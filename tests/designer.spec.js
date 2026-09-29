import { test, expect } from "@playwright/test";
import { countTokens } from "gpt-tokenizer/encoding/cl100k_base";

async function ready(page) {
  await expect(page.locator("#tokenizer-status")).toContainText("· exact");
}

async function exportDesign(page) {
  await page.locator("#json-panel").evaluate((element) => {
    element.open = true;
  });
  await page.locator("#export-json").click();
  return JSON.parse(await page.locator("#design-json").inputValue());
}

test("renders a separate hero and preserves theme preference without external requests", async ({
  page,
}) => {
  const external = [];
  const errors = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4321"))
      external.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "Context Designer", exact: true }),
  ).toBeVisible();
  const hero = await page.locator(".site-hero").boundingBox();
  const main = await page.locator("main").boundingBox();
  expect(main.y - (hero.y + hero.height)).toBeGreaterThanOrEqual(28);
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  for (const width of [320, 736, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1100 });
    const layout = await page.evaluate(() => {
      const box = document.body.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        centered: Math.abs(box.left - (innerWidth - box.right)) < 1,
      };
    });
    expect(layout).toEqual({ overflow: false, centered: true });
    await expect(page.locator("#theme-toggle")).toBeInViewport();
  }
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("counts real content, displays overflow, persists drafts, and changes tokenizer", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await page.locator("#slot-content").fill("Hello, world!");
  await expect(page.locator("#slot-metrics")).toContainText("4 text tokens");
  await page.locator("#slot-budget").fill("2");
  await expect(page.locator("#slot-metrics")).toContainText("over budget");
  await expect(page.locator(".over-budget-fill")).toHaveCount(1);
  await page.locator("#context-window").fill("10");
  await expect(page.locator("#budget-warning")).toContainText(
    "exceeds the window",
  );
  await expect(page.locator("#save-status")).toContainText(
    "Saved in this browser",
  );
  await page.reload();
  await ready(page);
  await expect(page.locator("#slot-content")).toHaveValue("Hello, world!");
  await page.locator("#fit-budget").click();
  await expect(page.locator("#slot-budget")).toHaveValue("4");
  const text = "你好世界 👩🏽‍💻\n<|endoftext|>\nconst value = 42;";
  await page.locator("#slot-content").fill(text);
  await page.locator("#encoding").selectOption("cl100k_base");
  await ready(page);
  const count = countTokens(text, { disallowedSpecial: new Set() });
  await expect(page.locator("#slot-metrics")).toContainText(
    `${count} text tokens`,
  );
});

test("category and slot changes survive import, undo, and large draft restoration", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await page.locator("#add-category").click();
  await page.locator("#category-name").fill("Retrieved context");
  await page.locator("#category-add-slot").click();
  await page.locator("#slot-name").fill("Knowledge");
  const text = "A retained prompt with 中文 and emoji 🧠.\n".repeat(900);
  await page.locator("#slot-content").fill(text);
  await expect(page.locator("#save-status")).toContainText(
    "Saved in this browser",
  );
  await page.reload();
  await ready(page);
  await expect(page.locator("#slot-content")).toHaveValue(text);
  const original = await exportDesign(page);
  await page.locator("#duplicate-slot").click();
  await page.locator("#delete-slot").click();
  await page.locator("#undo").click();
  await expect(page.locator("#slot-name")).toHaveValue("Knowledge copy");
  await page.locator("#design-json").fill(JSON.stringify(original));
  await page.locator("#import-json").click();
  await expect(page.locator("#json-status")).toContainText("Design imported");
  expect((await exportDesign(page)).design).toEqual(original.design);
  await page.locator("#design-json").fill("{invalid");
  await page.locator("#import-json").click();
  await expect(page.locator("#json-status")).toContainText("Import rejected");
  expect((await exportDesign(page)).design).toEqual(original.design);
});
