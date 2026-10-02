// Jest stub for CSS-module imports (`import styles from "./theme.module.css"`).
// Returns an empty object so `styles.root` is `undefined` rather than throwing —
// the per-deliberation server manifests import their theme module purely for
// the class name, which tests don't assert on. Wired via moduleNameMapper in
// jest.config.ts.
module.exports = {};
