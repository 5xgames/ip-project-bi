#!/usr/bin/env node
"use strict";

// Apply a dated, source-backed human review without conflating a discovery
// scrape with the editorial checks required for a complete daily update.
const fs = require("fs");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "../..");
const reviewPath = path.resolve(process.argv[2] || "");
if (!process.argv[2] || !fs.existsSync(reviewPath)) {
  console.error("Usage: node site/scripts/apply-daily-project-review.js <review.json>");
  process.exit(1);
}
const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
const reconcileNews = process.argv.includes("--reconcile-news");
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
if (review.reviewedAt !== today) throw new Error(`Review date ${review.reviewedAt} is not today in Asia/Tokyo (${today})`);

const projectPath = path.join(workspaceRoot, "site/game-projects/data/projects.json");
const projectJsPath = path.join(workspaceRoot, "site/game-projects/data/projects.js");
const queuePath = path.join(workspaceRoot, "data/processed/game_project_watch_queue.json");
const data = JSON.parse(fs.readFileSync(projectPath, "utf8"));
const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const originalReleases = new Map(data.releases.map((item) => [item.id, { ...item }]));
if (queue.today !== today) throw new Error(`Watch queue is stale: ${queue.today}`);
if (!Array.isArray(queue.newsCandidates)) throw new Error("Watch queue has no news candidate list");

function upsert(list, incoming) {
  for (const item of incoming || []) {
    if (!item.id || !item.sourceUrl || !item.verifiedAt) throw new Error(`Unverified record: ${item.id || "missing id"}`);
    const index = list.findIndex((existing) => existing.id === item.id);
    if (index < 0) list.push(item);
    else list[index] = { ...list[index], ...item };
  }
}
upsert(data.projects, review.projects);
upsert(data.releases, review.releases);
const addedProjectIds = review.newProjectIds || (review.projects || []).map((item) => item.id);
const addedReleaseIds = review.newReleaseIds || (review.releases || []).map((item) => item.id);
if (addedProjectIds.some((id) => !(review.projects || []).some((item) => item.id === id))
  || addedReleaseIds.some((id) => !(review.releases || []).some((item) => item.id === id))) {
  throw new Error("New project/release IDs must be included in this dated review");
}
data.meta.targetPlatforms = [...new Set([...(data.meta.targetPlatforms || []), "vr"])];

