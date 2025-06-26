// Mock for remark-parse ESM module
module.exports = function remarkParse() {
  return {
    parse: (markdown) => ({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [{
          type: 'text',
          value: markdown
        }]
      }]
    })
  };
};

// Default export
module.exports.default = module.exports;