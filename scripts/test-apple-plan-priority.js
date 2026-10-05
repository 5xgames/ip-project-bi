"use strict";
const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");
const path = require("path");
const source = fs.readFileSync(path.join(__dirname, "refresh-apple-preorders.js"), "utf8");
const start = source.indexOf("      if (canUseExpectedDate) {");
const end = source.indexOf("\n    } catch (error) {", start);
assert(start >= 0 && end > start);
const block = source.slice(start, end);
function scenario(plan, planSource, appleDate) {
  const project = { id: "fixture", status: "upcoming", sourceUrl: "https://official.example/", latestUpdateDate: "2026-09-01" };
  const release = { id: "fixture-ios", projectId: project.id, status: "upcoming", plannedLaunchDate: plan, plannedLaunchDateSource: planSource, storeUrl: "https://apple.example/" };
  const context = { release, canUseExpectedDate: true, appleDate, previousAppleDate: "2026-12-31", previousPlannedDate: plan, currentPlannedDate: /^\d{4}-\d{2}-\d{2}$/.test(plan) ? plan : "", checkedAt: "2026-10-05", projectById: new Map([[project.id, project]]), updatedDates: [], conflicts: [] };
  vm.runInNewContext(block, context);
  return { release, project, context };
}
for (const plan of ["2027-02", "2027年", "2026年秋", "2026-10-23"]) {
  const { release, project, context } = scenario(plan, "游戏官网", "2026-12-31");
  assert.equal(release.plannedLaunchDate, plan);
  assert.equal(release.appleExpectedLaunchDate, "2026-12-31");
  assert.equal(context.conflicts.length, 1);
  assert.equal(release.appleExpectedLaunchDateConflict.databasePlannedLaunchDate, plan);
  assert.equal(project.sourceUrl, "https://official.example/");
  assert.equal(project.latestUpdateDate, "2026-09-01");
}
assert.equal(scenario("", "", "2026-11-13").release.plannedLaunchDate, "2026-11-13");
assert.equal(scenario("2026-10-14", "Apple App Store 预约页", "2026-11-13").release.plannedLaunchDate, "2026-11-13");
assert.equal(scenario("2026-10-23", "游戏官网", "2026-10-23").context.conflicts.length, 0);
console.log("Apple plan priority: 7 scenarios passed");
