#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(root, "..");
const jsonPath = path.join(root, "game-projects/data/projects.json");
const jsPath = path.join(root, "game-projects/data/projects.js");
const queuePath = path.join(workspaceRoot, "data/processed/game_project_watch_queue.json");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
let previousQueue = {};
try {
  previousQueue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
} catch {
  // The first run has no review history to preserve.
}
const previousAppleReviews = new Map((previousQueue.applePreorderCandidates || [])
  .filter((candidate) => candidate.reviewStatus)
  .map((candidate) => [String(candidate.storeId), {
    reviewStatus: candidate.reviewStatus,
    reviewReason: candidate.reviewReason || "",
    reviewEvidenceUrl: candidate.reviewEvidenceUrl || "",
    reviewedAt: candidate.reviewedAt || "",
  }]));
const previousStorefrontReviews = new Map((previousQueue.storefrontLiveCandidates || [])
  .filter((candidate) => candidate.reviewStatus)
  .map((candidate) => [String(candidate.releaseId), {
    reviewStatus: candidate.reviewStatus,
    reviewReason: candidate.reviewReason || "",
    reviewEvidenceUrl: candidate.reviewEvidenceUrl || "",
    reviewedAt: candidate.reviewedAt || "",
  }]));
const previousOverdueReviews = new Map((previousQueue.overdueLaunches || [])
  .filter((candidate) => candidate.reviewStatus)
  .map((candidate) => [String(candidate.releaseId), {
    reviewStatus: candidate.reviewStatus,
    reviewReason: candidate.reviewReason || "",
    reviewEvidenceUrl: candidate.reviewEvidenceUrl || "",
    reviewedAt: candidate.reviewedAt || "",
  }]));
const previousNewsReviews = new Map((previousQueue.newsCandidates || [])
  .filter((candidate) => candidate.reviewStatus && candidate.url)
  .map((candidate) => [candidate.url, {
    reviewStatus: candidate.reviewStatus,
    reviewReason: candidate.reviewReason || "",
    reviewEvidenceUrl: candidate.reviewEvidenceUrl || "",
    reviewedAt: candidate.reviewedAt || "",
  }]));

const now = new Date();
const activeStatuses = new Set(["announced", "testing", "preregister", "upcoming", "delayed"]);
const terminalStatuses = new Set(["launched", "ended", "cancelled"]);
const regionCountry = {
  CN: "cn",
  HK: "hk",
  TW: "tw",
  JP: "jp",
  KR: "kr",
  SEA: "sg",
  US: "us",
  GLOBAL: "us",
  ASIA: "sg",
};
const discoveryQueries = [
  'site:apps.apple.com/jp/app "リリース予定" "ゲーム"',
  'site:apps.apple.com/jp/app "リリース予定" "アニメ"',
  'site:apps.apple.com/jp/app "リリース予定" "漫画"',
];
const newsQueries = [
  '"ゲーム化決定" (アニメ OR 漫画 OR ライトノベル) when:7d',
  '("新作ゲーム" OR "スマートフォンゲーム") (アニメ OR 漫画 OR VTuber) when:7d',
  '("事前登録" OR "予約開始") (アニメ OR 漫画 OR VTuber) ゲーム when:7d',
  '(Steam OR "Nintendo Switch" OR PlayStation OR Xbox) (アニメ OR 漫画) 新作 when:7d',
  'site:prtimes.jp (ゲーム OR ゲーム化) (アニメ OR 漫画 OR VTuber) when:7d',
  '("正式リリース" OR "配信開始" OR "発売日決定") (アニメ OR 漫画) ゲーム when:7d',
];

function tokyoDate(value) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
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
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+09:00`;
}

function exactDate(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function countryForRelease(release) {
  const urlCountry = String(release.storeUrl || release.sourceUrl || "")
    .match(/apps\.apple\.com\/([a-z]{2})\//i)?.[1];
  return (urlCountry || regionCountry[release.region] || "us").toLowerCase();
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function stripTags(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0 Chrome/140 Safari/537.36" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }
  }
  throw lastError;
}

async function appleLookup(storeId, country) {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(storeId)}&country=${country}&entity=software`;
  const payload = await (await fetchWithRetry(url)).json();
  const product = (payload.results || []).find((item) => String(item.trackId) === String(storeId));
  if (!product) throw new Error("App Store listing unavailable in selected storefront");
  return { product, lookupUrl: url };
}

