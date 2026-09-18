#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "game-projects/data/projects.json");
const jsPath = path.join(root, "game-projects/data/projects.js");
const statisticsUrl = "https://appmagic.rocks/api/v2/top/date-hours-statistics";
const rankingApiUrl = "https://appmagic.rocks/api/v2/top/hourly-apps";
const limit = 100;
const maxJobs = Math.max(0, Number(process.env.MAX_JOBS) || 0);
const concurrency = Math.max(1, Number(process.env.APP_MAGIC_CONCURRENCY) || 1);
const verifiedAt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const stores = [
  { platform: "android", store: 1, category: 209, label: "Google Play" },
  { platform: "ios", store: 2, category: 96, label: "App Store" },
];

const markets = [
  { region: "CN", country: "CN", timeZone: "Asia/Shanghai", targetUtcHour: 4, platforms: ["ios"], label: "中国大陆" },
  { region: "HK", country: "HK", timeZone: "Asia/Hong_Kong", targetUtcHour: 4, label: "香港" },
  { region: "TW", country: "TW", timeZone: "Asia/Taipei", targetUtcHour: 4, label: "台湾" },
  { region: "JP", country: "JP", timeZone: "Asia/Tokyo", targetUtcHour: 3, label: "日本" },
  { region: "KR", country: "KR", timeZone: "Asia/Seoul", targetUtcHour: 3, label: "韩国" },
  { region: "SEA", country: "SG", timeZone: "Asia/Singapore", targetUtcHour: 4, label: "东南亚（新加坡样本）" },
  { region: "US", country: "US", timeZone: "America/Los_Angeles", targetUtcHour: 19, label: "美国" },
];
const asianMarketRegions = new Set(["CN", "HK", "TW", "JP", "KR", "SEA"]);

function releaseRegionApplies(releaseRegion, marketRegion) {
  return releaseRegion === marketRegion
    || releaseRegion === "GLOBAL"
    || (releaseRegion === "ASIA" && asianMarketRegions.has(marketRegion));
}

function generatedAt() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+09:00`;
}

function localSnapshot(utcDate, utcHour, timeZone) {
  const instant = new Date(`${utcDate}T${String(utcHour).padStart(2, "0")}:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: `${values.hour}:${values.minute}`,
    utcDate,
    utcHour,
    sourceTimestamp: instant.toISOString(),
  };
}

