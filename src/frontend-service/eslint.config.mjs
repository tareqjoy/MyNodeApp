import { FlatCompat } from "@eslint/eslintrc";
import pluginJs from "@eslint/js";

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
  recommendedConfig: pluginJs.configs.recommended,
});

const eslintConfig = [
  ...compat.config({
    extends: ["eslint:recommended", "next", "prettier"],
    rules: {
    "no-unused-vars": "off",
    "no-undef": "warn"
    }
  }),
];

export default eslintConfig;
