import { chromium } from "playwright";
import { build, preview } from "vite";

await build();
const server = await preview({ preview: { port: 4173, strictPort: true } });
const baseUrl = server.resolvedUrls?.local[0];

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: false,
  args: ["--enable-webgpu-developer-features"],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("console", (msg) => console.log("[page]", msg.text()));

await page.goto(`${baseUrl}/?arm=C&n=1000&mode=noninstanced&seed=67`);
await page.waitForFunction(() => window.__benchResult !== undefined, null, {
  timeout: 60_000,
});

const result = await page.evaluate(() => window.__benchResult);
console.log(result.environment, result.summary);

await browser.close();
