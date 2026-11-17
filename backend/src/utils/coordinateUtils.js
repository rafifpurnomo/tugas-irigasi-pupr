// src/utils/coordinateUtils.js

const proj4 = require("proj4");

// UTM zone 49S -> WGS84
const UTM_49S = "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs";
const WGS84 = "EPSG:4326";

// Area of interest: Indonesia.
// This is a broad plausibility check, not a substitute for canal-distance validation.
function isPlausibleIndonesia(lon, lat) {
  return lon >= 90 && lon <= 145 && lat >= -15 && lat <= 10;
}

function isValidWgs84(lon, lat) {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

function isUtm49S(x, y) {
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= 100000 &&
    x <= 900000 &&
    y >= 0 &&
    y <= 10000000
  );
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(String(value).trim().replace(",", "."));

  return Number.isFinite(number) ? number : null;
}

/**
 * Menerima koordinat dalam urutan x/y.
 *
 * Return:
 * {
 *   lon, lat,
 *   valid,
 *   tanda: []
 * }
 */
function normalizeCoordinatePair(rawX, rawY) {
  const x = parseCoordinate(rawX);
  const y = parseCoordinate(rawY);

  if (x === null || y === null || (x === 0 && y === 0)) {
    return {
      lon: null,
      lat: null,
      valid: false,
      tanda: ["koordinat_tidak_valid"],
    };
  }

  // Kasus 1: UTM 49S (easting, northing).
  if (isUtm49S(x, y)) {
    try {
      const [lon, lat] = proj4(UTM_49S, WGS84, [x, y]);

      if (isValidWgs84(lon, lat) && isPlausibleIndonesia(lon, lat)) {
        return {
          lon,
          lat,
          valid: true,
          tanda: ["koordinat_utm_dikonversi"],
        };
      }
    } catch (error) {
      // Lanjut ke pemeriksaan format lain.
    }
  }

  // Kasus 2: WGS84 normal (longitude, latitude).
  if (isValidWgs84(x, y) && isPlausibleIndonesia(x, y)) {
    return {
      lon: x,
      lat: y,
      valid: true,
      tanda: [],
    };
  }

  // Kasus 3: WGS84 tertukar (latitude, longitude).
  if (isValidWgs84(y, x) && isPlausibleIndonesia(y, x)) {
    return {
      lon: y,
      lat: x,
      valid: true,
      tanda: ["koordinat_tertukar_dibetulkan"],
    };
  }

  return {
    lon: null,
    lat: null,
    valid: false,
    tanda: ["koordinat_tidak_valid"],
  };
}

/**
 * Laporan memiliki kolom lat dan lon.
 * Fungsi ini tetap mengirimkan pasangan longitude, latitude
 * agar konsisten dengan format GeoJSON.
 */
function normalizeLatLon(lat, lon) {
  return normalizeCoordinatePair(lon, lat);
}

/**
 * Memproses satu posisi GeoJSON.
 * Posisi GeoJSON berurutan [longitude, latitude].
 */
function normalizeGeoJsonPosition(position) {
  if (!Array.isArray(position) || position.length < 2) {
    return null;
  }

  const result = normalizeCoordinatePair(position[0], position[1]);

  if (!result.valid) return null;

  return [result.lon, result.lat, ...position.slice(2)];
}

/**
 * Memproses struktur koordinat GeoJSON secara rekursif.
 * Mendukung Point, MultiPoint, LineString, MultiLineString,
 * Polygon, dan MultiPolygon.
 */
function normalizeCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) return null;

  // Posisi koordinat: [x, y] atau [x, y, z].
  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] !== "object" &&
    typeof coordinates[1] !== "object"
  ) {
    return normalizeGeoJsonPosition(coordinates);
  }

  const normalized = coordinates.map(normalizeCoordinates);

  // Jangan mempertahankan geometri dengan posisi yang gagal.
  if (normalized.some((item) => item === null)) {
    return null;
  }

  return normalized;
}

function normalizeGeoJsonGeometry(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return null;
  }

  const coordinates = normalizeCoordinates(geometry.coordinates);

  if (!coordinates) return null;

  return {
    ...geometry,
    coordinates,
  };
}

module.exports = {
  normalizeCoordinatePair,
  normalizeLatLon,
  normalizeGeoJsonPosition,
  normalizeGeoJsonGeometry,
  isPlausibleIndonesia,
};
