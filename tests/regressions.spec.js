import { test, expect } from "@playwright/test";

test("malformed nested browser data and prototype-named routes cannot crash the app", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "study-room-v1",
      JSON.stringify({
        drafts: { 3: {}, 4: 42 },
        last: { paper: "constructor", section: "anything" },
        reviewed: [null, 2],
        checks: { "paper3-0": "no" },
        timers: { 3: { end: "tomorrow" } },
      }),
    ),
  );
  await page.goto("/#/practice");
  await expect(page.locator("#draft")).toHaveValue("");
  for (const route of [
    "notes/constructor/anything",
    "notes/__proto__/anything",
    "toString",
  ]) {
    await page.goto("/#/" + route);
    await expect(page.locator("main h1")).toContainText("isn’t");
  }
  expect(errors).toEqual([]);
});

test("Paper 4 progress requires case-study chapters as well as principles", async ({
  page,
  request,
}) => {
  const data = await (await request.get("/content.json")).json(),
    module = data.documents.paper4.modules[0];
  await page.goto("/#/notes/paper4/" + module.sections[0]);
  await page.locator("[data-review]").click();
  await expect(page.locator(".side-progress strong")).toHaveText("0 / 7");
  await page.goto("/#/paper4");
  await expect(page.locator(".topic-card").first()).toContainText(
    "1 / 2 chapters reviewed",
  );
  await page.goto("/#/notes/paper4/" + module.sections[1]);
  await page.locator("[data-review]").click();
  await expect(page.locator(".side-progress strong")).toHaveText("1 / 7");
  await page.goto("/#/paper4");
  await expect(
    page.locator(".topic-card").first().locator(".review-state"),
  ).toContainText("Reviewed");
});

test("timers survive reload, pause on paper switch and do not reset on a selected-paper click", async ({
  page,
}) => {
  await page.clock.install({ time: new Date() });
  await page.goto("/#/practice");
  await page.locator("#timer-toggle").click();
  await page.clock.fastForward(61000);
  await expect(page.locator("#timer-display")).toHaveText("88:59");
  await page.reload();
  await expect(page.locator("#timer-display")).toHaveText("88:59");
  await expect(page.locator("#timer-toggle")).toHaveText("Pause timer");
  await page.locator('[data-practice="3"]').click();
  await expect(page.locator("#timer-toggle")).toHaveText("Pause timer");
  await page.locator('[data-practice="4"]').click();
  await expect(page.locator("#timer-display")).toHaveText("90:00");
  await page.clock.fastForward(10000);
  await page.locator('[data-practice="3"]').click();
  await expect(page.locator("#timer-display")).toHaveText("88:59");
  await expect(page.locator("#timer-toggle")).toHaveText("Start timer");
});

test("a storage write failure is visible and does not prevent exporting a draft", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "study-room-v1")
        throw new DOMException("full", "QuotaExceededError");
      return original.call(this, k, v);
    };
  });
  await page.goto("/#/practice");
  await page.locator("#draft").fill("Keep this unsaved draft safe.");
  await expect(page.locator("#storage-banner")).toBeVisible();
  await expect(page.locator("#draft-save")).toContainText("unavailable");
  const download = page.waitForEvent("download");
  await page.locator("#export-draft").click();
  expect((await download).suggestedFilename()).toContain("draft");
});

test("year/diacritic search and mobile focus trapping work", async ({
  page,
}) => {
  await page.goto("/#/past-papers");
  await page.locator("#question-search").fill("2026");
  await expect(page.locator(".question-card")).toHaveCount(7);
  await page.locator("#search-open").click();
  await page.locator("#global-search").fill("Djenne");
  await expect(page.locator(".search-result").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 500 });
  await page.locator("#menu").click();
  await expect(page.locator(".drawer-close")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#sidebar .source-nav")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".drawer-close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeFocused();
});

test("partial or incompatible content is rejected rather than rendering misleading pages", async ({
  page,
}) => {
  await page.route("**/content.json", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: 2,
        documents: {},
        questions: [],
        resources: [],
      }),
    }),
  );
  await page.goto("/");
  await expect(page.locator("main")).toContainText("could not load");
});

test("preview supports HEAD requests and rejects writes", async ({
  request,
}) => {
  const head = await request.head("/content.json");
  expect(head.ok()).toBe(true);
  expect(head.headers()["cache-control"]).toBe("no-cache");
  expect(Number(head.headers()["content-length"])).toBeGreaterThan(100);
  expect((await request.post("/index.html")).status()).toBe(405);
});

