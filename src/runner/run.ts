import { chromium } from "playwright";
import { build, preview } from "vite";
import { shuffle } from "../helpers/shuffle";

const SEED = 67;

const nCounts = [1000, 2500, 5000] as const;
const nInstCounts = [1000, 2500, 5000, 10_000, 100_000, 1_000_000] as const;
const armsToTest = ["A", "B", "C"] as const;
const modes = ["instanced", "noninstanced"] as const;
const reps = [2, 3, 4];

const currentGermanTime = new Date().toLocaleTimeString("sv-SE", {
  timeZone: "Europe/Berlin",
});
const currentGermanDate = new Date().toLocaleDateString("sv-SE", {
  timeZone: "Europe/Berlin",
});

let succeeded = 0;
let failed = 0;
let total = 0;

await build();
const server = await preview({ preview: { port: 4173, strictPort: true } });

try {
  const baseUrl = server.resolvedUrls?.local[0];
  if (!baseUrl) {
    throw new Error("Vite preview server did not report a local URL");
  }

  async function launchBrowser() {
    return await chromium.launch({
      executablePath: "/usr/bin/chromium",
      headless: false,
      args: [
        "--enable-webgpu-developer-features",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-background-timer-throttling",
        "--disable-gpu-vsync",
        "--disable-frame-rate-limit",
      ],
    });
  }

  let browser = await launchBrowser();

  type Combo = {
    n: number;
    arm: (typeof armsToTest)[number];
    mode: (typeof modes)[number];
    reps: number;
    warmup: boolean;
  };
  const combos: Combo[] = [];

  for (const mode of modes) {
    const nValues = mode === "instanced" ? nInstCounts : nCounts;
    for (const n of nValues) {
      for (const arm of armsToTest) {
        for (const rep of reps) {
          combos.push({ n, arm, mode, reps: rep, warmup: false });
        }
      }
    }
  }

  const shuffledCombos = shuffle(combos, SEED);
  shuffledCombos.unshift({
    n: 100,
    arm: "C",
    mode: "instanced",
    reps: 1,
    warmup: true,
  });
  total = shuffledCombos.length;

  try {
    for (let i = 0; i < shuffledCombos.length; i++) {
      const combo = shuffledCombos[i];
      const paramString = `arm=${combo.arm}&n=${combo.n}&mode=${combo.mode}&seed=${SEED}`;
      const fileName = `${combo.warmup ? "WARMUP-" : ""}${paramString.replaceAll("=", "-").replaceAll("&", "_")}_rep-${combo.reps}.json`;

      browser = browser.isConnected() ? browser : await launchBrowser();

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
          `results/raw/${currentGermanDate}/${currentGermanTime}/SUCCESSFUL/${fileName}`,
          JSON.stringify(result, null, 2),
        );
        succeeded++;
      } catch (e) {
        failed++;
        console.error(`Run failed: ${paramString}\n`, e);
        const consoleMessages = await page.consoleMessages();
        await Bun.write(
          `results/raw/${currentGermanDate}/${currentGermanTime}/ERRORED/${fileName}`,
          JSON.stringify(
            {
              paramString,
              error: String(e),
              timestamp: Date.now(),
              pos: `${i} von ${shuffledCombos.length}`,
              warnings: consoleMessages.slice(-20).map((msg) => msg.text()),
            },
            null,
            2,
          ),
        );
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}

console.log(`${succeeded} of ${total} runs succeeded, ${failed} failed.`);
