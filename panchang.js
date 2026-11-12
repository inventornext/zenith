/* ZENITH Panchang engine.
   Computes tithi, paksha, nakshatra, sunrise, sunset and Rahu Kaal in the browser,
   using low-precision Meeus formulas (Sun ~0.01 deg, Moon ~0.1 deg).
   Tithi end times are typically within a few minutes of Drik Panchang.
   Works offline, needs no API. */
(function (root) {
  const RAD = Math.PI / 180;
  const norm = a => ((a % 360) + 360) % 360;
  const sin = d => Math.sin(d * RAD), cos = d => Math.cos(d * RAD);
  const jd = date => date.getTime() / 86400000 + 2440587.5;
  const T = date => (jd(date) - 2451545.0 + 69 / 86400) / 36525; // ~TT

  function sunLongitude(date) {
    const t = T(date);
    const L0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    const M = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
    const C = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sin(M) + (0.019993 - 0.000101 * t) * sin(2 * M) + 0.000289 * sin(3 * M);
    return norm(L0 + C - 0.00569);
  }

  // Meeus table 47.A (main terms): [D, M, M', F, coefficient * 1e-6 deg]
  const MOON = [
    [0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],
    [0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],
    [0,1,-1,0,-40923],[1,0,0,0,-34720],[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],
    [0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],
    [2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],[2,0,2,0,3994],
    [4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],
    [1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],
    [2,0,1,-2,-1773],[2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892]
  ];
  function moonLongitude(date) {
    const t = T(date);
    const Lp = 218.3164477 + 481267.88123421 * t - 0.0015786 * t * t;
    const D = 297.8501921 + 445267.1114034 * t - 0.0018819 * t * t;
    const M = 357.5291092 + 35999.0502909 * t - 0.0001536 * t * t;
    const Mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t * t;
    const F = 93.2720950 + 483202.0175233 * t - 0.0036539 * t * t;
    const E = 1 - 0.002516 * t - 0.0000074 * t * t;
    const A1 = 119.75 + 131.849 * t, A2 = 53.09 + 479264.290 * t;
    let s = 0;
    for (const [d, m, mp, f, c] of MOON) {
      const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
      s += c * e * sin(d * D + m * M + mp * Mp + f * F);
    }
    s += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    return norm(Lp + s / 1e6);
  }

  const elongation = date => norm(moonLongitude(date) - sunLongitude(date));
  // Lahiri ayanamsa, linear approximation (23.853 deg at J2000, 50.29"/yr)
  const ayanamsa = date => 23.853 + ((jd(date) - 2451545.0) / 365.25) * (50.29 / 3600);

  const TITHI = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi"];
  const NAKSHATRA = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];

  function tithiInfo(date) {
    const idx = Math.floor(elongation(date) / 12); // 0..29
    const paksha = idx < 15 ? "Shukla" : "Krishna";
    const name = idx === 14 ? "Purnima" : idx === 29 ? "Amavasya" : TITHI[idx % 15];
    return { index: idx, paksha, name };
  }

  // Time when elongation next reaches target (deg), searching forward from date.
  function nextElongation(date, target) {
    let t = date.getTime();
    for (let i = 0; i < 12; i++) {
      let diff = norm(target - elongation(new Date(t)));
      if (diff > 350) diff -= 360;
      t += (diff / 12.19) * 86400000;
      if (Math.abs(diff) < 1e-4) break;
    }
    return new Date(t);
  }
  function tithiEnd(date) { return nextElongation(date, (Math.floor(elongation(date) / 12) + 1) * 12); }

  function nakshatraInfo(date) {
    const sid = norm(moonLongitude(date) - ayanamsa(date));
    const idx = Math.floor(sid / (360 / 27));
    return { index: idx, name: NAKSHATRA[idx] };
  }

  // Sunrise and sunset (UTC Date objects) for the IST calendar day containing `date`.
  function sunTimes(date, lat, lon) {
    const ist = new Date(date.getTime() + 5.5 * 3600000);
    const noonGuess = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 12 - lon / 15));
    let noon = noonGuess, ha = 0;
    for (let i = 0; i < 2; i++) {
      const t = T(noon);
      const L0 = norm(280.46646 + 36000.76983 * t);
      const lam = sunLongitude(noon);
      const eps = 23.439291 - 0.0130042 * t;
      const ra = norm(Math.atan2(cos(eps) * sin(lam), cos(lam)) / RAD);
      const dec = Math.asin(sin(eps) * sin(lam)) / RAD;
      let eot = L0 - 0.0057183 - ra; eot = ((eot + 180) % 360 + 360) % 360 - 180; // degrees
      const solarNoonUTC = 12 - lon / 15 - eot / 15;
      noon = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) + solarNoonUTC * 3600000);
      ha = Math.acos((sin(-0.833) - sin(lat) * sin(dec)) / (cos(lat) * cos(dec))) / RAD;
    }
    return { sunrise: new Date(noon.getTime() - (ha / 15) * 3600000), sunset: new Date(noon.getTime() + (ha / 15) * 3600000), noon };
  }

  // Rahu Kaal: daytime split into 8 parts; segment by weekday (Sun..Sat)
  const RAHU = [8, 2, 7, 5, 6, 4, 3];
  function rahuKaal(sunrise, sunset, weekday) {
    const part = (sunset - sunrise) / 8, k = RAHU[weekday] - 1;
    return { start: new Date(sunrise.getTime() + k * part), end: new Date(sunrise.getTime() + (k + 1) * part) };
  }

  function panchang(date, lat, lon) {
    const st = sunTimes(date, lat, lon);
    const ref = st.sunrise; // traditional: tithi prevailing at sunrise
    const weekday = new Date(date.getTime() + 5.5 * 3600000).getUTCDay();
    return {
      ...st,
      tithiAtSunrise: tithiInfo(ref),
      tithiNow: tithiInfo(date),
      tithiEnds: tithiEnd(date),
      nakshatraNow: nakshatraInfo(date),
      rahu: rahuKaal(st.sunrise, st.sunset, weekday)
    };
  }

  // Upcoming Purnima, Amavasya and Ekadashi dates (by tithi at sunrise), forever.
  function upcomingLunarDays(from, lat, lon, days = 60) {
    const out = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 86400000);
      const st = sunTimes(d, lat, lon);
      const t = tithiInfo(st.sunrise);
      if ([10, 14, 25, 29].includes(t.index)) {
        const label = t.index === 14 ? "Purnima" : t.index === 29 ? "Amavasya" : t.paksha + " Ekadashi";
        if (!out.length || out[out.length - 1].label !== label) out.push({ date: st.sunrise, label });
      }
    }
    return out;
  }

  // Lunar month. Amanta month is named by the sidereal sign of the Sun at the new moon
  // that starts it. Purnimanta (used in Jharkhand, Bihar, UP) names Krishna paksha by the next month.
  const MONTHS = ["Vaishakha","Jyeshtha","Ashadha","Shravana","Bhadrapada","Ashwin","Kartik","Margashirsha","Pausha","Magha","Phalguna","Chaitra"];
  const sunRashi = date => Math.floor(norm(sunLongitude(date) - ayanamsa(date)) / 30);
  function newMoonBefore(date) {
    const back = new Date(date.getTime() - (elongation(date) / 12.19 + 1.5) * 86400000);
    const nm = nextElongation(back, 0);
    return nm > date ? nextElongation(new Date(back.getTime() - 30 * 86400000), 0) : nm;
  }
  function lunarMonth(date, system = "purnimanta") {
    const prev = newMoonBefore(date), next = nextElongation(new Date(prev.getTime() + 20 * 86400000), 0);
    const r = sunRashi(prev), adhik = r === sunRashi(next);
    const krishna = tithiInfo(date).index >= 15;
    const idx = system === "purnimanta" && krishna && !adhik ? (r + 1) % 12 : r;
    return { name: MONTHS[idx], adhik };
  }

  root.Panchang = { sunLongitude, moonLongitude, elongation, tithiInfo, tithiEnd, nakshatraInfo, sunTimes, rahuKaal, panchang, upcomingLunarDays, lunarMonth };
})(typeof window !== "undefined" ? window : globalThis);
