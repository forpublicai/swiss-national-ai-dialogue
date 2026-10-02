// jsdom doesn't define TextEncoder/TextDecoder, but `pg` (pulled in
// transitively whenever a module imports `@/db`) requires them at load time.
// Provide the Node implementations so test suites that touch the data layer's
// import graph can load even when they only exercise pure helpers.
import { TextDecoder, TextEncoder } from "node:util";
// jsdom has no ReadableStream; the SSE draft-chat stream (server engine and
// the client hook that consumes it) needs one under both test environments.
import { ReadableStream } from "node:stream/web";

const g = globalThis as unknown as {
  TextEncoder?: typeof TextEncoder;
  TextDecoder?: typeof TextDecoder;
  ReadableStream?: typeof ReadableStream;
  window?: { matchMedia?: (query: string) => unknown };
};
if (!g.TextEncoder) g.TextEncoder = TextEncoder;
if (!g.TextDecoder) g.TextDecoder = TextDecoder;
if (!g.ReadableStream) g.ReadableStream = ReadableStream;

// jsdom has no matchMedia; components that branch on pointer/hover media
// queries (e.g. the SNAD composer's desktop autofocus) need a stub that
// simply never matches.
if (g.window && !g.window.matchMedia) {
  g.window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
