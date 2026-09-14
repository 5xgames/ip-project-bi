#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "game-projects/data/projects.json");
const jsPath = path.join(root, "game-projects/data/projects.js");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const verifiedAt = "2026-09-14";

const projects = [
  {
    id: "code-geass-genesic-re-code",
    productName: "Code Geass Genesic Re;CODE",
    ipName: "Code Geass / 反叛的鲁路修",
    ipType: "动漫",
    genre: "角色扮演",
    developer: "JORO / Code Geass Genesic Re;CODE 制作委员会",
    publisher: "Code Geass Genesic Re;CODE 制作委员会",
    announcementDate: "",
    latestUpdateDate: "2023-04-27",
    latestUpdateLabel: "日本区停止运营",
    status: "ended",
    summary: "《Code Geass》系列首款社交游戏，2021 年 10 月 4 日在日本上线，2023 年 4 月 27 日 15:00 停止运营。",
    sourceUrl: "https://www.geass-gr.jp/news_detail/3678/index.html",
    verifiedAt,
  },
  {
    id: "classroom-of-the-elite-merge-puzzle",
    productName: "Classroom of the Elite: Merge Puzzle Special Test",
    ipName: "Classroom of the Elite / 欢迎来到实力至上主义教室",
    ipType: "轻小说 / 动漫",
    genre: "合并拼图",
    developer: "JORO",
    publisher: "JORO",
    announcementDate: "",
    latestUpdateDate: "2024-02-01",
    latestUpdateLabel: "日本 iOS / Android 正式上线",
    status: "launched",
    summary: "TV 动画《欢迎来到实力至上主义教室》首款手机游戏，2024 年 2 月 1 日在日本上线；JORO 官网截至 2026 年 9 月仍在持续发布运营公告。",
    sourceUrl: "https://www.you-zitsu-mergegame.com/",
    verifiedAt,
  },
];

const releases = [
  {
    id: "code-geass-genesic-re-code-jp-ios",
    projectId: "code-geass-genesic-re-code",
    platform: "ios",
    region: "JP",
    store: "App Store 日本",
    storeId: "1550481882",
    bundleId: "",
    storeUrl: "https://apps.apple.com/jp/app/id1550481882",
    storeProductName: "コードギアス Genesic Re;CODE",
    plannedLaunchDate: "2021-10-04",
    actualLaunchDate: "2021-10-04",
    serviceEndDate: "2023-04-27",
    status: "ended",
    storeAvailability: "delisted",
    availabilityCheckedAt: "2023-06-30",
    availabilityNote: "官方停运公告注明 2023-06-30 结束 iOS 应用分发。",
    sourceUrl: "https://www.geass-gr.jp/news_detail/3678/index.html",
    verifiedAt,
  },
  {
    id: "code-geass-genesic-re-code-jp-android",
    projectId: "code-geass-genesic-re-code",
    platform: "android",
    region: "JP",
    store: "Google Play 日本",
    storeId: "jp.co.hakuhododymp.game",
    storeUrl: "https://play.google.com/store/apps/details?id=jp.co.hakuhododymp.game&hl=ja&gl=JP",
    storeProductName: "コードギアス Genesic Re;CODE",
    plannedLaunchDate: "2021-10-04",
    actualLaunchDate: "2021-10-04",
    serviceEndDate: "2023-04-27",
    status: "ended",
    storeAvailability: "delisted",
    availabilityCheckedAt: "2023-06-30",
    availabilityNote: "官方停运公告注明 2023-06-30 结束 Android 应用分发。",
    sourceUrl: "https://www.geass-gr.jp/news_detail/3678/index.html",
    verifiedAt,
  },
  {
    id: "classroom-of-the-elite-merge-puzzle-jp-ios",
    projectId: "classroom-of-the-elite-merge-puzzle",
    platform: "ios",
    region: "JP",
    store: "App Store 日本",
    storeId: "6472700394",
    bundleId: "",
    storeUrl: "https://apps.apple.com/jp/app/id6472700394",
    storeProductName: "ようこそ実力至上主義の教室へ～マージパズル特別試験～",
    plannedLaunchDate: "2024-02-01",
    actualLaunchDate: "2024-02-01",
    status: "launched",
    storeAvailability: "available",
    availabilityCheckedAt: verifiedAt,
    sourceUrl: "https://www.you-zitsu-mergegame.com/",
    verifiedAt,
  },
  {
    id: "classroom-of-the-elite-merge-puzzle-jp-android",
    projectId: "classroom-of-the-elite-merge-puzzle",
    platform: "android",
    region: "JP",
    store: "Google Play 日本",
    storeId: "jp.co.joro.mip.prod",
    storeUrl: "https://play.google.com/store/apps/details?id=jp.co.joro.mip.prod&hl=ja&gl=JP",
    storeProductName: "ようこそ実力至上主義の教室へ～マージパズル特別試験～",
    plannedLaunchDate: "2024-02-01",
    actualLaunchDate: "2024-02-01",
    status: "launched",
    storeAvailability: "available",
    availabilityCheckedAt: verifiedAt,
    sourceUrl: "https://www.you-zitsu-mergegame.com/",
    verifiedAt,
  },
];

