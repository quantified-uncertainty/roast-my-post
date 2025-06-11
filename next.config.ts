import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // For server-side, externalize native modules
      config.externals = config.externals || [];
      config.externals.push({
        're2': 'commonjs re2',
        'canvas': 'commonjs canvas',
        'sharp': 'commonjs sharp',
      });
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

export default nextConfig;
