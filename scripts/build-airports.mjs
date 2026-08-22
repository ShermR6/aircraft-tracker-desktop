/**
 * build-airports.mjs
 * Downloads fresh airport + runway data from OurAirports and writes
 * src/data/airports.json in the compact array format the app expects:
 *   [icao, name, city, region, country, lat, lon, elev_ft, iata,
 *    [[le_ident, le_hdg, he_ident, he_hdg, length_ft, le_lat, le_lon, he_lat, he_lon], ...]]
 *
 * Usage: node scripts/build-airports.mjs
 */

import { createWriteStream } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'src', 'data', 'airports.json');
const OVERRIDES_PATH = path.join(__dirname, 'runway-overrides.json');

// runway-overrides.json format:
// {
//   "KXXX": [
//     { "leIdent": "18R", "heIdent": "36L", "leLat": 33.1234, "leLon": -97.1234, "heLat": 33.2345, "heLon": -97.2345 }
//   ]
// }
// Any null values are skipped (only non-null fields are applied).

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const RUNWAYS_URL  = 'https://davidmegginson.github.io/ourairports-data/runways.csv';

// Only include airports with runways that can actually be used for GA / commercial
const INCLUDE_TYPES = new Set(['small_airport', 'medium_airport', 'large_airport', 'heliport']);

// ── CSV parser (handles quoted fields with embedded commas / newlines) ─────────
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuote = false, i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { inQuote = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuote = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\n') {
      row.push(field); field = '';
      if (row.some(f => f !== '')) rows.push(row);
      row = []; i++; continue;
    }
    if (ch === '\r') { i++; continue; }
    field += ch; i++;
  }
  if (field || row.length) { row.push(field); if (row.some(f => f !== '')) rows.push(row); }
  return rows;
}

function objRows(rows) {
  const [header, ...data] = rows;
  return data.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

async function fetchText(url) {
  process.stdout.write(`  Downloading ${url} ... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  console.log(`${(text.length / 1024 / 1024).toFixed(1)} MB`);
  return text;
}

function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function int(v) { const n = parseInt(v); return isNaN(n) ? null : n; }
function str(v) { return v && v.trim() !== '' ? v.trim() : null; }

async function main() {
  console.log('Fetching OurAirports data...');
  const [airportText, runwayText] = await Promise.all([
    fetchText(AIRPORTS_URL),
    fetchText(RUNWAYS_URL),
  ]);

  console.log('Parsing airports...');
  const airportRows = objRows(parseCSV(airportText));
  // Filter to airports we care about
  const airports = airportRows.filter(a => INCLUDE_TYPES.has(a.type) && a.gps_code);

  console.log(`  ${airports.length.toLocaleString()} airports after filtering`);

  console.log('Parsing runways...');
  const runwayRows = objRows(parseCSV(runwayText));
  // Group by airport ident
  const runwaysByAirport = new Map();
  for (const rw of runwayRows) {
    const key = rw.airport_ident;
    if (!runwaysByAirport.has(key)) runwaysByAirport.set(key, []);
    // Skip closed runways with no data at all
    if (rw.closed === '1' && !rw.le_latitude_deg && !rw.le_heading_degT) continue;
    runwaysByAirport.get(key).push([
      str(rw.le_ident),                   // 0 le_ident
      num(rw.le_heading_degT),             // 1 le_hdg
      str(rw.he_ident),                    // 2 he_ident
      num(rw.he_heading_degT),             // 3 he_hdg
      int(rw.length_ft),                   // 4 length_ft
      num(rw.le_latitude_deg),             // 5 le_lat
      num(rw.le_longitude_deg),            // 6 le_lon
      num(rw.he_latitude_deg),             // 7 he_lat
      num(rw.he_longitude_deg),            // 8 he_lon
    ]);
  }

  // Apply manual runway coordinate overrides
  let overrides = {};
  try {
    overrides = JSON.parse(await readFile(OVERRIDES_PATH, 'utf8'));
    const count = Object.values(overrides).reduce((n, rws) => n + rws.length, 0);
    console.log(`Applying ${count} runway override(s) from runway-overrides.json...`);
  } catch {
    // No overrides file — skip silently
  }
  for (const [icao, patches] of Object.entries(overrides)) {
    const rwList = runwaysByAirport.get(icao);
    if (!rwList) continue;
    for (const patch of patches) {
      const rw = rwList.find(r => r[0] === patch.leIdent);
      if (!rw) continue;
      if (patch.leLat != null) rw[5] = patch.leLat;
      if (patch.leLon != null) rw[6] = patch.leLon;
      if (patch.heLat != null) rw[7] = patch.heLat;
      if (patch.heLon != null) rw[8] = patch.heLon;
      console.log(`  Patched ${icao} ${patch.leIdent}/${patch.heIdent}`);
    }
  }

  console.log('Building airports.json...');
  const out = [];
  for (const a of airports) {
    const icao = a.gps_code;
    const runways = runwaysByAirport.get(icao) || runwaysByAirport.get(a.ident) || [];
    out.push([
      icao,                                // 0 icao
      str(a.name),                         // 1 name
      str(a.municipality),                 // 2 city
      str(a.iso_region),                   // 3 region
      str(a.iso_country),                  // 4 country
      num(a.latitude_deg),                 // 5 lat
      num(a.longitude_deg),                // 6 lon
      int(a.elevation_ft),                 // 7 elev
      str(a.iata_code) || str(a.local_code), // 8 iata
      runways,                             // 9 runways
    ]);
  }

  // Sort by ICAO
  out.sort((a, b) => a[0].localeCompare(b[0]));

  console.log(`Writing ${out.length.toLocaleString()} airports to ${OUT}...`);
  await writeFile(OUT, JSON.stringify(out), 'utf8');

  // Quick sanity check: look up KDTO
  const kdto = out.find(a => a[0] === 'KDTO');
  if (kdto) {
    console.log('\nKDTO sanity check:');
    console.log(`  Name: ${kdto[1]}`);
    console.log(`  Runways: ${kdto[9].length}`);
    kdto[9].forEach(rw => console.log(`    ${rw[0]}/${rw[2]}: hdg=${rw[1]}° len=${rw[4]}ft coords=${rw[5] != null ? 'yes' : 'no'}`));
  }

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
