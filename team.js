/* =========================================================
   TAMID at UCLA: TEAM PAGE
   This page builds itself from the Google Sheet, so member info
   is edited in the Sheet, NOT here.

   - "Website" tab: everyone's form answers (no emails).
   - "Board Settings" tab: e-board titles, order, hide (Show = N),
     and name fixes (Display Name).

   If someone submits the form twice, their NEWEST answer is used.
   ========================================================= */

const WEBSITE_CSV  = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTi4MSmzRe2ZhSyrU-AZJtMoTkbtG5v4rf92_WtHcwAc0EfuX8RvMoPZ2fO12rEwBaNAVrxwZY5aQU-/pub?gid=2128881857&single=true&output=csv';
const SETTINGS_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTi4MSmzRe2ZhSyrU-AZJtMoTkbtG5v4rf92_WtHcwAc0EfuX8RvMoPZ2fO12rEwBaNAVrxwZY5aQU-/pub?gid=1148976622&single=true&output=csv';

// Headshots saved with the website (images/team/first-last.jpg).
// Anyone who submits the form AFTER this date gets their photo from Google Drive instead.
const LOCAL_PHOTOS = ['addie-sherman','ava-meyers','ben-arbib','ben-wolff','daniel-mendelson','danielle-boodman',
  'darren-tollman','eden-castel','ella-schenk','emma-shayestehfar','ethan-shakhman','iara-levy','jared-saal',
  'justin-halprin','levi-title','maia-rosenbaum','mattin-aframian','max-rubenstein','miya-zborovsky','omer-rabin',
  'richard-belsky','roman-hawk','ryan-levi','sadie-gryczman','shani-noudel','shayan-naeim','tova-rosenbaum','zack-siegel'];
const LOCAL_PHOTO_CUTOFF = new Date('2026-11-17T23:59:59');

// Order the member groups appear in
const MEMBER_GROUPS = [
  ['Project Manager', 'Project Managers'],
  ['Consultant / Analyst', 'Consultants & Analysts'],
  ['New Member', 'New Members'],
];

// Tidy up common shorthand in the "Major" answers
const MAJOR_FIXES = { 'bus econ': 'Business Economics', 'business-economics': 'Business Economics', 'econ': 'Economics' };

// Career interests are shortened so they fit on ONE line of the card.
// Only the first 2 a person picked are shown.
const INTEREST_SHORT = {
  'consulting': 'Consulting', 'investment banking': 'IB', 'private equity / venture capital': 'PE/VC',
  'investing / asset management': 'Investing', 'tech / product management': 'Tech',
  'entrepreneurship / startups': 'Startups', 'marketing': 'Marketing', 'law': 'Law',
  'biotech': 'Biotech', 'biotechnology': 'Biotech', 'real estate': 'Real Estate',
  'commercial real estate': 'Real Estate', 'undecided': 'Undecided',
};
const MAX_INTERESTS = 2;
function shortInterests(s) {
  // split on commas that are NOT inside an option name like "Private Equity / Venture Capital"
  const parts = (s || '').split(',').map(x => x.trim()).filter(Boolean);
  const out = [];
  parts.forEach(p => { const v = INTEREST_SHORT[key(p)] || p; if (!out.includes(v)) out.push(v); });
  return out.slice(0, MAX_INTERESTS).join(', ');
}

