# NEXUS — Personal Dashboard

A responsive, dark-themed personal dashboard for GitHub Pages. It contains only the requested modules:

- Live weather for Ranchi, Kharagpur and Varanasi, including current conditions, detailed metrics, air quality, 12-hour outlook and 7-day forecast.
- News tabs for India, Ranchi, Varanasi, World and Technology.
- A local autosaving notepad with word/character count and TXT export.
- Daily intelligence: on-this-day history, upcoming Hindu festivals, quote of the day and a daily Wikipedia discovery.

## Deploy to GitHub Pages

1. Create or open your GitHub repository.
2. Upload the contents of this folder to the repository root.
3. In **Settings → Pages**, select **Deploy from a branch**, choose `main` and `/ (root)`.
4. Wait for the Pages deployment to finish.

The included GitHub Actions workflow also supports deployment from the `main` branch.

## Data sources

- Weather and air quality: Open-Meteo.
- Headlines: Google News RSS via RSS2JSON.
- Historical events and random topic: Wikipedia REST API.
- Hindu festival dates: a small in-project 2026 list; dates can vary by regional Panchang. Update `festivals2026` in `app.js` for future years.

## Privacy and storage

The notepad is stored in the browser's `localStorage` on the device and browser where the site is opened. It is not synchronized to GitHub or other devices. Do not use it for passwords or highly sensitive information.

## Notes

This is a static website; no API key or backend is required. Public data services may occasionally rate-limit requests or be unavailable.
