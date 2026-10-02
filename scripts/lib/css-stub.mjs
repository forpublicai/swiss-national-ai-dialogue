// Headless shims for importing Next per-deliberation server manifests under
// tsx (eval scripts), outside Next.js. Server manifests import CSS modules
// (`import styles from "*.module.css"`) and next/font loaders — neither runs
// under plain tsx. Rather than fight tsx for the load slot, we register a
// synchronous resolve hook (module.registerHooks applies to CJS require too)
// that redirects those specifiers to real shim files tsx transforms normally.
// Load AFTER tsx so our resolve runs first:
//   node --import tsx --import file://<abs>/scripts/lib/css-stub.mjs script.ts
import { registerHooks } from "node:module";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CSS_SHIM = pathToFileURL(pathResolve(here, "css-shim.ts")).href;
const FONT_SHIM = pathToFileURL(pathResolve(here, "next-font-shim.cjs")).href;

const CSS_RE = /\.(css|scss|sass)(\?.*)?$/;
const FONT_RE = /^next\/font(\/google|\/local)?$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (CSS_RE.test(specifier)) {
      return { url: CSS_SHIM, shortCircuit: true };
    }
    if (FONT_RE.test(specifier)) {
      return { url: FONT_SHIM, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
