"use strict";

function steamAppIdFromRelease(release) {
  if (release?.platform !== "steam") return undefined;
  const appId = String(release.storeId || "");
  if (!/^\d+$/.test(appId)) return undefined;
  const matches = [release.sourceUrl, release.storeUrl].some((value) => {
    try {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol) || url.hostname !== "store.steampowered.com"
        || url.username || url.password || url.port) return false;
      return url.pathname.match(/^\/app\/(\d+)(?:\/|$)/)?.[1] === appId;
    } catch {
      return false;
    }
  });
  return matches ? appId : undefined;
}

function collectSteamProjectTargets(releases) {
  const appProjects = new Map();
  for (const release of releases) {
    const appId = steamAppIdFromRelease(release);
    if (appId && !appProjects.has(appId)) appProjects.set(appId, release.projectId);
  }
  return [...appProjects].map(([appId, projectId]) => ({ appId, projectId }));
}

module.exports = { steamAppIdFromRelease, collectSteamProjectTargets };
