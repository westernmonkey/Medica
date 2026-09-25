import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    ".generated/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
    "data/**",
    "mednotes/**",
    "src/app/mednotes/**",
    "src/components/anatomy-final/**",
    "scripts/anatomy/**",
    "scripts/prepare-mednotes-web-assets.cjs",
    "tests/mednotes/**",
    "public/mednotes-models/**",
    "public/mednotes-runtime/**",
  ]),
]);
