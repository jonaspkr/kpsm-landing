const fs = require('fs');
const path = require('path');

const content = JSON.parse(fs.readFileSync(path.join(__dirname, 'content/site.json'), 'utf8'));
const template = fs.readFileSync(path.join(__dirname, 'src/template.html'), 'utf8');

// Generate speaker cards HTML
const speakersHtml = content.speakers.map((s, i) => {
  const delay = (i % 4) + 1;
  const photoStyle = s.photo
    ? `style="background-image:url('${s.photo}');background-size:cover;background-position:center"`
    : '';
  return `
        <div class="speaker-card reveal delay-${delay}">
          <div class="speaker-photo"><div class="speaker-photo-inner" ${photoStyle}></div></div>
          <div class="speaker-info">
            <div class="speaker-name">${s.name}</div>
            <div class="speaker-title">${s.title}</div>
            <span class="speaker-tag">${s.tag}</span>
          </div>
        </div>`;
}).join('\n');

// Generate track cards HTML
const tracksHtml = content.tracks.map((t, i) => {
  const delay = (i % 3) + 1;
  return `
        <div class="track-card reveal delay-${delay}">
          <div class="track-num">${t.num}</div>
          <h3>${t.name}</h3>
          <p>${t.description}</p>
          <div class="track-count">${t.sessions}</div>
        </div>`;
}).join('\n');

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
  // Tracks
  .replace('{{tracks}}', tracksHtml)
  // Testimonials
  .replace('{{testimonials}}', testimonialsHtml)
  // Venue
  .replace('{{venue.title}}', content.venue.title)
  .replace('{{venue.description}}', content.venue.description)
  .replace(/\{\{venue\.venue_name\}\}/g, content.venue.venue_name)
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

// Copy images
const imgSrc = path.join(__dirname, 'images');
const imgDest = path.join(distDir, 'images');
fs.mkdirSync(imgDest, { recursive: true });
fs.readdirSync(imgSrc).forEach(f => {
  if (!f.startsWith('.')) fs.copyFileSync(path.join(imgSrc, f), path.join(imgDest, f));
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

// Generate sitemap.xml
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kpsm-landing.fly.dev/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);

// Generate robots.txt
const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /oauth/

Sitemap: https://kpsm-landing.fly.dev/sitemap.xml`;
fs.writeFileSync(path.join(distDir, 'robots.txt'), robots);

console.log('Build complete → dist/');
