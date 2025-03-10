const esModules = [
  "bail",
  "ccount",
  "comma-separated-tokens",
  "data-uri-to-buffer",
  "decode-named-character-reference",
  "devlop",
  "escape-string-regexp",
  "fetch-blob",
  "formdata-polyfill",
  "hast-util-from-parse5",
  "hast-util-parse-selector",
  "hast-util-raw",
  "hast-util-to-parse5",
  "hast-util-whitespace",
  "hastscript",
  "html-void-elements",
  "is-plain-obj",
  "markdown-table",
  "mdast-util-definitions",
  "mdast-util-find-and-replace",
  "mdast-util-from-markdown",
  "mdast-util-gfm",
  "mdast-util-to-hast",
  "mdast-util-to-markdown",
  "mdast-util-to-string",
  "micromark",
  "node-fetch",
  "property-information",
  "react-markdown",
  "rehype-raw",
  "remark-gfm",
  "remark-parse",
  "remark-rehype",
  "space-separated-tokens",
  "trim-lines",
  "trough",
  "unified",
  "unist-util-generated",
  "unist-util-is",
  "unist-util-position",
  "unist-util-stringify-position",
  "unist-util-visit",
  "uri-transformer",
  "vfile",
  "vfile-message",
  "web-namespaces",
  "zwitch",
].join("|");

module.exports = {
  modulePaths: ["<rootDir>/src"],
  testEnvironment: "jsdom",
  testTimeout: 10000,
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  setupFiles: ["<rootDir>/src/__tests__/setup/setup.js"],
  testMatch: ["**/__tests__/**/*.test.js"],
  moduleNameMapper: {
    "\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/src/__tests__/setup/fileMock.js",
    "\\.(css|less)$": "<rootDir>/src/__tests__/setup/fileMock.js",
  },
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.{js,jsx}"],
};
