import { chromium } from "playwright";
import { build, preview } from "vite";
import { shuffle } from "../helpers/shuffle";

const SEED = 67;

const nCounts = [1000, 2500, 5000] as const;
const nInstCounts = [1000, 2500, 5000, 10_000, 100_000, 1_000_000] as const;
const armsToTest = ["A", "B", "C"] as const;
const modes = ["instanced", "noninstanced"] as const;
const reps = [2, 3, 4];

const iterations = nCounts.length * armsToTest.length * modes.length;
const currentGermanTime = new Date().toLocaleTimeString("sv-SE", {
  timeZone: "Europe/Berlin",
});
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
    reps: number;
    warmup: boolean;
  };
  const combos: Combo[] = [];

  for (let i_modes = 0; i_modes < modes.length; i_modes++) {
    for (let i_n = 0; i_n < nCounts.length; i_n++) {
      for (let i_arms = 0; i_arms < armsToTest.length; i_arms++) {
        for (let i_reps = 0; i_reps < reps.length; i_reps++) {
          const curN = modes[i_modes] === "instanced" ? nInstCounts : nCounts;
          combos.push({
            n: curN[i_n],
            arm: armsToTest[i_arms],
            mode: modes[i_modes],
            reps: reps[i_reps],
            warmup: false,
          });
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

  try {
    for (let i = 0; i < shuffledCombos.length; i++) {
      const paramString = `${shuffledCombos[i].warmup ? "WARMUP-" : ""}arm=${shuffledCombos[i].arm}&n=${shuffledCombos[i].n}&mode=${shuffledCombos[i].mode}&seed=${SEED}`;
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
          `results/raw/${currentGermanDate}/${currentGermanTime}/SUCCESSFUL/${fileName}`,
          JSON.stringify(result, null, 2),
        );
        succeeded++;
      } catch (e) {
        failed++;
        console.error(`Run failed: ${paramString}\n`, e);
        await Bun.write(
          `results/raw/${currentGermanDate}/${currentGermanTime}/ERRORED/${fileName}`,
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