if (!reconcileNews) {
  for (const [index] of queue.newsCandidates.entries()) {
    const decision = review.newsDecisions?.[index];
    if (!decision?.titleContains || !String(decision.reviewStatus || "").trim() || !String(decision.reviewReason || "").trim()) {
      throw new Error(`News candidate ${index} lacks an explicit dated review decision`);
    }
  }
  for (const [indexText, decision] of Object.entries(review.newsDecisions || {})) {
    const index = Number(indexText);
    const candidate = queue.newsCandidates[index];
    if (!candidate || !candidate.title.includes(decision.titleContains || "")) {
      throw new Error(`News candidate ${indexText} no longer matches the reviewed headline`);
    }
  }
}
for (const [index, candidate] of queue.newsCandidates.entries()) {
  const supplement = (review.newsSupplements || []).find((item) => candidate.title.includes(item.titleContains));
  const decision = supplement || review.newsDecisions?.[index];
  if (!decision && reconcileNews && candidate.reviewedAt === today
    && String(candidate.reviewStatus || "").trim() && String(candidate.reviewReason || "").trim()) continue;
  if (!decision || !String(decision.reviewStatus || "").trim() || !String(decision.reviewReason || "").trim()) {
    throw new Error(`News candidate ${index} lacks today's explicit review; reconcile cannot invent a decision`);
  }
  candidate.reviewStatus = decision.reviewStatus;
  candidate.reviewReason = decision.reviewReason;
  candidate.reviewEvidenceUrl = decision.reviewEvidenceUrl || "";
  candidate.reviewedAt = today;
}
queue.summary.unreviewedNewsCandidates = 0;
const untrackedApple = (queue.applePreorderCandidates || []).filter((item) => !item.alreadyTracked);
for (const item of untrackedApple) {
  const decision = review.appleDecisions?.[item.storeId];
  if (!decision) continue;
  if (!String(decision.reviewReason || "").trim()) throw new Error(`Apple candidate ${item.storeId} lacks a review reason`);
  item.reviewStatus = decision.reviewStatus;
  item.reviewReason = decision.reviewReason;
  item.reviewEvidenceUrl = decision.reviewEvidenceUrl || item.storeUrl || "";
  item.reviewedAt = today;
}
const unreviewedApple = untrackedApple.filter((item) => item.reviewedAt !== today || !item.reviewStatus);
if (unreviewedApple.length) throw new Error(`${unreviewedApple.length} untracked Apple candidates lack today's review`);
const overdue = queue.overdueLaunches || [];
const storefront = queue.storefrontLiveCandidates || [];
for (const item of [...overdue, ...storefront]) {
  const decision = review.releaseDecisions?.[item.releaseId];
  if (!decision) continue;
  if (!String(decision.reviewReason || "").trim()) throw new Error(`Release candidate ${item.releaseId} lacks a review reason`);
  item.reviewStatus = decision.reviewStatus;
  item.reviewReason = decision.reviewReason;
  item.reviewEvidenceUrl = decision.reviewEvidenceUrl || item.sourceUrl || "";
  item.reviewedAt = today;
}
if ([...overdue, ...storefront].some((item) => item.reviewedAt !== today || !item.reviewStatus)) {
  throw new Error("Overdue or storefront-live candidate lacks today's official-evidence review");
}

