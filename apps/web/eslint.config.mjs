// Flat config replacing `next lint`, which Next 15 deprecates and Next 16
// removes. Without a config of its own that command dropped into an
// interactive setup prompt, so `pnpm lint` could not run unattended.
//
// ESLint stays on 9 and eslint-config-next on the 15.5 line, matching Next
// 15.5.2. ESLint 10 was attempted and does not work: eslint-config-next 16
// ships native flat configs, but every Next preset pulls eslint-plugin-react,
// whose latest release (7.37.5) declares `eslint: ^3 || ... || ^9.7` and throws
// `contextOrFilename.getFilename is not a function` under ESLint 10's rule API.
// ESLint 9 being end-of-life upstream is therefore an upstream blocker with a
// name, not a choice made here; it lifts when eslint-plugin-react ships ESLint
// 10 support.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [".next/**", "out/**", "next-env.d.ts", "public/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