async function fetchJson(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; 5XGames-IP-Research/1.0)",
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text();
        const error = new Error(`HTTP ${response.status}: ${body}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const backoff = error.status === 429 ? attempt * 5000 : attempt * 750;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function mapWithConcurrency(items, limitConcurrency, worker) {
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
  await Promise.all(Array.from({ length: Math.min(limitConcurrency, items.length) }, run));
  return results;
}

function applicationStoreIds(application) {
  return new Set([
    ...(application?.store_application_ids || []),
    ...(application?.store_ids || []).map((value) => String(value).replace(/^\d+_/, "")),
  ].map(String));
}

function rankMaps(rows) {
  const maps = { free_rank: new Map(), grossing_rank: new Map() };
  for (const row of rows) {
    for (const [branch, field, metricType] of [
      ["top_free", "top_free", "free_rank"],
      ["top_grossing", "top_grossing", "grossing_rank"],
    ]) {
      const item = row?.[branch];
      const rank = Number(item?.[field]);
      if (!item?.application || !Number.isFinite(rank)) continue;
      for (const storeId of applicationStoreIds(item.application)) {
        maps[metricType].set(storeId, { rank, productName: item.application.name || "" });
      }
    }
  }
  return maps;
}

function targetReleases(data, market, storeDefinition, snapshotDate) {
  if (market.platforms && !market.platforms.includes(storeDefinition.platform)) return [];
  const projectById = new Map(data.projects.map((project) => [project.id, project]));
  const targets = new Map();
  for (const release of data.releases) {
    if (!releaseRegionApplies(release.region, market.region) || release.platform !== storeDefinition.platform || !release.storeId) continue;
    const launchDate = String(release.actualLaunchDate || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    const serviceEndDate = String(release.serviceEndDate || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    if (!launchDate || launchDate > snapshotDate || serviceEndDate && serviceEndDate < snapshotDate) continue;
    if (["cancelled", "upcoming", "announced", "preregister", "testing"].includes(release.status)) continue;
    const specificity = release.region === market.region ? 2 : release.region === "ASIA" ? 1 : 0;
    const previous = targets.get(release.projectId);
    if (!previous || specificity > previous.specificity) {
      targets.set(release.projectId, {
        projectId: release.projectId,
        releaseId: release.id,
        storeId: String(release.storeId),
        sourceProductName: release.storeProductName || projectById.get(release.projectId)?.productName || release.projectId,
        specificity,
      });
    }
  }
  return [...targets.values()].sort((a, b) => a.projectId.localeCompare(b.projectId));
}

function snapshotFor(target, metricType, match, context) {
  const chartName = metricType === "free_rank" ? "免费游戏榜" : "游戏畅销榜";
  const base = {
    projectId: target.projectId,
    platforms: [context.storeDefinition.platform],
    region: context.market.region,
    date: context.snapshot.date,
    metricType,
    source: "AppMagic",
    sourceUrl: `https://appmagic.rocks/top-charts/live-store-rankings?category=${context.storeDefinition.category}&country=${context.market.country}`,
    apiSourceUrl: context.apiUrl,
    storeId: target.storeId,
    sourceProductName: match?.productName || target.sourceProductName,
    scope: `${context.market.label} ${context.storeDefinition.label} ${chartName} Top ${limit}；AppMagic 历史逐小时榜单 ${context.snapshot.hour}（${context.market.timeZone}）快照`,
    snapshotHour: context.snapshot.hour,
    sourceTimestamp: context.snapshot.sourceTimestamp,
    timeZone: context.market.timeZone,
    representativeCountry: context.market.region === "SEA" ? context.market.country : undefined,
    sourceMarketCountry: context.market.country,
    verifiedAt,
    performanceLevel: "insufficient",
  };
  if (match) return { ...base, rank: match.rank, display: `${context.market.label} ${context.storeDefinition.label} ${chartName}第 ${match.rank} 名` };
  return {
    ...base,
    rankStatus: `not_in_top_${limit}`,
    display: `${context.market.label} ${context.storeDefinition.label} ${chartName}未入 Top ${limit}`,
  };
}

function snapshotKey(snapshot) {
  return [
    snapshot.projectId,
    snapshot.region,
    snapshot.date,
    snapshot.metricType,
    (snapshot.platforms || []).join(","),
  ].join("|");
}

