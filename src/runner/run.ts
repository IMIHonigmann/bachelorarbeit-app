import { chromium } from "playwright";
import { build, preview } from "vite";
import { shuffle } from "../helpers/shuffle";

const SEED = 67;
const INSTANCED_N_FACTOR = 10;

const nCountsToTest = [1000, 2500, 5000] as const;
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
      "--disable-frame-rate-limit",
    ],
  });

  type Combo = {
    n: number;
    arm: (typeof armsToTest)[number];
    mode: (typeof modes)[number];
  };
  const combos: Combo[] = [];

  for (let i_n = 0; i_n < nCountsToTest.length; i_n++) {
    for (let i_arms = 0; i_arms < armsToTest.length; i_arms++) {
      for (let i_modes = 0; i_modes < modes.length; i_modes++) {
        const isInstancedCombo = modes[i_modes] === "instanced";
        combos.push({
          n: nCountsToTest[i_n] * (isInstancedCombo ? INSTANCED_N_FACTOR : 1),
          arm: armsToTest[i_arms],
          mode: modes[i_modes],
        });
      }
    }
  }

  const shuffledCombo = shuffle<Combo>(combos, SEED);

  try {
    for (let i = 0; i < shuffledCombo.length; i++) {
      const paramString = `arm=${shuffledCombo[i].arm}&n=${shuffledCombo[i].n}&mode=${shuffledCombo[i].mode}&seed=${SEED}`;
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
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}

console.log(`${succeeded} of ${iterations} runs succeeded, ${failed} failed.`);
