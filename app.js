const $ = (id) => document.getElementById(id);
const STORAGE = "personal-command-centre-v1";
const DEFAULTS = {
  settings: { github: "", news: "IN:en" },
  tasks: [], papers: [], notes: "", links: [],
  countdown: null, activeFeed: "india"
};
let state = loadState();
function loadState(){ try{return {...DEFAULTS,...JSON.parse(localStorage.getItem(STORAGE)||"{}")};}catch{return {...DEFAULTS};} }
function saveState(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
function safeText(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(message){const t=$("toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}
function fmtTime(zone,opts={hour:"2-digit",minute:"2-digit"}){return new Intl.DateTimeFormat("en-IN",{timeZone:zone,...opts}).format(new Date());}
function tick(){
  const now=new Date();$("clock").textContent=fmtTime("Asia/Kolkata",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
  $("date").textContent=fmtTime("Asia/Kolkata",{day:"2-digit",month:"short",year:"numeric"});
  $("today-label").textContent=fmtTime("Asia/Kolkata",{weekday:"long",day:"numeric",month:"long"});
  const h=Number(fmtTime("Asia/Kolkata",{hour:"2-digit",hour12:false}));$("greeting").textContent=h<12?"Good morning.":h<17?"Good afternoon.":"Good evening.";
  $("clock-ist").textContent=fmtTime("Asia/Kolkata");$("clock-london").textContent=fmtTime("Europe/London");$("clock-newyork").textContent=fmtTime("America/New_York");$("clock-tokyo").textContent=fmtTime("Asia/Tokyo");
}
const cities={
  ranchi:{name:"Ranchi",lat:23.3441,lon:85.3096},
  kharagpur:{name:"Kharagpur",lat:22.3460,lon:87.2320}
};
const weatherCodes={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",56:"Freezing drizzle",57:"Heavy freezing drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Heavy freezing rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Rain showers",81:"Rain showers",82:"Heavy showers",85:"Snow showers",86:"Heavy snow showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Heavy thunderstorm"};
const weatherIcons={clear:"☀",cloud:"☁",rain:"☂",fog:"≋",storm:"ϟ",snow:"❄"};
function iconFor(code){if(code===0||code===1)return weatherIcons.clear;if([2,3].includes(code))return weatherIcons.cloud;if([45,48].includes(code))return weatherIcons.fog;if([95,96,99].includes(code))return weatherIcons.storm;if([71,73,75,77,85,86].includes(code))return weatherIcons.snow;return weatherIcons.rain;}
async function fetchWeather(key,city){
  const params=new URLSearchParams({latitude:city.lat,longitude:city.lon,current:"temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,wind_speed_10m",hourly:"temperature_2m,precipitation_probability",daily:"temperature_2m_max,temperature_2m_min,precipitation_probability_max",timezone:"Asia/Kolkata",forecast_days:"1"});
  const r=await fetch("https://api.open-meteo.com/v1/forecast?"+params);if(!r.ok)throw Error("Weather service returned "+r.status);const d=await r.json();const c=d.current;
  $("temp-"+key).textContent=Math.round(c.temperature_2m)+"°";$("desc-"+key).textContent=weatherCodes[c.weather_code]||"Conditions unavailable";$("feels-"+key).textContent="Feels like "+Math.round(c.apparent_temperature)+"°";$("humidity-"+key).textContent=c.relative_humidity_2m+"%";$("wind-"+key).textContent=Math.round(c.wind_speed_10m)+" km/h";$("rain-"+key).textContent=(c.precipitation??0)+" mm";$("icon-"+key).textContent=iconFor(c.weather_code);$("updated-"+key).textContent="Updated "+fmtTime("Asia/Kolkata",{hour:"2-digit",minute:"2-digit"});
  fetchAQI(key,city).catch(()=>{$("aqi-"+key).textContent="AQI unavailable";});
}
async function fetchAQI(key,city){
  const p=new URLSearchParams({latitude:city.lat,longitude:city.lon,current:"us_aqi,pm2_5,pm10",timezone:"Asia/Kolkata"});
  const r=await fetch("https://air-quality-api.open-meteo.com/v1/air-quality?"+p);if(!r.ok)throw Error();const d=await r.json();const a=d.current?.us_aqi;$("aqi-"+key).textContent=a==null?"AQI unavailable":"US AQI "+Math.round(a);
}
async function loadWeather(){await Promise.all(Object.entries(cities).map(async([k,c])=>{try{await fetchWeather(k,c);}catch(e){$("desc-"+k).textContent="Weather temporarily unavailable";$("updated-"+k).textContent="Could not reach weather API";}}));}
const feeds={india:"India when:1d",world:"World when:1d",technology:"technology AI when:1d",science:"science research when:1d",energy:"energy power systems when:1d"};
function googleRss(q){const country=state.settings.news||"IN:en";const [gl,hl]=country.split(":");return "https://news.google.com/rss/search?q="+encodeURIComponent(q)+"&hl="+hl+"&gl="+gl+"&ceid="+gl+":"+hl;}
async function loadNews(feed=state.activeFeed||"india"){
  state.activeFeed=feed;saveState();document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.feed===feed));$("news-list").innerHTML='<div class="loading-row">Fetching headlines…</div>';
  try{
    const rss=googleRss(feeds[feed]||feeds.india);const url="https://api.rss2json.com/v1/api.json?rss_url="+encodeURIComponent(rss);
    const r=await fetch(url);if(!r.ok)throw Error("RSS bridge unavailable");const data=await r.json();if(data.status!=="ok"||!data.items?.length)throw Error("No headlines returned");
    $("news-list").innerHTML=data.items.slice(0,7).map((item,i)=>{const d=item.pubDate?new Date(item.pubDate):null;const when=d&&!isNaN(d)?d.toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"Recent";return `<div class="news-item"><span class="news-index">${String(i+1).padStart(2,"0")}</span><div><a href="${safeText(item.link)}" target="_blank" rel="noopener noreferrer">${safeText(item.title)}</a><div class="news-meta">${safeText(item.author||"Google News")} · ${when}</div></div></div>`;}).join("");
    $("news-updated").textContent="UPDATED "+fmtTime("Asia/Kolkata",{hour:"2-digit",minute:"2-digit"});
  }catch(e){$("news-list").innerHTML='<div class="error-text">Headlines could not be loaded right now. Try again later or open <a class="inline-link" href="https://news.google.com/" target="_blank" rel="noreferrer">Google News ↗</a>. Some public RSS bridges may impose rate limits.</div>';}
}
async function loadCurrency(){
  try{const r=await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR,EUR,GBP");if(!r.ok)throw Error();const d=await r.json();const usd=d.rates.INR;
    $("usd-inr").textContent="₹"+usd.toFixed(2);
    const eurR=await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=INR");const eur=await eurR.json();$("eur-inr").textContent="₹"+eur.rates.INR.toFixed(2);
    const gbpR=await fetch("https://api.frankfurter.dev/v1/latest?base=GBP&symbols=INR");const gbp=await gbpR.json();$("gbp-inr").textContent="₹"+gbp.rates.INR.toFixed(2);
    $("currency-updated").textContent="Reference rates · "+d.date;
  }catch{$("currency-updated").textContent="Exchange-rate service unavailable";}
}
function renderTasks(){
  const box=$("task-list");if(!state.tasks.length){box.className="item-list empty-state";box.textContent="Your tasks will appear here.";return;}box.className="item-list";
  box.innerHTML=state.tasks.map(t=>`<div class="list-row"><input class="check-task" type="checkbox" data-task="${t.id}" ${t.done?"checked":""}><span class="row-main"><span class="row-title" style="${t.done?"text-decoration:line-through;opacity:.55":""}">${safeText(t.text)}</span></span><button class="delete-button" data-delete-task="${t.id}" aria-label="Delete task">×</button></div>`).join("");
}
function renderPapers(){
  const box=$("paper-list");if(!state.papers.length){box.className="item-list empty-state";box.textContent="Add manuscripts, patents, or research projects to track their status.";return;}box.className="item-list";
  box.innerHTML=state.papers.map(p=>`<div class="list-row"><span class="row-main"><span class="row-title">${safeText(p.title)}</span></span><select data-paper="${p.id}">${["In preparation","Submitted","Under review","Major revision","Minor revision","Accepted","Published"].map(s=>`<option ${p.status===s?"selected":""}>${s}</option>`).join("")}</select><button class="delete-button" data-delete-paper="${p.id}" aria-label="Delete item">×</button></div>`).join("");
}
function renderLinks(){
  $("custom-links").innerHTML=state.links.map((l,i)=>`<a class="quick-card" href="${safeText(l.url)}" target="_blank" rel="noopener noreferrer"><span class="quick-icon">↗</span><span><b>${safeText(l.name)}</b><small>Custom shortcut</small></span><i data-delete-link="${i}" title="Remove link">×</i></a>`).join("");
}
function renderCountdown(){
  const c=state.countdown;if(!c){$("countdown-display").innerHTML="<strong>—</strong><span>No event set</span>";return;}
  const diff=Math.ceil((new Date(c.date+"T00:00:00")-new Date(new Date().toDateString()))/86400000);
  $("countdown-display").innerHTML=`<strong>${diff<0?"Passed":diff===0?"Today":diff+" days"}</strong><span>${safeText(c.title)} · ${safeText(c.date)}</span>`;
}
async function loadGithub(username){
  if(!username){$("github-profile").innerHTML='<span class="muted-small">Add your GitHub username to view public profile statistics.</span>';return;}
  $("github-profile").innerHTML='<span class="muted-small">Loading profile…</span>';
  try{const r=await fetch("https://api.github.com/users/"+encodeURIComponent(username));if(!r.ok)throw Error("Profile not found");const d=await r.json();$("github-profile").innerHTML=`<img src="${safeText(d.avatar_url)}" alt=""><div><b>${safeText(d.name||d.login)}</b><small>${d.public_repos} public repos · ${d.followers} followers · <a class="inline-link" href="${safeText(d.html_url)}" target="_blank" rel="noreferrer">View profile ↗</a></small></div>`;}
  catch{$("github-profile").innerHTML='<span class="error-text">Could not load that public GitHub profile.</span>';}
}
function refreshAll(){ $("system-status").textContent="UPDATING";Promise.all([loadWeather(),loadNews(),loadCurrency()]).finally(()=>{$("system-status").textContent="ONLINE";});}
$("refresh-all").addEventListener("click",()=>{refreshAll();toast("Refreshing live information…");});
$("news-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-feed]");if(b)loadNews(b.dataset.feed);});
$("task-form").addEventListener("submit",e=>{e.preventDefault();const text=$("task-input").value.trim();if(!text)return;state.tasks.unshift({id:Date.now(),text,done:false});saveState();renderTasks();e.target.reset();});
$("task-list").addEventListener("change",e=>{const id=Number(e.target.dataset.task);if(!id)return;const t=state.tasks.find(x=>x.id===id);if(t){t.done=e.target.checked;saveState();renderTasks();}});
$("task-list").addEventListener("click",e=>{const id=Number(e.target.dataset.deleteTask);if(id){state.tasks=state.tasks.filter(x=>x.id!==id);saveState();renderTasks();}});
$("add-paper").addEventListener("click",()=>$("paper-form").classList.toggle("hidden"));
$("paper-form").addEventListener("submit",e=>{e.preventDefault();state.papers.unshift({id:Date.now(),title:$("paper-title").value.trim(),status:$("paper-status").value});saveState();renderPapers();e.target.reset();e.target.classList.add("hidden");});
$("paper-list").addEventListener("change",e=>{const id=Number(e.target.dataset.paper);const p=state.papers.find(x=>x.id===id);if(p){p.status=e.target.value;saveState();}});
$("paper-list").addEventListener("click",e=>{const id=Number(e.target.dataset.deletePaper);if(id){state.papers=state.papers.filter(x=>x.id!==id);saveState();renderPapers();}});
$("notes").value=state.notes;$("notes").addEventListener("input",()=>{state.notes=$("notes").value;saveState();$("notes-status").textContent="Saved locally · "+fmtTime("Asia/Kolkata");});
$("add-link").addEventListener("click",()=>$("link-form").classList.toggle("hidden"));
$("link-form").addEventListener("submit",e=>{e.preventDefault();const url=$("link-url").value.trim();if(!/^https?:\/\//i.test(url)){toast("Use a full http(s) URL");return;}state.links.push({name:$("link-name").value.trim(),url});saveState();renderLinks();e.target.reset();e.target.classList.add("hidden");});
$("custom-links").addEventListener("click",e=>{const i=e.target.dataset.deleteLink;if(i!==undefined){e.preventDefault();state.links.splice(Number(i),1);saveState();renderLinks();}});
$("countdown-form").addEventListener("submit",e=>{e.preventDefault();state.countdown={title:$("countdown-title").value.trim(),date:$("countdown-date").value};saveState();renderCountdown();});
$("github-form").addEventListener("submit",e=>{e.preventDefault();const u=$("github-user").value.trim();state.settings.github=u;saveState();loadGithub(u);});
$("edit-settings").addEventListener("click",()=>{$("settings-github").value=state.settings.github;$("settings-news").value=state.settings.news;$("settings-dialog").showModal();});
$("save-settings").addEventListener("click",()=>{state.settings.github=$("settings-github").value.trim();state.settings.news=$("settings-news").value;saveState();$("github-user").value=state.settings.github;loadGithub(state.settings.github);loadNews("india");toast("Settings saved");});
function init(){
  tick();setInterval(tick,1000);renderTasks();renderPapers();renderLinks();renderCountdown();$("github-user").value=state.settings.github;loadGithub(state.settings.github);refreshAll();
  setInterval(loadWeather,10*60*1000);setInterval(loadNews,30*60*1000);setInterval(loadCurrency,60*60*1000);
}
init();
