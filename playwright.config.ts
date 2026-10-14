import { defineConfig,devices } from "@playwright/test";
export default defineConfig({
  testDir:"./tests/e2e",fullyParallel:true,timeout:30000,
  reporter:[["list"],["html",{open:"never"}]],
  use:{baseURL:"http://127.0.0.1:3001",trace:"retain-on-failure",
    launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}},
  projects:[{name:"desktop",use:{...devices["Desktop Chrome"]}},
    {name:"mobile",use:{...devices["Pixel 7"]}}],
  webServer:{command:"npm run dev -- --hostname 127.0.0.1 --port 3001",url:"http://127.0.0.1:3001",reuseExistingServer:false,timeout:120000,
    env:{NEXT_BUILD_DIR:".next-test",ENABLE_TEST_FIXTURES:"1"}},
});
