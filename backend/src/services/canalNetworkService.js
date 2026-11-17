const proj4 = require("proj4");

const WGS84 = "EPSG:4326";
const UTM_49S = "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs";

function projectCoordinate([lon, lat]) {
  return proj4(WGS84, UTM_49S, [lon, lat]);
}

function distanceMeters(pointA, pointB) {
  const [x1, y1] = projectCoordinate(pointA);
  const [x2, y2] = projectCoordinate(pointB);

  return Math.hypot(x2 - x1, y2 - y1);
}

// Union-Find untuk menggabungkan endpoint yang berdekatan.
class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, index) => index);
    this.rank = Array(size).fill(0);
  }

  find(value) {
    if (this.parent[value] !== value) {
      this.parent[value] = this.find(this.parent[value]);
    }

    return this.parent[value];
  }

  union(a, b) {
    let rootA = this.find(a);
    let rootB = this.find(b);

    if (rootA === rootB) return;

    if (this.rank[rootA] < this.rank[rootB]) {
      [rootA, rootB] = [rootB, rootA];
    }

    this.parent[rootB] = rootA;

    if (this.rank[rootA] === this.rank[rootB]) {
      this.rank[rootA]++;
    }
  }
}

function getLineComponents(geometry) {
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
 * Membangun jaringan berdasarkan endpoint saluran.
 * Endpoint dengan jarak <= toleranceMeters dianggap terhubung.
 */
function buildCanalNetwork(canals = [], toleranceMeters = 5) {
  const endpoints = [];
  const components = [];

  for (const canal of canals) {
    const lines = getLineComponents(canal.geometri);

    lines.forEach((coordinates, componentIndex) => {
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return;
      }

      const startIndex = endpoints.length;

      endpoints.push({
        index: startIndex,
        id_ruas: canal.id_ruas,
        component_index: componentIndex,
        position: coordinates[0],
        end_type: "awal",
      });

      const endIndex = endpoints.length;

      endpoints.push({
        index: endIndex,
        id_ruas: canal.id_ruas,
        component_index: componentIndex,
        position: coordinates[coordinates.length - 1],
        end_type: "akhir",
      });

      components.push({
        id_ruas: canal.id_ruas,
        component_index: componentIndex,
        coordinates,
        start_index: startIndex,
        end_index: endIndex,
      });
    });
  }

  const unionFind = new UnionFind(endpoints.length);

  // Bandingkan setiap pasangan endpoint.
  for (let i = 0; i < endpoints.length; i++) {
    for (let j = i + 1; j < endpoints.length; j++) {
      const distance = distanceMeters(
        endpoints[i].position,
        endpoints[j].position,
      );

      if (distance <= toleranceMeters) {
        unionFind.union(i, j);
      }
    }
  }

  // Kelompokkan endpoint berdasarkan root Union-Find.
  const groups = new Map();

  for (const endpoint of endpoints) {
    const root = unionFind.find(endpoint.index);

    if (!groups.has(root)) {
      groups.set(root, []);
    }

    groups.get(root).push(endpoint);
  }

  const rootToNodeId = new Map();
  const nodes = [];

  let nodeNumber = 1;

  for (const [root, members] of groups.entries()) {
    const projectedPoints = members.map((member) =>
      projectCoordinate(member.position),
    );

    // Titik representatif dihitung dari rata-rata koordinat UTM.
    const averageX =
      projectedPoints.reduce((sum, point) => sum + point[0], 0) /
      projectedPoints.length;

    const averageY =
      projectedPoints.reduce((sum, point) => sum + point[1], 0) /
      projectedPoints.length;

    const [lon, lat] = proj4(UTM_49S, WGS84, [averageX, averageY]);

    const nodeId = `NODE-${String(nodeNumber).padStart(4, "0")}`;

    rootToNodeId.set(root, nodeId);

    nodes.push({
      id: nodeId,
      lon,
      lat,
      jumlah_endpoint: members.length,
      endpoints: members.map((member) => ({
        id_ruas: member.id_ruas,
        component_index: member.component_index,
        end_type: member.end_type,
      })),
    });

    nodeNumber++;
  }

  // Setiap komponen garis menjadi edge jaringan.
  const edges = components.map((component) => ({
    id_ruas: component.id_ruas,
    component_index: component.component_index,
    from_node: rootToNodeId.get(unionFind.find(component.start_index)),
    to_node: rootToNodeId.get(unionFind.find(component.end_index)),
    coordinates: component.coordinates,
  }));

  return {
    nodes,
    edges,
    jumlah_endpoint: endpoints.length,
    jumlah_node: nodes.length,
    jumlah_terhubung: endpoints.length - nodes.length,
    tolerance_meters: toleranceMeters,
  };
}

module.exports = {
  buildCanalNetwork,
  distanceMeters,
};
