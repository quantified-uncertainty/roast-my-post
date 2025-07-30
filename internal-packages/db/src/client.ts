import { PrismaClient } from '../generated';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Prisma client configuration optimized for Next.js
const prismaClientSingleton = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Add error formatting for better debugging
    errorFormat: 'pretty',
  });

  // Middleware to add retry logic for transient errors
  client.$use(async (params, next) => {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await next(params);
      } catch (error: any) {
        retries++;
        
        // Check if it's a connection error that we should retry
        if (
          retries < maxRetries && 
          (error.message?.includes('Engine is not yet connected') ||
           error.message?.includes('Response from the Engine was empty') ||
           error.code === 'P2024' || // Connection pool timeout
           error.code === 'P2025')   // Record not found (sometimes transient)
        ) {
          console.warn(`Prisma query failed, retrying (${retries}/${maxRetries})...`, {
            model: params.model,
            action: params.action,
            error: error.message
          });
          
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error(`Max retries (${maxRetries}) exceeded`);
  });

  return client;
};

// Prevent multiple instances of Prisma Client in development
const prisma = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Gracefully handle shutdowns
const handleShutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

export { prisma };