const fs = require('fs');
const path = require('path');

const content = JSON.parse(fs.readFileSync(path.join(__dirname, 'content/site.json'), 'utf8'));
const template = fs.readFileSync(path.join(__dirname, 'src/template.html'), 'utf8');
const speakerTemplate = fs.readFileSync(path.join(__dirname, 'src/speaker-template.html'), 'utf8');

// Generate slug from name: strip diacritics, lowercase, replace non-alphanum with hyphens
function toSlug(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/,.*$/, '')                                // strip suffixes like ", MD, PhD"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Resolve slug for each speaker (use explicit slug or generate from name)
content.speakers.forEach(s => {
  if (!s.slug) s.slug = toSlug(s.name);
});

// Collect all presentations per speaker from schedule
function getSpeakerPresentations(speakerName) {
  const presentations = [];
  for (const [dayKey, day] of Object.entries(content.schedule)) {
    for (const block of day.blocks) {
      if (!block.presentations) continue;
      for (const p of block.presentations) {
        if (p.speaker === speakerName) {
          presentations.push({
            time: p.time,
            topic: p.topic,
            session: block.title,
            day: day.label
          });
        }
      }
    }
  }
  return presentations;
}

// Generate speaker cards HTML (wrapped in links)
const speakersHtml = content.speakers.map((s, i) => {
  const delay = (i % 4) + 1;
  const photoInner = s.photo
    ? `<img src="${s.photo}" alt="${s.name}" loading="lazy" width="400" height="300">`
    : `<div class="speaker-photo-inner"></div>`;
  const presentations = getSpeakerPresentations(s.name);
  const topics = presentations
    .filter(p => p.topic)
    .map(p => `<li>${p.topic}</li>`)
    .join('');
  const topicsHtml = topics ? `<ul class="speaker-topics">${topics}</ul>` : '';
  return `
        <a href="/speakers/${s.slug}/" class="speaker-card-link reveal delay-${delay}">
        <div class="speaker-card">
          <div class="speaker-photo">${photoInner}</div>
          <div class="speaker-info">
            <div class="speaker-name">${s.name}</div>
            <div class="speaker-title">${s.title}</div>
            ${topicsHtml}
          </div>
        </div>
        </a>`;
}).join('\n');



// Generate session cards HTML
const sessionsHtml = content.sessions.map((t, i) => {
  const delay = (i % 3) + 1;
  const slug = toSlug(t.name);
  return `
        <a href="#session-${slug}" class="session-card-link reveal delay-${delay}">
        <div class="session-card">
          <div class="session-num">${t.num}</div>
          <h3>${t.name}</h3>
          <p>${t.description}</p>
          <div class="session-meta">
            <span class="session-count">${t.count}</span>
            <span class="session-day">${t.day}</span>
          </div>
        </div>
        </a>`;
}).join('\n');

// Pad grid to fill row (3 columns) with empty black cells
const remainder = content.sessions.length % 3;
const fillerHtml = remainder ? Array(3 - remainder).fill('\n        <div class="session-card-filler"></div>').join('') : '';

// Generate schedule HTML
function buildSchedule(day) {
  return day.blocks.map(b => {
    const cls = b.type === 'break' ? 'schedule-break' : b.type === 'social' ? 'schedule-social' : 'schedule-session';
    const detail = b.detail ? `<span class="schedule-detail">${b.detail}</span>` : '';
    let presentationsHtml = '';
    if (b.presentations && b.presentations.length > 0) {
      presentationsHtml = `<div class="schedule-presentations">` +
        b.presentations.map(p => {
          const speaker = p.speaker ? `<span class="pres-speaker">${p.speaker}</span>` : '';
          const topic = p.topic ? `<span class="pres-topic">${p.topic}</span>` : '';
          const separator = p.speaker && p.topic ? ' — ' : '';
          return `
                <div class="pres-row">
                  <span class="pres-time">${p.time}</span>
                  <span class="pres-detail">${topic}${separator}${speaker}</span>
                </div>`;
        }).join('\n') + `</div>`;
    }
    const idSlug = b.title.replace(/\s+Session$/i, '');
    const id = b.type === 'session' ? ` id="session-${toSlug(idSlug)}"` : '';
    return `
            <div class="schedule-row ${cls}"${id}>
              <div class="schedule-time">${b.time}</div>
              <div class="schedule-info">
                <div class="schedule-title">${b.title}</div>
                ${detail}
                ${presentationsHtml}
              </div>
            </div>`;
  }).join('\n');
}
const scheduleHtml = `
        <div class="schedule-day">
          <h3 class="schedule-day-label">${content.schedule.friday.label}</h3>
${buildSchedule(content.schedule.friday)}
        </div>
        <div class="schedule-day">
          <h3 class="schedule-day-label">${content.schedule.saturday.label}</h3>
${buildSchedule(content.schedule.saturday)}
        </div>`;

