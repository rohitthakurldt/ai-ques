import { defineConfig, globalIgnores } from "eslint/config";

// ESLint disabled - all rules turned off
const eslintConfig = defineConfig([
  {
    rules: {
      // Disable all rules
    },
  },
  // Ignore build directories and node_modules
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
