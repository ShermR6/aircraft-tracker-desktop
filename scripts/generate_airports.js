/**
 * Downloads OurAirports CSV data and generates a compact airports.json
 * for use in the AirportConfig ICAO search autocomplete.
 *
 * Run with: node scripts/generate_airports.js
 *
 * Output: src/data/airports.json
 * Format: [[icao, name, city, region, country, lat, lon, elev_ft, iata, [[le_ident, le_hdg, he_ident, he_hdg, length_ft], ...]], ...]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchURL(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.split('\n');
  const header = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = parseCSVLine(line);
    const obj = {};
    header.forEach((h, idx) => { obj[h] = row[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

async function main() {
  console.log('Downloading airports.csv...');
  const airportsCSV = await fetchURL('https://ourairports.com/data/airports.csv');
  console.log(`Downloaded ${(airportsCSV.length / 1024).toFixed(0)} KB`);

  console.log('Downloading runways.csv...');
  const runwaysCSV = await fetchURL('https://ourairports.com/data/runways.csv');
  console.log(`Downloaded ${(runwaysCSV.length / 1024).toFixed(0)} KB`);

  console.log('Parsing...');
  const airportRows = parseCSV(airportsCSV);
  const runwayRows = parseCSV(runwaysCSV);

  // Build runway map: ICAO -> list of runway tuples [le_ident, le_hdg, he_ident, he_hdg, length_ft]
  const runwayMap = {};
  for (const rw of runwayRows) {
    const icao = rw.airport_ident;
    if (!icao || icao.length !== 4 || !/^[A-Z]{4}$/.test(icao)) continue;
    const leHdg = parseFloat(rw.le_heading_degT);
    const heHdg = parseFloat(rw.he_heading_degT);
    const lenFt = parseInt(rw.length_ft);
    if (isNaN(leHdg) || isNaN(heHdg)) continue;
    if (!runwayMap[icao]) runwayMap[icao] = [];
    runwayMap[icao].push([
      rw.le_ident || '',
      Math.round(leHdg),
      rw.he_ident || '',
      Math.round(heHdg),
      isNaN(lenFt) ? 0 : lenFt
    ]);
  }

  // Filter airports: 4-letter ICAO, medium/large, or small with scheduled service
  const airports = [];
  for (const ap of airportRows) {
    const icao = ap.ident;
    if (!icao || icao.length !== 4 || !/^[A-Z]{4}$/.test(icao)) continue;

    const type = ap.type;
    const service = ap.scheduled_service;
    if (
      type !== 'large_airport' &&
      type !== 'medium_airport' &&
      !(type === 'small_airport' && service === 'yes')
    ) continue;

    const lat = parseFloat(ap.latitude_deg);
    const lon = parseFloat(ap.longitude_deg);
    const elev = parseInt(ap.elevation_ft);
    if (isNaN(lat) || isNaN(lon)) continue;

    const region = (ap.iso_region || '').split('-')[1] || ap.iso_region || '';
    const iata = ap.iata_code || '';
    const runways = runwayMap[icao] || [];

    airports.push([
      icao,
      ap.name || '',
      ap.municipality || '',
      region,
      ap.iso_country || '',
      Math.round(lat * 10000) / 10000,
      Math.round(lon * 10000) / 10000,
      isNaN(elev) ? 0 : elev,
      iata,
      runways
    ]);
  }

  airports.sort((a, b) => a[0].localeCompare(b[0]));

  const outDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'airports.json');
  fs.writeFileSync(outPath, JSON.stringify(airports));
  const sizKB = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`✅ Generated ${airports.length} airports → src/data/airports.json (${sizKB} KB)`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