// Generate testimonial cards HTML
const testimonialsHtml = content.testimonials.map((t, i) => {
  const delay = (i % 3) + 1;
  return `
        <div class="testimonial reveal delay-${delay}">
          <div class="testimonial-quote">&ldquo;</div>
          <p>${t.quote}</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar">${t.initial}</div>
            <div>
              <div class="testimonial-name">${t.name}</div>
              <div class="testimonial-role">${t.role}</div>
            </div>
          </div>
        </div>`;
}).join('\n');

// Replace all placeholders
let html = template
  // Hero
  .replace('{{hero.badge}}', content.hero.badge)
  .replace('{{hero.title_line1}}', content.hero.title_line1)
  .replace('{{hero.title_line2}}', content.hero.title_line2)
  .replace('{{hero.title_accent}}', content.hero.title_accent)
  .replace(/\{\{hero\.subtitle\}\}/g, content.hero.subtitle)
  .replace('{{hero.location}}', content.hero.location)
  .replace('{{hero.duration}}', content.hero.duration)
  .replace('{{hero.credits}}', content.hero.credits)
  .replace('{{hero.stat_speakers}}', content.hero.stat_speakers)
  .replace('{{hero.stat_countries}}', content.hero.stat_countries)
  .replace('{{hero.stat_attendees}}', content.hero.stat_attendees)
  // Speakers
  .replace('{{speakers}}', speakersHtml)
  // Sessions
  .replace('{{sessions}}', sessionsHtml + fillerHtml)
  .replace('{{schedule}}', scheduleHtml)
  // Testimonials
  .replace('{{testimonials}}', testimonialsHtml)
  // Venue
  .replace('{{venue.title}}', content.venue.title)
  .replace('{{venue.description}}', content.venue.description)
  .replace(/\{\{venue\.venue_name\}\}/g, content.venue.venue_name)
  .replace('{{venue.venue_address}}', content.venue.venue_address)
  .replace('{{venue.airport}}', content.venue.airport)
  .replace('{{venue.transport}}', content.venue.transport)
  .replace('{{venue.hotels}}', content.venue.hotels)
  // CTA
  .replace('{{cta.heading}}', content.cta.heading)
  .replace('{{cta.description}}', content.cta.description)
  .replace('{{cta.price}}', content.cta.price)
  .replace('{{cta.price_note}}', content.cta.price_note)
  .replace('{{cta.button_text}}', content.cta.button_text)
  .replace('{{cta.button_link}}', content.cta.button_link)
  // Footer
  .replace('{{footer.brand_text}}', content.footer.brand_text)
  .replace(/\{\{footer\.email\}\}/g, content.footer.email)
  .replace(/\{\{footer\.year\}\}/g, content.footer.year);

