# Personal Command Centre

A responsive, dark-mode personal dashboard designed for GitHub Pages. It combines live weather for **Ranchi** and **Kharagpur**, headlines, exchange rates, world clocks, research tracking, tasks, notes, countdowns, GitHub profile stats, and shortcuts.

## Included features

- **Full weather:** current conditions, feels-like temperature, humidity, pressure, visibility, cloud cover, wind direction/gusts, UV index, air quality, hourly outlook and seven-day forecast for Ranchi and Kharagpur.
- **Air quality:** current US AQI where the Open-Meteo air-quality endpoint returns data.
- **News:** India, Ranchi, World and Technology tabs using Google News RSS through the RSS2JSON public bridge.
- **Currency:** reference exchange rates for USD/INR, EUR/INR and GBP/INR using Frankfurter.
- **World clocks:** India, London, New York and Tokyo.
- **Research pipeline:** add manuscripts/projects and update their status.
- **Productivity:** task list, autosaving notes, event countdown and custom shortcuts.
- **GitHub profile:** public profile statistics from the GitHub REST API.
- **Responsive layout:** desktop, tablet and mobile.

## Deploy to GitHub Pages

1. Download and unzip this project.
2. Create a new **public** GitHub repository, for example `personal-command-centre`.
3. Upload the contents of this folder to the repository root. Make sure `index.html`, `styles.css`, `app.js`, and the `.github` folder are at the root.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, set **Source** to **GitHub Actions**.
6. The included workflow at `.github/workflows/deploy.yml` deploys the site when you push to `main`.
7. Open the **Actions** tab and wait for “Deploy personal command centre” to complete. Your site will be available at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

If your default branch is not `main`, edit the branch name in `.github/workflows/deploy.yml`.

## Run locally

You can open `index.html` directly in a modern browser. For a local HTTP server, run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## API sources and notes

| Feature | Endpoint / provider | Key required? |
|---|---|---|
| Weather | [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | No for standard non-commercial use |
| Air quality | [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | No for standard non-commercial use |
| News | Google News RSS via [RSS2JSON](https://rss2json.com/) | Public bridge; may be rate-limited |
| Currency | [Frankfurter](https://www.frankfurter.dev/) | No |
| GitHub profile | [GitHub REST API](https://docs.github.com/en/rest/users/users#get-a-user) | No for public profile read |

Weather data is provided by Open-Meteo under CC BY 4.0; retain attribution. Exchange rates are reference rates, not executable trading quotes. News availability depends on the RSS bridge and upstream feeds. If the bridge is rate-limited or unavailable, the dashboard displays a fallback link to Google News.

## Data storage and privacy

Tasks, notes, research entries, countdown and custom links are stored in the browser's `localStorage`. They are **not synced** across browsers or devices. Clearing browser site data will remove them. The website is static and does not send your notes or task data to a server.

**Important:** GitHub Pages websites are publicly accessible. Do not put passwords, API keys, private research details, confidential manuscript information, personal identifiers, or sensitive notes in this dashboard or repository. This version does not require secrets. Never place a private API key in `app.js`.

## Customization

- Change city coordinates and names in `cities` in `app.js`.
- Add or remove quick links in `index.html`.
- Change news region/language in the Settings dialog.
- Edit colors and layout in `styles.css`.
- To add an API that requires a secret key, use a server-side proxy or scheduled GitHub Actions workflow with GitHub Secrets; do not expose the key in browser code.

## License

You may modify this project for personal use. Check each API provider's terms and attribution requirements before redistributing or using the data commercially.


## Version 2: nine additional modules

1. Mission control with objectives, XP, levels and a daily bonus.
2. Babu virtual snake companion with feed/play/pat interactions.
3. Arcade: Snake, reaction test and number guessing.
4. Earth Observatory: Leaflet map, USGS earthquakes (M2.5+ past day) and approximate ISS location.
5. Daily intelligence: Wikipedia On This Day, random discovery and a riddle.
6. Ranchi vs Kharagpur live weather comparison.
7. Rabbit-hole generator using random Wikipedia articles.
8. Personal milestone timeline.
9. All features are integrated into a module navigation bar and the existing dashboard.

These additions are browser-side and store game/pet/timeline state locally. Public data services may occasionally rate-limit or be unavailable.


Weather forecasts use Open-Meteo with a 24-hour hourly outlook and seven daily forecast rows. Forecast values are model estimates. Hindu festival dates are a curated upcoming India list; regional Panchang traditions and tithi boundaries can differ. Verify local dates and ritual timings. Refresh the festival list for each new year.


## Festival reference

The initial upcoming dates shown are based on India-facing 2026 festival calendars. For example, the November sequence includes Chhath Puja (15–16 November), Devutthana Ekadashi (20 November), Tulsi Vivah (21 November) and Kartik Purnima / Dev Deepawali (24 November). Dates may differ by regional Panchang and sunrise/tithi rules; consult a local Panchang before planning observances.