const active = new Set(["announced", "testing", "preregister", "upcoming", "delayed"]);
const activeProjects = data.projects.filter((item) => active.has(item.status));
const activeReleases = data.releases.filter((item) => active.has(item.status));
if ([...activeProjects, ...activeReleases].some((item) => !/^https?:\/\//.test(item.sourceUrl || ""))) {
  throw new Error("An active project/release is missing its official source URL");
}
const sourceUrls = new Set([...activeProjects, ...activeReleases].map((item) => item.sourceUrl).filter((url) => /^https?:\/\//.test(url || "")));
const checkedProjects = new Set(review.sourceChecks?.checkedProjectIds || []);
const checkedReleases = new Set(review.sourceChecks?.checkedReleaseIds || []);
const checkedUrls = new Set(review.sourceChecks?.checkedSourceUrls || []);
const sourceResults = review.sourceChecks?.sourceResults || [];
const resultUrls = new Set(sourceResults.filter((item) => item.checkedAt === today
  && ["reviewed", "failed"].includes(item.readStatus)
  && String(item.evidence || item.reason || "").trim()).map((item) => item.url));
const missingChecks = [
  ...activeProjects.filter((item) => !checkedProjects.has(item.id)).map((item) => `project:${item.id}`),
  ...activeReleases.filter((item) => !checkedReleases.has(item.id)).map((item) => `release:${item.id}`),
  ...[...sourceUrls].filter((url) => !checkedUrls.has(url)).map((url) => `source:${url}`),
  ...[...sourceUrls].filter((url) => !resultUrls.has(url)).map((url) => `source-result:${url}`),
];
if (missingChecks.length) throw new Error(`Active audit does not cover actual records: ${missingChecks.join(", ")}`);
const sourceCheckFailures = [...new Map((review.sourceChecks?.sourceCheckFailures || []).map((item) => [item.url, item])).values()];
const uncheckedFailure = sourceCheckFailures.filter((item) => !sourceUrls.has(item.url));
if (uncheckedFailure.length) throw new Error(`Source-check failure does not match an active source: ${uncheckedFailure[0].url}`);

const unresolvedOverdue = [...new Set(overdue.filter((item) => item.reviewStatus !== "verified_launched")
  .map((item) => item.projectId))];
const unresolvedStorefront = [...new Set(storefront.filter((item) => item.reviewStatus !== "verified_launched")
  .map((item) => item.projectId))];
queue.reviewAudit = {
  reviewedAt: today,
  untrackedAppleCandidatesReviewed: untrackedApple.length,
  acceptedAppleCandidates: 0,
  excludedAppleCandidates: untrackedApple.filter((item) => String(item.reviewStatus || "").startsWith("excluded_")).map((item) => item.storeId),
  newsCandidatesReviewed: queue.newsCandidates.length,
  newsReviewStatuses: Object.fromEntries([...new Set(queue.newsCandidates.map((item) => item.reviewStatus))]
    .map((status) => [status, queue.newsCandidates.filter((item) => item.reviewStatus === status).length])),
  projectsAddedFromNews: addedProjectIds,
  releasesAddedFromNews: addedReleaseIds,
  storefrontCandidatesReviewed: storefront.length,
  overdueLaunchesReviewed: overdue.length,
  unresolvedStorefrontProjectIds: unresolvedStorefront,
  unresolvedOverdueProjectIds: unresolvedOverdue,
  historicalBackfillCandidates: ["wixoss-multiverse", "sengoku-rance-steam"],
  note: review.note || "逐条筛查新闻候选，新增事实回到官方来源核验。",
};

data.meta.projectDiscoveryAudit = {
  ...(data.meta.projectDiscoveryAudit || {}),
  plannedDateAudit: {
    verifiedAt: today,
    activeProjectsChecked: activeProjects.length,
    activeReleasesChecked: activeReleases.length,
    activeSourceUrlsChecked: sourceUrls.size,
    activeSourceUrlsReachable: sourceUrls.size - sourceCheckFailures.length,
    checkedProjectIds: activeProjects.map((item) => item.id),
    checkedReleaseIds: activeReleases.map((item) => item.id),
    checkedSourceUrls: [...sourceUrls],
    sourceResults: sourceResults.filter((item) => sourceUrls.has(item.url)),
    preciseDatesAdded: 0,
    actualLaunchDatesAdded: [...new Map((review.releases || []).map((item) => [item.id, item])).values()].filter((item) => item.actualLaunchDate && !originalReleases.get(item.id)?.actualLaunchDate).length,
    launchStatusCorrections: 0,
    projectsAdded: addedProjectIds.length,
    releaseDefinitionsAdded: addedReleaseIds.length,
    addedProjectIds,
    unresolvedOverdueProjectIds: unresolvedOverdue,
    unresolvedStorefrontProjectIds: unresolvedStorefront,
    sourceCheckFailures,
    note: "逐条筛查今日候选，并对全部待上线项目和发行版本的来源链接及到期日期做完整复核；链接异常与无正式上线证据的项目保留待核验。",
  },
};
data.meta.generatedAt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
}).format(new Date()).replace(" ", "T") + "+09:00";
data.meta.latestProjectDate = data.projects.map((item) => item.latestUpdateDate || "").sort().at(-1) || "";
const rendered = `${JSON.stringify(data, null, 2)}\n`;
fs.writeFileSync(projectPath, rendered);
fs.writeFileSync(projectJsPath, `window.GAME_PROJECTS_DATA = ${rendered.trimEnd()};\n`);
fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
console.log(JSON.stringify({
  reviewedAt: today, newsCandidatesReviewed: queue.newsCandidates.length,
  activeProjectsChecked: activeProjects.length, activeReleasesChecked: activeReleases.length,
  activeSourceUrlsChecked: sourceUrls.size, activeSourceUrlsReachable: sourceUrls.size - sourceCheckFailures.length,
  projectsAdded: addedProjectIds.length, releaseDefinitionsAdded: addedReleaseIds.length,
}, null, 2));
