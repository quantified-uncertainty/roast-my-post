// Mock for unified ESM module
const unified = function() {
  const processors = [];
  
  const processor = {
    use: function(plugin) {
      processors.push(plugin);
      return processor;
    },
    process: function(markdown) {
      return Promise.resolve({
        toString: () => markdown
      });
    },
    processSync: function(markdown) {
      return {
        toString: () => markdown
      };
    }
  };
  
  return processor;
};

module.exports = unified;
module.exports.unified = unified;