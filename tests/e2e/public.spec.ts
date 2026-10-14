import { test,expect } from "@playwright/test";
test("Landing page presents all five features and leads to demo login",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading",{level:1})).toContainText("Sve tvoje misli");
  await expect(page.getByRole("heading",{name:"Slika govori više"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Podijeli pod svojim uvjetima"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Traži kako razmišljaš"})).toBeVisible();
  await page.screenshot({path:`test-results/landing-${test.info().project.name}.png`,fullPage:true});
  await Promise.all([page.waitForURL(/prijava/,{timeout:20000}),page.getByRole("link",{name:"Prijavi se demo računom"}).click()]);
  await expect(page).toHaveURL(/prijava/);
  await expect(page.getByLabel("E-mail",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Lozinka",{exact:true})).toHaveAttribute("minlength","8");
  await expect(page.getByText("Za demonstraciju koristi pripremljeni demo račun.",{exact:false})).toBeVisible();
  await expect(page.getByRole("link",{name:/Registriraj|Stvori račun/})).toHaveCount(0);
  await expect(page.getByLabel("Ime",{exact:true})).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("Public pages stay within the viewport",async({page})=>{
  for(const route of ["/","/prijava"]){
    await page.goto(route);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  }
});
test("Unauthenticated AI and image writes are rejected",async({request})=>{
  const search=await request.post("/api/pretraga",{headers:{origin:"http://127.0.0.1:3001"},data:{query:"poklon za mamu"}});
  expect([401,503]).toContain(search.status());
  const upload=await request.post("/api/biljeske/938e852e-8b05-4549-9355-49dfaa50fa7e/slike",{headers:{origin:"http://127.0.0.1:3001"}});
  expect([401,503]).toContain(upload.status());
});
test("Cross-origin requests are rejected before processing",async({request})=>{
  const response=await request.post("/api/pretraga",{headers:{origin:"https://example.invalid"},data:{query:"poklon"}});
  expect(response.status()).toBe(403);
});

test("Registration and email confirmation routes are unavailable",async({request})=>{
  for(const route of ["/registracija","/auth/potvrda"]){
    const response=await request.get(route);
    expect(response.status()).toBe(404);
  }
});
