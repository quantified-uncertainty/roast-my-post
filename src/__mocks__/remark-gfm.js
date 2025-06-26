// Mock for remark-gfm ESM module
module.exports = function remarkGfm() {
  return (tree, file) => tree;
};

// Default export
module.exports.default = module.exports;