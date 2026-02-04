import eslintBrowser from "personal-style-guide/eslint/browser";

export default [
  ...eslintBrowser,
  {
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-non-literal-regexp": "off",
      "security/detect-object-injection": "off",
      "security/detect-unsafe-regex": "off",
    },
  },
];