async function appleStorefrontState(storeUrl, storeId) {
  const html = await (await fetchWithRetry(storeUrl)).text();
  const escapedStoreId = String(storeId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const statePattern = new RegExp(`"adamId":"${escapedStoreId}"[\\s\\S]{0,1400}?"isPreorder":(true|false)`, "g");
  const states = [...html.matchAll(statePattern)].map((match) => match[1] === "true");
  if (!states.length) throw new Error("App Store preorder state not found on product page");
  if (states.some((state) => state !== states[0])) {
    throw new Error("App Store product page returned inconsistent preorder states");
  }
  return {
    isPreorder: states[0],
    signal: states[0] ? "isPreorder=true" : "isPreorder=false（商店已从预约转为可获取）",
  };
}

function collectYahooResults(rootValue) {
  const results = [];
  const seen = new Set();
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (value.url && value.title && !seen.has(value.url)) {
      seen.add(value.url);
      if (!/(?:^|\/\/)(?:[^/]+\.)?yahoo\.co\.jp\//.test(value.url)) {
        results.push({
          title: stripTags(value.title),
          description: stripTags(value.description),
          url: value.url,
        });
      }
    }
    for (const child of Object.values(value)) walk(child);
  }
  walk(rootValue);
  return results;
}

async function yahooSearch(query) {
  const url = new URL("https://search.yahoo.co.jp/search");
  url.searchParams.set("p", query);
  const html = await (await fetchWithRetry(url)).text();
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  const end = html.indexOf("</script>", start);
  if (start < 0 || end < 0) throw new Error("Yahoo Search result payload not found");
  const payload = JSON.parse(html.slice(start + marker.length, end));
  const pageData = payload?.props?.pageProps?.initialProps?.pageData;
  if (!pageData) throw new Error("Yahoo Search page data not found");
  return collectYahooResults(pageData);
}

async function googleNewsSearch(query) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("hl", "ja");
  url.searchParams.set("gl", "JP");
  url.searchParams.set("ceid", "JP:ja");
  url.searchParams.set("q", query);
  const xml = await (await fetchWithRetry(url)).text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const item = match[1];
    const field = (name) => stripTags(item.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1]);
    return {
      title: field("title"),
      description: field("description"),
      url: field("link"),
      publishedAt: field("pubDate"),
      source: stripTags(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]),
    };
  }).filter((item) => item.title && item.url);
}

function projectMatches(text) {
  const target = normalize(text);
  return data.projects
    .filter((project) => {
      const candidates = [project.productName, project.ipName]
        .flatMap((value) => String(value || "").split(/\s*\/\s*/))
        .map(normalize)
        .filter((value) => value.length >= 4);
      return candidates.some((candidate) => target.includes(candidate));
    })
    .map((project) => project.id);
}

function likelyJapaneseIp(product) {
  const text = `${product.trackName || ""}\n${product.description || ""}`;
  return /(TVアニメ|テレビアニメ|アニメ|漫画|マンガ|コミック|ライトノベル|原作|VTuber|ホロライブ|にじさんじ|キャラクター|シリーズ作品)/i.test(text);
}

async function discoverAppleCandidates(knownStoreIds) {
  const searchResults = [];
  const searchErrors = [];
  for (const query of discoveryQueries) {
    try {
      const results = await yahooSearch(query);
      searchResults.push(...results.map((result) => ({ ...result, query })));
    } catch (error) {
      searchErrors.push({ query, reason: error.message });
    }
  }

  const uniqueIds = [...new Set(searchResults.map((result) => result.url.match(/\/id(\d+)/)?.[1]).filter(Boolean))];
  const candidates = [];
  for (const storeId of uniqueIds) {
    try {
      const { product, lookupUrl } = await appleLookup(storeId, "jp");
      const expectedDate = exactDate(product.releaseDate);
      if (product.primaryGenreName !== "Games" || !expectedDate || expectedDate < checkedAt) continue;
      candidates.push({
        storeId,
        productName: product.trackName || "",
        expectedLaunchDate: expectedDate,
        rawStoreReleaseDate: product.releaseDate || "",
        publisher: product.artistName || product.sellerName || "",
        storeUrl: product.trackViewUrl || `https://apps.apple.com/jp/app/id${storeId}`,
        lookupUrl,
        alreadyTracked: knownStoreIds.has(storeId),
        matchedProjectIds: projectMatches(`${product.trackName || ""} ${product.description || ""}`),
        likelyJapaneseIp: likelyJapaneseIp(product),
        discoverySource: "Apple App Store 预约页（Yahoo Japan 索引发现，Apple Lookup 核验）",
      });
    } catch (error) {
      searchErrors.push({ storeId, reason: error.message });
    }
  }
  return { candidates, searchErrors };
}

