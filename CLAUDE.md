# KPSM Landing Page

Landing page for the Kaunas Plastic Surgery Meeting (KPSM) — 19–20 June 2026, Kaunas, Lithuania.

## Quick Start
```bash
node build.js        # Build: template + content → dist/
node server.js       # Serve locally on :8080
```

## Project Structure
- `src/template.html` — Main page template (all CSS/JS inline, uses `{{placeholder}}` syntax)
- `content/site.json` — All site content as JSON
- `build.js` — Build script: reads template + JSON, outputs `dist/index.html`
- `server.js` — Production server (static files + OAuth proxy + contact form API)
- `images/` — All images (copied to `dist/images/` on build)
- `admin/` — Decap CMS configuration

## Deployment
- Fly.io app `kpsm-landing` (Stockholm region)
- Push to `main` triggers GitHub Actions → build → `flyctl deploy`

## Workflow
- Use `/frontend-design` skill for design changes
- Use Playwright to screenshot and visually verify changes after building
- Always run `node build.js` after editing `src/template.html` or `content/site.json`
- All styling is inline CSS in the template — no external stylesheets