const rankSnapshots = [
  {
    releaseId: "code-geass-genesic-re-code-jp-ios",
    projectId: "code-geass-genesic-re-code",
    platforms: ["ios"],
    region: "JP",
    date: "2021-10-04",
    metricType: "free_rank",
    rank: 1,
    display: "日本 App Store 免费游戏榜第 1 名",
    scope: "日本 App Store 免费游戏榜；上线当日媒体报道",
    source: "Anime! Anime!",
    sourceUrl: "https://animeanime.jp/article/2021/10/04/64351.html",
    verifiedAt,
    performanceLevel: "phenomenon",
  },
];

function upsertById(collection, value) {
  const index = collection.findIndex((item) => item.id === value.id);
  if (index >= 0) collection[index] = { ...collection[index], ...value };
  else collection.push(value);
}

function snapshotKey(snapshot) {
  return [snapshot.releaseId || snapshot.projectId, snapshot.date, snapshot.metricType, snapshot.source].join("|");
}

for (const project of projects) upsertById(data.projects, project);
for (const release of releases) upsertById(data.releases, release);
for (const snapshot of rankSnapshots) {
  const key = snapshotKey(snapshot);
  const index = data.rankSnapshots.findIndex((item) => snapshotKey(item) === key);
  if (index >= 0) data.rankSnapshots[index] = { ...data.rankSnapshots[index], ...snapshot };
  else data.rankSnapshots.push(snapshot);
}

const nightmare = data.projects.find((project) => project.id === "code-geass-nightmare-survivor");
if (nightmare) {
  nightmare.summary = "《Code Geass》系列首款生存动作手机游戏；日本 App Store 预约页当前预计 2026 年 9 月 30 日上线，该日期作为计划日期显示，正式开服仍以后续官方公告为准。";
}

data.meta.schemaVersion = "3.1";
data.meta.phase = Math.max(Number(data.meta.phase) || 0, 29);
data.meta.generatedAt = `${verifiedAt}T13:10:00+09:00`;
data.meta.latestProjectDate = verifiedAt;
data.meta.projectDiscoveryAudit = {
  ...(data.meta.projectDiscoveryAudit || {}),
  publisherHistoryBackfill: {
    verifiedAt,
    publisher: "JORO",
    catalogUrl: "https://www.joro.co.jp/",
    addedProjects: projects.map((project) => project.id),
    addedReleases: releases.map((release) => release.id),
    excludedCatalogEntries: [
      { title: "Coin Musme", reason: "发行商原创 BCG，未识别为外部日本娱乐 IP 游戏化" },
      { title: "AniPoko", reason: "发行商原创产品，未识别为外部日本娱乐 IP 游戏化" },
    ],
    note: "发行商产品履历用于补足已停运、已下架且近期没有新闻或榜单记录的历史项目。",
  },
};

const json = `${JSON.stringify(data, null, 2)}\n`;
fs.writeFileSync(jsonPath, json);
fs.writeFileSync(jsPath, `window.GAME_PROJECTS_DATA = ${json.trimEnd()};\n`);
console.log(JSON.stringify({
  projects: data.projects.length,
  releases: data.releases.length,
  rankSnapshots: data.rankSnapshots.length,
  addedProjects: projects.map((project) => project.id),
}, null, 2));
