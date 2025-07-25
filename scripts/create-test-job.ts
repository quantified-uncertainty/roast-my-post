import { prisma } from './src/lib/prisma';

async function createTestJob() {
  // Find a multi-epistemic-eval agent
  const agent = await prisma.agent.findFirst({
    where: { extendedCapabilityId: 'multi-epistemic-eval' },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!agent) {
    console.log('No multi-epistemic-eval agent found');
    return;
  }
  
  // Find a document with spelling errors
  const doc = await prisma.document.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  if (!doc) {
    console.log('No documents found');
    return;
  }
  
  // Get latest version
  const version = await prisma.documentVersion.findFirst({
    where: { documentId: doc.id },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!version) {
    console.log('No document version found');
    return;
  }
  
  console.log('Creating evaluation for:');
  console.log('Agent:', agent.id);
  console.log('Document:', doc.id);
  console.log('Title:', version.title);
  
  // Create evaluation
  const evaluation = await prisma.evaluation.create({
    data: {
      documentId: doc.id,
      documentVersionId: version.id,
      agentId: agent.id,
      agentVersionId: agent.id // assuming agent version same as agent id
    }
  });
  
  // Create job
  const job = await prisma.job.create({
    data: {
      evaluationId: evaluation.id,
      status: 'PENDING'
    }
  });
  
  console.log('\nCreated job:', job.id);
  console.log('Status:', job.status);
}

createTestJob();