/* ---------- helpers ---------- */
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(v => v.trim())).map(r =>
    Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
const key = n => n.toLowerCase().replace(/\s+/g, ' ').trim();
const slug = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = n => n.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
function niceCase(n) {            // "EMMA SMITH" or "emma smith" -> "Emma Smith"
  if (n !== n.toUpperCase() && n !== n.toLowerCase()) return n;
  return n.toLowerCase().replace(/(^|[\s\-'])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}
// Hobbies: capitalize each word ("rock climbing, hiking" -> "Rock Climbing, Hiking").
// Small joining words (and, the, to...) stay lowercase unless they come first.
const SMALL_WORDS = ['and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'to', 'at', 'for', 'with'];
function titleCase(s) {
  return (s || '').split(' ').map((w, i) => {
    if (i > 0 && SMALL_WORDS.includes(w.replace(/[,.]/g, '').toLowerCase())) return w.toLowerCase();
    return w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-');
  }).join(' ');
}
function cleanLinkedIn(u) {
  if (!/linkedin\.com/i.test(u)) return '';
  u = u.split('?')[0];
  return /^https?:\/\//i.test(u) ? u : 'https://' + u.replace(/^\/+/, '');
}
const driveId = u => (u.match(/id=([-\w]{20,})/) || [])[1];
const toDate = s => { const d = new Date(s); return isNaN(d) ? new Date(0) : d; };

/* ---------- card ---------- */
function card(p) {
  // Every line stays on ONE line (it shrinks slightly if needed). Only Hobbies may wrap.
  const row = (label, val) => val ? `<div class="ln"><b>${label}:</b> ${esc(val)}</div>` : '';
  const details = (p.grad ? `<div class="ln">Class of ${esc(p.grad)}</div>` : '') +
                  row('Major', p.major) + row('Interests', shortInterests(p.interest)) +
                  row('Hometown', p.hometown) +
                  (p.hobbies ? `<div class="hob"><b>Hobbies:</b> ${esc(p.hobbies)}</div>` : '');
  const s = slug(p.name);
  const local = LOCAL_PHOTOS.includes(s) ? `images/team/${s}.jpg` : '';
  const id = driveId(p.photo || '');
  // Newer form submissions use the Drive photo; otherwise the saved one
  let src = (id && p.date > LOCAL_PHOTO_CUTOFF) ? `https://drive.google.com/thumbnail?id=${id}&sz=w600` : local;
  if (!src && id) src = `https://drive.google.com/thumbnail?id=${id}&sz=w600`;
  const fallback = local && src !== local ? `this.onerror=null;this.src='${local}'` : `this.replaceWith(document.createTextNode('${initials(p.name)}'))`;
  const pic = src ? `<img src="${src}" alt="${esc(p.name)}" loading="lazy" onerror="${fallback}">` : initials(p.name);
  return `<div class="person reveal">
    <div class="pic">${pic}${details ? `<div class="info">${details}</div>` : ''}</div>
    <h4>${esc(p.name)}</h4><span class="role">${esc(p.role)}</span>
    ${p.linkedin ? `<a class="li" href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ''}
  </div>`;
}

/* ---------- build the page ---------- */
async function buildTeam() {
  const boardEl = document.getElementById('board'), membersEl = document.getElementById('members-list');
  try {
    const [wRes, sRes] = await Promise.all([fetch(WEBSITE_CSV), fetch(SETTINGS_CSV)]);
    if (!wRes.ok || !sRes.ok) throw new Error('Sheet not reachable');
    const responses = parseCSV(await wRes.text());
    const settings = parseCSV(await sRes.text());

    // Keep only each person's newest response
    const latest = new Map();
    responses.forEach(r => {
      if (!r.Name) return;
      const k = key(r.Name), d = toDate(r.Timestamp);
      if (!latest.has(k) || d > latest.get(k).date) latest.set(k, { ...r, date: d });
    });
    const set = new Map(settings.filter(s => s.Name).map(s => [key(s.Name), s]));

    const people = [];
    const seen = new Set();
    const add = (k, r, s) => {
      if (s && /^n/i.test(s.Show || '')) return;               // hidden on purpose
      const rawName = (s && s['Display Name']) || (r && r.Name) || (s && s.Name);
      const major = r ? (MAJOR_FIXES[key(r.Major || '')] || r.Major) : '';
      people.push({
        name: niceCase(rawName), title: (s && s.Title) || '', order: s && s.Order ? +s.Order : 999,
        position: r ? r.Position : 'Executive Board', grad: r ? r['Grad Year'] : '', major,
        interest: r ? r['Career Interest'] : '', hometown: r ? r.Hometown : '', hobbies: r ? titleCase(r.Hobbies) : '',
        linkedin: r ? cleanLinkedIn(r.LinkedIn || '') : '', photo: r ? r.Photo : '', date: r ? r.date : new Date(0),
      });
      seen.add(k);
    };
    latest.forEach((r, k) => add(k, r, set.get(k)));
    set.forEach((s, k) => { if (!seen.has(k) && s.Title) add(k, null, s); });   // e-board who haven't filled out the form yet

    // Executive board = anyone with a Title in Board Settings
    const board = people.filter(p => p.title).sort((a, b) => a.order - b.order);
    const groups = [
      ['Presidents', board.filter(p => /president/i.test(p.title))],
      ['Directors', board.filter(p => !/president/i.test(p.title))],
    ];
    boardEl.innerHTML = groups.filter(g => g[1].length).map(([label, list]) =>
      `<div class="board-group"><h3>${label}</h3><div class="people">${list.map(p => card({ ...p, role: p.title })).join('')}</div></div>`
    ).join('');

    // Everyone else, grouped by position, alphabetical by first name
    const rest = people.filter(p => !p.title).sort((a, b) => a.name.localeCompare(b.name));
    const used = new Set();
    let html = MEMBER_GROUPS.map(([pos, label]) => {
      const list = rest.filter(p => key(p.position) === key(pos));
      list.forEach(p => used.add(p));
      return list.length ? `<div class="board-group"><h3>${label}</h3><div class="people small">${
        list.map(p => card({ ...p, role: p.grad ? 'Class of ' + p.grad : '' })).join('')}</div></div>` : '';
    }).join('');
    const other = rest.filter(p => !used.has(p));
    if (other.length) html += `<div class="board-group"><h3>Members</h3><div class="people small">${
      other.map(p => card({ ...p, role: p.grad ? 'Class of ' + p.grad : '' })).join('')}</div></div>`;
    membersEl.innerHTML = html || '<p class="team-note">Member profiles are coming soon.</p>';
  } catch (err) {
    boardEl.innerHTML = '<p class="team-note">Our team page is updating. Please check back soon.</p>';
    membersEl.innerHTML = '';
  }

  // Phones have no hover, so tapping a photo shows the details
  document.querySelectorAll('.person .pic').forEach(pic =>
    pic.addEventListener('click', () => pic.classList.toggle('show')));
  observeReveals();
  fitLines();
}

// Shrink any detail line that is too wide so it stays on a single line
function fitLines() {
  document.querySelectorAll('.person .info .ln').forEach(el => {
    el.style.fontSize = '';
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && size > 10) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }
  });
}
let fitTimer;
window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitLines, 150); });
if (document.fonts) document.fonts.ready.then(fitLines);

buildTeam();
