const proj4 = require("proj4");

const { normalizeCoordinatePair } = require("../utils/coordinateUtils");

const {
  normalizeNomenklatur,
  normalizeJenis,
  normalizeKondisi,
  normalizeDate,
} = require("../utils/normalize");

const WGS84 = "EPSG:4326";
const UTM_49S = "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs";

function projectCoordinate(lon, lat) {
  return proj4(WGS84, UTM_49S, [lon, lat]);
}

function pointToSegmentDistance(point, start, end) {
  const [px, py] = point;
  const [ax, ay] = start;
  const [bx, by] = end;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)),
  );

  const nearestX = ax + t * dx;
  const nearestY = ay + t * dy;

  return Math.hypot(px - nearestX, py - nearestY);
}

function getLines(geometry) {
  if (!geometry) return [];

  if (geometry.type === "LineString") {
    return [geometry.coordinates];
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates;
  }

  return [];
}

function getNearestCanalDistanceMeters(lon, lat, canals) {
  const point = projectCoordinate(lon, lat);
  let minimumDistance = Infinity;

  for (const canal of canals) {
    const lines = getLines(canal.geometri);

    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const start = projectCoordinate(...line[i]);
        const end = projectCoordinate(...line[i + 1]);

        const distance = pointToSegmentDistance(point, start, end);

        minimumDistance = Math.min(minimumDistance, distance);
      }
    }
  }

  return minimumDistance;
}

function keepLatestAssets(rows, kualitas) {
  const latestByCode = new Map();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const kodeAset = String(row.kode_aset || "").trim();

    if (!kodeAset) {
      kualitas.push({
        sumber_file: "aset_bangunan.csv",
        pengenal_baris: `BARIS-${index + 1}`,
        kategori: "kode_aset_tidak_valid",
        masalah: "Kode aset kosong",
        tindakan: "Baris aset tidak dimasukkan",
      });
      continue;
    }

    const current = latestByCode.get(kodeAset);
    const currentDate = normalizeDate(current?.tgl_update);
    const newDate = normalizeDate(row.tgl_update);

    if (!current || (newDate && (!currentDate || newDate > currentDate))) {
      if (current) {
        kualitas.push({
          sumber_file: "aset_bangunan.csv",
          pengenal_baris: kodeAset,
          kategori: "aset_ganda",
          masalah: "Kode aset ditemukan lebih dari satu kali",
          tindakan: "Data dengan tanggal update terbaru dipertahankan",
        });
      }

      latestByCode.set(kodeAset, row);
    } else {
      kualitas.push({
        sumber_file: "aset_bangunan.csv",
        pengenal_baris: kodeAset,
        kategori: "aset_ganda",
        masalah: "Kode aset ditemukan lebih dari satu kali",
        tindakan: "Data duplikat yang lebih lama dibuang",
      });
    }
  }

  return [...latestByCode.values()];
}

function cleanAssets(rows = [], canals = []) {
  const kualitas = [];

  const uniqueRows = keepLatestAssets(rows, kualitas);
  const aset = [];

  for (const row of uniqueRows) {
    const coordinate = normalizeCoordinatePair(row.x, row.y);
    const tanda = [...coordinate.tanda];

    let lon = coordinate.valid ? coordinate.lon : null;
    let lat = coordinate.valid ? coordinate.lat : null;
    let jarakSaluran = null;
    let geometri = null;

    if (coordinate.valid) {
      jarakSaluran = getNearestCanalDistanceMeters(lon, lat, canals);

      if (jarakSaluran > 2000) {
        lon = null;
        lat = null;
        tanda.push("koordinat_tidak_valid");

        kualitas.push({
          sumber_file: "aset_bangunan.csv",
          pengenal_baris: row.kode_aset,
          kategori: "koordinat_tidak_valid",
          masalah: "Aset lebih dari 2 km dari saluran terdekat",
          tindakan: "Koordinat dan geometri aset dikosongkan",
        });
      } else {
        geometri = {
          type: "Point",
          coordinates: [lon, lat],
        };

        if (jarakSaluran > 50) {
          tanda.push("jauh_dari_saluran");

          kualitas.push({
            sumber_file: "aset_bangunan.csv",
            pengenal_baris: row.kode_aset,
            kategori: "jauh_dari_saluran",
            masalah: "Aset berjarak lebih dari 50 meter dari saluran",
            tindakan:
              "Aset dipertahankan tetapi dikecualikan dari analisis dampak",
          });
        }
      }
    } else {
      kualitas.push({
        sumber_file: "aset_bangunan.csv",
        pengenal_baris: row.kode_aset,
        kategori: "koordinat_tidak_valid",
        masalah: "Koordinat kosong atau tidak dapat dinormalisasi",
        tindakan: "Aset dipertahankan tanpa geometri",
      });
    }

    aset.push({
      kode_aset: String(row.kode_aset).trim(),
      nomenklatur: normalizeNomenklatur(row.nomenklatur),
      jenis: normalizeJenis(row.jenis),
      nama_saluran: row.nama_saluran || null,
      kondisi: normalizeKondisi(row.kondisi),
      tahun_bangun: row.tahun_bangun || null,
      tgl_update: normalizeDate(row.tgl_update),
      tgl_kondisi: normalizeDate(row.tgl_update),
      lon,
      lat,
      geometri,
      jarak_saluran: jarakSaluran,
      tanda,
    });
  }

  return {
    aset,
    kualitas,
    jumlah_awal: rows.length,
    jumlah_akhir: aset.length,
  };
}

module.exports = {
  cleanAssets,
  getNearestCanalDistanceMeters,
};
