import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // The dev-tools badge floats at the viewport's bottom-left, where it sits
  // on top of SNAD's mobile back arrow and intercepts its clicks in e2e runs.
  devIndicators: false,
  // Expose the build-time deployment id (Dockerfile ARG NEXT_DEPLOYMENT_ID) to
  // the client bundle so VersionRefresher can compare the id it was built with
  // against the id the live server reports. Undefined in dev — the client then
  // skips the check entirely.
  env: { NEXT_PUBLIC_DEPLOYMENT_ID: process.env.NEXT_DEPLOYMENT_ID },
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*", "./deliberations/**/*"],
  },
  experimental: {
    serverActions: {
      // Comma-separated extra hostnames allowed to POST server actions when
      // the app sits behind a proxy that rewrites Host.
      allowedOrigins: (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
