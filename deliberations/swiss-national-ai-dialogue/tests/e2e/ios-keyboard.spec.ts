import { test, expect, type Page } from "@playwright/test";

const SWISS = "swiss-national-ai-dialogue";
const KB_HEIGHT = 336;
const COMPOSER = "closing-island";
const COMPOSER_TEXTAREA = "closing-quote-text";

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

declare global {

  var __vv: {
    set: (
      next: Partial<{
        height: number;
        offsetTop: number;
        innerHeight: number | null;
      }>,
      emit?: boolean,
    ) => void;
  };
}

function installViewportMock() {
  const state: {
    height: number | null;
    offsetTop: number;
    innerHeight: number | null;
  } = {
    height: null,
    offsetTop: 0,
    innerHeight: null,
  };
  const nativeInnerHeight = Object.getOwnPropertyDescriptor(
    window,
    "innerHeight",
  );
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    get: () =>
      state.innerHeight ?? nativeInnerHeight?.get?.call(window) ?? 0,
  });
  class FakeVisualViewport extends EventTarget {
    get width() {
      return window.innerWidth;
    }
    get height() {
      return state.height ?? window.innerHeight;
    }
    get offsetTop() {
      return state.offsetTop;
    }
    get offsetLeft() {
      return 0;
    }
    get pageTop() {
      return window.scrollY + state.offsetTop;
    }
    get pageLeft() {
      return window.scrollX;
    }
    get scale() {
      return 1;
    }
  }
  const fake = new FakeVisualViewport();
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    get: () => fake,
  });
  window.__vv = {
    set(next, emit = true) {
      Object.assign(state, next);
      if (emit) {
        fake.dispatchEvent(new Event("resize"));
        fake.dispatchEvent(new Event("scroll"));
      }
    },
  };

  const origMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (q: string) =>
    q === "(hover: none)"
      ? ({ matches: true, media: q } as unknown as MediaQueryList)
      : origMatchMedia(q);
}

async function openSwissChat(page: Page) {
  await page.addInitScript(installViewportMock);
  await primeSwissChat(page);
  await page.goto(`/${SWISS}`);
  await page.getByRole("button", { name: "Reject all" }).click();
  await page.getByTestId("landing-cta").click();
  const textarea = page.getByTestId(COMPOSER_TEXTAREA);
  const skip = page.getByRole("button", { name: "Skip" });
  for (let i = 0; i < 12; i += 1) {
    await expect(textarea.or(skip).first()).toBeVisible({ timeout: 20_000 });
    if (await textarea.isVisible()) break;
    await skip.click();
    await page.waitForTimeout(200);
  }
  await expect(textarea).toBeVisible({ timeout: 20_000 });
  await expect(
    page
      .locator('[role="log"]')
      .locator("div, p")
      .filter({ hasText: /.+/ })
      .first(),
  ).toBeVisible({ timeout: 45_000 });
  await expect(textarea).toBeEnabled({ timeout: 45_000 });
  await page.evaluate((composer) => {
    const spacer = document.createElement("div");
    spacer.setAttribute("data-e2e-spacer", "");
    spacer.style.height = "3000px";
    document.body.prepend(spacer);
    document
      .querySelector(`[data-testid="${composer}"]`)
      ?.setAttribute("data-e2e-original", "");
    window.scrollTo(0, document.documentElement.scrollHeight);
  }, COMPOSER);
  await page.waitForTimeout(150);
  return textarea;
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  const state = await page
    .evaluate((composer) => {
      const node = document.querySelector<HTMLElement>(
        `[data-testid="${composer}"]`,
      );
      return {
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        vvHeight: window.visualViewport?.height,
        vvTop: window.visualViewport?.offsetTop,
        spacerAttached: document.querySelector("[data-e2e-spacer]") !== null,
        composerIsOriginal: node?.hasAttribute("data-e2e-original") ?? null,
        composerBottom: node?.style.bottom ?? null,
        activeElement: document.activeElement?.tagName,
      };
    }, COMPOSER)
    .catch(() => null);
  console.log(`[vv-dump] ${testInfo.title}: ${JSON.stringify(state)}`);
});

async function primeSwissChat(page: Page) {
  const started = await page.request.post("/api/snad/session", {
    data: { locale: "en", canton: "ZH" },
  });
  const startedBody = await started.text();
  expect(started.ok(), startedBody).toBe(true);
  let session = (
    JSON.parse(startedBody) as {
      session: { activeStep: { kind: string; topicKey?: string } };
    }
  ).session;
  expect(session.activeStep.kind).toBe("topic");

  while (session.activeStep.kind === "topic") {
    const resolved = await page.request.patch("/api/snad/session", {
      data: {
        operation: "answer",
        response: {
          step_id: `topic:${session.activeStep.topicKey}`,
          answer: null,
          skipped: true,
        },
      },
    });
    expect(resolved.ok(), await resolved.text()).toBe(true);
    session = (
      (await resolved.json()) as {
        session: { activeStep: { kind: string; topicKey?: string } };
      }
    ).session;
  }

  const completed = await page.request.patch("/api/snad/session", {
    data: { operation: "complete" },
  });
  expect(completed.ok(), await completed.text()).toBe(true);
}

const composerBottom = (page: Page) =>
  page.evaluate(
    (composer) =>
      document.querySelector<HTMLElement>(`[data-testid="${composer}"]`)?.style
        .bottom ?? "",
    COMPOSER,
  );

const blankBelow = (page: Page) =>
  page.evaluate(() => {
    const vv = window.visualViewport;
    const doc = document.documentElement;
    if (!vv) return Number.NaN;
    return Math.round(
      vv.offsetTop + vv.height - (doc.getBoundingClientRect().top + doc.scrollHeight),
    );
  });

test("keyboard open lifts the composer; silent viewport pans are tracked", async ({
  page,
}) => {
  const textarea = await openSwissChat(page);
  await textarea.focus();
  // iOS staggers the shrink across several resize events.
  await page.evaluate(() => window.__vv.set({ height: 700 }));
  await page.evaluate(() => window.__vv.set({ height: 508 }));
  await expect.poll(() => composerBottom(page)).toBe(`${KB_HEIGHT}px`);

  await page.evaluate(() => window.__vv.set({ offsetTop: 60 }, false));
  await expect.poll(() => composerBottom(page)).toBe(`${KB_HEIGHT - 60}px`);
});

test("dead space is corrected even when innerHeight mirrors the visual viewport", async ({
  page,
}) => {
  const textarea = await openSwissChat(page);
  await textarea.focus();

  const before = await page.evaluate(() => {
    window.__vv.set({ height: 508, innerHeight: 508, offsetTop: 400 }, false);
    return window.scrollY;
  });

  await expect
    .poll(() => blankBelow(page), { timeout: 15_000 })
    .toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(before);
});

test("swiss page paints the overscroll canvas with the paper ground", async ({
  page,
}) => {
  await page.goto(`/${SWISS}`);

  await expect
    .poll(() =>
      page.evaluate(
        () => getComputedStyle(document.documentElement).backgroundColor,
      ),
    )
    .toBe("rgb(246, 246, 246)");
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe("rgb(246, 246, 246)");
});
