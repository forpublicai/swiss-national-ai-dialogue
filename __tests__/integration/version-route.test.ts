import "@testing-library/jest-dom";

// next/server's Request shim throws at import under jsdom; stub NextResponse to
// a minimal json() so the route module imports cleanly (same spirit as the
// sibling route tests).
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { GET } from "@/app/api/version/route";

const originalDeploymentId = process.env.NEXT_DEPLOYMENT_ID;

afterEach(() => {
  if (originalDeploymentId === undefined) delete process.env.NEXT_DEPLOYMENT_ID;
  else process.env.NEXT_DEPLOYMENT_ID = originalDeploymentId;
});

describe("GET /api/version", () => {
  it("reports the running server's deployment id", async () => {
    process.env.NEXT_DEPLOYMENT_ID = "git-abc123";

    const res = GET();
    const body = await res.json();

    expect(body).toEqual({ id: "git-abc123" });
  });

  it("reports null when no deployment id is set (local dev)", async () => {
    delete process.env.NEXT_DEPLOYMENT_ID;

    const res = GET();
    const body = await res.json();

    expect(body).toEqual({ id: null });
  });
});