function hasMatchingLaunchedRelease(data, snapshot) {
  if (!snapshot.projectId || !snapshot.date || !["free_rank", "grossing_rank"].includes(snapshot.metricType)) return true;
  const platforms = snapshot.platforms || [];
  return data.releases.some((release) => {
    if (release.projectId !== snapshot.projectId || !releaseRegionApplies(release.region, snapshot.region) || !platforms.includes(release.platform)) return false;
    const launchDate = String(release.actualLaunchDate || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    const serviceEndDate = String(release.serviceEndDate || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
    return launchDate && launchDate <= snapshot.date && (!serviceEndDate || serviceEndDate >= snapshot.date);
  });
}

(async () => {
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const statistics = await fetchJson(statisticsUrl);
  const existingAppMagicKeys = new Set((data.rankSnapshots || [])
    .filter((snapshot) => snapshot.source === "AppMagic" && ["free_rank", "grossing_rank"].includes(snapshot.metricType))
    .map(snapshotKey));
  const jobs = [];
  let skippedCompleteJobs = 0;
  for (const market of markets) {
    for (const storeDefinition of stores) {
      if (market.platforms && !market.platforms.includes(storeDefinition.platform)) continue;
      const storeDates = statistics.filter((item) => Number(item.store) === storeDefinition.store
        && /^\d{4}-\d{2}-\d{2}$/.test(String(item.date))
        && Array.isArray(item.hours) && item.hours.length > 0);
      for (const item of storeDates) {
        const utcHour = item.hours.includes(market.targetUtcHour)
          ? market.targetUtcHour
          : item.hours.reduce((best, hour) => Math.abs(hour - market.targetUtcHour) < Math.abs(best - market.targetUtcHour) ? hour : best);
        const snapshot = localSnapshot(item.date, utcHour, market.timeZone);
        const targets = targetReleases(data, market, storeDefinition, snapshot.date);
        if (!targets.length) continue;
        const complete = targets.every((target) => ["free_rank", "grossing_rank"].every((metricType) => existingAppMagicKeys.has(snapshotKey({
          projectId: target.projectId,
          region: market.region,
          date: snapshot.date,
          metricType,
          platforms: [storeDefinition.platform],
        }))));
        if (complete) skippedCompleteJobs += 1;
        else jobs.push({ market, storeDefinition, snapshot, targets });
      }
    }
  }

  const selectedJobs = maxJobs > 0 ? jobs.slice(0, maxJobs) : jobs;
  const fetched = await mapWithConcurrency(selectedJobs, concurrency, async (job) => {
    const apiUrl = new URL(rankingApiUrl);
    apiUrl.searchParams.set("store", String(job.storeDefinition.store));
    apiUrl.searchParams.set("country", job.market.country);
    apiUrl.searchParams.set("date", job.snapshot.utcDate);
    apiUrl.searchParams.set("hour", String(job.snapshot.utcHour));
    apiUrl.searchParams.set("category", String(job.storeDefinition.category));
    apiUrl.searchParams.set("limit", String(limit));
    const payload = await fetchJson(apiUrl);
    if (!Array.isArray(payload.data) || payload.data.length === 0) throw new Error("AppMagic returned no rows");
    const maps = rankMaps(payload.data);
    const context = { ...job, apiUrl: apiUrl.toString() };
    const observations = job.targets.flatMap((target) => [
      snapshotFor(target, "free_rank", maps.free_rank.get(target.storeId), context),
      snapshotFor(target, "grossing_rank", maps.grossing_rank.get(target.storeId), context),
    ]);
    return { ...job, apiUrl: apiUrl.toString(), rows: payload.data.length, observations };
  });

  const successful = fetched.filter((result) => Array.isArray(result.observations));
  const failed = fetched.filter((result) => result.error);
  const observations = successful.flatMap((result) => result.observations);
  const observationsByKey = new Map(observations.map((snapshot) => [snapshotKey(snapshot), snapshot]));
  let invalidPrelaunchRemoved = 0;
  const retained = [];
  for (const snapshot of data.rankSnapshots || []) {
    if (snapshot.source === "AppMagic" && ["free_rank", "grossing_rank"].includes(snapshot.metricType)
      && !hasMatchingLaunchedRelease(data, snapshot)) {
      invalidPrelaunchRemoved += 1;
      continue;
    }
    const key = snapshotKey(snapshot);
    const replacement = observationsByKey.get(key);
    if (snapshot.source === "AppMagic" && replacement) {
      if (Number.isFinite(Number(snapshot.rank)) && !Number.isFinite(Number(replacement.rank))) {
        observationsByKey.set(key, snapshot);
      }
      continue;
    }
    retained.push(snapshot);
  }
  data.rankSnapshots = [...retained, ...observationsByKey.values()].sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))
    || String(a.projectId || a.releaseId || "").localeCompare(String(b.projectId || b.releaseId || ""))
    || String(a.region || "").localeCompare(String(b.region || ""))
    || String((a.platforms || []).join(",")).localeCompare(String((b.platforms || []).join(",")))
    || String(a.metricType || "").localeCompare(String(b.metricType || "")));

  const historicalMobileSnapshots = data.rankSnapshots.filter((snapshot) => snapshot.source === "AppMagic"
    && snapshot.sourceMarketCountry
    && ["free_rank", "grossing_rank"].includes(snapshot.metricType));
  const dates = [...new Set(historicalMobileSnapshots.map((snapshot) => snapshot.date))].sort();
  const projects = [...new Set(historicalMobileSnapshots.map((snapshot) => snapshot.projectId))];
  const historicalSnapshotKeys = new Set(historicalMobileSnapshots.map(snapshotKey));
  const currentAvailableJobKeys = new Set();
  for (const market of markets) {
    for (const storeDefinition of stores) {
      if (market.platforms && !market.platforms.includes(storeDefinition.platform)) continue;
      for (const item of statistics.filter((entry) => Number(entry.store) === storeDefinition.store && Array.isArray(entry.hours) && entry.hours.length)) {
        const utcHour = item.hours.includes(market.targetUtcHour)
          ? market.targetUtcHour
          : item.hours.reduce((best, hour) => Math.abs(hour - market.targetUtcHour) < Math.abs(best - market.targetUtcHour) ? hour : best);
        const local = localSnapshot(item.date, utcHour, market.timeZone);
        currentAvailableJobKeys.add(`${market.region}|${storeDefinition.platform}|${local.date}`);
      }
    }
  }
  const expiredJobKeys = [...new Set(historicalMobileSnapshots.map((snapshot) => `${snapshot.region}|${(snapshot.platforms || [])[0] || ""}|${snapshot.date}`))]
    .filter((key) => !currentAvailableJobKeys.has(key));
  const unavailableHistoricalGaps = [];
  for (const key of expiredJobKeys) {
    const [region, platform, date] = key.split("|");
    const market = markets.find((item) => item.region === region);
    const storeDefinition = stores.find((item) => item.platform === platform);
    if (!market || !storeDefinition) continue;
    const missing = [];
    for (const target of targetReleases(data, market, storeDefinition, date)) {
      for (const metricType of ["free_rank", "grossing_rank"]) {
        if (!historicalSnapshotKeys.has(snapshotKey({
          projectId: target.projectId,
          region,
          date,
          metricType,
          platforms: [platform],
        }))) missing.push(target.projectId);
      }
    }
    if (missing.length) unavailableHistoricalGaps.push({
      date,
      region,
      platform,
      missingObservations: missing.length,
      affectedProjects: [...new Set(missing)].sort(),
      reason: "该日期已滚出 AppMagic 公开逐小时窗口，无法再次请求；不使用其他日期反推。",
    });
  }
  const previousAvailableDates = data.meta.performanceCoverage?.appMagicHistoricalRanks?.sourceAvailableUtcDates || [];
  data.meta.generatedAt = generatedAt();
  data.meta.performanceCoverage = {
    ...(data.meta.performanceCoverage || {}),
    appMagicHistoricalRanks: {
      verifiedAt,
      coverageStart: dates[0] || "",
      coverageEnd: dates.at(-1) || "",
      sourceAvailableUtcDates: [...new Set([
        ...previousAvailableDates,
        ...successful.map((result) => result.snapshot.utcDate),
      ])].sort(),
      markets: markets.map(({ region, country, label }) => ({ region, country, label })),
      platforms: stores.map(({ platform, store, label }) => ({ platform, store, label })),
      trackedProjects: projects.length,
      snapshotsAddedOrUpdated: historicalMobileSnapshots.length,
      rankedSnapshots: historicalMobileSnapshots.filter((snapshot) => Number.isFinite(Number(snapshot.rank))).length,
      unrankedSnapshots: historicalMobileSnapshots.filter((snapshot) => !Number.isFinite(Number(snapshot.rank))).length,
      invalidPrelaunchSnapshotsRemoved: invalidPrelaunchRemoved,
      attemptedJobs: selectedJobs.length,
      pendingJobs: Math.max(0, jobs.length - selectedJobs.length),
      unavailableHistoricalGaps,
      failedJobs: failed.map((result) => ({
        region: result.market.region,
        country: result.market.country,
        platform: result.storeDefinition.platform,
        utcDate: result.snapshot.utcDate,
        utcHour: result.snapshot.utcHour,
        reason: result.error,
      })),
      note: "AppMagic 公开逐小时榜单仅提供当前可用日期窗口；按各市场当地中午附近的单小时快照回填。未出现于完整 Top 100 的已上线目标产品记录为未入 Top 100，不推断第 101 名。更早日期不使用当前名次反推。",
    },
  };

  const json = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(jsPath, `window.GAME_PROJECTS_DATA = ${json.trimEnd()};\n`);
  console.log(JSON.stringify({
    jobs: jobs.length,
    attemptedJobs: selectedJobs.length,
    pendingJobs: Math.max(0, jobs.length - selectedJobs.length),
    skippedCompleteJobs,
    successfulJobs: successful.length,
    failedJobs: failed.length,
    coverageStart: dates[0] || "",
    coverageEnd: dates.at(-1) || "",
    trackedProjects: projects.length,
    observationsAddedOrUpdated: observationsByKey.size,
    rankedSnapshots: [...observationsByKey.values()].filter((snapshot) => Number.isFinite(Number(snapshot.rank))).length,
    invalidPrelaunchSnapshotsRemoved: invalidPrelaunchRemoved,
  }, null, 2));
  if (failed.length) process.exitCode = 2;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
