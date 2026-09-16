#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "game-projects/data/projects.json");
const jsPath = path.join(root, "game-projects/data/projects.js");
const sourceUrl = "https://appmagic.rocks/top-charts/live-store-rankings?category=209&country=JP";
const statisticsUrl = "https://appmagic.rocks/api/v2/top/date-hours-statistics";
const rankingApiUrl = "https://appmagic.rocks/api/v2/top/hourly-apps";
const store = 1;
const category = 209;
const limit = 100;
const timeZone = "Asia/Tokyo";

function tokyoParts(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function generatedAt(value = new Date()) {
  const parts = tokyoParts(value);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+09:00`;
}

function localSnapshot(utcDate, utcHour) {
  const instant = new Date(`${utcDate}T${String(utcHour).padStart(2, "0")}:00:00Z`);
  const parts = tokyoParts(instant);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: `${parts.hour}:00`,
    timestamp: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00:00+09:00`,
  };
}

async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0 Chrome/140 Safari/537.36" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function latestGooglePlaySlot(statistics) {
  const candidates = statistics
    .filter((item) => Number(item.store) === store && /^\d{4}-\d{2}-\d{2}$/.test(String(item.date)))
    .flatMap((item) => (item.hours || []).map((hour) => ({
      date: item.date,
      hour: Number(hour),
      timestamp: Date.parse(`${item.date}T${String(hour).padStart(2, "0")}:00:00Z`),
    })))
    .filter((item) => Number.isFinite(item.hour) && Number.isFinite(item.timestamp));
  if (!candidates.length) throw new Error("AppMagic did not return an available Google Play ranking slot");
  return candidates.sort((a, b) => b.timestamp - a.timestamp)[0];
}

function applicationPackages(application) {
  return new Set([
    ...(application?.store_application_ids || []),
    ...(application?.store_ids || []).map((value) => String(value).replace(/^1_/, "")),
  ].map(String));
}

function rankMaps(rows) {
  const maps = { free_rank: new Map(), grossing_rank: new Map() };
  const definitions = [
    ["top_free", "top_free", "free_rank"],
    ["top_grossing", "top_grossing", "grossing_rank"],
  ];
  for (const row of rows) {
    for (const [branch, rankKey, metricType] of definitions) {
      const item = row?.[branch];
      const rank = Number(item?.[rankKey]);
      if (!item?.application || !Number.isFinite(rank)) continue;
      for (const packageName of applicationPackages(item.application)) {
        maps[metricType].set(packageName, { rank, productName: item.application.name || "" });
      }
    }
  }
  return maps;
}

function trackedAndroidReleases(data, snapshotDate) {
  const projectById = new Map(data.projects.map((project) => [project.id, project]));
  const targets = new Map();
  for (const release of data.releases) {
    if (release.platform !== "android" || release.region !== "JP" || !release.storeId) continue;
    if (release.status !== "launched" || !release.actualLaunchDate || release.actualLaunchDate > snapshotDate) continue;
    if (release.storeAvailability === "delisted" || release.storeAvailability === "unavailable") continue;
    if (!targets.has(release.projectId)) {
      targets.set(release.projectId, {
        projectId: release.projectId,
        storeId: String(release.storeId),
        sourceProductName: release.storeProductName || projectById.get(release.projectId)?.productName || release.projectId,
      });
    }
  }
  return [...targets.values()].sort((a, b) => a.projectId.localeCompare(b.projectId));
}

function snapshotFor(target, metricType, match, snapshot) {
  const chartName = metricType === "free_rank" ? "免费游戏榜" : "游戏畅销榜";
  const base = {
    projectId: target.projectId,
    platforms: ["android"],
    region: "JP",
    date: snapshot.date,
    metricType,
    source: "AppMagic",
    sourceUrl,
    storeId: target.storeId,
    sourceProductName: match?.productName || target.sourceProductName,
    scope: `日本 Google Play ${chartName} Top ${limit}；AppMagic ${snapshot.hour}（日本时间）实时榜快照`,
    snapshotHour: snapshot.hour,
    sourceTimestamp: snapshot.timestamp,
    timeZone,
    verifiedAt: snapshot.date,
    performanceLevel: "insufficient",
  };
  if (match) {
    return { ...base, rank: match.rank, display: `日本 Google Play ${chartName}第 ${match.rank} 名` };
  }
  return {
    ...base,
    rankStatus: `not_in_top_${limit}`,
    display: `日本 Google Play ${chartName}未入 Top ${limit}`,
  };
}

