const {
  normalizeNomenklatur,
  normalizeKondisi,
  normalizeDate,
} = require("../utils/normalize");

const { normalizeLatLon } = require("../utils/coordinateUtils");

const { distanceMeters } = require("./canalNetworkService");

function normalizeStatus(value) {
  const status = String(value || "AKTIF")
    .trim()
    .toUpperCase();

  if (["BATAL", "DIBATALKAN", "CANCELLED", "CANCELED"].includes(status)) {
    return "BATAL";
  }

  return "AKTIF";
}

function findNearestAsset(lon, lat, assets, maxDistance = 30) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  let nearest = null;
  let shortestDistance = Infinity;

  for (const asset of assets) {
    if (
      !Number.isFinite(asset.lon) ||
      !Number.isFinite(asset.lat) ||
      asset.tanda?.includes("koordinat_tidak_valid")
    ) {
      continue;
    }

    const distance = distanceMeters([lon, lat], [asset.lon, asset.lat]);

    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearest = asset;
    }
  }

  if (nearest && shortestDistance <= maxDistance) {
    return {
      asset: nearest,
      distance: shortestDistance,
    };
  }

  return null;
}

function cleanReports(reportRows = [], assets = []) {
  const kualitas = [];
  const laporan = [];

  const assetByNomenklatur = new Map();

  for (const asset of assets) {
    const key = normalizeNomenklatur(asset.nomenklatur);

    if (key && !assetByNomenklatur.has(key)) {
      assetByNomenklatur.set(key, asset);
    }
  }

  const duplicateKeys = new Set();

  for (let index = 0; index < reportRows.length; index++) {
    const row = reportRows[index];

    const idLaporan = String(row.id_laporan || `BARIS-${index + 1}`).trim();

    const nomenklatur = normalizeNomenklatur(row.nomenklatur);
    const kondisi = normalizeKondisi(row.kondisi);
    const tanggal = normalizeDate(row.tanggal);
    const status = normalizeStatus(row.status);

    const tanda = [];
    let kodeAset = null;
    let jarakAset = null;

    // Cari berdasarkan nomenklatur terlebih dahulu.
    let matchedAsset = nomenklatur ? assetByNomenklatur.get(nomenklatur) : null;

    // Jika tidak ditemukan, cari berdasarkan koordinat.
    if (!matchedAsset) {
      const coordinate = normalizeLatLon(row.lat, row.lon);

      if (coordinate.valid) {
        const nearest = findNearestAsset(
          coordinate.lon,
          coordinate.lat,
          assets,
          30,
        );

        if (nearest) {
          matchedAsset = nearest.asset;
          jarakAset = nearest.distance;
          tanda.push("aset_dicocokkan_berdasarkan_jarak");
        }
      }
    }

    if (matchedAsset) {
      kodeAset = matchedAsset.kode_aset;
    } else {
      tanda.push("laporan_tanpa_aset");

      kualitas.push({
        sumber_file: "laporan_penelusuran.xlsx",
        pengenal_baris: idLaporan,
        kategori: "laporan_tanpa_aset",
        masalah: "Laporan tidak berhasil dicocokkan dengan aset",
        tindakan: "Laporan tetap disimpan tanpa relasi aset",
      });
    }

    if (!tanggal) {
      kualitas.push({
        sumber_file: "laporan_penelusuran.xlsx",
        pengenal_baris: idLaporan,
        kategori: "tanggal_tidak_valid",
        masalah: "Tanggal laporan tidak valid",
        tindakan:
          "Laporan tetap disimpan tetapi tidak digunakan untuk kondisi terkini",
      });
    }

    if (!kondisi) {
      kualitas.push({
        sumber_file: "laporan_penelusuran.xlsx",
        pengenal_baris: idLaporan,
        kategori: "kondisi_tidak_valid",
        masalah: "Kondisi laporan tidak dikenali",
        tindakan: "Laporan tetap disimpan dengan kondisi null",
      });
    }

    const coordinate = normalizeLatLon(row.lat, row.lon);

    const normalizedReport = {
      id_laporan: idLaporan,
      tanggal,
      petugas: row.petugas || null,
      nomenklatur,
      jenis_kerusakan: row.jenis_kerusakan || null,
      kondisi,
      lat: coordinate.valid ? coordinate.lat : null,
      lon: coordinate.valid ? coordinate.lon : null,
      status,
      keterangan: row.keterangan || null,
      kode_aset: kodeAset,
      tanda,
      jarak_aset: jarakAset,
    };

    // Duplikasi: aset, tanggal, dan kondisi.
    const duplicateKey = [
      kodeAset || "TANPA_ASET",
      tanggal || "TANPA_TANGGAL",
      kondisi || "TANPA_KONDISI",
    ].join("|");

    if (duplicateKeys.has(duplicateKey)) {
      kualitas.push({
        sumber_file: "laporan_penelusuran.xlsx",
        pengenal_baris: idLaporan,
        kategori: "laporan_ganda",
        masalah:
          "Laporan dengan aset, tanggal, dan kondisi yang sama ditemukan",
        tindakan: "Laporan duplikat dibuang",
      });

      continue;
    }

    duplicateKeys.add(duplicateKey);
    laporan.push(normalizedReport);
  }

  return {
    laporan,
    kualitas,
    jumlah_awal: reportRows.length,
    jumlah_akhir: laporan.length,
    jumlah_tanpa_aset: laporan.filter((item) =>
      item.tanda.includes("laporan_tanpa_aset"),
    ).length,
  };
}

module.exports = {
  cleanReports,
  normalizeStatus,
  findNearestAsset,
};
