import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", ".workforce/**"] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 140, skipBlankLines: true, skipComments: true }],
      "no-console": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { "allowNumber": true, "allowNullish": true }],
      "@typescript-eslint/no-unnecessary-type-parameters": "off"
    }
  },
  {
    files: ["src/domain.ts", "src/acceptance/**/*.ts", "src/supervision/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["**/storage/**", "**/tui/**", "**/docker-runtime.js"], message: "Domain policy must not depend on infrastructure or presentation." }
        ]
      }]
    }
  },
  {
    files: ["src/cli.tsx", "src/doctor.ts", "src/plan-cli.ts", "src/arm-cli.ts"],
    rules: { "no-console": "off" }
  },
  {
    files: ["test/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-floating-promises": "off" }
  },
  {
    files: ["src/storage/sanitize-terminal.ts"],
    rules: { "no-control-regex": "off" }
  }
);
