const booleanValid = require("@turf/boolean-valid").default;
const unkinkPolygon = require("@turf/unkink-polygon").default;

const { normalizeGeoJsonGeometry } = require("../utils/coordinateUtils");

const { normalizeNomenklatur, parseDecimal } = require("../utils/normalize");

const { calculateGeometryAreaHa } = require("../utils/areaUtils");

function addQuality(kualitas, kodePetak, kategori, masalah, tindakan) {
  kualitas.push({
    sumber_file: "petak_tersier.geojson",
    pengenal_baris: kodePetak,
    kategori,
    masalah,
    tindakan,
  });
}

/**
 * Memperbaiki polygon yang tidak valid.
 * Jika tidak bisa diperbaiki, kembalikan null.
 */
function repairPolygon(geometry) {
  if (!geometry) return null;

  const feature = {
    type: "Feature",
    properties: {},
    geometry,
  };

  try {
    if (booleanValid(feature)) {
      return {
        geometry,
        diperbaiki: false,
      };
    }

    if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
      return null;
    }

    const repaired = unkinkPolygon(feature);

    if (!repaired.features.length) return null;

    const polygons = repaired.features
      .map((item) => item.geometry)
      .filter(
        (item) =>
          item &&
          (item.type === "Polygon" || item.type === "MultiPolygon") &&
          booleanValid({
            type: "Feature",
            properties: {},
            geometry: item,
          }),
      );

    if (!polygons.length) return null;

    let repairedGeometry;

    if (polygons.length === 1) {
      repairedGeometry = polygons[0];
    } else {
      repairedGeometry = {
        type: "MultiPolygon",
        coordinates: polygons.flatMap((item) =>
          item.type === "Polygon" ? [item.coordinates] : item.coordinates,
        ),
      };
    }

    return {
      geometry: repairedGeometry,
      diperbaiki: true,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Menentukan apakah luas sumber menggunakan hektare atau m².
 * Bandingkan kedua kemungkinan dengan luas geometri.
 */
function normalizeAreaToHa(rawValue, geometryAreaHa) {
  const value = parseDecimal(rawValue);

  if (value === null || value <= 0) {
    return {
      luasHa: geometryAreaHa,
      dikonversi: false,
      sumberValid: false,
    };
  }

  const kandidatHa = value;
  const kandidatM2 = value / 10000;

  const selisih = (candidate) =>
    Math.abs(candidate - geometryAreaHa) / Math.max(geometryAreaHa, 0.000001);

  // Jika interpretasi m² lebih mendekati luas geometri,
  // anggap nilai sumber dalam m².
  const gunakanM2 = value >= 1000 && selisih(kandidatM2) < selisih(kandidatHa);

  return {
    luasHa: gunakanM2 ? kandidatM2 : kandidatHa,
    dikonversi: gunakanM2,
    sumberValid: true,
  };
}

function cleanPlotFeatures(features = []) {
  const petak = [];
  const kualitas = [];
  const kodeTerdaftar = new Set();

  for (let index = 0; index < features.length; index++) {
    const feature = features[index];
    const properties = feature.properties || {};

    const kodePetak = String(
      properties.kode_petak || `BARIS-${index + 1}`,
    ).trim();

    // Hapus duplikat berdasarkan kode_petak.
    if (kodeTerdaftar.has(kodePetak)) {
      addQuality(
        kualitas,
        kodePetak,
        "petak_ganda",
        "Kode petak tersier ditemukan lebih dari satu kali",
        "Petak duplikat dibuang",
      );
      continue;
    }

    kodeTerdaftar.add(kodePetak);

    // Normalisasi koordinat geometri ke WGS84.
    const normalizedGeometry = normalizeGeoJsonGeometry(feature.geometry);

    if (
      !normalizedGeometry ||
      !["Polygon", "MultiPolygon"].includes(normalizedGeometry.type)
    ) {
      addQuality(
        kualitas,
        kodePetak,
        "geometri_tidak_valid",
        "Geometri petak kosong, tidak valid, atau bukan polygon",
        "Petak tidak dimasukkan karena geometri tidak dapat digunakan",
      );
      continue;
    }

    // Periksa dan coba perbaiki polygon.
    const repairResult = repairPolygon(normalizedGeometry);

    if (!repairResult) {
      addQuality(
        kualitas,
        kodePetak,
        "geometri_tidak_valid",
        "Polygon tidak berhasil diperbaiki",
        "Petak tidak dimasukkan",
      );
      continue;
    }

    const geometry = repairResult.geometry;

    if (repairResult.diperbaiki) {
      addQuality(
        kualitas,
        kodePetak,
        "geometri_diperbaiki",
        "Ditemukan polygon yang tidak valid",
        "Geometri diperbaiki menggunakan proses unkink",
      );
    }

    const geometryAreaHa = calculateGeometryAreaHa(geometry);

    if (!Number.isFinite(geometryAreaHa) || geometryAreaHa <= 0) {
      addQuality(
        kualitas,
        kodePetak,
        "geometri_tidak_valid",
        "Luas geometri hasil perhitungan tidak valid",
        "Petak tidak dimasukkan",
      );
      continue;
    }

    const areaResult = normalizeAreaToHa(properties.luas_baku, geometryAreaHa);

    if (areaResult.dikonversi) {
      addQuality(
        kualitas,
        kodePetak,
        "luas_dikonversi",
        "Luas baku sumber terdeteksi menggunakan satuan m²",
        "Nilai luas dikonversi menjadi hektare",
      );
    }

    // Jika luas atribut berbeda lebih dari 20%,
    // gunakan luas hasil perhitungan geometri.
    const selisihPersen = areaResult.sumberValid
      ? Math.abs(areaResult.luasHa - geometryAreaHa) / geometryAreaHa
      : 0;

    let luasHa = areaResult.luasHa;

    if (!areaResult.sumberValid || selisihPersen > 0.2) {
      luasHa = geometryAreaHa;

      addQuality(
        kualitas,
        kodePetak,
        "luas_tidak_wajar",
        "Luas atribut kosong/tidak valid atau berbeda lebih dari 20% dari luas geometri",
        "Luas geometri digunakan sebagai luas baku",
      );
    }

    petak.push({
      kode_petak: kodePetak,
      nama_petak: properties.nama_petak || null,
      luas_baku: Number(luasHa.toFixed(4)),
      luas_ha: Number(luasHa.toFixed(4)),
      nomenklatur_sadap: normalizeNomenklatur(properties.nomenklatur_sadap),
      geometri: geometry,
      tanda: repairResult.diperbaiki ? ["geometri_diperbaiki"] : [],
    });
  }

  return {
    petak,
    kualitas,
    jumlah_awal: features.length,
    jumlah_akhir: petak.length,
    jumlah_duplikat: kualitas.filter((item) => item.kategori === "petak_ganda")
      .length,
  };
}

module.exports = {
  cleanPlotFeatures,
  repairPolygon,
  normalizeAreaToHa,
};
