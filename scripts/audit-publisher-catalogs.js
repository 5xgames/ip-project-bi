#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(root, "..");
const dataPath = path.join(root, "game-projects/data/projects.json");
const jsPath = path.join(root, "game-projects/data/projects.js");
const sourcesPath = path.join(root, "game-projects/data/publisher-catalog-sources.json");
const queuePath = path.join(workspaceRoot, "data/processed/publisher_catalog_watch_queue.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const config = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));

const ignoredHosts = new Set([
  "apple.com", "apps.apple.com", "facebook.com", "google.com", "instagram.com",
  "linkedin.com", "play.google.com", "twitter.com", "wix.com", "wixstatic.com",
  "parastorage.com", "youtube.com", "x.com", "wantedly.com", "engage.net",
]);

function tokyoDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function generatedAt() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+09:00`;
}

function baseHost(host) {
  return String(host || "").toLowerCase().replace(/^www\./, "");
}

function stripTags(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function urlsInData() {
  const values = [
    ...data.projects.flatMap((project) => [project.sourceUrl]),
    ...data.releases.flatMap((release) => [release.sourceUrl, release.storeUrl]),
  ].filter(Boolean);
  const byHost = new Map();
  for (const value of values) {
    try {
      const host = baseHost(new URL(value).hostname);
      if (!byHost.has(host)) byHost.set(host, new Set());
    } catch {}
  }
  for (const project of data.projects) {
    const projectUrls = [project.sourceUrl, ...data.releases
      .filter((release) => release.projectId === project.id)
      .flatMap((release) => [release.sourceUrl, release.storeUrl])].filter(Boolean);
    for (const value of projectUrls) {
      try {
        const host = baseHost(new URL(value).hostname);
        if (!byHost.has(host)) byHost.set(host, new Set());
        byHost.get(host).add(project.id);
      } catch {}
    }
  }
  return byHost;
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 Chrome/140 Safari/537.36" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }
  }
  throw lastError;
}

function extractExternalLinks(html, catalogUrl) {
  const sourceHost = baseHost(new URL(catalogUrl).hostname);
  const normalizedHtml = html.replaceAll("\\/", "/").replaceAll("\\u002F", "/");
  const links = [];
  const seen = new Set();
  for (const match of normalizedHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(match[1], catalogUrl);
      const host = baseHost(url.hostname);
      if (!/^https?:$/.test(url.protocol) || host === sourceHost || seen.has(host)) continue;
      seen.add(host);
      links.push({ host, url: url.href, anchorText: stripTags(match[2]).slice(0, 240) });
    } catch {}
  }
  return links;
}

(async () => {
  const checkedAt = tokyoDate();
  const trackedByHost = urlsInData();
  const checkedSources = [];
  const candidates = [];
  const missingExpectedProjects = [];
  const exclusions = [];
  const errors = [];

  for (const source of config.sources || []) {
    try {
      const html = await fetchWithRetry(source.catalogUrl);
      const pageText = stripTags(html);
      const expected = (source.expectedProjects || []).map((item) => ({
        ...item,
        presentOnCatalog: item.aliases.some((alias) => pageText.includes(alias)),
        presentInDatabase: data.projects.some((project) => project.id === item.projectId),
      }));
      for (const item of expected) {
        if (item.presentOnCatalog && !item.presentInDatabase) {
          missingExpectedProjects.push({ publisher: source.publisher, catalogUrl: source.catalogUrl, ...item });
        }
      }

      const sourceExclusions = new Map((source.excludedExternalHosts || [])
        .map((item) => [baseHost(item.host), item.reason]));
      const externalLinks = extractExternalLinks(html, source.catalogUrl);
      for (const link of externalLinks) {
        const ignored = [...ignoredHosts].some((host) => link.host === host || link.host.endsWith(`.${host}`));
        if (ignored) continue;
        const excludedReason = sourceExclusions.get(link.host);
        if (excludedReason) {
          exclusions.push({ publisher: source.publisher, ...link, reason: excludedReason });
          continue;
        }
        const matchedProjectIds = [...(trackedByHost.get(link.host) || [])];
        if (!matchedProjectIds.length) candidates.push({
          publisher: source.publisher,
          catalogUrl: source.catalogUrl,
          ...link,
          reason: "发行商官网出现尚未匹配到项目库的外部产品链接，需核验是否属于日本娱乐 IP 游戏化项目",
        });
      }
      checkedSources.push({
        publisher: source.publisher,
        catalogUrl: source.catalogUrl,
        expectedProjects: expected,
        externalProductLinksChecked: externalLinks.length,
      });
    } catch (error) {
      errors.push({ publisher: source.publisher, catalogUrl: source.catalogUrl, reason: error.message });
    }
  }

  const queue = {
    generatedAt: generatedAt(),
    today: checkedAt,
    policy: "发行商官网目录仅用于发现；新增候选仍须用游戏官网、官方商店或版权方/发行商公告核验后再写入正式项目库。",
    summary: {
      catalogSourcesChecked: checkedSources.length,
      missingExpectedProjects: missingExpectedProjects.length,
      unmatchedExternalProductLinks: candidates.length,
      exclusions: exclusions.length,
      errors: errors.length,
    },
    checkedSources,
    missingExpectedProjects,
    candidates,
    exclusions,
    errors,
  };

  data.meta.schemaVersion = "3.1";
  data.meta.phase = Math.max(Number(data.meta.phase) || 0, 29);
  data.meta.generatedAt = generatedAt();
  data.meta.projectDiscoveryAudit = {
    ...(data.meta.projectDiscoveryAudit || {}),
    publisherCatalogs: {
      verifiedAt: checkedAt,
      catalogSourcesChecked: checkedSources.length,
      missingExpectedProjects: missingExpectedProjects.length,
      unmatchedExternalProductLinks: candidates.length,
      queue: "data/processed/publisher_catalog_watch_queue.json",
      note: "用于发现近期无新闻、已下架或已停运的历史产品；候选不会未经核验自动入库。",
    },
  };

  const json = `${JSON.stringify(data, null, 2)}\n`;
  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  fs.writeFileSync(dataPath, json);
  fs.writeFileSync(jsPath, `window.GAME_PROJECTS_DATA = ${json.trimEnd()};\n`);
  console.log(JSON.stringify(queue.summary, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
