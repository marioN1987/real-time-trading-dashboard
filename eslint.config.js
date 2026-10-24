// eslint.config.js
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        WebSocket: "readonly",
        console: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
  },
];