test("expiry is persisted once and starting a finished timer creates a fresh session", async ({
  page,
}) => {
  await page.clock.install({ time: new Date() });
  await page.goto("/#/practice");
  await page.locator("#timer-toggle").click();
  await page.clock.fastForward(5400001);
  await expect(page.locator("#timer-display")).toHaveText("00:00");
  await expect(page.locator("#timer-toggle")).toHaveText("Start new session");
  await page.reload();
  await expect(page.locator("#timer-display")).toHaveText("00:00");
  await page.locator("#timer-toggle").click();
  await expect(page.locator("#timer-display")).toHaveText("90:00");
});

test("another tab cannot silently overwrite a newer saved draft", async ({
  page,
  context,
}) => {
  await page.goto("/#/practice");
  const other = await context.newPage();
  await other.goto("/#/practice");
  await page.locator("#draft").fill("Newer saved work.");
  await expect(other.locator("#storage-banner")).toContainText("another tab");
  await other.locator("#draft").fill("Different in-memory work.");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("study-room-v1")).drafts["3"],
    ),
  ).toBe("Newer saved work.");
  await expect(other.locator("#draft-save")).toContainText("unavailable");
});

test("damaged saved JSON is distinguished from unavailable storage", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("study-room-v1", "{not-json"),
  );
  await page.goto("/#/practice");
  await expect(page.locator("#storage-banner")).toContainText("damaged");
  await page.locator("#draft").fill("New valid work");
  await expect(page.locator("#draft-save")).toHaveText("Saved on this browser");
});

test("skip-to-content and reader contents links move focus without breaking the route", async ({
  page,
  request,
}) => {
  const data = await (await request.get("/content.json")).json();
  const section = data.documents.paper3.sections[1];
  await page.goto("/#/notes/paper3/" + section.id);
  await page.locator(".skip").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  expect(page.url()).toContain("/#/notes/paper3/");
  const jump = page.locator("[data-jump]").first(),
    id = await jump.getAttribute("data-jump");
  await jump.click();
  await expect(page.locator('[id="' + id + '"]').first()).toBeFocused();
  expect(page.url()).toContain("/#/notes/paper3/");
});

test("reset removes review marks and checks but keeps both paper drafts", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "study-room-v1",
      JSON.stringify({
        reviewed: ["paper3:test"],
        checks: { "paper3-0": true },
        drafts: { 3: "keep three", 4: "keep four" },
      }),
    );
  });
  await page.goto("/#/sources");
  page.on("dialog", (d) => d.accept());
  await page.locator("#reset-progress").click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("study-room-v1")),
  );
  expect(saved.reviewed).toEqual([]);
  expect(saved.checks).toEqual({});
  expect(saved.drafts).toEqual({ 3: "keep three", 4: "keep four" });
});

test("confidence markers are visible, labelled and not presented as topic probabilities", async ({
  page,
}) => {
  await page.goto("/#/priorities");
  await expect(page.locator("#confidence-title")).toHaveText(
    "Evidence confidence—not a topic ranking",
  );
  await expect(page.locator(".confidence-explanation")).toContainText(
    "do not rate how likely a topic",
  );
  await expect(page.locator(".confidence-badge")).toHaveCount(3);
  await expect(page.locator(".priorities-prose h3")).toHaveCount(2);
  await expect(page.locator(".priorities-prose ol > li")).toHaveCount(8);
  await expect(page.locator(".priorities-prose")).not.toContainText(
    "High confidence:",
  );
  for (const surface of ["light", "dark"]) {
    if (surface === "dark")
      await page.addStyleTag({
        content:
          ":root{--paper:#22211d;--cream:#25241e;--ink:#f4eee4;--muted:#c9c1b4;--line:#645c51}",
      });
    const colours = await page
      .locator(".confidence-dot")
      .evaluateAll((dots) =>
        dots.map((dot) => getComputedStyle(dot).backgroundColor),
      );
    expect(new Set(colours).size).toBe(3);
    for (const dot of await page.locator(".confidence-dot").all()) {
      await expect(dot).toBeVisible();
      expect((await dot.boundingBox()).width).toBeGreaterThanOrEqual(12);
      expect(
        await dot.evaluate((el) => getComputedStyle(el).boxShadow),
      ).not.toBe("none");
      await expect(dot).toHaveAttribute("aria-hidden", "true");
    }
    await page.setViewportSize({ width: 320, height: 750 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/confidence-${surface}.png`,
      fullPage: true,
    });
  }
});
