// Mock for remark-slate-transformer
module.exports = {
  remarkToSlate: () => {
    return (tree) => [
      {
        type: 'paragraph',
        children: [{ text: 'mocked content' }],
      },
    ];
  },
};