// A `*.svg` import resolves to its URL string under Next.js.
declare module "*.svg" {
  const src: string;
  export default src;
}
