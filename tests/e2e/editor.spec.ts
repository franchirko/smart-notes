import { test,expect } from "@playwright/test";
test("Rich text edits keep text safe and update the unsaved state",async({page})=>{
  await page.goto("/test-fixtures/editor");
  await expect(page.getByRole("button",{name:"Spremi",exact:true})).toBeDisabled();
  const paragraph=page.getByRole("textbox",{name:"Tekst",exact:true});
  await paragraph.fill('<img src=x onerror="window.__xss=true">');
  await expect(page.getByText("Nespremljene izmjene",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Spremi",exact:true})).toBeEnabled();
  await expect(paragraph.locator("img")).toHaveCount(0);
  await page.getByRole("button",{name:"Dodaj odlomak"}).click();
  await expect(page.getByRole("textbox",{name:"Tekst",exact:true})).toHaveCount(2);
  await expect(page.getByRole("textbox",{name:"Naslov",exact:true})).toContainText("Mali znakovi pažnje");
});
test("Read-only view offers no editing or sharing controls",async({page})=>{
  await page.goto("/test-fixtures/editor?readonly=1");
  await expect(page.getByLabel("Naslov bilješke",{exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Spremi",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Podijeli",exact:true})).toHaveCount(0);
  await expect(page.locator('[contenteditable="true"]')).toHaveCount(0);
  await expect(page.getByText("Ova bilješka podijeljena je s tobom za čitanje.")).toBeVisible();
});
test("Workspace is responsive and share dialog explains permissions",async({page})=>{
  await page.goto("/test-fixtures/editor");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await expect(page.getByRole("textbox",{name:"Naslov",exact:true})).toContainText("Mali znakovi pažnje");
  await page.screenshot({path:`test-results/editor-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole("button",{name:"Podijeli",exact:true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("combobox",{name:"Ovlast",exact:true})).toHaveValue("read");
  await page.getByRole("combobox",{name:"Ovlast",exact:true}).selectOption("edit");
  await expect(page.getByRole("combobox",{name:"Ovlast",exact:true})).toHaveValue("edit");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
