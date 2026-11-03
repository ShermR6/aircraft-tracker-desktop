// src/config/mapTiles.js
//
// One place for the basemap, because the provider changed under us once
// already. CARTO's dark_all tiles began returning an "API KEY REQUIRED"
// placeholder *image* for every request — HTTP 200, a valid PNG, so nothing
// errored; the map just filled with that text. Six call sites each had the URL
// pasted in, so there was no single place to fix it.
//
// Esri's Dark Gray Canvas is keyless and dark. Its last real zoom level is 16,
// so maxNativeZoom lets Leaflet upscale past that rather than request blank
// tiles. Labels ship as a separate transparent overlay, added second so it
// draws above the base.

const ESRI = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas';
const MAX_NATIVE_ZOOM = 16;
const ATTRIBUTION = '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

export function addBaseLayers(L, map, { maxZoom = 19, labels = true } = {}) {
  L.tileLayer(`${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
    maxZoom,
    maxNativeZoom: MAX_NATIVE_ZOOM,
    attribution: ATTRIBUTION,
  }).addTo(map);

  if (labels) {
    L.tileLayer(`${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom,
      maxNativeZoom: MAX_NATIVE_ZOOM,
    }).addTo(map);
  }

  return map;
}
