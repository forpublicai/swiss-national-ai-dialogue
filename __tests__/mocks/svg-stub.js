// Jest stub for `*.svg` imports. `@deliberations/ui` brand components import
// SVGs for their URL; under ts-jest those imports would otherwise be parsed as
// JS ("Unexpected token '<'"). Mirrors the style/next-font stubs — a plain
// string stands in for the resolved URL.
module.exports = "svg-stub";
