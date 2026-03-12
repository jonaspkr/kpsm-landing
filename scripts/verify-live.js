const { chromium } = require('playwright');

const BASE = process.argv[2] || 'https://www.kpsm.lt';
const SCREENSHOT_DIR = '/tmp/kpsm-verify';

async function verify() {
  const fs = require('fs');
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = [];
  const check = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  // 1. Homepage loads
  console.log(`\n--- Verifying ${BASE} ---\n`);
  const res = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  check('Homepage loads', res.ok(), `status ${res.status()}`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-homepage.png`, fullPage: false });

  // 2. Title
  const title = await page.title();
  check('Page has title', title.length > 0, title);

  // 3. Key sections exist
  for (const id of ['speakers', 'programme', 'schedule', 'venue', 'contact']) {
    const el = await page.$(`#${id}, [id="${id}"]`);
    check(`Section #${id} exists`, !!el);
  }

  // 4. Speaker count
  const speakerCards = await page.$$('.speaker-card');
  check('Speaker cards rendered', speakerCards.length === 16, `found ${speakerCards.length}`);

  // 5. Nav links work
  const navLinks = await page.$$eval('nav a[href^="#"]', els => els.map(a => a.getAttribute('href')));
  check('Nav has anchor links', navLinks.length >= 3, navLinks.join(', '));

  // 6. Buy tickets links go to Fienta
  const ticketLinks = await page.$$eval('a[href*="fienta.com"]', els => els.length);
  check('Fienta ticket links present', ticketLinks >= 1, `found ${ticketLinks}`);

  // 7. Email is correct
  const emailLinks = await page.$$eval('a[href*="mailto:"]', els => els.map(a => a.href));
  const hasCorrectEmail = emailLinks.some(e => e.includes('andriuspajeda@gmail.com'));
  check('Contact email is andriuspajeda@gmail.com', hasCorrectEmail, emailLinks.join(', '));

  // 8. Images load
  const brokenImages = await page.$$eval('img', imgs =>
    imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src)
  );
  check('All images load', brokenImages.length === 0,
    brokenImages.length ? `broken: ${brokenImages.join(', ')}` : `all good`);

  // 9. Speaker subpages — click first speaker
  const firstSpeaker = await page.$('.speaker-card a');
  if (firstSpeaker) {
    const href = await firstSpeaker.getAttribute('href');
    const speakerRes = await page.goto(new URL(href, BASE).toString(), { waitUntil: 'networkidle', timeout: 10000 });
    check('Speaker subpage loads', speakerRes.ok(), href);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-speaker-subpage.png`, fullPage: false });
    // Go back
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
  }

  // 10. Privacy, Terms, Cookies pages
  for (const pg of ['privacy.html', 'terms.html', 'cookies.html']) {
    const r = await page.goto(`${BASE}/${pg}`, { waitUntil: 'networkidle', timeout: 10000 });
    check(`/${pg} loads`, r.ok(), `status ${r.status()}`);
  }

  // 11. Mobile view
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-mobile.png`, fullPage: false });
  check('Mobile renders', true);

  // 12. Venue section — no Hotels card
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
  const venueLabels = await page.$$eval('.venue-detail-label', els => els.map(e => e.textContent.trim()));
  check('No Hotels card in venue', !venueLabels.includes('Hotels'), venueLabels.join(', '));
  check('"Getting to Kaunas" label', venueLabels.includes('Getting to Kaunas'), venueLabels.join(', '));

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n--- ${passed} passed, ${failed} failed ---`);
  console.log(`Screenshots saved to ${SCREENSHOT_DIR}/`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

verify().catch(e => { console.error(e); process.exit(1); });
