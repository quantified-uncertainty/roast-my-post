/** @type {import('next').NextConfig} */

// Docker-specific Next.js configuration without plugins that require Prisma client

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["react-markdown", "rehype-raw", "remark-gfm"],
  // Monorepo file tracing (moved from experimental in Next.js 15)
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  // Explicitly include Prisma engines in serverless bundle (Next.js 15 renamed from serverComponentsExternalPackages)
  serverExternalPackages: ['@prisma/client', '@prisma/engines', '@roast/db'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Add markdown loader
    config.module.rules.push({
      test: /\.md$/,
      use: "raw-loader",
    });

    if (isServer) {
      // For server-side, externalize native modules
      config.externals = config.externals || [];
      config.externals.push({
        're2': 'commonjs re2',
        'canvas': 'commonjs canvas',
        'sharp': 'commonjs sharp',
      });
      
      // Explicitly copy Prisma engines for Docker builds
      const path = require('path');
      const fs = require('fs');
      
      // Manual engine copy during build phase since CopyPlugin doesn't work well in Docker
      const enginePath = path.join(__dirname, '../../internal-packages/db/generated');
      const targetPath = path.join(__dirname, 'generated');
      
      // Create target directory if it doesn't exist
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      
      // Copy all .node files
      if (fs.existsSync(enginePath)) {
        const files = fs.readdirSync(enginePath);
        files.filter(f => f.endsWith('.node')).forEach(file => {
          const src = path.join(enginePath, file);
          const dest = path.join(targetPath, file);
          fs.copyFileSync(src, dest);
          console.log(`Copied Prisma engine: ${file}`);
        });
      }
    } else {
      // For client-side, completely ignore these modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        're2': false,
        'canvas': false,
        'sharp': false,
        'fs': false,
        'path': false,
        'os': false,
      };
    }
    
    // Ignore native node modules
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });

    return config;
  },
};

module.exports = nextConfig;