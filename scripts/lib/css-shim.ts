// Stand-in for any `*.module.css` import when running headless under tsx (eval
// scripts). A Proxy that echoes each requested class name back as its own
// string value, so `styles.root === "root"`. Never rendered — the eval runner
// only reads manifest data, not styles.
const proxy = new Proxy(
  {},
  { get: (_t, k) => (typeof k === "string" ? k : undefined) },
) as Record<string, string>;

export default proxy;
