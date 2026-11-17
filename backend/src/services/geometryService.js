// src/services/geometryService.js

const turf = require("@turf/turf");
const proj4 = require("proj4");

const WGS84 = "EPSG:4326";
const UTM_49S = "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs";

/**
 * Mengubah geometry menjadi Feature agar bisa diproses Turf.
 */
function toFeature(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return null;
  }

  return turf.feature(geometry);
}

/**
 * Menghitung jarak titik ke satu ruas saluran dalam meter.
 */
function distanceToCanal(lon, lat, canalGeometry) {
  const point = turf.point([lon, lat]);
  const line = toFeature(canalGeometry);

  if (!line) return Infinity;

  try {
    return turf.pointToLineDistance(point, line, {
      units: "meters",
    });
  } catch (error) {
    return Infinity;
  }
}

/**
 * Mencari jarak terdekat aset ke seluruh ruas saluran.
 */
function findNearestCanal(lon, lat, canals = []) {
  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    !Array.isArray(canals) ||
    canals.length === 0
  ) {
    return {
      distance: Infinity,
      canal: null,
    };
  }

  let nearestDistance = Infinity;
  let nearestCanal = null;

  for (const canal of canals) {
    const geometry = canal.geometry || canal.geometri;

    const distance = distanceToCanal(lon, lat, geometry);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCanal = canal;
    }
  }

  return {
    distance: nearestDistance,
    canal: nearestCanal,
  };
}

/**
 * Validasi posisi aset terhadap saluran.
 *
 * > 2000 m : koordinat_tidak_valid, geometri dihapus.
 * > 50 m   : jauh_dari_saluran.
 * <= 50 m  : posisi dapat digunakan untuk analisis dampak.
 */
function validateAssetLocation(asset, canals = []) {
  const tanda = Array.isArray(asset.tanda) ? [...asset.tanda] : [];

  const lon = Number(asset.lon);
  const lat = Number(asset.lat);

  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    asset.lon === null ||
    asset.lat === null
  ) {
    return {
      ...asset,
      lon: null,
      lat: null,
      geometri: null,
      tanda: addFlag(tanda, "koordinat_tidak_valid"),
      jarak_saluran: null,
    };
  }

  const nearest = findNearestCanal(lon, lat, canals);

  if (!Number.isFinite(nearest.distance)) {
    return {
      ...asset,
      lon: null,
      lat: null,
      geometri: null,
      tanda: addFlag(tanda, "koordinat_tidak_valid"),
      jarak_saluran: null,
    };
  }

  if (nearest.distance > 2000) {
    return {
      ...asset,
      lon: null,
      lat: null,
      geometri: null,
      tanda: addFlag(tanda, "koordinat_tidak_valid"),
      jarak_saluran: nearest.distance,
    };
  }

  if (nearest.distance > 50) {
    return {
      ...asset,
      geometri: turf.point([lon, lat]).geometry,
      tanda: addFlag(tanda, "jauh_dari_saluran"),
      jarak_saluran: nearest.distance,
    };
  }

  return {
    ...asset,
    geometri: turf.point([lon, lat]).geometry,
    tanda: tanda.filter((flag) => flag !== "jauh_dari_saluran"),
    jarak_saluran: nearest.distance,
  };
}

function addFlag(flags, flag) {
  return flags.includes(flag) ? flags : [...flags, flag];
}

/**
 * Menghitung panjang satu segmen pada bidang UTM 49S.
 */
function segmentLengthMeters(start, end) {
  const [x1, y1] = proj4(WGS84, UTM_49S, start);
  const [x2, y2] = proj4(WGS84, UTM_49S, end);

  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Mendapatkan semua bagian garis.
 * Mendukung LineString dan MultiLineString.
 */
function getLineParts(geometry) {
  if (!geometry) return [];

  if (geometry.type === "LineString") {
    return [geometry.coordinates];
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates;
  }

  return [];
}

/**
 * Menghitung panjang geometri saluran dalam kilometer.
 */
function calculateCanalLengthKm(geometry) {
  const parts = getLineParts(geometry);

  let totalMeters = 0;

  for (const coordinates of parts) {
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalMeters += segmentLengthMeters(coordinates[i], coordinates[i + 1]);
    }
  }

  return totalMeters / 1000;
}

module.exports = {
  distanceToCanal,
  findNearestCanal,
  validateAssetLocation,
  calculateCanalLengthKm,
};
