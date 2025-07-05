// Mock for next/font/google
const createFontMock = (name) => ({
  style: {
    fontFamily: `'${name}', serif`,
  },
  className: `font-${name.toLowerCase()}`,
  variable: `--font-${name.toLowerCase()}`,
});

module.exports = {
  Merriweather: () => createFontMock('Merriweather'),
  Libre_Baskerville: () => createFontMock('Libre Baskerville'),
  // Add other fonts as needed
};