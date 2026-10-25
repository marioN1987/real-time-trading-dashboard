import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "vendor/**",
      "**/*.min.js",
      "**/*.bundle.js",
    ],
  },

  js.configs.recommended,

  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        WebSocket: "readonly",
      },
    },
  },

  {
    files: ["server/**/*.js", "server/**/*.cjs"],

    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
];