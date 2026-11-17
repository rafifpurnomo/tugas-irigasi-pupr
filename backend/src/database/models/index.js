const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db_config");

const aset_bangunan = sequelize.define(
  "aset_bangunan",
  {
    kode_aset: { type: DataTypes.STRING(50), primaryKey: true },
    nomenklatur: { type: DataTypes.STRING(100) },
    jenis: { type: DataTypes.STRING(50) },
    nama_saluran: { type: DataTypes.STRING(150) },
    kondisi: { type: DataTypes.STRING(30) },
    tahun_bangun: { type: DataTypes.INTEGER },
    tgl_update: { type: DataTypes.DATEONLY },
    lon: { type: DataTypes.DECIMAL(12, 8), allowNull: true },
    lat: { type: DataTypes.DECIMAL(12, 8), allowNull: true },
    geometri: { type: DataTypes.JSON, allowNull: true },
    tanda: { type: DataTypes.JSON, allowNull: true },
    tgl_kondisi: { type: DataTypes.DATEONLY, allowNull: true },
  },
  {
    tableName: "aset_bangunan",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { name: "idx_aset_nomenklatur", fields: ["nomenklatur"] },
      { name: "idx_aset_kondisi", fields: ["kondisi"] },
      { name: "idx_aset_saluran", fields: ["nama_saluran"] },
    ],
  },
);

const laporan_penelusuran = sequelize.define(
  "laporan_penelusuran",
  {
    id_laporan: { type: DataTypes.STRING(100), primaryKey: true },
    tanggal: { type: DataTypes.DATEONLY },
    petugas: { type: DataTypes.STRING(150) },
    nomenklatur: { type: DataTypes.STRING(100) },
    jenis_kerusakan: { type: DataTypes.STRING(150) },
    kondisi: { type: DataTypes.STRING(30) },
    lat: { type: DataTypes.DECIMAL(12, 8), allowNull: true },
    lon: { type: DataTypes.DECIMAL(12, 8), allowNull: true },
    status: { type: DataTypes.STRING(30) },
    keterangan: { type: DataTypes.TEXT },
    kode_aset: { type: DataTypes.STRING(50), allowNull: true },
    tanda: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "laporan_penelusuran",
    timestamps: false,
    indexes: [
      { name: "idx_laporan_aset", fields: ["kode_aset"] },
      { name: "idx_laporan_tanggal", fields: ["tanggal"] },
      { name: "idx_laporan_status", fields: ["status"] },
    ],
  },
);

const ruas_saluran = sequelize.define(
  "ruas_saluran",
  {
    id_ruas: { type: DataTypes.STRING(100), primaryKey: true },
    nama_saluran: { type: DataTypes.STRING(150) },
    tingkat: { type: DataTypes.STRING(30) },
    kondisi: { type: DataTypes.STRING(30) },
    geometri: { type: DataTypes.JSON, allowNull: false },
    panjang_km: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
  },
  {
    tableName: "ruas_saluran",
    timestamps: false,
    indexes: [
      { name: "idx_saluran_tingkat", fields: ["tingkat"] },
      { name: "idx_saluran_kondisi", fields: ["kondisi"] },
    ],
  },
);

const petak_tersier = sequelize.define(
  "petak_tersier",
  {
    kode_petak: { type: DataTypes.STRING(100), primaryKey: true },
    nama_petak: { type: DataTypes.STRING(150) },
    luas_baku: { type: DataTypes.DECIMAL(12, 4) },
    luas_ha: { type: DataTypes.DECIMAL(12, 4) },
    nomenklatur_sadap: { type: DataTypes.STRING(100) },
    geometri: { type: DataTypes.JSON, allowNull: false },
    tanda: { type: DataTypes.JSON, allowNull: true },
  },
  { tableName: "petak_tersier", timestamps: false },
);

const kualitas_data = sequelize.define(
  "kualitas_data",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    sumber_file: { type: DataTypes.STRING(150), allowNull: false },
    pengenal_baris: { type: DataTypes.STRING(150) },
    kategori: { type: DataTypes.STRING(100), allowNull: false },
    masalah: { type: DataTypes.TEXT },
    tindakan: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "kualitas_data",
    timestamps: false,
    indexes: [{ name: "idx_kualitas_kategori", fields: ["kategori"] }],
  },
);

const import_status = sequelize.define(
  "import_status",
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    selesai: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    selesai_pada: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "import_status",
    timestamps: false,
  },
);

module.exports = {
  sequelize,
  aset_bangunan,
  laporan_penelusuran,
  ruas_saluran,
  petak_tersier,
  kualitas_data,
  import_status,
};
