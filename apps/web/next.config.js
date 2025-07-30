/** @type {import('next').NextConfig} */

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

      // Ensure Prisma engines are included in the bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        '@prisma/client': require.resolve('@roast/db/generated'),
      };
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
    
    // Copy Prisma engines to output directory
    if (isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new (require('webpack').IgnorePlugin)({
          checkResource(resource) {
            const lazyImports = [
              '@nestjs/microservices',
              '@nestjs/websockets/socket-module',
              'class-transformer/storage',
            ];
            if (!lazyImports.includes(resource)) {
              return false;
            }
            try {
              require.resolve(resource);
            } catch (err) {
              return true;
            }
            return false;
          },
        }),
      );
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