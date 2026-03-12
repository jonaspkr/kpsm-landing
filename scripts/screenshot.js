const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:8080';
const OUT = process.argv[3] || '/tmp';
const WIDTH = parseInt(process.argv[4] || '1440', 10);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: WIDTH, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Scroll through the entire page to trigger reveal animations
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const step = 400;
  for (let y = 0; y < totalHeight; y += step) {
    await page.evaluate(pos => window.scrollTo(0, pos), y);
    await page.waitForTimeout(150);
  }
  // Scroll back to top and let animations settle
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);

  // Full-page screenshot
  const fullPath = `${OUT}/kpsm-${WIDTH}w-full.png`;
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`  ${fullPath} (full page)`);

  // Viewport-sized chunks for detailed inspection
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewH = 900;

  if (pageHeight > viewH) {
    const offsets = [];
    for (let y = 0; y < pageHeight; y += viewH) offsets.push(y);
    console.log(`Page height: ${pageHeight}px — capturing ${offsets.length} chunks at ${WIDTH}px wide`);

    for (let i = 0; i < offsets.length; i++) {
      const y = offsets[i];
      const h = Math.min(viewH, pageHeight - y);
      if (h < 1) continue;
      const filename = `${OUT}/kpsm-${WIDTH}w-${String(i + 1).padStart(2, '0')}.png`;
      await page.screenshot({
        path: filename,
        fullPage: true,
        clip: { x: 0, y: Math.floor(y), width: WIDTH, height: Math.floor(h) }
      });
      console.log(`  ${filename}`);
    }
  }

  await browser.close();
  console.log('Done');
})();
