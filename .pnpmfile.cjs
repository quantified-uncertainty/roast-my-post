module.exports = {
  hooks: {
    readPackage(pkg) {
      if (
        pkg.name === '@anthropic-ai/claude-agent-sdk' &&
        pkg.version.startsWith('0.3.') &&
        pkg.peerDependencies?.zod
      ) {
        // The SDK accepts v3 tool schemas, but its own runtime needs Zod 4.
        // Install that version locally so the app keeps its shared Zod 3 API.
        pkg.dependencies = { ...pkg.dependencies, zod: pkg.peerDependencies.zod };
        delete pkg.peerDependencies.zod;
      }
      return pkg;
    },
  },
};
