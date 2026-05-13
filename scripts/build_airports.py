"""
Downloads OurAirports open data and builds src/data/airports.json
Output format: [icao, name, city, region, country, lat, lon, elev_ft, iata,
  [[le_ident, le_hdg, he_ident, he_hdg, length_ft, le_lat, le_lon, he_lat, he_lon], ...]]
Threshold lat/lon are null when not available in source data.
"""
import csv
import json
import io
import urllib.request
import os

AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
RUNWAYS_URL  = "https://davidmegginson.github.io/ourairports-data/runways.csv"

INCLUDE_TYPES = {"large_airport", "medium_airport", "small_airport"}

def fetch_csv(url):
    print(f"Downloading {url} ...")
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read().decode("utf-8")

def build():
    airports_csv = fetch_csv(AIRPORTS_URL)
    runways_csv  = fetch_csv(RUNWAYS_URL)

    # Build runway map: ident -> list of runway tuples
    runways = {}
    for row in csv.DictReader(io.StringIO(runways_csv)):
        ident = row["airport_ident"].strip()
        if row.get("closed", "0") == "1":
            continue
        try:
            le_ident = row["le_ident"].strip()
            he_ident = row["he_ident"].strip()
            le_hdg   = round(float(row["le_heading_degT"])) if row.get("le_heading_degT") else None
            he_hdg   = round(float(row["he_heading_degT"])) if row.get("he_heading_degT") else None
            length   = int(row["length_ft"]) if row.get("length_ft") else 0
            le_lat   = round(float(row["le_latitude_deg"]),  6) if row.get("le_latitude_deg")  else None
            le_lon   = round(float(row["le_longitude_deg"]), 6) if row.get("le_longitude_deg") else None
            he_lat   = round(float(row["he_latitude_deg"]),  6) if row.get("he_latitude_deg")  else None
            he_lon   = round(float(row["he_longitude_deg"]), 6) if row.get("he_longitude_deg") else None
        except (ValueError, KeyError):
            continue
        if le_ident or he_ident:
            runways.setdefault(ident, []).append(
                [le_ident, le_hdg, he_ident, he_hdg, length, le_lat, le_lon, he_lat, he_lon]
            )

    airports = []
    for row in csv.DictReader(io.StringIO(airports_csv)):
        if row.get("type") not in INCLUDE_TYPES:
            continue
        icao = row.get("gps_code", "").strip() or row.get("ident", "").strip()
        if not icao or len(icao) < 3:
            continue
        try:
            lat  = round(float(row["latitude_deg"]),  6)
            lon  = round(float(row["longitude_deg"]), 6)
            elev = int(row["elevation_ft"]) if row["elevation_ft"] else 0
        except (ValueError, KeyError):
            continue

        name    = row.get("name", "").strip()
        city    = row.get("municipality", "").strip()
        region  = row.get("iso_region", "").strip()
        country = row.get("iso_country", "").strip()
        iata    = row.get("iata_code", "").strip() or None

        rws = runways.get(icao, runways.get(row.get("ident", "").strip(), []))

        airports.append([icao, name, city, region, country, lat, lon, elev, iata, rws])

    airports.sort(key=lambda a: a[0])

    out_path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "airports.json")
    out_path = os.path.normpath(out_path)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(airports, f, separators=(",", ":"))

    size_kb = os.path.getsize(out_path) // 1024
    print(f"Done — {len(airports):,} airports written to {out_path} ({size_kb} KB)")

if __name__ == "__main__":
    build()