// Write output
const distDir = path.join(__dirname, 'dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'index.html'), html);

// Generate speaker subpages
const speakersDir = path.join(distDir, 'speakers');
fs.mkdirSync(speakersDir, { recursive: true });

content.speakers.forEach(speaker => {
  const slug = speaker.slug;
  const presentations = getSpeakerPresentations(speaker.name);

  // Photo HTML
  const photoHtml = speaker.photo
    ? `<img src="/${speaker.photo}" alt="${speaker.name}">`
    : `<div class="speaker-photo-placeholder"></div>`;

  // Bio HTML
  const bioHtml = speaker.bio
    ? `<div class="speaker-bio">${speaker.bio.split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>`
    : '';

  // Presentations HTML
  let presentationsHtml = '';
  if (presentations.length > 0) {
    const cards = presentations.map(p => {
      const topicHtml = p.topic
        ? `<div class="presentation-topic">${p.topic}</div>`
        : `<div class="presentation-topic" style="color:var(--gray-400);font-style:italic">Topic to be announced</div>`;
      return `
            <div class="presentation-card">
              <div class="presentation-session">${p.session}</div>
              ${topicHtml}
              <div class="presentation-time"><span class="presentation-day">${p.day}</span> &middot; ${p.time}</div>
            </div>`;
    }).join('\n');

    presentationsHtml = `
          <div class="presentations-section">
            <p class="presentations-label">Presentations at KPSM 2026</p>
${cards}
          </div>`;
  }

  // Other speakers HTML
  const otherSpeakersHtml = content.speakers
    .filter(s => s.slug !== slug)
    .map(s => `
        <a href="/speakers/${s.slug}/" class="other-speaker-link">
          <div class="other-speaker-name">${s.name}</div>
        </a>`)
    .join('\n');

  // Build the page
  let page = speakerTemplate
    .replace(/\{\{speaker\.name\}\}/g, speaker.name)
    .replace(/\{\{speaker\.slug\}\}/g, slug)
    .replace(/\{\{speaker\.title\}\}/g, speaker.title)
    .replace('{{speaker.tag}}', speaker.tag)
    .replace('{{speaker.photo_html}}', photoHtml)
    .replace('{{speaker.bio_html}}', bioHtml)
    .replace('{{speaker.presentations_html}}', presentationsHtml)
    .replace('{{other_speakers}}', otherSpeakersHtml)
    .replace('{{footer.brand_text}}', content.footer.brand_text)
    .replace(/\{\{footer\.email\}\}/g, content.footer.email)
    .replace(/\{\{footer\.year\}\}/g, content.footer.year);

  const speakerDir = path.join(speakersDir, slug);
  fs.mkdirSync(speakerDir, { recursive: true });
  fs.writeFileSync(path.join(speakerDir, 'index.html'), page);
});

console.log(`Generated ${content.speakers.length} speaker pages → dist/speakers/`);

// Copy images
const imgSrc = path.join(__dirname, 'images');
const imgDest = path.join(distDir, 'images');
fs.mkdirSync(imgDest, { recursive: true });
fs.readdirSync(imgSrc).forEach(f => {
  const src = path.join(imgSrc, f);
  if (!f.startsWith('.') && fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(imgDest, f));
});

// Copy admin
const adminSrc = path.join(__dirname, 'admin');
if (fs.existsSync(adminSrc)) {
  const adminDest = path.join(distDir, 'admin');
  fs.mkdirSync(adminDest, { recursive: true });
  fs.readdirSync(adminSrc).forEach(f => {
    fs.copyFileSync(path.join(adminSrc, f), path.join(adminDest, f));
  });
}

// Copy API files (PHP)
const apiSrc = path.join(__dirname, 'src', 'api');
if (fs.existsSync(apiSrc)) {
  const apiDest = path.join(distDir, 'api');
  fs.mkdirSync(apiDest, { recursive: true });
  fs.readdirSync(apiSrc).forEach(f => {
    fs.copyFileSync(path.join(apiSrc, f), path.join(apiDest, f));
  });
}

// Copy extra pages (privacy, cookies)
['privacy.html', 'cookies.html', 'terms.html'].forEach(f => {
  const src = path.join(__dirname, 'src', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(distDir, f));
});

// Generate sitemap.xml
const today = new Date().toISOString().split('T')[0];
const speakerUrls = content.speakers.map(s => `
  <url>
    <loc>https://www.kpsm.lt/speakers/${s.slug}/</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>`).join('');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.kpsm.lt/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
  </url>${speakerUrls}
</urlset>`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);

// Generate robots.txt
const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /oauth/

Sitemap: https://www.kpsm.lt/sitemap.xml`;
fs.writeFileSync(path.join(distDir, 'robots.txt'), robots);

console.log('Build complete → dist/');
