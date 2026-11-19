import { chromium } from "playwright";
import { build, preview } from "vite";

const nCountsToTest = [1000, 10_000] as const;
const armsToTest = ["A", "B", "C"] as const;
const modes = ["instanced", "noninstanced"] as const;

const iterations = nCountsToTest.length * armsToTest.length * modes.length;
const currentGermanDate = new Date().toLocaleDateString("sv-SE", {
  timeZone: "Europe/Berlin",
});

let succeeded = 0;
let failed = 0;

await build();
const server = await preview({ preview: { port: 4173, strictPort: true } });

try {
  const baseUrl = server.resolvedUrls?.local[0];
  if (!baseUrl) {
    throw new Error("Vite preview server did not report a local URL");
  }

  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: false,
    args: [
      "--enable-webgpu-developer-features",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-background-timer-throttling",
      "--disable-gpu-vsync",
      "--disable-framerate-limit",
    ],
  });

  try {
    for (let i_n = 0; i_n < nCountsToTest.length; i_n++) {
      for (let i_arms = 0; i_arms < armsToTest.length; i_arms++) {
        for (let i_modes = 0; i_modes < modes.length; i_modes++) {
          const paramString = `arm=${armsToTest[i_arms]}&n=${nCountsToTest[i_n]}&mode=${modes[i_modes]}&seed=67`;
          const fileName = `${paramString.replaceAll("=", "-").replaceAll("&", "_")}.json`;

          const page = await browser.newPage({
            viewport: { width: 1280, height: 720 },
          });
          page.on("console", (msg) => console.log("[page]", msg.text()));

          try {
            await page.goto(`${baseUrl}?${paramString}`);
            await page.waitForFunction(
              () => window.__benchResult !== undefined,
              null,
              {
                timeout: 60_000,
              },
            );

            const result = await page.evaluate(() => window.__benchResult);
            await Bun.write(
              `results/raw/${currentGermanDate}/SUCCESSFUL/${fileName}`,
              JSON.stringify(result, null, 2),
            );
            succeeded++;
          } catch (e) {
            failed++;
            console.error(`Run failed: ${paramString}\n`, e);
            await Bun.write(
              `results/raw/${currentGermanDate}/ERRORED/${fileName}`,
              JSON.stringify({ paramString, error: String(e) }, null, 2),
            );
          } finally {
            await page.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}

console.log(`${succeeded} of ${iterations} runs succeeded, ${failed} failed.`);
