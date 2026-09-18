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
const source = "SteamCharts";
const monthNumbers = new Map([
  ["January", "01"], ["February", "02"], ["March", "03"], ["April", "04"],
  ["May", "05"], ["June", "06"], ["July", "07"], ["August", "08"],
  ["September", "09"], ["October", "10"], ["November", "11"], ["December", "12"],
]);

function cleanCell(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#43;/g, "+")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMonthlyRows(html) {
  const rows = [];
  for (const rowHtml of html.match(/<tr\b[\s\S]*?<\/tr>/g) || []) {
    const cells = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((match) => cleanCell(match[1]));
    if (cells.length < 5) continue;
    const monthMatch = cells[0].match(/^([A-Za-z]+)\s+(20\d{2})$/);
    if (!monthMatch || !monthNumbers.has(monthMatch[1])) continue;
    const date = `${monthMatch[2]}-${monthNumbers.get(monthMatch[1])}-01`;
    const average = Number(cells[1].replaceAll(",", ""));
    if (!Number.isFinite(average) || average < 0) continue;
    rows.push({ date, monthLabel: cells[0], average });
  }
  return rows;
}

async function fetchMonthly(appId) {
  const sourceUrl = `https://steamcharts.com/app/${appId}`;
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; 5XGames-IP-Research/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return { sourceUrl, rows: parseMonthlyRows(html) };
}

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

const appProjects = new Map();
for (const release of data.releases || []) {
  if (release.platform !== "steam" || !/^\d+$/.test(String(release.storeId || ""))) continue;
  if (!String(release.sourceUrl || "").includes("store.steampowered.com")) continue;
  if (!appProjects.has(String(release.storeId))) {
    appProjects.set(String(release.storeId), release.projectId);
  }
}

const targets = [...appProjects].map(([appId, projectId]) => ({ appId, projectId }));

(async () => {
  const fetched = await mapWithConcurrency(targets, 3, async (target) => ({
    ...target,
    ...(await fetchMonthly(target.appId)),
  }));
  const successful = fetched.filter((result) => Array.isArray(result.rows) && result.rows.length > 0);
  const failed = fetched.filter((result) => result.error || !result.rows?.length);
  const refreshedProjectIds = new Set(successful.map((result) => result.projectId));
  const coverageStart = successful.flatMap((result) => result.rows.map((row) => row.date)).sort()[0] || "";

  data.rankSnapshots = (data.rankSnapshots || []).filter((snapshot) => !(
    snapshot.source === source
    && snapshot.metricType === "average_concurrent_users"
    && refreshedProjectIds.has(snapshot.projectId)
  ));

  let added = 0;
  for (const result of successful) {
    for (const row of result.rows) {
      data.rankSnapshots.push({
        projectId: result.projectId,
        platforms: ["steam"],
        region: "GLOBAL",
        date: row.date,
        metricType: "average_concurrent_users",
        value: row.average,
        display: `Steam 月均同时在线 ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(row.average)}`,
        scope: `Steam 全球月度平均同时在线（${row.monthLabel}）`,
        source,
        sourceUrl: result.sourceUrl,
        verifiedAt,
        performanceLevel: "insufficient",
      });
      added += 1;
    }
  }

  const allSteamChartsSnapshots = data.rankSnapshots.filter((snapshot) => (
    snapshot.source === source && snapshot.metricType === "average_concurrent_users"
  ));
  const allSteamChartsProjectIds = new Set(allSteamChartsSnapshots.map((snapshot) => snapshot.projectId).filter(Boolean));
  const actualCoverageStart = allSteamChartsSnapshots.map((snapshot) => snapshot.date).filter(Boolean).sort()[0] || coverageStart;

  data.rankSnapshots.sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))
    || String(a.projectId || a.releaseId || "").localeCompare(String(b.projectId || b.releaseId || ""))
    || String(a.metricType || "").localeCompare(String(b.metricType || "")));
  data.meta.schemaVersion = data.meta.schemaVersion || "2.4";
  data.meta.phase = Math.max(Number(data.meta.phase) || 0, 19);
  data.meta.generatedAt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(now).replace(" ", "T") + "+09:00";
  data.meta.performanceCoverage = {
    ...(data.meta.performanceCoverage || {}),
    steamCharts: {
      verifiedAt,
      coverageStart: actualCoverageStart,
      metric: "monthly_average_concurrent_players",
      projects: allSteamChartsProjectIds.size,
      snapshots: allSteamChartsSnapshots.length,
      refreshedProjects: successful.length,
      snapshotsAddedOrUpdated: added,
      source,
      unavailable: failed.map(({ appId, projectId, error }) => ({
        appId,
        projectId,
        reason: error || "no monthly rows",
      })),
    },
  };

  const json = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(jsPath, `window.GAME_PROJECTS_DATA = ${json.trimEnd()};\n`);

  console.log(JSON.stringify({
    targets: targets.length,
    successful: successful.length,
    failed: failed.map(({ appId, projectId, error }) => ({ appId, projectId, error: error || "no monthly rows" })),
    snapshotsAdded: added,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
