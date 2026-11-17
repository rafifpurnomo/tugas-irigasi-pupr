const path = require("path");

const readGeoJson = require("../utils/readGeoJson");
const { DATA_DIR } = require("../config/dataConfig");

const { cleanCanalFeatures } = require("../services/canalCleaningService");

const { buildCanalNetwork } = require("../services/canalNetworkService");

function testSyntheticNetwork() {
  const sampleCanals = [
    {
      id_ruas: "TEST-A",
      geometri: {
        type: "LineString",
        coordinates: [
          [110.0, -7.0],
          [110.001, -7.0],
        ],
      },
    },
    {
      id_ruas: "TEST-B",
      geometri: {
        type: "LineString",
        coordinates: [
          [110.001001, -7.0],
          [110.002, -7.0],
        ],
      },
    },
  ];

  const network = buildCanalNetwork(sampleCanals, 5);

  console.log("\n=== TEST JARINGAN SINTETIS ===");
  console.log("Jumlah endpoint:", network.jumlah_endpoint);
  console.log("Jumlah node:", network.jumlah_node);
  console.log("Jumlah endpoint terhubung:", network.jumlah_terhubung);

  console.log("Edges:");
  console.dir(network.edges, { depth: 4 });
}

async function testCanalNetwork() {
  try {
    const filePath = path.join(DATA_DIR, "saluran.geojson");
    const features = readGeoJson(filePath);

    const cleaned = cleanCanalFeatures(features);

    const network = buildCanalNetwork(cleaned.saluran, 5);

    console.log("=== TEST KONEKTIVITAS SALURAN ===");
    console.log("Jumlah ruas:", cleaned.saluran.length);
    console.log("Jumlah endpoint:", network.jumlah_endpoint);
    console.log("Jumlah node:", network.jumlah_node);
    console.log("Jumlah endpoint yang tergabung:", network.jumlah_terhubung);

    console.log("\nContoh node:");
    console.dir(network.nodes.slice(0, 5), { depth: 4 });

    console.log("\nContoh edge:");
    console.dir(network.edges.slice(0, 5), { depth: 4 });

    testSyntheticNetwork();
  } catch (error) {
    console.error("Gagal membangun jaringan saluran:", error);
  }
}

testCanalNetwork();
