import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Server/client boundary for per-deliberation manifests. The two-file
  // convention (server.ts server-only; client.tsx client-only) keeps
  // `next/font` loaders and other RSC-only modules from being pulled into
  // the client bundle, and keeps client React components out of server
  // graphs. Catching this at lint time is much cheaper than a silent
  // bundle-size regression.
  {
    files: ["deliberations/*/client*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/server", "**/server.ts", "**/server/index*"],
              message:
                "client.tsx must not import server.ts (server-only manifest).",
            },
            {
              group: ["next/font", "next/font/*"],
              message:
                "next/font loaders are server-only — move them into the sibling server.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["deliberations/*/server*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/client", "**/client.tsx", "**/client/index*"],
              message:
                "server.ts must not import client.tsx (client-only manifest).",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
