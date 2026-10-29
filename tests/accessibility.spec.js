import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("core pages have no automated WCAG A/AA violations", async ({ page }) => {
  for (const route of [
    "home",
    "paper3",
    "paper4",
    "practice",
    "past-papers",
    "priorities",
    "downloads",
    "sources",
  ]) {
    await page.goto("/#/" + route);
    await page.waitForSelector("main h1");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ html: n.html, fail: n.failureSummary })),
      })),
      route,
    ).toEqual([]);
  }
});

test("all 19 reader chapters have no automated WCAG A/AA violations", async ({
  page,
  request,
}) => {
  const data = await (await request.get("/content.json")).json();
  for (const id of ["paper3", "paper4"])
    for (const section of data.documents[id].sections) {
      await page.goto(`/#/notes/${id}/${section.id}`);
      await page.waitForSelector("article.prose");
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.html),
        })),
        section.title,
      ).toEqual([]);
    }
});

test("mobile drawer, search and storage warning states pass automated checks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("blocked");
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto("/#/practice");
  await page.waitForSelector("#draft");
  for (const state of ["normal", "drawer", "search"]) {
    if (state === "drawer") await page.locator("#menu").click();
    if (state === "search") {
      await page.keyboard.press("Escape");
      await page.locator("#search-open").click();
    }
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })),
      state,
    ).toEqual([]);
  }
});
