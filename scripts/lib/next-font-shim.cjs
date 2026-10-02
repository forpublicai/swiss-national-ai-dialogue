// Stand-in for next/font/google and next/font/local when importing Next
// server manifests headless under tsx. Each named font loader (Inter,
// Merriweather, …) and the default export resolves to a function returning a
// font object with the className/variable/style shape manifests read.
const fontLoader = () => ({
  className: "font-stub",
  variable: "--font-stub",
  style: { fontFamily: "stub" },
});

module.exports = new Proxy(
  {},
  {
    get: (_t, k) => (k === "__esModule" ? true : fontLoader),
  },
);
