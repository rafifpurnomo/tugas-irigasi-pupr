const { normalizeGeoJsonGeometry } = require("../utils/coordinateUtils");

const { calculateCanalLengthKm } = require("./geometryService");

/**
 * Membuat identitas geometri yang tidak terpengaruh
 * oleh arah garis (awal ke akhir atau sebaliknya).
 */
function getGeometrySignature(geometry) {
  if (!geometry) return null;

  const roundCoordinate = (coordinate) =>
    coordinate.map((value) => Number(value.toFixed(8)));

  if (geometry.type === "LineString") {
    const forward = geometry.coordinates.map(roundCoordinate);
    const reverse = [...forward].reverse();

    const forwardKey = JSON.stringify(forward);
    const reverseKey = JSON.stringify(reverse);

    return forwardKey < reverseKey ? forwardKey : reverseKey;
  }

  if (geometry.type === "MultiLineString") {
    const lines = geometry.coordinates.map((line) => {
      const forward = line.map(roundCoordinate);
      const reverse = [...forward].reverse();

      const forwardKey = JSON.stringify(forward);
      const reverseKey = JSON.stringify(reverse);

      return forwardKey < reverseKey ? forwardKey : reverseKey;
    });

    return JSON.stringify(lines.sort());
  }

  return JSON.stringify(geometry);
}

/**
 * Membersihkan seluruh fitur saluran.
 */
function cleanCanalFeatures(features = []) {
  const hasil = [];
  const kualitas = [];
  const geometriTerdaftar = new Set();

  for (let index = 0; index < features.length; index++) {
    const feature = features[index];
    const properties = feature.properties || {};

    const idRuas = properties.id_ruas || `BARIS-${index + 1}`;

    // Normalisasi koordinat GeoJSON ke WGS84.
    const geometry = normalizeGeoJsonGeometry(feature.geometry);

    if (!geometry) {
      kualitas.push({
        sumber_file: "saluran.geojson",
        pengenal_baris: idRuas,
        kategori: "koordinat_tidak_valid",
        masalah:
          "Geometri saluran tidak valid atau koordinat gagal dinormalisasi",
        tindakan: "Ruas tidak dimasukkan ke data saluran",
      });

      continue;
    }

    if (geometry.type !== "LineString" && geometry.type !== "MultiLineString") {
      kualitas.push({
        sumber_file: "saluran.geojson",
        pengenal_baris: idRuas,
        kategori: "geometri_tidak_valid",
        masalah: `Tipe geometri ${geometry.type} bukan geometri garis`,
        tindakan: "Ruas tidak dimasukkan ke data saluran",
      });

      continue;
    }

    const signature = getGeometrySignature(geometry);

    // Hapus geometri duplikat.
    if (geometriTerdaftar.has(signature)) {
      kualitas.push({
        sumber_file: "saluran.geojson",
        pengenal_baris: idRuas,
        kategori: "ruas_ganda",
        masalah: "Ditemukan geometri saluran duplikat",
        tindakan: "Ruas duplikat dibuang",
      });

      continue;
    }

    geometriTerdaftar.add(signature);

    // Hitung panjang berdasarkan EPSG:32749.
    const panjangKm = calculateCanalLengthKm(geometry);

    hasil.push({
      id_ruas: idRuas,
      nama_saluran: properties.nama_saluran || null,
      tingkat: properties.tingkat || null,
      kondisi: properties.kondisi || null,
      geometri: geometry,
      panjang_km: Number(panjangKm.toFixed(6)),
    });
  }

  return {
    saluran: hasil,
    kualitas,
    jumlah_awal: features.length,
    jumlah_akhir: hasil.length,
    jumlah_duplikat: kualitas.filter((item) => item.kategori === "ruas_ganda")
      .length,
  };
}

module.exports = {
  cleanCanalFeatures,
  getGeometrySignature,
};
