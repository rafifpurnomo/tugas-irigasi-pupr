
const fs = require("fs");

function readGeoJson(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const geojson = JSON.parse(content);

  if (
    geojson.type !== "FeatureCollection" ||
    !Array.isArray(geojson.features)
  ) {
    throw new Error(`Format GeoJSON tidak valid: ${filePath}`);
  }

  return geojson.features;
}

module.exports = readGeoJson;
