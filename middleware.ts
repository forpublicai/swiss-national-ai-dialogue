import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROOT_SLUG = "swiss-national-ai-dialogue";

// /admin is protected by HTTP Basic auth against ADMIN_PASSWORD (any
// username). Unset, /admin is reachable only from localhost in development.
function isAuthorizedAdmin(request: NextRequest): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const host = request.headers.get("host") ?? "";
    return (
      process.env.NODE_ENV !== "production" &&
      (host.startsWith("localhost") || host.startsWith("127.0.0.1"))
    );
  }
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const supplied = decoded.slice(decoded.indexOf(":") + 1);
  if (supplied.length !== password.length) return false;
  let diff = 0;
  for (let i = 0; i < password.length; i += 1) {
    diff |= supplied.charCodeAt(i) ^ password.charCodeAt(i);
  }
  return diff === 0;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminPath =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminPath && !isAuthorizedAdmin(request)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"' },
    });
  }

  // /partner is the browser-accessible, access-key admin surface. This is
  // only a UX-level cookie-presence redirect — the authoritative HMAC
  // verification lives in the server layer (lib/partner/auth.ts), which every
  // /partner page and /api/partner route performs itself.
  if (
    pathname.startsWith("/partner") &&
    pathname !== "/partner/login" &&
    !pathname.startsWith("/api/") &&
    !request.cookies.has("partner_session")
  ) {
    return NextResponse.redirect(new URL("/partner/login", request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://*.amplitude.com`,
    // style-src retains 'unsafe-inline' because next/font injects an inline
    // <style> block into <head> at render time (one per font family) and the
    // Next.js font loader does not accept or forward a nonce.  All React
    // style={{ … }} object literals in this app are browser-applied CSSOM
    // styles (not <style> tags), so they are unaffected by style-src.
    // Switching to nonce-${nonce} here would break font loading immediately.
    `style-src 'self' 'unsafe-inline'`,
    `font-src 'self'`,
    `img-src 'self' data:`,
    `connect-src 'self' https://*.amplitude.com`,
    `worker-src 'self' blob:`,
    `child-src 'self' blob:`,
    `frame-src 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // The dialogue is served at the site root.
  const response =
    pathname === "/"
      ? // Keep the query string: the page reads `?view=dialogue` on the
        // server to open straight into a resumed dialogue.
        NextResponse.rewrite(
          new URL(`/${ROOT_SLUG}${request.nextUrl.search}`, request.url),
          { request: { headers: requestHeaders } },
        )
      : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    {
      source:
        "/((?!_next/static|_next/image|favicon|admin|api/admin|.*\\.(?:png|ico|svg|jpg)).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
