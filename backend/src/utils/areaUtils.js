const proj4 = require("proj4");

const WGS84 = "EPSG:4326";
const UTM_49S = "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs";

/**
 * Menghitung luas satu ring polygon menggunakan
 * rumus Shoelace setelah diproyeksikan ke UTM 49S.
 */
function calculateRingArea(ring) {
  if (!Array.isArray(ring) || ring.length < 4) return 0;

  const projected = ring.map(([lon, lat]) => proj4(WGS84, UTM_49S, [lon, lat]));

  let area = 0;

  for (let i = 0; i < projected.length - 1; i++) {
    const [x1, y1] = projected[i];
    const [x2, y2] = projected[i + 1];

    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

/**
 * Luas polygon = luas ring luar - luas ring lubang.
 */
function calculatePolygonAreaM2(rings) {
  if (!Array.isArray(rings) || rings.length === 0) return 0;

  const outerArea = calculateRingArea(rings[0]);

  const holesArea = rings
    .slice(1)
    .reduce((total, ring) => total + calculateRingArea(ring), 0);

  return Math.max(0, outerArea - holesArea);
}

/**
 * Mendukung Polygon dan MultiPolygon.
 */
function calculateGeometryAreaHa(geometry) {
  if (!geometry) return 0;

  let areaM2 = 0;

  if (geometry.type === "Polygon") {
    areaM2 = calculatePolygonAreaM2(geometry.coordinates);
  } else if (geometry.type === "MultiPolygon") {
    areaM2 = geometry.coordinates.reduce(
      (total, polygon) => total + calculatePolygonAreaM2(polygon),
      0,
    );
  } else {
    return 0;
  }

  return areaM2 / 10000;
}

module.exports = {
  calculateRingArea,
  calculatePolygonAreaM2,
  calculateGeometryAreaHa,
};
