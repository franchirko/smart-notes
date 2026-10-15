import { test, expect } from "@playwright/test";
import sharp from "sharp";
const editor = (page: import("@playwright/test").Page) => page.getByRole("textbox", { name: "Sadržaj bilješke", exact: true });
async function blank(page: import("@playwright/test").Page) {
  await page.goto("/test-fixtures/editor");
  await expect(editor(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Spremi", exact: true })).toBeDisabled();
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
}
test("Enter creates paragraphs, Shift+Enter preserves hard breaks and dirty state", async ({ page }) => {
  await blank(page);
  await page.keyboard.type("Prvi"); await page.keyboard.press("Enter");
  await page.keyboard.type("Drugi"); await page.keyboard.press("Shift+Enter"); await page.keyboard.type("Red");
  await expect(editor(page).locator("p")).toHaveCount(2);
  await expect(editor(page).locator("p").last()).toHaveText("DrugiRed");
  await expect(editor(page).locator("p").last().locator("br:not(.ProseMirror-trailingBreak)")).toHaveCount(1);
  await expect(page.getByText("Nespremljene izmjene", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spremi", exact: true })).toBeEnabled();
});
test("List continues on Enter and exits on an empty item", async ({ page }) => {
  await blank(page); await page.getByRole("button", { name: "Popis", exact: true }).click();
  await page.keyboard.type("Jedan"); await page.keyboard.press("Enter"); await page.keyboard.type("Dva");
  await expect(editor(page).locator("li")).toHaveCount(2);
  await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); await page.keyboard.type("Izvan");
  await expect(editor(page).locator("li")).toHaveCount(2);
  await expect(editor(page).locator(":scope > p").last()).toHaveText("Izvan");
});
test("Typing in the middle preserves cursor and Backspace joins paragraphs", async ({ page }) => {
  await blank(page);
  await page.keyboard.type("abcd");
  await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowLeft");
  await page.keyboard.type("XY");
  await expect(editor(page).locator("p")).toHaveText("abXYcd");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Backspace");
  await expect(editor(page).locator("p")).toHaveCount(1);
  await expect(editor(page).locator("p")).toHaveText("abXYcd");
});
test("Selection across paragraphs supports formatting, undo and redo", async ({ page }) => {
  await blank(page); await page.keyboard.type("Prvi"); await page.keyboard.press("Enter"); await page.keyboard.type("Drugi");
  await page.keyboard.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Podebljaj označeni tekst" }).click();
  await expect(editor(page).locator("strong")).toHaveCount(2);
  await page.getByRole("button", { name: "Poništi", exact: true }).click();
  await expect(editor(page).locator("strong")).toHaveCount(0);
  await page.getByRole("button", { name: "Ponovi", exact: true }).click();
  await expect(editor(page).locator("strong")).toHaveCount(2);
  await page.keyboard.press("ControlOrMeta+i");
  await expect(editor(page).locator("em")).toHaveCount(2);
});
test("Paste accepts only plain text and rejects overflow without truncation", async ({ page }) => {
  await blank(page);
  await editor(page).evaluate(el => {
    const data = new DataTransfer(); data.setData("text/plain", '<img src=x onerror="window.__xss=true">\nSigurno'); data.setData("text/html", '<img src=x onerror="window.__xss=true">');
    el.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await expect(editor(page).locator("img")).toHaveCount(0);
  await expect(editor(page)).toContainText('<img src=x onerror="window.__xss=true">');
  const before = await editor(page).innerText();
  await editor(page).evaluate(el => {
    const data = new DataTransfer(); data.setData("text/plain", "x".repeat(30001));
    el.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await expect(page.locator(".rich-editor").getByRole("alert")).toContainText("Izmjena nije prihvaćena");
  expect(await editor(page).innerText()).toBe(before);
});
test("Read-only document offers no editing or sharing controls", async ({ page }) => {
  await page.goto("/test-fixtures/editor?readonly=1");
  await expect(page.getByLabel("Naslov bilješke", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Spremi", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Podijeli", exact: true })).toHaveCount(0);
  await expect(page.locator('[contenteditable="true"]')).toHaveCount(0);
  await expect(page.getByRole("toolbar")).toHaveCount(0);
  await expect(page.locator(".tiptap h2")).toContainText("Mali znakovi pažnje");
});
test("Workspace fits viewport and share dialog explains permissions", async ({ page }) => {
  await page.goto("/test-fixtures/editor"); await expect(editor(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/editor-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Podijeli", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Ovlast", exact: true })).toHaveValue("read");
  await page.getByRole("combobox", { name: "Ovlast", exact: true }).selectOption("edit");
  await expect(page.getByRole("combobox", { name: "Ovlast", exact: true })).toHaveValue("edit");
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Image upload remembers cursor; keyboard removal keeps attachment available", async ({ page }) => {
  const imageId = "938e852e-8b05-4549-9355-49dfaa50fa7e";
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#4054db" } }).png().toBuffer();
  await page.route("**/api/biljeske/*/slike", route => route.fulfill({ json: { id: imageId } }));
  await page.route("**/api/slike/*", route => route.fulfill({ body: png, contentType: "image/png" }));
  await blank(page);
  await page.keyboard.type("Prije"); await page.keyboard.press("Enter"); await page.keyboard.type("Poslije");
  await page.keyboard.press("ArrowUp"); await page.keyboard.press("Home");
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Dodaj sliku", exact: true }).click();
  await (await chooserPromise).setFiles({ name: "slika.png", mimeType: "image/png", buffer: png });
  await expect(editor(page).locator("img")).toHaveCount(1);
  const order = await editor(page).locator(":scope > *").evaluateAll(nodes => nodes.map(n => n.tagName));
  expect(order.indexOf("FIGURE")).toBeLessThan(order.length - 1);
  // A React update to the title must preserve the editor selection and document.
  await page.getByLabel("Naslov bilješke", { exact: true }).fill("Novi naslov");
  await expect(editor(page)).toContainText("Poslije");
  await editor(page).locator("figure").click(); await page.keyboard.press("Backspace");
  await expect(editor(page).locator("img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Umetni spremljenu sliku" })).toBeVisible();
  await page.getByRole("button", { name: "Umetni spremljenu sliku" }).click();
  await expect(editor(page).locator("img")).toHaveCount(1);
});
