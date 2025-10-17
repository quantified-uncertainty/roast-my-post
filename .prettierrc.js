module.exports = {
  trailingComma: "es5",
  semi: true,
  endOfLine: "lf",
  printWidth: 160,
  singleAttributePerLine: false,
  objectWrap: "collapse",
  singleQuote: true,
  tabWidth: 2,
  plugins: ["prettier-plugin-tailwindcss"],
  overrides: [
    {
      files: ["tsconfig.json", "language-configuration.json"],
      options: {
        parser: "jsonc",
      },
    },
  ],
};