async function discoverNewsCandidates() {
  const results = [];
  const errors = [];
  for (const query of newsQueries) {
    try {
      const matches = await googleNewsSearch(query);
      results.push(...matches.slice(0, 30).map((match) => ({
        ...match,
        query,
        matchedProjectIds: projectMatches(`${match.title} ${match.description}`),
      })));
    } catch (error) {
      errors.push({ query, reason: error.message });
    }
  }
  const seen = new Set();
  return {
    candidates: results.filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    }),
    errors,
  };
}

const checkedAt = tokyoDate(now);

(async () => {
  const projectById = new Map(data.projects.map((project) => [project.id, project]));
  const iosReleases = data.releases.filter((release) => release.platform === "ios" && /^\d+$/.test(String(release.storeId || "")));
  const lookupCache = new Map();
  const lookupErrors = [];
  const updatedDates = [];
  const conflicts = [];
  const storefrontLiveCandidates = [];

  for (const release of iosReleases) {
    const country = countryForRelease(release);
    const cacheKey = `${release.storeId}|${country}`;
    try {
      if (!lookupCache.has(cacheKey)) lookupCache.set(cacheKey, await appleLookup(release.storeId, country));
      const { product, lookupUrl } = lookupCache.get(cacheKey);
      const appleDate = exactDate(product.releaseDate);
      const previousAppleDate = exactDate(release.appleExpectedLaunchDate);
      const previousPlannedDate = String(release.plannedLaunchDate || "");
      const currentPlannedDate = exactDate(previousPlannedDate);
      const canUseExpectedDate = !release.actualLaunchDate && !terminalStatuses.has(release.status) && appleDate >= checkedAt;

      release.storeUrl = product.trackViewUrl || release.storeUrl || `https://apps.apple.com/${country}/app/id${release.storeId}`;
      release.storeProductName = product.trackName || release.storeProductName || "";
      release.bundleId = product.bundleId || release.bundleId || "";
      release.rawStoreReleaseDate = product.releaseDate || release.rawStoreReleaseDate || "";
      release.appleReleaseDateCheckedAt = checkedAt;
      release.appleLookupUrl = lookupUrl;
      release.storeAvailability = "available";
      release.availabilityCheckedAt = checkedAt;

      if (activeStatuses.has(release.status) && !release.actualLaunchDate) {
        try {
          const storefrontState = await appleStorefrontState(release.storeUrl, release.storeId);
          release.storefrontStateCheckedAt = checkedAt;
          release.storefrontIsPreorder = storefrontState.isPreorder;
          if (!storefrontState.isPreorder) {
            const project = projectById.get(release.projectId);
            const candidate = {
              projectId: release.projectId,
              productName: project?.productName || release.projectId,
              releaseId: release.id,
              platform: release.platform,
              region: release.region,
              storeId: String(release.storeId),
              status: release.status,
              plannedLaunchDate: exactDate(release.plannedLaunchDate),
              appleExpectedLaunchDate: appleDate,
              storeUrl: release.storeUrl,
              officialSiteUrl: project?.officialSiteUrl || "",
              currentProjectSourceUrl: project?.sourceUrl || "",
              detectedAt: checkedAt,
              signal: storefrontState.signal,
              reason: "App Store 已从预约变为可获取；必须当天核验官网、官方新闻及官方账号，确认实际开服日期后才能写 actualLaunchDate。",
            };
            const review = previousStorefrontReviews.get(String(release.id));
            if (review) Object.assign(candidate, review);
            storefrontLiveCandidates.push(candidate);
          }
        } catch (error) {
          lookupErrors.push({
            stage: "storefront-state",
            releaseId: release.id,
            projectId: release.projectId,
            storeId: release.storeId,
            country,
            reason: error.message,
          });
        }
      }

      if (canUseExpectedDate) {
        release.appleExpectedLaunchDate = appleDate;
        release.appleExpectedLaunchDateSource = "Apple App Store 预约页";
        release.appleExpectedLaunchDateSourceUrl = release.storeUrl;
        release.plannedLaunchDateVerifiedAt = checkedAt;
        release.verifiedAt = checkedAt;

        if (!currentPlannedDate || release.plannedLaunchDateSource === "Apple App Store 预约页") {
          if (previousPlannedDate !== appleDate) {
            release.plannedLaunchDate = appleDate;
            release.plannedLaunchDateSource = "Apple App Store 预约页";
            release.plannedLaunchDateSourceUrl = release.storeUrl;
            release.plannedLaunchDateVerifiedAt = checkedAt;
            release.verifiedAt = checkedAt;
            updatedDates.push({
              projectId: release.projectId,
              releaseId: release.id,
              previousPlannedLaunchDate: previousPlannedDate,
              plannedLaunchDate: appleDate,
              sourceUrl: release.storeUrl,
            });
          }
        } else if (currentPlannedDate !== appleDate) {
          release.appleExpectedLaunchDateConflict = {
            databasePlannedLaunchDate: currentPlannedDate,
            appleExpectedLaunchDate: appleDate,
            checkedAt,
          };
          conflicts.push({
            projectId: release.projectId,
            releaseId: release.id,
            databasePlannedLaunchDate: currentPlannedDate,
            appleExpectedLaunchDate: appleDate,
            sourceUrl: release.storeUrl,
          });
        } else {
          delete release.appleExpectedLaunchDateConflict;
        }

        if (release.status === "announced") release.status = "preregister";
        const project = projectById.get(release.projectId);
        if (project && project.status === "announced") project.status = "preregister";
        if (project && (!previousAppleDate || previousAppleDate !== appleDate || !currentPlannedDate)) {
          project.latestUpdateDate = checkedAt;
          project.latestUpdateLabel = `Apple App Store 预约页预计 ${appleDate} 上线`;
          project.sourceUrl = release.storeUrl;
          project.verifiedAt = checkedAt;
        }
      }
    } catch (error) {
      lookupErrors.push({ releaseId: release.id, projectId: release.projectId, storeId: release.storeId, country, reason: error.message });
    }
  }

  const knownStoreIds = new Set(iosReleases.map((release) => String(release.storeId)));
  const appleDiscovery = await discoverAppleCandidates(knownStoreIds);
  for (const candidate of appleDiscovery.candidates) {
    const review = previousAppleReviews.get(String(candidate.storeId));
    if (review) Object.assign(candidate, review);
  }
  const newsDiscovery = await discoverNewsCandidates();
  for (const candidate of newsDiscovery.candidates) {
    const review = previousNewsReviews.get(candidate.url);
    if (review) Object.assign(candidate, review);
  }
  const overdueLaunches = data.releases
    .filter((release) => {
      const plannedDate = exactDate(release.plannedLaunchDate);
      return activeStatuses.has(release.status)
        && !release.actualLaunchDate
        && plannedDate
        && plannedDate <= checkedAt;
    })
    .map((release) => {
      const candidate = {
        projectId: release.projectId,
        productName: projectById.get(release.projectId)?.productName || release.projectId,
        releaseId: release.id,
        platform: release.platform,
        region: release.region,
        plannedLaunchDate: exactDate(release.plannedLaunchDate),
        appleExpectedLaunchDate: release.appleExpectedLaunchDate || "",
        status: release.status,
        reason: "计划日期已到，但尚无 actualLaunchDate；必须核验官方开服/发售证据",
        sourceUrl: release.sourceUrl || release.storeUrl || "",
      };
      const review = previousOverdueReviews.get(String(release.id));
      if (review) Object.assign(candidate, review);
      return candidate;
    });

  const queue = {
    generatedAt: generatedAt(),
    today: checkedAt,
    policy: "候选项目必须回到官网、版权方、发行商、官方账号或官方商店核验后才能写入正式数据库；Apple 预约日期可作为计划日期，但不能单独证明已正式开服。",
    summary: {
      knownIosListingsChecked: iosReleases.length,
      plannedDatesUpdated: updatedDates.length,
      dateConflicts: conflicts.length,
      overdueLaunches: overdueLaunches.length,
      storefrontLiveCandidates: storefrontLiveCandidates.length,
      applePreorderCandidates: appleDiscovery.candidates.length,
      untrackedApplePreorderCandidates: appleDiscovery.candidates.filter((item) => !item.alreadyTracked).length,
      unreviewedApplePreorderCandidates: appleDiscovery.candidates.filter((item) => !item.alreadyTracked && !item.reviewStatus).length,
      newsCandidates: newsDiscovery.candidates.length,
      unreviewedNewsCandidates: newsDiscovery.candidates.filter((item) => item.reviewedAt !== checkedAt).length,
      errors: lookupErrors.length + appleDiscovery.searchErrors.length + newsDiscovery.errors.length,
    },
    updatedDates,
    dateConflicts: conflicts,
    overdueLaunches,
    storefrontLiveCandidates,
    applePreorderCandidates: appleDiscovery.candidates,
    newsCandidates: newsDiscovery.candidates,
    errors: [...lookupErrors, ...appleDiscovery.searchErrors, ...newsDiscovery.errors],
    reviewAudit: previousQueue.reviewAudit || undefined,
  };

  data.meta.schemaVersion = "3.1";
  data.meta.phase = Math.max(Number(data.meta.phase) || 0, 28);
  data.meta.generatedAt = generatedAt();
  data.meta.latestProjectDate = data.projects
    .map((project) => exactDate(project.latestUpdateDate))
    .filter(Boolean)
    .sort()
    .at(-1) || data.meta.latestProjectDate || "";
  data.meta.projectDiscoveryAudit = {
    ...(data.meta.projectDiscoveryAudit || {}),
    appleStorePreorders: {
      verifiedAt: checkedAt,
      knownIosListingsChecked: iosReleases.length,
      plannedDatesUpdated: updatedDates.length,
      dateConflicts: conflicts.length,
      overdueLaunches: overdueLaunches.length,
      storefrontLiveCandidates: storefrontLiveCandidates.length,
      untrackedCandidates: appleDiscovery.candidates.filter((item) => !item.alreadyTracked).length,
      unreviewedCandidates: appleDiscovery.candidates.filter((item) => !item.alreadyTracked && !item.reviewStatus).length,
      source: "Apple iTunes Search/Lookup API 与 App Store 预约页",
      note: "Apple 预约页日期用于 plannedLaunchDate；若商店提前从预约变为可获取，会进入 storefrontLiveCandidates 并触发官方开服核验，但仍须取得官方开服或发售证据才能写 actualLaunchDate。",
    },
    dailyDiscovery: {
      ...(
        data.meta.projectDiscoveryAudit?.dailyDiscovery?.verifiedAt === checkedAt
          ? data.meta.projectDiscoveryAudit.dailyDiscovery
          : {}
      ),
      verifiedAt: checkedAt,
      searchQueries: discoveryQueries.length + newsQueries.length,
      newsCandidates: newsDiscovery.candidates.length,
      queue: "data/processed/game_project_watch_queue.json",
      note: data.meta.projectDiscoveryAudit?.dailyDiscovery?.verifiedAt === checkedAt
        && Number(data.meta.projectDiscoveryAudit.dailyDiscovery.projectsAdded || 0) > 0
        ? data.meta.projectDiscoveryAudit.dailyDiscovery.note
        : "候选仅用于每日核验，不自动把搜索结果写成正式项目。",
    },
  };

  const json = `${JSON.stringify(data, null, 2)}\n`;
  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(jsPath, `window.GAME_PROJECTS_DATA = ${json.trimEnd()};\n`);
  console.log(JSON.stringify(queue.summary, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