(async () => {
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const statistics = await fetchJson(statisticsUrl);
  const slot = latestGooglePlaySlot(statistics);
  const snapshot = localSnapshot(slot.date, slot.hour);
  const apiUrl = new URL(rankingApiUrl);
  apiUrl.searchParams.set("store", String(store));
  apiUrl.searchParams.set("country", "JP");
  apiUrl.searchParams.set("date", slot.date);
  apiUrl.searchParams.set("hour", String(slot.hour));
  apiUrl.searchParams.set("category", String(category));
  apiUrl.searchParams.set("limit", String(limit));

  const payload = await fetchJson(apiUrl);
  if (!Array.isArray(payload.data) || payload.data.length !== limit) {
    throw new Error(`AppMagic returned ${payload.data?.length ?? 0} rows; expected ${limit}`);
  }

  const targets = trackedAndroidReleases(data, snapshot.date);
  const maps = rankMaps(payload.data);
  const observations = targets.flatMap((target) => [
    snapshotFor(target, "free_rank", maps.free_rank.get(target.storeId), snapshot),
    snapshotFor(target, "grossing_rank", maps.grossing_rank.get(target.storeId), snapshot),
  ]);
  const targetIds = new Set(targets.map((target) => target.projectId));
  data.rankSnapshots = (data.rankSnapshots || []).filter((item) => !(
    item.source === "AppMagic"
    && item.date === snapshot.date
    && item.region === "JP"
    && (item.platforms || []).includes("android")
    && ["free_rank", "grossing_rank"].includes(item.metricType)
    && targetIds.has(item.projectId)
  ));
  data.rankSnapshots.push(...observations);
  data.rankSnapshots.sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))
    || String(a.projectId || a.releaseId || "").localeCompare(String(b.projectId || b.releaseId || ""))
    || String(a.metricType || "").localeCompare(String(b.metricType || "")));

  data.meta.generatedAt = generatedAt();
  data.meta.performanceCoverage = {
    ...(data.meta.performanceCoverage || {}),
    appMagicGooglePlayRanks: {
      verifiedAt: snapshot.date,
      sourceTimestamp: snapshot.timestamp,
      market: "JP",
      platform: "android",
      chartCategory: "games",
      snapshotHour: snapshot.hour,
      timeZone,
      positions: limit,
      trackedProjects: targets.length,
      snapshotsAdded: observations.length,
      ranked: observations.filter((item) => Number.isFinite(item.rank)).map((item) => ({
        projectId: item.projectId,
        metricType: item.metricType,
        rank: item.rank,
      })),
      unranked: observations.filter((item) => !Number.isFinite(item.rank)).map((item) => ({
        projectId: item.projectId,
        metricType: item.metricType,
      })),
      sourceUrl,
      apiUrl: apiUrl.toString(),
      note: `AppMagic 日本 Google Play 游戏免费榜与畅销榜最新可用小时快照，公开端点范围为 Top ${limit}；未出现的已上线目标产品保存为未入 Top ${limit}，不推断其精确名次。`,
    },
  };

  const json = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(jsPath, `window.GAME_PROJECTS_DATA = ${json.trimEnd()};\n`);
  console.log(JSON.stringify({
    snapshotDate: snapshot.date,
    snapshotHour: snapshot.hour,
    trackedProjects: targets.length,
    rankedObservations: observations.filter((item) => Number.isFinite(item.rank)).length,
    unrankedObservations: observations.filter((item) => !Number.isFinite(item.rank)).length,
    positions: limit,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
