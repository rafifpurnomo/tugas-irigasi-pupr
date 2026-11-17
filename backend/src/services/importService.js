const path = require("path");

const readCsv = require("../utils/readCsv");
const readExcel = require("../utils/readExcel");
const readGeoJson = require("../utils/readGeoJson");

const { DATA_DIR } = require("../config/dataConfig");

async function readInitialData() {
  console.log("Mulai membaca file sumber...");

  const aset = await readCsv(path.join(DATA_DIR, "aset_bangunan.csv"));

  const laporan = readExcel(path.join(DATA_DIR, "laporan_penelusuran.xlsx"));

  const saluran = readGeoJson(path.join(DATA_DIR, "saluran.geojson"));

  const petak = readGeoJson(path.join(DATA_DIR, "petak_tersier.geojson"));

  console.log("Lokasi folder data:", DATA_DIR);
  console.log("Seluruh file berhasil dibaca!");

  return {
    aset,
    laporan,
    saluran,
    petak,
  };
}

module.exports = {
  readInitialData,
};
