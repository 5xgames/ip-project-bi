const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "game-projects/data/projects.json");
const jsPath = path.join(root, "game-projects/data/projects.js");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const now = new Date();
const verifiedAt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(now);
const source = "Video Game Insights (Sensor Tower)";
const apiBase = "https://app.sensortower.com/vgi/api/v1/game";
const numberFormat = new Intl.NumberFormat("en-US");
const platformFields = [
  { platform: "steam", field: "units_sold_vgi", label: "Steam" },
  { platform: "playstation", field: "units_sold_ps", label: "PlayStation" },
  { platform: "xbox", field: "units_sold_xbox", label: "Xbox" },
];

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        results[index] = { ...items[index], error: error.message };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function fetchGame(target) {
  const apiUrl = `${apiBase}/${target.appId}`;
  const response = await fetch(apiUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; 5XGames-IP-Research/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const game = await response.json();
  if (!game?.slug || Number(game.steam_id) !== Number(target.appId)) throw new Error("game identity mismatch");
  return { ...target, game, apiUrl };
}

const appProjects = new Map();
for (const release of data.releases || []) {
  if (release.platform !== "steam" || !/^\d+$/.test(String(release.storeId || ""))) continue;
  if (!String(release.sourceUrl || "").includes("store.steampowered.com")) continue;
  if (!appProjects.has(String(release.storeId))) appProjects.set(String(release.storeId), release.projectId);
}
const targets = [...appProjects].map(([appId, projectId]) => ({ appId, projectId }));

(async () => {
  const fetched = await mapWithConcurrency(targets, 3, fetchGame);
  const successful = fetched.filter((result) => result.game);
  const failed = fetched.filter((result) => result.error);
  const refreshedProjects = new Set(successful.map((result) => result.projectId));

  data.rankSnapshots = (data.rankSnapshots || []).filter((snapshot) => !(
    snapshot.source === source
    && snapshot.metricType === "estimated_sales"
    && snapshot.date === verifiedAt
    && refreshedProjects.has(snapshot.projectId)
  ));

  const counts = { steam: 0, playstation: 0, xbox: 0 };
  for (const result of successful) {
    const publicPageUrl = `https://app.sensortower.com/vgi/game/${result.game.slug}`;
    for (const definition of platformFields) {
      const value = Number(result.game[definition.field]);
      if (!Number.isFinite(value) || value <= 0) continue;
      data.rankSnapshots.push({
        projectId: result.projectId,
        platforms: [definition.platform],
        region: "GLOBAL",
        date: verifiedAt,
        metricType: "estimated_sales",
        value,
        display: `VGI ${definition.label} 累计销量估算 ${numberFormat.format(value)} 份`,
        scope: "全球累计销量估算；第三方模型值，非发行商披露",
        source,
        sourceUrl: publicPageUrl,
        apiSourceUrl: result.apiUrl,
        sourceProductName: result.game.name,
        steamAppId: Number(result.appId),
        verifiedAt,
        estimated: true,
        performanceLevel: "insufficient",
      });
      counts[definition.platform] += 1;
    }
  }

  const historicalSalesSnapshots = data.rankSnapshots.filter((snapshot) => (
    snapshot.source === source && snapshot.metricType === "estimated_sales"
  ));
  const historicalSalesProjectIds = new Set(historicalSalesSnapshots.map((snapshot) => snapshot.projectId).filter(Boolean));

  data.rankSnapshots.sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))
    || String(a.projectId || a.releaseId || "").localeCompare(String(b.projectId || b.releaseId || ""))
    || String(a.metricType || "").localeCompare(String(b.metricType || "")));
  data.meta.schemaVersion = data.meta.schemaVersion || "2.4";
  data.meta.phase = Math.max(Number(data.meta.phase) || 0, 20);
  data.meta.generatedAt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(now).replace(" ", "T") + "+09:00";
  data.meta.performanceCoverage = {
    ...(data.meta.performanceCoverage || {}),
    videoGameInsights: {
      verifiedAt,
      metric: "estimated_lifetime_unit_sales",
      projects: historicalSalesProjectIds.size,
      targetsQueried: targets.length,
      snapshots: historicalSalesSnapshots.length,
      snapshotsAddedOrUpdated: Object.values(counts).reduce((total, count) => total + count, 0),
      platforms: counts,
      source,
      unavailable: failed.map(({ appId, projectId, error }) => ({ appId, projectId, reason: error })),
    },
  };

  const json = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(jsPath, `window.GAME_PROJECTS_DATA = ${json.trimEnd()};\n`);

  console.log(JSON.stringify({
    targets: targets.length,
    successful: successful.length,
    failed: failed.map(({ appId, projectId, error }) => ({ appId, projectId, error })),
    salesSnapshots: counts,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
