# ZENITH · Personal Control Room

A grid-control-room style personal dashboard for GitHub Pages. Static site, no build step, no API keys.

Live: https://inventornext.github.io/zenith/

## Panels

- **Hero clock** with IST time, a decorative 3-phase 50 Hz oscilloscope trace and a time-of-day colour theme (dawn, day, dusk, night).
- **Panchang**: tithi (with end time), nakshatra, lunar month (purnimanta), sunrise, sunset, Rahu Kaal and the next Purnima / Amavasya / Ekadashi. Calculated in the browser by `panchang.js`, so it never expires.
- **Countdowns**: your own deadlines plus the next festival.
- **Focus**: Pomodoro timer (25/5/15 with beep) and daily habit streaks.
- **Research tracker**: papers, journals, status and days in the current status.
- **Projects board**: apps, games, books and sites with a 4-stage progress bar.
- **GitHub**: public stats, 12-week activity heatmap and recently pushed repos.
- **Cricket** live scores, **trains** quick status links, **weather** for Ranchi, Kharagpur and Varanasi, **news** tabs, **notepad**, and the daily panel (on this day, festivals, quote, topic).

## Your data stays private

The repo contains **no personal data**. Research, projects, countdowns, habits, trains and notes are stored in your browser (`localStorage`).

- Footer → **Import** loads a JSON file (for example the `my-data.json` kept outside this repo).
- Footer → **Export** downloads a backup. Do this before clearing browser data or switching devices.

Never commit `my-data.json` or backups: `.gitignore` already excludes them.

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` publishes to Pages
(Settings → Pages → Source: **GitHub Actions**). Branch deploy from `main` / root also works.

## Data sources

- Weather and AQI: Open-Meteo
- News and cricket: Google News RSS and ESPNcricinfo RSS, via rss2json with allorigins as a fallback; last good headlines are cached
- History and topic of the day: Wikipedia REST API
- GitHub: public REST API (60 requests/hour, cached 15 minutes)
- Festivals: built-in 2026–2027 list in `app.js` (`FESTIVALS`); add 2028 dates next year

## Customise

- GitHub username: `GH_USER` in `app.js`
- Cities: `CITIES` in `app.js`
- Quotes: `QUOTES` in `app.js`
