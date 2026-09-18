(() => {
  "use strict";

  const data = window.GAME_PROJECTS_DATA || {};
  const meta = data.meta || {};
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const releases = Array.isArray(data.releases) ? data.releases : [];
  const rankSnapshots = Array.isArray(data.rankSnapshots) ? data.rankSnapshots : [];
  const regionChecks = Array.isArray(data.regionChecks) ? data.regionChecks : [];
  const nameLocalization = window.IPBINameLocalization;
  let nameLanguage = nameLocalization?.getMode?.() || "zh";
  const displayLocalizedName = (localized, original, mode = nameLanguage) => (
    nameLocalization?.display?.(localized, original, mode) || localized || original || ""
  );
  const comparableProductName = (value) => String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
  const productStoreAliasesByProject = new Map();
  const japaneseStoreNamesByProject = new Map();
  for (const release of releases) {
    const storeProductName = String(release.storeProductName || "").trim();
    if (!storeProductName) continue;
    if (!productStoreAliasesByProject.has(release.projectId)) productStoreAliasesByProject.set(release.projectId, new Set());
    productStoreAliasesByProject.get(release.projectId).add(storeProductName);
    if (release.region === "JP") {
      if (!japaneseStoreNamesByProject.has(release.projectId)) japaneseStoreNamesByProject.set(release.projectId, new Set());
      japaneseStoreNamesByProject.get(release.projectId).add(storeProductName);
    }
  }
  const preferredJapaneseStoreName = (projectId) => [...(japaneseStoreNamesByProject.get(projectId) || [])]
    .sort((a, b) => a.length - b.length || a.localeCompare(b, "ja"))[0] || "";
  if (nameLocalization) {
    for (const project of projects) {
      project.productOriginalName = project.productName;
      project.ipOriginalName = project.ipName;
      project.productJapaneseName = preferredJapaneseStoreName(project.id);
      project.productSourceName = project.productJapaneseName || project.productOriginalName;
      project.productAliases = [...new Set([
        project.productOriginalName,
        project.productJapaneseName,
        ...(productStoreAliasesByProject.get(project.id) || []),
      ].filter(Boolean))];
      const localizedProductName = nameLocalization.product(project.productOriginalName, project.id);
      const localizedProductIsEnglishFallback = comparableProductName(localizedProductName) === comparableProductName(project.productOriginalName)
        && /[A-Za-z]/.test(project.productOriginalName);
      project.productLocalizedName = localizedProductIsEnglishFallback && project.productJapaneseName
        ? project.productJapaneseName
        : localizedProductName;
      project.ipLocalizedName = nameLocalization.ip(project.ipOriginalName);
      project.productName = displayLocalizedName(project.productLocalizedName, project.productSourceName);
      project.ipName = displayLocalizedName(project.ipLocalizedName, project.ipOriginalName);
    }
  } else {
    for (const project of projects) {
      project.productOriginalName = project.productName;
      project.ipOriginalName = project.ipName;
      project.productJapaneseName = preferredJapaneseStoreName(project.id);
      project.productSourceName = project.productJapaneseName || project.productOriginalName;
      project.productAliases = [...new Set([
        project.productOriginalName,
        project.productJapaneseName,
        ...(productStoreAliasesByProject.get(project.id) || []),
      ].filter(Boolean))];
    }
  }
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const releaseById = new Map(releases.map((release) => [release.id, release]));

  const platformNames = {
    ios: "iOS", android: "Android", steam: "Steam", windows: "Windows PC",
    switch: "Nintendo Switch", playstation: "PlayStation", xbox: "Xbox",
    web: "网页游戏", unannounced: "平台待公布",
    wechat_minigame: "微信小游戏", douyin_minigame: "抖音小游戏",
  };
  const regionNames = {
    CN: "中国大陆", HK: "香港", TW: "台湾", JP: "日本", KR: "韩国",
    SEA: "东南亚", US: "美国", GLOBAL: "全球公告范围", ASIA: "亚洲公告范围",
  };
  const targetRegionCodes = Array.isArray(meta.targetRegions) && meta.targetRegions.length
    ? meta.targetRegions.filter((code) => regionNames[code] && !["GLOBAL", "ASIA"].includes(code))
    : ["JP", "CN", "HK", "TW", "KR", "SEA", "US"];
  const asiaRegionCodes = new Set(["JP", "CN", "HK", "TW", "KR", "SEA"]);
  const statusNames = {
    announced: "已公布", testing: "测试中", preregister: "预约中", upcoming: "即将上线",
    launched: "已上线", delayed: "延期", cancelled: "已取消", ended: "停止运营",
  };
  const metricNames = {
    free_rank: "免费游戏榜", grossing_rank: "畅销游戏榜", top_seller_rank: "畅销榜",
    concurrent_users: "历史在线峰值", average_concurrent_users: "月均同时在线",
    daily_active_users: "日活跃用户", active_users: "活跃用户",
    download_rank: "下载榜", physical_sales: "实体销量", unit_sales: "销量", estimated_sales: "销量估算",
    review_count: "评价数", review_score: "好评率", user_rating_5: "玩家评分", revenue: "公开收入", store_award: "商店奖项",
    estimated_downloads: "生命周期下载量估算", estimated_revenue: "生命周期收入估算",
  };
  const levelNames = {
    phenomenon: "现象级", strong: "强势", good: "表现良好",
    ordinary: "一般", insufficient: "数据不足",
  };
  const ipNameAliases = new Map([
    ["DRAGON BALL Z / 龙珠Z", "DRAGON BALL / 龙珠"],
    ["龙珠Z", "龙珠"],
  ]);

  function applyNameLanguage(mode) {
    if (!nameLocalization) return;
    nameLanguage = nameLocalization?.modes?.includes(mode) ? mode : "zh";
    document.documentElement.dataset.nameLanguage = nameLanguage;
    for (const project of projects) {
      project.productName = displayLocalizedName(
        project.productLocalizedName,
        project.productSourceName || project.productOriginalName,
        nameLanguage,
      );
      project.ipName = displayLocalizedName(project.ipLocalizedName, project.ipOriginalName, nameLanguage);
    }
  }

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    generatedAt: $("#generated-at"),
    nameLanguage: $("#name-language-selector"),
    latestProjectDate: $("#latest-project-date"),
    projectSourceFreshness: $("#project-source-freshness"),
    performanceStartDate: $("#performance-start-date-filter"),
    performanceEndDate: $("#performance-end-date-filter"),
    performanceDateRangeLabel: $("#performance-date-range-label"),
    performanceCoverageNote: $("#performance-coverage-note"),
    platform: $("#platform-filter"),
    region: $("#region-filter"),
    status: $("#status-filter"),
    ipType: $("#ip-type-filter"),
    product: $("#product-filter"),
    search: $("#search-filter"),
    reset: $("#reset-filters"),
    summary: $("#filter-summary"),
    regionAudit: $("#region-audit-summary"),
    kpiProjects: $("#kpi-projects"),
    kpiLaunched: $("#kpi-launched"),
    kpiUpcoming: $("#kpi-upcoming"),
    kpiUpcomingDetail: $("#kpi-upcoming-detail"),
    kpiReleases: $("#kpi-releases"),
    recentCount: $("#recent-project-count"),
    calendarGrid: $("#project-calendar-grid"),
    calendarYearSelect: $("#calendar-year-select"),
    calendarMonthSelect: $("#calendar-month-select"),
    calendarPrevMonth: $("#calendar-prev-month"),
    calendarNextMonth: $("#calendar-next-month"),
    calendarToday: $("#calendar-today"),
    calendarSelectedDate: $("#calendar-selected-date"),
    calendarSelectedSummary: $("#calendar-selected-summary"),
    calendarAgendaList: $("#calendar-agenda-list"),
    calendarAgendaEmpty: $("#calendar-agenda-empty"),
    calendarWindowSection: $("#calendar-window-section"),
    calendarWindowList: $("#calendar-window-list"),
    ipActivitySummary: $("#ip-activity-summary"),
    ipActivityBody: $("#ip-activity-table-body"),
    ipActivityEmpty: $("#ip-activity-empty"),
    ipActivityCount: $("#ip-activity-count"),
    ipActivityPagination: $("#ip-activity-pagination"),
    ipDrilldownStatus: $("#ip-drilldown-status"),
    ipDrilldownName: $("#ip-drilldown-name"),
    clearIpDrilldown: $("#clear-ip-drilldown"),
    schedule: $("#release-schedule"),
    scheduleEmpty: $("#schedule-empty"),
    scheduleCount: $("#schedule-count"),
    schedulePagination: $("#schedule-pagination"),
    performancePanel: $("#performance-panel"),
    performanceSectionNote: $("#performance-section-note"),
    performanceProduct: $("#performance-product-filter"),
    performanceOverviewView: $("#performance-overview-view"),
    productPerformanceView: $("#product-performance-view"),
    productPerformanceName: $("#product-performance-name"),
    productPerformanceScope: $("#product-performance-scope"),
    productPlatformTimelines: $("#product-platform-timelines"),
    clearPerformanceProduct: $("#clear-performance-product"),
    steamPeakChart: $("#steam-peak-chart"),
    steamPeakEmpty: $("#steam-peak-empty"),
    performanceTierChart: $("#performance-tier-chart"),
    performanceTierEmpty: $("#performance-tier-empty"),
    mobileMarketChart: $("#mobile-market-chart"),
    mobileMarketEmpty: $("#mobile-market-empty"),
    performanceDetailNote: $("#performance-detail-note"),
    performanceList: $("#performance-list"),
    performanceEmpty: $("#performance-empty"),
    performanceMethod: $("#performance-method"),
    tableBody: $("#project-table-body"),
    tableEmpty: $("#project-table-empty"),
    tableCount: $("#project-count"),
    projectPagination: $("#project-pagination"),
    footerSource: $("#footer-source"),
  };

  const isoDate = (value) => String(value || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
  const dateBounds = (value) => {
    const exactDate = isoDate(value);
    if (exactDate) return { start: exactDate, end: exactDate };
    const textValue = String(value || "");
    const year = textValue.match(/20\d{2}/)?.[0];
    if (!year) return null;
    const monthNumber = textValue.match(/20\d{2}(?:年|[-/])(\d{1,2})(?:月)?/)?.[1];
    if (monthNumber) {
      const month = String(Number(monthNumber)).padStart(2, "0");
      const lastDay = new Date(Date.UTC(Number(year), Number(monthNumber), 0)).toISOString().slice(8, 10);
      return { start: `${year}-${month}-01`, end: `${year}-${month}-${lastDay}` };
    }
    if (/上半年/.test(textValue)) return { start: `${year}-01-01`, end: `${year}-06-30` };
    if (/下半年/.test(textValue)) return { start: `${year}-07-01`, end: `${year}-12-31` };
    if (/春/.test(textValue)) return { start: `${year}-03-01`, end: `${year}-05-31` };
    if (/夏/.test(textValue)) return { start: `${year}-06-01`, end: `${year}-08-31` };
    if (/秋/.test(textValue)) return { start: `${year}-09-01`, end: `${year}-11-30` };
    if (/冬|年末/.test(textValue)) return { start: `${year}-12-01`, end: `${year}-12-31` };
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  };
  const timingPrecision = (value) => {
    const textValue = String(value || "").trim();
    if (isoDate(textValue)) return 0;
    if (/20\d{2}(?:年|[-/])\d{1,2}(?:月)?/.test(textValue)) return 1;
    if (/上半年|下半年|春|夏|秋|冬|年末|Q[1-4]|第[一二三四]季度/i.test(textValue)) return 2;
    return 3;
  };
  const generatedDate = isoDate(meta.generatedAt) || new Date().toISOString().slice(0, 10);
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const projectDateValues = [
    ...projects.flatMap((project) => [project.announcementDate, project.latestUpdateDate, project.verifiedAt]),
    ...releases.flatMap((release) => [
      release.testStartDate, release.preregisterDate, release.plannedLaunchDate,
      release.actualLaunchDate, release.serviceEndDate, release.verifiedAt,
    ]),
  ];
  const projectObservedDates = projectDateValues.flatMap((value) => {
    const bounds = dateBounds(value);
    return bounds ? [bounds.start, bounds.end] : [];
  }).sort();
  const performanceObservedDates = rankSnapshots.map((snapshot) => isoDate(snapshot.date)).filter(Boolean).sort();
  const projectMinimumDate = meta.coverageStart || projectObservedDates[0] || "2018-01-01";
  const projectMaximumDate = projectObservedDates.at(-1) || generatedDate;
  const performanceMinimumDate = performanceObservedDates[0] || projectMinimumDate;
  const performanceMaximumDate = performanceObservedDates.at(-1) || generatedDate;
  const defaultPerformanceEndDate = performanceMaximumDate;
  const defaultPerformanceStartObject = new Date(`${defaultPerformanceEndDate}T00:00:00Z`);
  defaultPerformanceStartObject.setUTCDate(defaultPerformanceStartObject.getUTCDate() - Math.max(1, Number(meta.defaultWindowDays) || 90) + 1);
  const defaultPerformanceStartDate = defaultPerformanceStartObject.toISOString().slice(0, 10) < performanceMinimumDate
    ? performanceMinimumDate
    : defaultPerformanceStartObject.toISOString().slice(0, 10);
  const numberFormat = new Intl.NumberFormat("zh-CN");

  const state = {
    performanceStartDate: defaultPerformanceStartDate,
    performanceEndDate: defaultPerformanceEndDate,
    platform: "all",
    region: "all",
    status: "all",
    ipType: "all",
    product: "all",
    search: "",
    performanceProduct: "all",
    selectedIp: "all",
    calendarMonth: today.slice(0, 7),
    calendarSelectedDate: today,
    ipActivityPage: 1,
    schedulePage: 1,
    projectPage: 1,
    nameLanguage,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatGeneratedAt(value) {
    if (!value) return "项目库等待首次导入";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return `数据生成 ${value}`;
    return `数据结构更新 ${new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(parsed)}（日本时间）`;
  }

  function renderProjectSourceFreshness() {
    if (!elements.projectSourceFreshness) return;
    const groups = new Map([
      ["ios", { label: "iOS 榜单", latestDate: "", maxLag: 1 }],
      ["android", { label: "Android 榜单", latestDate: "", maxLag: 3 }],
      ["pc", { label: "Steam / PC", latestDate: "", maxLag: 35 }],
      ["console", { label: "主机商店", latestDate: "", maxLag: 7 }],
      ["other", { label: "其他表现来源", latestDate: "", maxLag: 7 }],
    ]);
    for (const snapshot of rankSnapshots) {
      const source = String(snapshot.source || "");
      const platforms = Array.isArray(snapshot.platforms) ? snapshot.platforms : [];
      let key = "other";
      if (source.includes("Apple App Store") || platforms.includes("ios")) key = "ios";
      else if (source.includes("AppMagic") || source.includes("Google Play") || platforms.includes("android")) key = "android";
      else if (source.includes("Steam") || source.includes("VG Insights") || platforms.some((value) => ["steam", "windows"].includes(value))) key = "pc";
      else if (/PlayStation|Xbox|Nintendo/i.test(source) || platforms.some((value) => ["switch", "playstation", "xbox"].includes(value))) key = "console";
      const day = isoDate(snapshot.date);
      const group = groups.get(key);
      if (day > group.latestDate) group.latestDate = day;
    }
    elements.projectSourceFreshness.innerHTML = [...groups.values()]
      .filter((group) => group.latestDate)
      .map((group) => {
        const ageDays = Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${group.latestDate}T00:00:00Z`)) / 86400000));
        const stale = ageDays > group.maxLag;
        return `<div class="source-freshness-item ${stale ? "is-stale" : ""}"><span>${escapeHtml(group.label)}</span><time datetime="${escapeHtml(group.latestDate)}">${escapeHtml(group.latestDate)}${stale ? ` · 滞后${ageDays}天` : ""}</time></div>`;
      }).join("");
  }

  function displayDate(value, emptyLabel = "待确认") {
    const date = isoDate(value);
    if (!date) return `<span class="project-date-note">${escapeHtml(value || emptyLabel)}</span>`;
    const note = String(value).replace(date, "").trim();
    return `<time class="project-date" datetime="${escapeHtml(date)}">${escapeHtml(date)}</time>${note ? `<span class="project-date-note">${escapeHtml(note)}</span>` : ""}`;
  }

  function statusClass(status) {
    if (["testing", "preregister", "upcoming"].includes(status)) return "active";
    if (["announced", "delayed"].includes(status)) return "pending";
    if (["cancelled", "ended"].includes(status)) return "unread";
    return "ended";
  }

  function releaseRegionMatch(release) {
    if (!release) return null;
    if (state.region === "all") {
      return {
        displayRegion: release.region,
        quality: ["GLOBAL", "ASIA"].includes(release.region) ? "announcement_scope" : "verified",
      };
    }
    if (release.region === state.region) return { displayRegion: state.region, quality: "verified" };
    if (release.region === "GLOBAL") {
      return { displayRegion: state.region, quality: "announcement_scope", scopeLabel: "全球公告覆盖 · 待逐区确认" };
    }
    if (release.region === "ASIA" && asiaRegionCodes.has(state.region)) {
      return { displayRegion: state.region, quality: "announcement_scope", scopeLabel: "亚洲公告覆盖 · 待逐区确认" };
    }
    return null;
  }

  function displayedRegion(release, regionMatch = releaseRegionMatch(release)) {
    if (!release || !regionMatch) return { label: "地区待公布", scopeLabel: "" };
    return {
      label: regionNames[regionMatch.displayRegion] || regionMatch.displayRegion,
      scopeLabel: regionMatch.scopeLabel || "",
    };
  }

  function textMatches(project, release) {
    if (!state.search) return true;
    const haystack = [
      project.productName, project.ipName, project.productOriginalName, project.ipOriginalName,
      project.productLocalizedName, project.ipLocalizedName,
      ...(project.productAliases || []), release?.storeProductName,
      project.ipType, project.genre,
      project.developer, project.publisher, release?.store,
    ].join(" ").toLocaleLowerCase();
    return haystack.includes(state.search.toLocaleLowerCase());
  }

  function productOptionLabel(project) {
    const displayed = String(project.productName || "").trim();
    const source = String(project.productSourceName || project.productOriginalName || "").trim();
    return source && comparableProductName(displayed) !== comparableProductName(source)
      ? `${displayed} / ${source}`
      : displayed || source || project.id;
  }

  function baseReleaseMatches(project, release, { ignoreRegion = false } = {}) {
    const effectiveStatus = release?.status || project.status || "announced";
    return (state.platform === "all" || release?.platform === state.platform)
      && (ignoreRegion || state.region === "all" || release?.region === state.region)
      && (state.status === "all" || effectiveStatus === state.status)
      && (state.ipType === "all" || project.ipType === state.ipType)
      && (state.product === "all" || project.id === state.product)
      && textMatches(project, release);
  }

  function filteredRows() {
    return collectFilteredRows();
  }

  function collectFilteredRows() {
    const rows = [];
    for (const project of projects) {
      const projectReleases = releases.filter((release) => release.projectId === project.id);
      if (!projectReleases.length) {
        if (baseReleaseMatches(project, null) && state.platform === "all" && state.region === "all") {
          rows.push({ project, release: null });
        }
        continue;
      }
      const exactPlatforms = new Set(projectReleases
        .filter((release) => state.region !== "all" && release.region === state.region)
        .map((release) => release.platform));
      for (const release of projectReleases) {
        const regionMatch = releaseRegionMatch(release);
        if (!regionMatch) continue;
        if (regionMatch.quality === "announcement_scope" && exactPlatforms.has(release.platform)) continue;
        if (baseReleaseMatches(project, release, { ignoreRegion: true })) {
          rows.push({ project, release, regionMatch });
        }
      }
    }
    return rows;
  }

  function appendOptions(select, entries) {
    const current = select.value;
    const first = select.options[0];
    select.replaceChildren(first);
    for (const [value, label] of entries) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }

  function populateFilters() {
    const platformCodes = [...new Set(releases.map((release) => release.platform).filter(Boolean))].sort();
    const statuses = [...new Set([
      ...projects.map((project) => project.status),
      ...releases.map((release) => release.status),
    ].filter(Boolean))].sort();
    const ipTypes = [...new Set(projects.map((project) => project.ipType).filter(Boolean))].sort();
    appendOptions(elements.platform, platformCodes.map((code) => [code, platformNames[code] || code]));
    appendOptions(elements.region, targetRegionCodes.map((code) => [code, regionNames[code] || code]));
    appendOptions(elements.status, statuses.map((status) => [status, statusNames[status] || status]));
    appendOptions(elements.ipType, ipTypes.map((type) => [type, type]));
    appendOptions(elements.product, projects
      .slice()
      .sort((a, b) => String(a.productName).localeCompare(String(b.productName), "zh-CN"))
      .map((project) => [project.id, productOptionLabel(project)]));
    const minimumYear = Number(projectMinimumDate.slice(0, 4));
    const maximumYear = Number(projectMaximumDate.slice(0, 4));
    elements.calendarYearSelect.innerHTML = Array.from(
      { length: maximumYear - minimumYear + 1 },
      (_, index) => `<option value="${minimumYear + index}">${minimumYear + index} 年</option>`,
    ).join("");
    elements.calendarMonthSelect.innerHTML = Array.from(
      { length: 12 },
      (_, index) => `<option value="${String(index + 1).padStart(2, "0")}">${index + 1} 月</option>`,
    ).join("");
    elements.performanceStartDate.min = performanceMinimumDate;
    elements.performanceStartDate.max = performanceMaximumDate;
    elements.performanceEndDate.min = performanceMinimumDate;
    elements.performanceEndDate.max = performanceMaximumDate;
  }

  function syncControls() {
    elements.performanceStartDate.value = state.performanceStartDate;
    elements.performanceEndDate.value = state.performanceEndDate;
    elements.platform.value = state.platform;
    elements.region.value = state.region;
    elements.status.value = state.status;
    elements.ipType.value = state.ipType;
    elements.product.value = state.product;
    elements.search.value = state.search;
    elements.calendarYearSelect.value = state.calendarMonth.slice(0, 4);
    elements.calendarMonthSelect.value = state.calendarMonth.slice(5, 7);
    elements.performanceDateRangeLabel.textContent = `${state.performanceStartDate || "最早"} — ${state.performanceEndDate || "最新"}`;
  }

  function paginate(items, stateKey, pageSize) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    state[stateKey] = Math.min(Math.max(1, state[stateKey]), totalPages);
    const startIndex = (state[stateKey] - 1) * pageSize;
    return {
      items: items.slice(startIndex, startIndex + pageSize),
      page: state[stateKey],
      totalPages,
    };
  }

  function renderPagination(element, stateKey, totalItems, pageSize) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(Math.max(1, state[stateKey]), totalPages);
    element.hidden = totalItems <= pageSize;
    element.innerHTML = totalItems > pageSize ? `<button type="button" data-page-state="${stateKey}" data-page="${page - 1}"${page <= 1 ? " disabled" : ""}>上一页</button>
      <span>第 <strong>${page}</strong> / ${totalPages} 页 · 每页 ${pageSize} 项</span>
      <button type="button" data-page-state="${stateKey}" data-page="${page + 1}"${page >= totalPages ? " disabled" : ""}>下一页</button>` : "";
  }

  function calendarEventType(label) {
    if (label === "开始测试") return "testing";
    if (label === "开放预约") return "preregister";
    if (["计划上线", "预计上线"].includes(label)) return "planned";
    if (label === "正式上线") return "launched";
    if (label === "停止运营") return "ended";
    return "planned";
  }

  const calendarEventPriority = {
    planned: 1, preregister: 2, testing: 3, launched: 4, ended: 5,
  };

  function monthBounds(month) {
    const [year, monthNumber] = month.split("-").map(Number);
    const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
    const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    return { start, end, days: Number(end.slice(8, 10)) };
  }

  function shiftMonth(month, delta) {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
  }

  function clampCalendarMonth(month) {
    const minimumMonth = projectMinimumDate.slice(0, 7);
    const maximumMonth = projectMaximumDate.slice(0, 7);
    return month < minimumMonth ? minimumMonth : month > maximumMonth ? maximumMonth : month;
  }

  function calendarProjectData(rows) {
    const groupedProjects = new Map();
    for (const { project, release } of rows) {
      if (!groupedProjects.has(project.id)) groupedProjects.set(project.id, { project, releases: new Map() });
      if (release) groupedProjects.get(project.id).releases.set(release.id, release);
    }
    const exactEvents = new Map();
    const windowEvents = new Map();
    const add = (project, release, dateValue, label) => {
      if (!dateValue) return;
      const exactDate = isoDate(dateValue);
      const bounds = dateBounds(dateValue);
      if (!bounds) return;
      const eventType = calendarEventType(label);
      const key = exactDate
        ? `${project.id}|${exactDate}|${label}`
        : `${project.id}|${String(dateValue)}|${label}`;
      const target = exactDate ? exactEvents : windowEvents;
      if (!target.has(key)) target.set(key, {
        project, date: exactDate, timing: String(dateValue), bounds, label, eventType, releases: new Map(),
      });
      if (release) target.get(key).releases.set(release.id, release);
    };
    for (const { project, releases: releaseMap } of groupedProjects.values()) {
      const projectReleases = [...releaseMap.values()];
      for (const release of projectReleases) {
        add(project, release, release.testStartDate, "开始测试");
        add(project, release, release.preregisterDate, "开放预约");
        const isAppleExpectedDate = Boolean(isoDate(release.plannedLaunchDate))
          && release.plannedLaunchDateSource === "Apple App Store 预约页";
        add(project, release, release.plannedLaunchDate, isAppleExpectedDate ? "预计上线" : "计划上线");
        add(project, release, release.actualLaunchDate, "正式上线");
        add(project, release, release.serviceEndDate, "停止运营");
      }
    }
    const definitiveExactEvents = new Map();
    for (const event of exactEvents.values()) {
      const key = `${event.project.id}|${event.date}`;
      const previous = definitiveExactEvents.get(key);
      if (!previous || calendarEventPriority[event.eventType] > calendarEventPriority[previous.eventType]) {
        if (previous) {
          for (const [releaseId, release] of previous.releases) event.releases.set(releaseId, release);
        }
        definitiveExactEvents.set(key, event);
      } else {
        for (const [releaseId, release] of event.releases) previous.releases.set(releaseId, release);
      }
    }
    return {
      exact: [...definitiveExactEvents.values()]
        .sort((a, b) => a.date.localeCompare(b.date) || a.project.productName.localeCompare(b.project.productName, "zh-CN")),
      windows: [...windowEvents.values()].sort((a, b) => a.bounds.start.localeCompare(b.bounds.start)),
    };
  }

  function calendarFocusForIp(ipKey) {
    const projectIds = new Set(filteredRows()
      .filter(({ project }) => canonicalIpKey(project) === ipKey)
      .map(({ project }) => project.id));
    if (!projectIds.size) return null;

    const releasesByProject = new Map();
    for (const release of releases) {
      if (!projectIds.has(release.projectId)) continue;
      if (!releasesByProject.has(release.projectId)) releasesByProject.set(release.projectId, []);
      releasesByProject.get(release.projectId).push(release);
    }

    const futureProjects = [];
    const launchedProjects = [];
    for (const projectId of projectIds) {
      const project = projectById.get(projectId);
      if (!project) continue;
      const projectReleases = releasesByProject.get(projectId) || [];
      const firstLaunchDate = projectReleases
        .map((release) => isoDate(release.actualLaunchDate))
        .filter((date) => date && date <= today)
        .sort()[0];
      if (firstLaunchDate) {
        launchedProjects.push({ projectId, productName: project.productName, date: firstLaunchDate });
        continue;
      }

      const nextTiming = projectReleases
        .map((release) => ({
          timing: release.plannedLaunchDate,
          bounds: dateBounds(release.plannedLaunchDate),
          precision: timingPrecision(release.plannedLaunchDate),
        }))
        .filter(({ bounds }) => bounds && bounds.end >= today)
        .map(({ timing, bounds, precision }) => ({
          timing,
          bounds,
          date: bounds.start <= today && today <= bounds.end ? today : bounds.start,
          precision,
        }))
        .sort((a, b) => a.precision - b.precision
          || a.date.localeCompare(b.date)
          || a.bounds.start.localeCompare(b.bounds.start)
          || a.bounds.end.localeCompare(b.bounds.end))[0];
      if (nextTiming) {
        futureProjects.push({
          projectId,
          productName: project.productName,
          date: nextTiming.date,
        });
      }
    }

    const focus = futureProjects.sort((a, b) => a.date.localeCompare(b.date)
      || a.productName.localeCompare(b.productName, "zh-CN"))[0]
      || launchedProjects.sort((a, b) => b.date.localeCompare(a.date)
        || a.productName.localeCompare(b.productName, "zh-CN"))[0];
    return focus ? { ...focus, month: focus.date.slice(0, 7) } : null;
  }

  function calendarFocusForProject(projectId) {
    const project = projectById.get(projectId);
    if (!project) return null;
    const projectRows = collectFilteredRows().filter((row) => row.project.id === projectId);
    const projectReleases = [...new Map(projectRows
      .filter(({ release }) => release)
      .map(({ release }) => [release.id, release])).values()];
    const upcoming = projectReleases
      .flatMap((release) => [release.actualLaunchDate, release.plannedLaunchDate])
      .map((timing) => ({ timing, bounds: dateBounds(timing), precision: timingPrecision(timing) }))
      .filter(({ bounds }) => bounds && bounds.end >= today)
      .map(({ timing, bounds, precision }) => ({
        timing,
        date: bounds.start <= today && today <= bounds.end ? today : bounds.start,
        precision,
      }))
      .sort((a, b) => a.precision - b.precision || a.date.localeCompare(b.date))[0];
    if (upcoming) return { projectId, productName: project.productName, date: upcoming.date, month: upcoming.date.slice(0, 7) };

    const latestLaunchDate = projectReleases
      .map((release) => isoDate(release.actualLaunchDate))
      .filter((date) => date && date <= today)
      .sort()
      .at(-1);
    if (latestLaunchDate) {
      return { projectId, productName: project.productName, date: latestLaunchDate, month: latestLaunchDate.slice(0, 7) };
    }

    const latestLifecycleDate = projectReleases
      .flatMap((release) => [release.testStartDate, release.preregisterDate, release.serviceEndDate])
      .map(isoDate)
      .filter(Boolean)
      .sort()
      .at(-1);
    return latestLifecycleDate
      ? { projectId, productName: project.productName, date: latestLifecycleDate, month: latestLifecycleDate.slice(0, 7) }
      : null;
  }

  function calendarEventScope(event) {
    const eventReleases = [...event.releases.values()];
    if (!eventReleases.length) return `${event.project.ipName} · 平台及地区待公布`;
    const platforms = [...new Set(eventReleases.map((release) => platformNames[release.platform] || release.platform))];
    const regions = [...new Set(eventReleases.map((release) => displayedRegion(release).label))];
    return `${event.project.ipName} · ${platforms.join(" / ")} · ${regions.join(" / ")}`;
  }

  function formatCalendarDate(date) {
    const parsed = new Date(`${date}T00:00:00Z`);
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "UTC", month: "long", day: "numeric", weekday: "short",
    }).format(parsed);
  }

  function renderProjectCalendar(rows) {
    const { exact, windows } = calendarProjectData(rows);
    state.calendarMonth = clampCalendarMonth(state.calendarMonth);
    const { start: monthStart, end: monthEnd, days } = monthBounds(state.calendarMonth);
    const monthEvents = exact.filter((event) => event.date >= monthStart && event.date <= monthEnd);
    const eventsByDate = new Map();
    for (const event of monthEvents) {
      if (!eventsByDate.has(event.date)) eventsByDate.set(event.date, []);
      eventsByDate.get(event.date).push(event);
    }
    const windowCandidates = windows.filter((event) => event.bounds.end >= monthStart && event.bounds.start <= monthEnd);
    const monthWindowMap = new Map();
    for (const event of windowCandidates) {
      const previous = monthWindowMap.get(event.project.id);
      const eventSpan = new Date(`${event.bounds.end}T00:00:00Z`) - new Date(`${event.bounds.start}T00:00:00Z`);
      const previousSpan = previous
        ? new Date(`${previous.bounds.end}T00:00:00Z`) - new Date(`${previous.bounds.start}T00:00:00Z`)
        : Number.POSITIVE_INFINITY;
      if (!previous || eventSpan < previousSpan
        || (eventSpan === previousSpan && calendarEventPriority[event.eventType] > calendarEventPriority[previous.eventType])) {
        monthWindowMap.set(event.project.id, event);
      }
    }
    const monthWindows = [...monthWindowMap.values()];
    const monthProjectCount = new Set([
      ...monthEvents.map((event) => event.project.id),
      ...monthWindows.map((event) => event.project.id),
    ]).size;
    elements.recentCount.textContent = `本月 ${monthProjectCount} 项 · ${monthEvents.length} 个节点`;
    elements.calendarYearSelect.value = state.calendarMonth.slice(0, 4);
    elements.calendarMonthSelect.value = state.calendarMonth.slice(5, 7);
    elements.calendarPrevMonth.disabled = state.calendarMonth <= projectMinimumDate.slice(0, 7);
    elements.calendarNextMonth.disabled = state.calendarMonth >= projectMaximumDate.slice(0, 7);

    if (!state.calendarSelectedDate.startsWith(`${state.calendarMonth}-`)) {
      state.calendarSelectedDate = monthEvents[0]?.date || monthStart;
    }
    const leadingDays = (new Date(`${monthStart}T00:00:00Z`).getUTCDay() + 6) % 7;
    const totalCells = Math.ceil((leadingDays + days) / 7) * 7;
    const cells = [];
    for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
      const dayNumber = cellIndex - leadingDays + 1;
      if (dayNumber < 1 || dayNumber > days) {
        cells.push('<div class="calendar-day calendar-day-blank" aria-hidden="true"></div>');
        continue;
      }
      const date = `${state.calendarMonth}-${String(dayNumber).padStart(2, "0")}`;
      const dayEvents = eventsByDate.get(date) || [];
      const classNames = ["calendar-day"];
      if (date === today) classNames.push("is-today");
      if (date === state.calendarSelectedDate) classNames.push("is-selected");
      const visibleEvents = dayEvents.slice(0, 3);
      cells.push(`<div class="${classNames.join(" ")}" role="gridcell" data-calendar-date="${date}">
        <button class="calendar-day-number" type="button" data-calendar-date="${date}" aria-label="${escapeHtml(formatCalendarDate(date))}${dayEvents.length ? `，${dayEvents.length} 个项目节点` : ""}">${dayNumber}</button>
        <div class="calendar-day-events">${visibleEvents.map((event) => `<button class="calendar-event calendar-event-${event.eventType}" type="button" data-calendar-date="${date}" title="${escapeHtml(`${event.label}${event.label === "预计上线" ? "（Apple App Store 预约页）" : ""} · ${date} · ${event.project.productName}`)}"><i aria-hidden="true"></i><span>${escapeHtml(event.project.productName)}</span></button>`).join("")}${dayEvents.length > visibleEvents.length ? `<button class="calendar-event-more" type="button" data-calendar-date="${date}">+${dayEvents.length - visibleEvents.length}</button>` : ""}</div>
      </div>`);
    }
    elements.calendarGrid.innerHTML = cells.join("");

    const selectedEvents = eventsByDate.get(state.calendarSelectedDate) || [];
    elements.calendarSelectedDate.textContent = formatCalendarDate(state.calendarSelectedDate);
    elements.calendarSelectedSummary.textContent = selectedEvents.length
      ? `${selectedEvents.length} 个节点 · ${new Set(selectedEvents.map((event) => event.project.id)).size} 个项目`
      : "当日暂无精确日期节点";
    elements.calendarAgendaEmpty.hidden = selectedEvents.length > 0;
    elements.calendarAgendaList.innerHTML = selectedEvents.map((event) => `<button class="calendar-agenda-item" type="button" data-project-id="${escapeHtml(event.project.id)}">
      <i class="calendar-event-dot ${event.eventType}" aria-hidden="true"></i>
      <span><strong>${escapeHtml(event.project.productName)}</strong><small>${escapeHtml(calendarEventScope(event))}</small></span>
      <em title="${escapeHtml(event.label)}">${escapeHtml(event.label === "预计上线" ? `预计 ${event.date} 上线 · Apple App Store` : event.label)}</em>
    </button>`).join("");

    elements.calendarWindowSection.hidden = monthWindows.length === 0;
    elements.calendarWindowList.innerHTML = monthWindows.map((event) => `<button class="calendar-window-item" type="button" data-project-id="${escapeHtml(event.project.id)}">
      <span><strong>${escapeHtml(event.project.productName)}</strong><small>${escapeHtml(calendarEventScope(event))}</small></span>
      <em>${escapeHtml(event.timing)}</em>
    </button>`).join("");
  }

  function canonicalIpKey(project) {
    const localizedName = project.ipLocalizedName || project.ipOriginalName || project.ipName || "IP 待确认";
    return ipNameAliases.get(localizedName) || localizedName;
  }

  function gapFromDate(date) {
    if (!date) return { days: Number.POSITIVE_INFINITY, label: "上线日期待补" };
    const start = new Date(`${date}T00:00:00Z`);
    const end = new Date(`${today}T00:00:00Z`);
    const days = Math.max(0, Math.floor((end - start) / 86400000));
    if (days < 31) return { days, label: `${Math.max(1, days)} 天` };
    if (days < 365) return { days, label: `${Math.floor(days / 30)} 个月` };
    return { days, label: `${(days / 365.25).toFixed(1)} 年` };
  }

  function renderIpActivity(rows) {
    const activeFutureStatuses = new Set(["announced", "testing", "preregister", "upcoming"]);
    const groups = new Map();
    const ensureGroup = (project) => {
      const ipKey = canonicalIpKey(project);
      if (!groups.has(ipKey)) groups.set(ipKey, {
        ipKey, ipName: project.ipName || "IP 待确认", projects: new Map(), releases: new Map(),
      });
      return groups.get(ipKey);
    };
    for (const { project, release } of rows) {
      const group = ensureGroup(project);
      group.projects.set(project.id, project);
      if (release) group.releases.set(release.id, release);
    }

    const activityRows = [...groups.values()].map((group) => {
      const groupProjects = [...group.projects.values()];
      const groupProjectIds = new Set(groupProjects.map((project) => project.id));
      const allProjectReleases = releases.filter((release) => groupProjectIds.has(release.projectId));
      const launchedProjects = new Set();
      const upcomingProjects = new Map();
      const launchMoments = [];
      const releasesByProject = new Map();
      const firstLaunchByProject = new Map();
      // IP activity is product-based: later ports and regional listings must not reset a title's first launch.
      for (const release of allProjectReleases) {
        if (!releasesByProject.has(release.projectId)) releasesByProject.set(release.projectId, []);
        releasesByProject.get(release.projectId).push(release);
        const actualDate = isoDate(release.actualLaunchDate);
        if (!actualDate || actualDate > today) continue;
        const previous = firstLaunchByProject.get(release.projectId);
        if (!previous || actualDate < previous) firstLaunchByProject.set(release.projectId, actualDate);
      }
      for (const project of groupProjects) {
        if (["launched", "ended"].includes(project.status)) launchedProjects.add(project.id);
        const firstLaunch = firstLaunchByProject.get(project.id);
        if (firstLaunch) {
          launchedProjects.add(project.id);
          launchMoments.push({ date: firstLaunch, productName: project.productName });
        }
        if (launchedProjects.has(project.id)) continue;
        const projectReleases = releasesByProject.get(project.id) || [];
        const activeReleases = projectReleases.filter((release) => {
          if (isoDate(release.actualLaunchDate)) return false;
          const status = release.status || project.status || "announced";
          if (!activeFutureStatuses.has(status)) return false;
          const bounds = dateBounds(String(release.plannedLaunchDate || "").trim());
          return !bounds || bounds.end >= today;
        });
        if (!activeFutureStatuses.has(project.status) && !activeReleases.length) continue;
        const plannedTiming = preferredTiming(activeReleases.map((release) => release.plannedLaunchDate))[0] || "时间待定";
        const bounds = dateBounds(plannedTiming);
        const candidate = {
          productName: project.productName,
          timing: plannedTiming,
          sortKey: bounds?.start || "9999-12-31",
        };
        upcomingProjects.set(project.id, candidate);
      }
      launchMoments.sort((a, b) => b.date.localeCompare(a.date));
      const nextProjects = [...upcomingProjects.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      const lastLaunch = launchMoments[0] || null;
      const gap = gapFromDate(lastLaunch?.date);
      return {
        ...group,
        totalCount: group.projects.size,
        launchedCount: launchedProjects.size,
        upcomingCount: upcomingProjects.size,
        lastLaunch,
        gap,
        nextProject: nextProjects[0] || null,
        inactive: Boolean(lastLaunch) && gap.days >= 365 * 3 && upcomingProjects.size === 0,
      };
    }).sort((a, b) => b.totalCount - a.totalCount
      || b.upcomingCount - a.upcomingCount
      || a.ipName.localeCompare(b.ipName, "zh-CN"));

    if (state.selectedIp !== "all" && !activityRows.some((row) => row.ipKey === state.selectedIp)) {
      state.selectedIp = "all";
      state.performanceProduct = "all";
    }

    elements.ipActivityCount.textContent = `${numberFormat.format(activityRows.length)} 个 IP`;
    elements.ipActivityEmpty.hidden = activityRows.length > 0;
    const pageData = paginate(activityRows, "ipActivityPage", 10);
    elements.ipActivityBody.innerHTML = pageData.items.map((row) => {
      const selected = row.ipKey === state.selectedIp;
      return `<tr${selected ? ' class="is-selected"' : ""}>
      <td><button type="button" class="ip-activity-select" data-ip-key="${escapeHtml(row.ipKey)}" aria-pressed="${selected}">${escapeHtml(row.ipName)}</button>${row.inactive ? '<span class="ip-activity-flag">近 3 年无新作计划</span>' : ""}</td>
      <td><strong class="ip-activity-number">${escapeHtml(numberFormat.format(row.totalCount))}</strong></td>
      <td>${escapeHtml(numberFormat.format(row.launchedCount))}</td>
      <td>${row.upcomingCount ? `<span class="status-chip active">${escapeHtml(numberFormat.format(row.upcomingCount))} 项</span>` : '<span class="table-secondary">暂无</span>'}</td>
      <td>${row.lastLaunch
        ? `<time class="project-date" datetime="${escapeHtml(row.lastLaunch.date)}">${escapeHtml(row.lastLaunch.date)}</time><span class="table-secondary">${escapeHtml(row.lastLaunch.productName)} · 距今 ${escapeHtml(row.gap.label)}</span>`
        : '<span class="table-secondary">尚无已核验上线日期</span>'}</td>
      <td>${row.nextProject
        ? `<span class="table-primary">${escapeHtml(row.nextProject.productName)}</span><span class="table-secondary">${escapeHtml(row.nextProject.timing)}</span>`
        : '<span class="table-secondary">暂无已公布项目</span>'}</td>
    </tr>`;
    }).join("");
    renderPagination(elements.ipActivityPagination, "ipActivityPage", activityRows.length, 10);

    const hasSelectedIp = state.selectedIp !== "all";
    elements.ipDrilldownStatus.hidden = !hasSelectedIp;
    elements.ipDrilldownName.textContent = hasSelectedIp
      ? activityRows.find((row) => row.ipKey === state.selectedIp)?.ipName || state.selectedIp
      : "";

    const top = activityRows[0];
    const upcomingIpCount = activityRows.filter((row) => row.upcomingCount > 0).length;
    const upcomingProjectCount = activityRows.reduce((total, row) => total + row.upcomingCount, 0);
    const longestInactive = activityRows.filter((row) => row.inactive).sort((a, b) => b.gap.days - a.gap.days)[0];
    elements.ipActivitySummary.innerHTML = activityRows.length ? `<div>
      <span>项目收录最多</span><strong>${escapeHtml(top.ipName)}</strong><small>${escapeHtml(numberFormat.format(top.totalCount))} 个项目</small>
    </div><div>
      <span>未来已有计划</span><strong>${escapeHtml(numberFormat.format(upcomingIpCount))} 个 IP</strong><small>${escapeHtml(numberFormat.format(upcomingProjectCount))} 个已公布项目</small>
    </div><div>
      <span>最长空窗且无新作</span><strong>${escapeHtml(longestInactive?.ipName || "暂无可判定 IP")}</strong><small>${longestInactive ? `距最近作品首发 ${escapeHtml(longestInactive.gap.label)}` : "需补充更多历史首发日期"}</small>
    </div>` : "";
    return activityRows;
  }

  function renderSchedule(rows) {
    const activeFutureStatuses = new Set(["announced", "testing", "preregister", "upcoming"]);
    const timingSortKey = (value) => {
      const exactDate = isoDate(value);
      if (exactDate) return exactDate;
      const textValue = String(value || "");
      const year = textValue.match(/20\d{2}/)?.[0];
      if (!year) return "9999-12-31";
      if (/上半年|春/.test(textValue)) return `${year}-04-01`;
      if (/下半年|秋|年末|冬/.test(textValue)) return `${year}-10-01`;
      return `${year}-07-01`;
    };
    const scheduleCandidates = rows
      .filter(({ project, release }) => release && (
        isoDate(release.actualLaunchDate)
        || String(release.plannedLaunchDate || "").trim()
        || activeFutureStatuses.has(release.status || project.status)
      ))
      .map(({ project, release }) => ({
        project,
        release,
        timing: isoDate(release.actualLaunchDate) || String(release.plannedLaunchDate || "").trim() || "时间待定",
        sortKey: timingSortKey(release.actualLaunchDate || release.plannedLaunchDate),
        precision: timingPrecision(release.actualLaunchDate || release.plannedLaunchDate),
        actual: Boolean(String(release.actualLaunchDate || "").trim()),
        future: !isoDate(release.actualLaunchDate) && activeFutureStatuses.has(release.status || project.status),
        appleExpected: !isoDate(release.actualLaunchDate)
          && Boolean(isoDate(release.plannedLaunchDate))
          && release.plannedLaunchDateSource === "Apple App Store 预约页",
      }));
    const groupedSchedule = new Map();
    for (const item of scheduleCandidates) {
      const key = `${item.project.id}:${item.timing}:${item.actual}`;
      if (!groupedSchedule.has(key)) groupedSchedule.set(key, { ...item, platforms: new Set(), regions: new Set() });
      groupedSchedule.get(key).platforms.add(platformNames[item.release.platform] || item.release.platform);
      const regionInfo = displayedRegion(item.release);
      groupedSchedule.get(key).regions.add(regionInfo.scopeLabel ? `${regionInfo.label}（${regionInfo.scopeLabel}）` : regionInfo.label);
    }
    const scheduleRows = [...groupedSchedule.values()]
      .sort((a, b) => Number(b.future) - Number(a.future)
        || a.precision - b.precision
        || a.sortKey.localeCompare(b.sortKey)
        || a.project.productName.localeCompare(b.project.productName, "zh-CN"));
    const pageData = paginate(scheduleRows, "schedulePage", 6);
    elements.scheduleCount.textContent = `${numberFormat.format(scheduleRows.length)} 个节点`;
    elements.scheduleEmpty.hidden = scheduleRows.length > 0;
    elements.schedule.innerHTML = pageData.items.map(({ project, platforms, regions, timing, actual, appleExpected }) => `<div class="schedule-row">
      ${isoDate(timing)
        ? `<time class="schedule-date" datetime="${escapeHtml(isoDate(timing))}">${escapeHtml(timing)}</time>`
        : `<span class="schedule-date">${escapeHtml(timing)}</span>`}
      <div class="schedule-content"><strong>${escapeHtml(project.productName)}</strong><span>${escapeHtml([...platforms].join(" / "))} · ${escapeHtml([...regions].join(" / "))} · ${actual ? "实际上线" : appleExpected ? "预计上线（Apple App Store 预约页）" : "计划上线"}</span></div>
    </div>`).join("");
    renderPagination(elements.schedulePagination, "schedulePage", scheduleRows.length, 6);
  }

  function formatMetric(snapshot) {
    if (snapshot.display) return snapshot.display;
    const name = metricNames[snapshot.metricType] || snapshot.metricType || "平台指标";
    if (Number.isFinite(Number(snapshot.rank))) return `${name} 第 ${numberFormat.format(Number(snapshot.rank))} 名`;
    if (Number.isFinite(Number(snapshot.value))) {
      const suffix = snapshot.metricType === "review_score" ? "%" : "";
      return `${name} ${numberFormat.format(Number(snapshot.value))}${suffix}`;
    }
    return `${name} 数据待补`;
  }

  const performanceLevels = ["phenomenon", "strong", "good", "ordinary"];
  const performanceWeights = { phenomenon: 4, strong: 3, good: 2, ordinary: 1, insufficient: 0 };

  function dateInPerformancePeriod(value) {
    const date = isoDate(value);
    return Boolean(date)
      && (!state.performanceStartDate || date >= state.performanceStartDate)
      && (!state.performanceEndDate || date <= state.performanceEndDate);
  }

  function aggregateSnapshotMatches(snapshot, project, { ignoreDate = false } = {}) {
    const applicablePlatforms = Array.isArray(snapshot.platforms) ? snapshot.platforms : [];
    return (ignoreDate || dateInPerformancePeriod(snapshot.date))
      && (state.platform === "all" || applicablePlatforms.includes(state.platform))
      && (state.region === "all" || snapshot.region === state.region)
      && (state.status === "all" || (project.status || "announced") === state.status)
      && (state.ipType === "all" || project.ipType === state.ipType)
      && (state.product === "all" || project.id === state.product)
      && textMatches(project, null);
  }

  function performanceEntries({ ignoreDate = false } = {}) {
    return rankSnapshots.map((snapshot) => {
      if (snapshot.releaseId) {
        const release = releaseById.get(snapshot.releaseId);
        const project = projectById.get(release?.projectId);
        if (!release || !project || (!ignoreDate && !dateInPerformancePeriod(snapshot.date)) || !baseReleaseMatches(project, release)
          || (state.selectedIp !== "all" && canonicalIpKey(project) !== state.selectedIp)) return null;
        return { snapshot, release, project, aggregate: false };
      }
      if (snapshot.projectId) {
        const project = projectById.get(snapshot.projectId);
        if (!project || !aggregateSnapshotMatches(snapshot, project, { ignoreDate })
          || (state.selectedIp !== "all" && canonicalIpKey(project) !== state.selectedIp)) return null;
        return { snapshot, release: null, project, aggregate: true };
      }
      return null;
    }).filter(Boolean);
  }

  function renderSteamPeakChart(entries) {
    const peakByProject = new Map();
    for (const entry of entries) {
      const value = Number(entry.snapshot.value);
      if (entry.snapshot.metricType !== "concurrent_users" || !Number.isFinite(value) || value <= 0) continue;
      const previous = peakByProject.get(entry.project.id);
      if (!previous || value > Number(previous.snapshot.value)) peakByProject.set(entry.project.id, entry);
    }
    const peaks = [...peakByProject.values()]
      .sort((a, b) => Number(b.snapshot.value) - Number(a.snapshot.value))
      .slice(0, 8);
    elements.steamPeakEmpty.hidden = peaks.length > 0;
    elements.steamPeakChart.hidden = peaks.length === 0;
    if (!peaks.length) {
      elements.steamPeakChart.innerHTML = "";
      elements.steamPeakChart.setAttribute("aria-label", "当前筛选范围没有可比较的 Steam 历史同时在线峰值");
      return;
    }
    const maximum = Math.max(...peaks.map(({ snapshot }) => Number(snapshot.value)));
    const chartLabel = peaks.map(({ project, snapshot }) => `${project.productName} ${numberFormat.format(Number(snapshot.value))} 人`).join("；");
    elements.steamPeakChart.setAttribute("aria-label", `Steam 历史同时在线峰值排行榜：${chartLabel}`);
    elements.steamPeakChart.innerHTML = `${peaks.map(({ project, snapshot }) => {
      const value = Number(snapshot.value);
      const width = Math.max(8, Math.log10(value + 1) / Math.log10(maximum + 1) * 100);
      const level = performanceLevels.includes(snapshot.performanceLevel) ? snapshot.performanceLevel : "ordinary";
      return `<div class="steam-peak-row">
        <div class="steam-peak-label"><button type="button" class="performance-product-select" data-performance-project-id="${escapeHtml(project.id)}">${escapeHtml(project.productName)}</button><span>${escapeHtml(project.ipName)}</span></div>
        <div class="steam-peak-track" aria-hidden="true"><span class="steam-peak-fill level-${escapeHtml(level)}" style="width:${width.toFixed(2)}%"></span></div>
        <strong class="steam-peak-value">${escapeHtml(numberFormat.format(value))}</strong>
      </div>`;
    }).join("")}
      <div class="steam-peak-axis" aria-hidden="true"><span>1</span><span>条长为对数比例</span><span>${escapeHtml(numberFormat.format(maximum))}</span></div>`;
  }

  function renderPerformanceTierChart(entries) {
    const bestByProject = new Map();
    for (const entry of entries) {
      const level = entry.snapshot.performanceLevel || "insufficient";
      if (!performanceLevels.includes(level)) continue;
      const previous = bestByProject.get(entry.project.id);
      if (!previous || performanceWeights[level] > performanceWeights[previous.snapshot.performanceLevel || "insufficient"]) {
        bestByProject.set(entry.project.id, entry);
      }
    }
    const counts = Object.fromEntries(performanceLevels.map((level) => [level, 0]));
    for (const { snapshot } of bestByProject.values()) counts[snapshot.performanceLevel] += 1;
    const total = bestByProject.size;
    elements.performanceTierEmpty.hidden = total > 0;
    elements.performanceTierChart.hidden = total === 0;
    if (!total) {
      elements.performanceTierChart.innerHTML = "";
      elements.performanceTierChart.setAttribute("aria-label", "当前筛选范围没有已分级的产品");
      return;
    }
    elements.performanceTierChart.setAttribute("aria-label", `产品表现等级分布，共 ${total} 项：${performanceLevels.map((level) => `${levelNames[level]} ${counts[level]} 项`).join("；")}`);
    elements.performanceTierChart.innerHTML = `<div class="performance-tier-stack" aria-hidden="true">
      ${performanceLevels.filter((level) => counts[level] > 0).map((level) => `<span class="tier-segment level-${escapeHtml(level)}" style="flex-grow:${counts[level]}"></span>`).join("")}
    </div>
    <div class="performance-tier-total"><strong>${escapeHtml(numberFormat.format(total))}</strong><span>个有公开表现的产品</span></div>
    <div class="performance-tier-legend">
      ${performanceLevels.map((level) => `<div><span class="tier-dot level-${escapeHtml(level)}" aria-hidden="true"></span><span>${escapeHtml(levelNames[level])}</span><strong>${escapeHtml(numberFormat.format(counts[level]))}</strong></div>`).join("")}
    </div>`;
  }

  function renderMobileMarketChart(entries) {
    const mobileMetrics = new Set(["estimated_downloads", "estimated_revenue"]);
    const latestByProjectMetric = new Map();
    for (const entry of entries) {
      if (!entry.aggregate || !mobileMetrics.has(entry.snapshot.metricType)) continue;
      const key = `${entry.project.id}:${entry.snapshot.metricType}`;
      const previous = latestByProjectMetric.get(key);
      if (!previous || String(entry.snapshot.date).localeCompare(String(previous.snapshot.date)) > 0) {
        latestByProjectMetric.set(key, entry);
      }
    }
    const grouped = new Map();
    for (const entry of latestByProjectMetric.values()) {
      if (!grouped.has(entry.project.id)) grouped.set(entry.project.id, { project: entry.project, metrics: {} });
      grouped.get(entry.project.id).metrics[entry.snapshot.metricType] = entry.snapshot;
    }
    const products = [...grouped.values()].sort((a, b) => {
      const aBest = Math.max(...Object.values(a.metrics).map((snapshot) => performanceWeights[snapshot.performanceLevel] || 0));
      const bBest = Math.max(...Object.values(b.metrics).map((snapshot) => performanceWeights[snapshot.performanceLevel] || 0));
      return bBest - aBest || a.project.productName.localeCompare(b.project.productName, "zh-CN");
    });
    elements.mobileMarketEmpty.hidden = products.length > 0;
    elements.mobileMarketChart.hidden = products.length === 0;
    if (!products.length) {
      elements.mobileMarketChart.innerHTML = "";
      elements.mobileMarketChart.setAttribute("aria-label", "当前筛选范围没有可比较的手游市场估算");
      return;
    }
    const labels = { estimated_downloads: "下载量", estimated_revenue: "收入" };
    elements.mobileMarketChart.setAttribute("aria-label", `手游生命周期市场估算：${products.map(({ project, metrics }) => `${project.productName}，${Object.values(metrics).map(formatMetric).join("，")}`).join("；")}`);
    elements.mobileMarketChart.innerHTML = products.map(({ project, metrics }) => `<article class="mobile-market-product">
      <div class="mobile-market-product-title"><button type="button" class="performance-product-select" data-performance-project-id="${escapeHtml(project.id)}">${escapeHtml(project.productName)}</button><span>${escapeHtml(project.ipName)}</span></div>
      <div class="mobile-market-metrics">
        ${["estimated_downloads", "estimated_revenue"].map((metricType) => {
          const snapshot = metrics[metricType];
          if (!snapshot) return `<div class="mobile-market-metric muted"><span>${escapeHtml(labels[metricType])}</span><div class="mobile-market-track" aria-hidden="true"></div><strong>待补</strong></div>`;
          const level = performanceLevels.includes(snapshot.performanceLevel) ? snapshot.performanceLevel : "ordinary";
          const width = (performanceWeights[level] / 4) * 100;
          return `<div class="mobile-market-metric"><span>${escapeHtml(labels[metricType])}</span><div class="mobile-market-track" aria-hidden="true"><i class="level-${escapeHtml(level)}" style="width:${width}%"></i></div><strong>${escapeHtml(formatMetric(snapshot).replace(/^AppMagic\s*/, ""))}</strong></div>`;
        }).join("")}
      </div>
    </article>`).join("");
  }

  function performancePlatformLabel(snapshot, release) {
    if (release) return `${platformNames[release.platform] || release.platform} · ${regionNames[release.region] || release.region}`;
    const platforms = (snapshot.platforms || []).map((platform) => platformNames[platform] || platform).join(" + ") || "跨平台";
    const region = snapshot.region === "GLOBAL" ? "全球汇总估算" : regionNames[snapshot.region] || snapshot.region || "汇总范围";
    return `${platforms} · ${region}`;
  }

  const compactNumberFormat = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });
  const salesMetrics = ["unit_sales", "estimated_sales", "physical_sales"];
  const productPlatformGroups = [
    {
      id: "steam", title: "Steam", note: "销量与玩家活跃度分别观察，不与其他平台换算", platforms: ["steam"],
      charts: [
        { id: "steam-sales", title: "销量走势", note: "官方公开值与第三方累计销量估算分别成线", metrics: salesMetrics, unit: "份" },
        { id: "steam-activity", title: "玩家活跃走势", note: "DAU、活跃用户与月均同时在线分别成线", metrics: ["daily_active_users", "active_users", "average_concurrent_users"], unit: "人" },
        { id: "steam-peak", title: "历史在线峰值", note: "全历史最高同时在线，仅作规模参照", metrics: ["concurrent_users"], unit: "人", optional: true },
      ],
    },
    {
      id: "console", title: "主机平台", note: "Nintendo Switch、PlayStation 与 Xbox 分平台、分地区呈现", platforms: ["switch", "playstation", "xbox"],
      charts: [
        { id: "console-sales", title: "销量走势", note: "官方公开值、实体销量与第三方累计估算分别成线", metrics: salesMetrics, unit: "份" },
        { id: "console-reviews", title: "用户评分走势", note: "官方商店玩家星级；PlayStation 为全球口径，Xbox 按商店地区", metrics: ["user_rating_5"], unit: "/5", fixedMax: 5 },
        { id: "console-review-count", title: "评分人数走势", note: "与玩家星级分开呈现，用于判断样本规模", metrics: ["review_count"], unit: "人", optional: true },
      ],
    },
    {
      id: "mobile", title: "手游双商店", note: "App Store 与 Google Play 的榜单名次分别成线，越接近第 1 名越好", platforms: ["ios", "android"],
      charts: [
        { id: "mobile-download-rank", title: "下载榜排名", note: "iOS 免费游戏榜 / Google Play 下载榜", metrics: ["free_rank", "download_rank"], unit: "名", rank: true },
        { id: "mobile-grossing-rank", title: "畅销榜排名", note: "iOS / Google Play 游戏畅销榜", metrics: ["grossing_rank"], unit: "名", rank: true },
        { id: "mobile-downloads", title: "生命周期下载规模", note: "第三方市场估算，仅作补充", metrics: ["estimated_downloads"], unit: "次", optional: true },
        { id: "mobile-revenue", title: "生命周期收入规模", note: "第三方市场估算，仅作补充", metrics: ["estimated_revenue"], unit: "美元", currency: true, optional: true },
      ],
    },
    {
      id: "pc", title: "Windows PC", note: "非 Steam PC 渠道按可获得的销量与活跃数据呈现", platforms: ["windows"],
      charts: [
        { id: "pc-sales", title: "销量走势", note: "公开销量或可信区间估算", metrics: salesMetrics, unit: "份" },
        { id: "pc-activity", title: "活跃用户走势", note: "日活与活跃用户分别成线", metrics: ["daily_active_users", "active_users", "concurrent_users"], unit: "人" },
      ],
    },
    {
      id: "web", title: "网页与小游戏", note: "网页、微信小游戏与抖音小游戏按各平台原生指标呈现", platforms: ["web", "wechat_minigame", "douyin_minigame"],
      charts: [
        { id: "web-popularity", title: "下载 / 人气榜排名", note: "平台榜单名次，越接近第 1 名越好", metrics: ["free_rank", "download_rank"], unit: "名", rank: true },
        { id: "web-grossing", title: "畅销榜排名", note: "平台畅销或销售榜名次", metrics: ["grossing_rank", "top_seller_rank"], unit: "名", rank: true },
      ],
    },
  ];

  function snapshotPlatforms(entry) {
    if (entry.release?.platform) return [entry.release.platform];
    if (Array.isArray(entry.snapshot.platforms)) return entry.snapshot.platforms;
    return entry.snapshot.platform ? [entry.snapshot.platform] : [];
  }

  function numericSnapshotValue(snapshot) {
    if (Number.isFinite(Number(snapshot.rank))) return Number(snapshot.rank);
    return Number.isFinite(Number(snapshot.value)) ? Number(snapshot.value) : null;
  }

  function chartValueLabel(value, chart) {
    if (chart.rank) return `第 ${numberFormat.format(value)} 名`;
    if (chart.percent) return `${numberFormat.format(value)}%`;
    if (chart.currency) return `US$${compactNumberFormat.format(value)}`;
    return `${compactNumberFormat.format(value)}${chart.unit || ""}`;
  }

  function niceChartMaximum(value) {
    if (!Number.isFinite(value) || value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const normalized = value / power;
    const multiplier = [1, 2, 5, 10].find((step) => normalized <= step) || 10;
    return multiplier * power;
  }

  function timelineEntriesForChart(entries, group, chart) {
    const platformSet = new Set(group.platforms);
    return entries.map((entry) => {
      const date = isoDate(entry.snapshot.date);
      const value = numericSnapshotValue(entry.snapshot);
      const platforms = snapshotPlatforms(entry);
      if (!date || value === null || !chart.metrics.includes(entry.snapshot.metricType)
        || !platforms.some((platform) => platformSet.has(platform))) return null;
      const platformLabel = platforms.map((platform) => platformNames[platform] || platform).join(" + ") || "跨平台";
      const regionCode = entry.release?.region || entry.snapshot.region;
      const regionLabel = regionCode === "GLOBAL" ? "全球汇总" : regionNames[regionCode] || regionCode || "范围待确认";
      const sourceLabel = entry.snapshot.source || "来源待补";
      return {
        ...entry, date, value,
        seriesKey: `${platforms.join("+")}:${regionCode || "scope"}:${entry.snapshot.metricType}:${sourceLabel}`,
        seriesLabel: `${platformLabel} · ${regionLabel} · ${metricNames[entry.snapshot.metricType] || entry.snapshot.metricType} · ${sourceLabel}`,
      };
    }).filter(Boolean);
  }

  function renderMetricTimelineChart(entries, group, chart) {
    const chartEntries = timelineEntriesForChart(entries, group, chart);
    const heading = `<div class="product-metric-heading"><div><strong>${escapeHtml(chart.title)}</strong><span>${escapeHtml(chart.note)}</span></div><span>${escapeHtml(numberFormat.format(chartEntries.length))} 个数据点</span></div>`;
    if (!chartEntries.length) {
      const platformSet = new Set(group.platforms);
      const unrankedEntries = entries
        .filter((entry) => String(entry.snapshot.rankStatus || "").startsWith("not_in_top_")
          && chart.metrics.includes(entry.snapshot.metricType)
          && snapshotPlatforms(entry).some((platform) => platformSet.has(platform)));
      const latestUnrankedBySeries = new Map();
      for (const entry of unrankedEntries) {
        const key = `${snapshotPlatforms(entry).join("+")}:${entry.release?.region || entry.snapshot.region || "scope"}:${entry.snapshot.metricType}:${entry.snapshot.source || "来源待补"}`;
        const previous = latestUnrankedBySeries.get(key);
        if (!previous || String(entry.snapshot.date).localeCompare(String(previous.snapshot.date)) > 0) {
          latestUnrankedBySeries.set(key, entry);
        }
      }
      const latestUnranked = [...latestUnrankedBySeries.values()]
        .sort((a, b) => snapshotPlatforms(a).join("+").localeCompare(snapshotPlatforms(b).join("+")));
      const emptyMessage = latestUnranked.length
        ? `最新公开榜单快照：${latestUnranked.map((entry) => `${isoDate(entry.snapshot.date)} ${formatMetric(entry.snapshot)}（${entry.snapshot.source || "来源待补"}）`).join("；")}。`
        : "该指标的历史时间序列待补；不会使用其他平台数据代替。";
      return `<article class="product-metric-card is-empty">${heading}<div class="product-chart-empty">${escapeHtml(emptyMessage)}</div></article>`;
    }

    const seriesMap = new Map();
    for (const entry of chartEntries) {
      if (!seriesMap.has(entry.seriesKey)) seriesMap.set(entry.seriesKey, { label: entry.seriesLabel, points: [] });
      seriesMap.get(entry.seriesKey).points.push(entry);
    }
    const series = [...seriesMap.values()].map((item) => ({
      ...item,
      points: item.points.sort((a, b) => a.date.localeCompare(b.date)),
    }));
    const allDates = [...new Set(chartEntries.map((entry) => entry.date))].sort();
    const allTimes = allDates.map((date) => new Date(`${date}T00:00:00Z`).getTime());
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);
    const values = chartEntries.map((entry) => entry.value);
    const plot = { width: 640, height: 220, left: 66, right: 16, top: 18, bottom: 46 };
    const plotWidth = plot.width - plot.left - plot.right;
    const plotHeight = plot.height - plot.top - plot.bottom;
    const yMinimum = chart.rank ? 1 : 0;
    const yMaximum = chart.fixedMax || (chart.percent ? 100 : chart.rank
      ? Math.max(10, niceChartMaximum(Math.max(...values)))
      : niceChartMaximum(Math.max(...values)));
    const xPosition = (date) => {
      if (minTime === maxTime) return plot.left + plotWidth / 2;
      const time = new Date(`${date}T00:00:00Z`).getTime();
      return plot.left + ((time - minTime) / (maxTime - minTime)) * plotWidth;
    };
    const yPosition = (value) => {
      const ratio = (value - yMinimum) / Math.max(1, yMaximum - yMinimum);
      return chart.rank ? plot.top + ratio * plotHeight : plot.top + (1 - ratio) * plotHeight;
    };
    const yTicks = [...new Set([yMinimum, chart.rank ? Math.round((yMinimum + yMaximum) / 2) : yMaximum / 2, yMaximum])];
    const xTicks = allDates.length <= 3
      ? allDates
      : [allDates[0], allDates[Math.floor((allDates.length - 1) / 2)], allDates.at(-1)];
    const grid = yTicks.map((tick) => {
      const y = yPosition(tick);
      return `<line x1="${plot.left}" y1="${y.toFixed(2)}" x2="${plot.width - plot.right}" y2="${y.toFixed(2)}" class="product-chart-gridline"></line><text x="${plot.left - 9}" y="${(y + 4).toFixed(2)}" text-anchor="end" class="product-chart-axis-label">${escapeHtml(chart.rank ? `#${numberFormat.format(tick)}` : chartValueLabel(tick, chart))}</text>`;
    }).join("");
    const dateLabels = xTicks.map((date, index) => {
      const anchor = index === 0 && xTicks.length > 1 ? "start" : index === xTicks.length - 1 && xTicks.length > 1 ? "end" : "middle";
      return `<text x="${xPosition(date).toFixed(2)}" y="${plot.height - 16}" text-anchor="${anchor}" class="product-chart-axis-label">${escapeHtml(date)}</text>`;
    }).join("");
    const paths = series.map((item, index) => {
      const path = item.points.map((point, pointIndex) => `${pointIndex ? "L" : "M"} ${xPosition(point.date).toFixed(2)} ${yPosition(point.value).toFixed(2)}`).join(" ");
      const line = item.points.length > 1 ? `<path d="${path}" class="product-series-line series-tone-${index % 5}"></path>` : "";
      const points = item.points.map((point) => `<circle cx="${xPosition(point.date).toFixed(2)}" cy="${yPosition(point.value).toFixed(2)}" r="5" class="product-series-point series-tone-${index % 5}"><title>${escapeHtml(`${item.label} · ${point.date} · ${chartValueLabel(point.value, chart)}`)}</title></circle>`).join("");
      return `${line}${points}`;
    }).join("");
    const accessibleSummary = series.map((item) => `${item.label}：${item.points.map((point) => `${point.date} ${chartValueLabel(point.value, chart)}`).join("、")}`).join("；");
    const legend = series.map((item, index) => {
      const latest = item.points.at(-1);
      return `<div class="product-series-legend-row"><span class="product-series-swatch series-tone-${index % 5}" aria-hidden="true"></span><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(chartValueLabel(latest.value, chart))}</strong><time>${escapeHtml(latest.date)}</time></div>`;
    }).join("");
    return `<article class="product-metric-card">${heading}<svg class="product-time-chart" viewBox="0 0 ${plot.width} ${plot.height}" role="img" aria-label="${escapeHtml(`${chart.title}：${accessibleSummary}`)}"><title>${escapeHtml(`${chart.title}，${accessibleSummary}`)}</title>${grid}<line x1="${plot.left}" y1="${plot.top + plotHeight}" x2="${plot.width - plot.right}" y2="${plot.top + plotHeight}" class="product-chart-axis"></line>${paths}${dateLabels}</svg><div class="product-series-legend">${legend}</div></article>`;
  }

  function entryDateExtent(entries) {
    const dates = entries.map((entry) => isoDate(entry.snapshot.date)).filter(Boolean).sort();
    if (!dates.length) return "";
    return dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} 至 ${dates.at(-1)}`;
  }

  function renderProductPlatformTimelines(projectId, entries, allProjectEntries) {
    const project = projectById.get(projectId);
    if (!project) {
      elements.productPlatformTimelines.innerHTML = '<div class="product-platform-empty">未找到该产品的项目记录。</div>';
      return;
    }
    const matchingReleases = releases.filter((release) => release.projectId === projectId
      && releaseRegionMatch(release)
      && baseReleaseMatches(project, release, { ignoreRegion: true }));
    const relevantPlatforms = new Set(matchingReleases.map((release) => release.platform));
    for (const entry of allProjectEntries) for (const platform of snapshotPlatforms(entry)) relevantPlatforms.add(platform);
    const groups = productPlatformGroups.filter((group) => group.platforms.some((platform) => relevantPlatforms.has(platform)));
    const platformLabels = [...relevantPlatforms].map((platform) => platformNames[platform] || platform);
    const selectedPeriod = `${state.performanceStartDate || "最早"} 至 ${state.performanceEndDate || "最新"}`;
    const visibleCoverage = entryDateExtent(entries);
    const availableCoverage = entryDateExtent(allProjectEntries);
    elements.productPerformanceName.textContent = project.productName;
    elements.productPerformanceScope.textContent = visibleCoverage
      ? `${project.ipName} · ${platformLabels.join(" / ") || "平台待确认"} · 所选 ${selectedPeriod} · 当前显示 ${visibleCoverage}`
      : `${project.ipName} · ${platformLabels.join(" / ") || "平台待确认"} · 所选 ${selectedPeriod} 无记录 · 该产品现有数据 ${availableCoverage || "待补"}`;
    if (!groups.length) {
      elements.productPlatformTimelines.innerHTML = '<div class="product-platform-empty">当前筛选范围尚未确认该产品的平台版本。</div>';
      return;
    }
    elements.productPlatformTimelines.innerHTML = groups.map((group) => {
      const groupEntries = entries.filter((entry) => snapshotPlatforms(entry).some((platform) => group.platforms.includes(platform)));
      const charts = group.charts.filter((chart) => !chart.optional || timelineEntriesForChart(groupEntries, group, chart).length > 0);
      const groupPlatformLabels = group.platforms.filter((platform) => relevantPlatforms.has(platform)).map((platform) => platformNames[platform] || platform);
      const numericPoints = groupEntries.filter((entry) => numericSnapshotValue(entry.snapshot) !== null).length;
      return `<section class="product-platform-section" aria-labelledby="product-platform-${escapeHtml(group.id)}"><div class="product-platform-heading"><div><span>${escapeHtml(groupPlatformLabels.join(" / ") || group.title)}</span><h3 id="product-platform-${escapeHtml(group.id)}">${escapeHtml(group.title)}</h3><p>${escapeHtml(group.note)}</p></div><strong>${escapeHtml(numberFormat.format(groupEntries.length))} 条已核验记录 · ${escapeHtml(numberFormat.format(numericPoints))} 个数值点</strong></div><div class="product-metric-grid">${charts.map((chart) => renderMetricTimelineChart(groupEntries, group, chart)).join("")}</div></section>`;
    }).join("");
  }

  function renderPerformance() {
    const allEntries = performanceEntries();
    const allAvailableEntries = performanceEntries({ ignoreDate: true });
    const candidateRows = collectFilteredRows().filter(({ project }) => state.selectedIp === "all" || canonicalIpKey(project) === state.selectedIp);
    const visibleProjectIds = [...new Set(candidateRows.map(({ project }) => project.id))];
    elements.performanceProduct.options[0].textContent = state.selectedIp === "all" ? "当前筛选全部产品" : "当前 IP 全部产品";
    appendOptions(elements.performanceProduct, visibleProjectIds
      .sort((a, b) => (projectById.get(a)?.productName || a).localeCompare(projectById.get(b)?.productName || b, "zh-CN"))
      .map((id) => [id, projectById.has(id) ? productOptionLabel(projectById.get(id)) : id]));
    if (![...elements.performanceProduct.options].some((option) => option.value === state.performanceProduct)) {
      state.performanceProduct = "all";
    }
    elements.performanceProduct.value = state.performanceProduct;
    const selectedProjectId = state.performanceProduct !== "all"
      ? state.performanceProduct
      : state.product !== "all" ? state.product : "all";
    const snapshots = allEntries
      .filter(({ project }) => selectedProjectId === "all" || project.id === selectedProjectId)
      .sort((a, b) => String(b.snapshot.date).localeCompare(String(a.snapshot.date)));
    const availableSnapshots = allAvailableEntries
      .filter(({ project }) => selectedProjectId === "all" || project.id === selectedProjectId);
    const selectedPeriod = `${state.performanceStartDate || "最早"} 至 ${state.performanceEndDate || "最新"}`;
    const visibleCoverage = entryDateExtent(snapshots);
    const availableCoverage = entryDateExtent(availableSnapshots);
    const numericPoints = snapshots.filter((entry) => numericSnapshotValue(entry.snapshot) !== null).length;
    elements.performanceCoverageNote.textContent = visibleCoverage
      ? `所选 ${selectedPeriod}｜当前显示 ${visibleCoverage}｜${numberFormat.format(snapshots.length)} 条记录，其中 ${numberFormat.format(numericPoints)} 个数值点`
      : `所选 ${selectedPeriod} 无记录｜当前筛选现有数据 ${availableCoverage || "待补"}`;
    const productSelected = selectedProjectId !== "all";
    elements.performanceOverviewView.hidden = productSelected;
    elements.productPerformanceView.hidden = !productSelected;
    elements.performanceSectionNote.textContent = productSelected
      ? "按平台拆分该产品的重要指标；销量、活跃、口碑与商店榜单不跨平台混算。"
      : "保留平台原始指标，再转换为可比较的表现等级。";
    elements.performanceDetailNote.textContent = productSelected
      ? "展示所选产品在当前表现期间内最近核验的 6 条原始记录"
      : "展示当前筛选内最近核验的 6 条记录";
    elements.performanceMethod.innerHTML = productSelected
      ? "<strong>产品视图口径：</strong>每张图只比较同平台、同单位指标；Steam 重点观察销量与活跃，主机重点观察销量与用户口碑，手游分别观察 App Store 与 Google Play 的下载榜和畅销榜。榜单纵轴越接近第 1 名越好；累计值只按核验日期显示，不视为当日新增。"
      : "<strong>分级口径：</strong>Steam 历史同时在线峰值 ≥100,000 为“现象级”，≥20,000 为“强势”，≥5,000 为“表现良好”；手游收入依次采用 ≥US$50M、≥US$20M、≥US$5M，手游下载量依次采用 ≥10M、≥5M、≥1M。AppMagic 免费公开区间仅表示下限，页面保留“&gt;”；不同平台指标不直接混算。";
    if (productSelected) {
      renderProductPlatformTimelines(selectedProjectId, snapshots, availableSnapshots);
    } else {
      renderSteamPeakChart(snapshots);
      renderPerformanceTierChart(snapshots);
      renderMobileMarketChart(snapshots);
    }
    elements.performanceEmpty.hidden = snapshots.length > 0;
    elements.performanceList.innerHTML = snapshots.slice(0, 6).map(({ snapshot, release, project }) => {
      const level = snapshot.performanceLevel || "insufficient";
      return `<div class="performance-row">
        <div class="performance-product"><button type="button" class="performance-product-select" data-performance-project-id="${escapeHtml(project.id)}">${escapeHtml(project.productName)}</button><span>${escapeHtml(performancePlatformLabel(snapshot, release))}</span></div>
        <div class="performance-metric"><strong>${escapeHtml(formatMetric(snapshot))}</strong><span>${escapeHtml(snapshot.scope || "平台公开榜单")} · ${escapeHtml(isoDate(snapshot.date) || "日期待补")}</span></div>
        <span class="status-chip ${level === "phenomenon" || level === "strong" ? "active" : level === "insufficient" ? "pending" : "ended"} performance-level">${escapeHtml(levelNames[level] || level)}</span>
      </div>`;
    }).join("");
  }

  function latestPerformanceForRelease(release) {
    const byDateAndLevel = (a, b) => String(b.date).localeCompare(String(a.date))
      || Number(Number.isFinite(Number(b.rank)) || Number.isFinite(Number(b.value)))
        - Number(Number.isFinite(Number(a.rank)) || Number.isFinite(Number(a.value)))
      || (performanceWeights[b.performanceLevel] || 0) - (performanceWeights[a.performanceLevel] || 0);
    const exact = rankSnapshots
      .filter((snapshot) => snapshot.releaseId === release.id)
      .sort(byDateAndLevel)[0];
    if (exact) return exact;
    return rankSnapshots
      .filter((snapshot) => snapshot.projectId === release.projectId
        && snapshot.region === release.region
        && Array.isArray(snapshot.platforms)
        && snapshot.platforms.includes(release.platform))
      .sort(byDateAndLevel)[0] || null;
  }

  function preferredTiming(values) {
    return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
      .sort((a, b) => {
        const aBounds = dateBounds(a);
        const bBounds = dateBounds(b);
        if (!aBounds && !bBounds) return a.localeCompare(b, "zh-CN");
        if (!aBounds) return 1;
        if (!bBounds) return -1;
        return timingPrecision(a) - timingPrecision(b)
          || aBounds.start.localeCompare(bBounds.start)
          || aBounds.end.localeCompare(bBounds.end);
      });
  }

  function displayPreferredTiming(values, emptyLabel) {
    const timings = preferredTiming(values);
    if (!timings.length) return displayDate("", emptyLabel);
    return `${displayDate(timings[0], emptyLabel)}${timings.length > 1 ? `<span class="project-date-note">另有 ${timings.length - 1} 个地区日期</span>` : ""}`;
  }

  function projectStatusForRows(project, projectRows) {
    const statuses = projectRows.map(({ release }) => release?.status).filter(Boolean);
    if (project.status === "cancelled" || statuses.length && statuses.every((status) => status === "cancelled")) return "cancelled";
    if (project.status === "ended" || statuses.length && statuses.every((status) => status === "ended")) return "ended";
    if (projectRows.some(({ release }) => isoDate(release?.actualLaunchDate) && isoDate(release.actualLaunchDate) <= today)) return "launched";
    return ["testing", "preregister", "upcoming", "delayed", "announced"]
      .find((status) => project.status === status || statuses.includes(status)) || project.status || "announced";
  }

  function renderTable(rows) {
    const groupedProjects = new Map();
    for (const row of rows) {
      if (!groupedProjects.has(row.project.id)) groupedProjects.set(row.project.id, { project: row.project, rows: new Map() });
      const rowKey = row.release?.id || `${row.project.id}:unannounced`;
      groupedProjects.get(row.project.id).rows.set(rowKey, row);
    }
    const projectRows = [...groupedProjects.values()].map(({ project, rows: rowMap }) => {
      const groupedRows = [...rowMap.values()];
      const sortDates = [
        isoDate(project.latestUpdateDate), isoDate(project.announcementDate),
        ...groupedRows.flatMap(({ release }) => [isoDate(release?.actualLaunchDate), isoDate(release?.plannedLaunchDate)]),
      ].filter(Boolean).sort();
      return { project, rows: groupedRows, sortDate: sortDates.at(-1) || "" };
    }).sort((a, b) => b.sortDate.localeCompare(a.sortDate) || a.project.productName.localeCompare(b.project.productName, "zh-CN"));
    const pageData = paginate(projectRows, "projectPage", 8);
    const releaseCount = rows.filter(({ release }) => release).length;
    elements.tableCount.textContent = `${numberFormat.format(projectRows.length)} 个产品 · ${numberFormat.format(releaseCount)} 个版本`;
    elements.tableEmpty.hidden = projectRows.length > 0;
    elements.tableBody.innerHTML = pageData.items.map(({ project, rows: groupedRows }) => {
      const status = projectStatusForRows(project, groupedRows);
      const releasesForProject = groupedRows.map(({ release }) => release).filter(Boolean);
      const platforms = [...new Set(releasesForProject.map((release) => platformNames[release.platform] || release.platform))];
      const regions = [...new Set(groupedRows
        .filter(({ release }) => release)
        .map(({ release, regionMatch }) => displayedRegion(release, regionMatch).label))];
      const performance = groupedRows.map(({ release, regionMatch }) => {
        const scopedOnly = state.region !== "all" && regionMatch?.quality === "announcement_scope";
        return release && !scopedOnly ? latestPerformanceForRelease(release) : null;
      }).filter(Boolean).sort((a, b) => String(b.date).localeCompare(String(a.date))
        || Number(Number.isFinite(Number(b.rank)) || Number.isFinite(Number(b.value)))
          - Number(Number.isFinite(Number(a.rank)) || Number.isFinite(Number(a.value)))
        || (performanceWeights[b.performanceLevel] || 0) - (performanceWeights[a.performanceLevel] || 0))[0];
      const variants = groupedRows.filter(({ release }) => release).sort((a, b) => {
        const aRegion = displayedRegion(a.release, a.regionMatch).label;
        const bRegion = displayedRegion(b.release, b.regionMatch).label;
        return aRegion.localeCompare(bRegion, "zh-CN") || String(a.release.platform).localeCompare(String(b.release.platform));
      });
      return `<tr>
        <td><span class="table-primary">${escapeHtml(project.productName)}</span><span class="table-secondary">${escapeHtml(project.ipName)} · ${escapeHtml(project.ipType || "类型待补")}</span></td>
        <td><span class="table-primary">${escapeHtml(project.developer || "开发商待补")}</span><span class="table-secondary">发行：${escapeHtml(project.publisher || "待补")}</span></td>
        <td><div class="project-platforms">${(platforms.length ? platforms : ["平台待公布"]).map((platform) => `<span class="project-chip platform">${escapeHtml(platform)}</span>`).join("")}${regions.map((region) => `<span class="project-chip region">${escapeHtml(region)}</span>`).join("")}</div>${variants.length ? `<details class="release-variants"><summary>${variants.length} 个地区平台版本</summary><div class="release-variant-list">${variants.map(({ release, regionMatch }) => { const regionInfo = displayedRegion(release, regionMatch); const timing = release.actualLaunchDate || release.plannedLaunchDate || "时间待定"; return `<div><strong>${escapeHtml(platformNames[release.platform] || release.platform)} · ${escapeHtml(regionInfo.label)}</strong><span>${escapeHtml(isoDate(timing) || timing)} · ${escapeHtml(isoDate(release.actualLaunchDate) ? "实际上线" : "计划记录")}</span></div>`; }).join("")}</div></details>` : '<span class="table-secondary">渠道待确认</span>'}</td>
        <td>${displayDate(project.announcementDate)}</td>
        <td>${displayPreferredTiming(releasesForProject.map((release) => release.plannedLaunchDate), ["announced", "testing", "preregister", "upcoming"].includes(status) ? "时间待定" : "待确认")}</td>
        <td>${displayPreferredTiming(releasesForProject.map((release) => release.actualLaunchDate), "尚未上线")}</td>
        <td><span class="status-chip ${statusClass(status)}">${escapeHtml(statusNames[status] || status)}</span></td>
        <td>${performance ? `<span class="table-primary">${escapeHtml(formatMetric(performance))}</span><span class="table-secondary">${escapeHtml(levelNames[performance.performanceLevel] || "表现等级待评估")}</span>` : '<span class="project-chip pending">榜单待补</span>'}</td>
      </tr>`;
    }).join("");
    renderPagination(elements.projectPagination, "projectPage", projectRows.length, 8);
  }

  function renderKpis(rows) {
    const uniqueProjects = new Map(rows.map(({ project }) => [project.id, project]));
    const launched = [...uniqueProjects.values()].filter((project) => {
      const projectReleases = rows.filter((row) => row.project.id === project.id).map((row) => row.release).filter(Boolean);
      return project.status === "launched" || projectReleases.some((release) => isoDate(release.actualLaunchDate) && isoDate(release.actualLaunchDate) <= today);
    }).length;
    const activeFutureStatuses = new Set(["announced", "testing", "preregister", "upcoming"]);
    const upcomingProjects = new Map();
    for (const { project, release } of rows) {
      if (!release) continue;
      const plannedDate = isoDate(release.plannedLaunchDate);
      const effectiveStatus = release.status || project.status || "announced";
      if (isoDate(release.actualLaunchDate) || !activeFutureStatuses.has(effectiveStatus)) continue;
      const previous = upcomingProjects.get(project.id);
      const candidate = { project, release, plannedDate, plannedTiming: String(release.plannedLaunchDate || "").trim() };
      if (!previous
        || (plannedDate && !previous.plannedDate)
        || (plannedDate && previous.plannedDate && plannedDate < previous.plannedDate)
        || (!plannedDate && candidate.plannedTiming && !previous.plannedDate && !previous.plannedTiming)) {
        upcomingProjects.set(project.id, candidate);
      }
    }
    const nextUpcoming = [...upcomingProjects.values()]
      .filter(({ plannedDate }) => plannedDate && plannedDate >= today)
      .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))[0];
    const undatedUpcoming = [...upcomingProjects.values()].filter(({ plannedTiming }) => !plannedTiming).length;
    elements.kpiProjects.textContent = numberFormat.format(uniqueProjects.size);
    elements.kpiLaunched.textContent = numberFormat.format(launched);
    elements.kpiUpcoming.textContent = numberFormat.format(upcomingProjects.size);
    elements.kpiUpcomingDetail.textContent = nextUpcoming
      ? `${nextUpcoming.project.productName} · ${nextUpcoming.plannedDate}${undatedUpcoming ? `；另有 ${undatedUpcoming} 项日期待定` : ""}`
      : `含年份窗口及日期待定的已公布项目${undatedUpcoming ? `（${undatedUpcoming} 项日期待定）` : ""}`;
    elements.kpiReleases.textContent = numberFormat.format(rows.filter(({ release }) => release).length);
  }

  function renderRegionAudit() {
    const checks = regionChecks.filter((check) => {
      const project = projectById.get(check.projectId);
      if (!project) return false;
      return (state.platform === "all" || check.platform === state.platform)
        && (state.region === "all" || check.region === state.region)
        && (state.product === "all" || check.projectId === state.product)
        && (state.ipType === "all" || project.ipType === state.ipType)
        && textMatches(project, null);
    });
    if (!checks.length) {
      elements.regionAudit.innerHTML = `<div class="region-audit-empty">当前筛选范围尚无结构化地区商店核验；不等同于确认未发行。</div>`;
      return;
    }
    const count = (...availability) => checks.filter((check) => availability.includes(check.availability)).length;
    const auditedRegions = new Set(checks.map((check) => check.region));
    const marketLabel = state.region === "all"
      ? `已核验 ${auditedRegions.size} 个地区`
      : regionNames[state.region] || state.region;
    const auditedPlatforms = [...new Set(checks.map((check) => platformNames[check.platform] || check.platform))].sort();
    const platformLabel = auditedPlatforms.join(" / ");
    const auditScopeLabel = state.region === "CN"
      ? "版号、国服 / 国行与大陆官方发行渠道"
      : state.region === "SEA"
        ? "东南亚目前以新加坡为代表样本"
        : state.region === "all"
          ? "含大陆版号 / 国行核验；东南亚以新加坡为代表样本"
          : "来自官方地区商店";
    elements.regionAudit.innerHTML = `<div class="region-audit-title"><span>地区商店核验进度</span><strong>${escapeHtml(marketLabel)} · ${escapeHtml(platformLabel)}</strong><small>${escapeHtml(auditScopeLabel)}</small></div>
      <div><span>检查记录</span><strong>${escapeHtml(numberFormat.format(checks.length))}</strong></div>
      <div><span>当前可用</span><strong>${escapeHtml(numberFormat.format(count("available")))}</strong></div>
      <div><span>历史已停售</span><strong>${escapeHtml(numberFormat.format(count("delisted_store_page")))}</strong></div>
      <div><span>当前未上架 / 未检索到</span><strong>${escapeHtml(numberFormat.format(count("not_available_currently", "not_listed_currently", "check_failed")))}</strong></div>`;
  }

  function render() {
    const rows = filteredRows();
    renderKpis(rows);
    renderRegionAudit();
    renderIpActivity(rows);
    const downstreamRows = state.selectedIp === "all"
      ? rows
      : rows.filter(({ project }) => canonicalIpKey(project) === state.selectedIp);
    renderProjectCalendar(downstreamRows);
    renderSchedule(downstreamRows);
    renderPerformance();
    renderTable(downstreamRows);
    elements.summary.textContent = rows.length
      ? `当前筛选显示 ${new Set(rows.map(({ project }) => project.id)).size} 个项目、${rows.filter(({ release }) => release).length} 个地区平台记录。${state.region === "all" ? "“全球/亚洲”仅表示公告范围。" : `其中 ${rows.filter(({ regionMatch }) => regionMatch?.quality === "verified").length} 条已逐区核验，${rows.filter(({ regionMatch }) => regionMatch?.quality === "announcement_scope").length} 条为公告覆盖待逐区确认。`}`
      : "当前筛选条件下没有可展示的项目；可调整产品、平台、地区或其他项目筛选条件。";
  }

  function updateStateAndRender(event) {
    const productFilterChanged = event?.target === elements.product;
    state.performanceStartDate = elements.performanceStartDate.value;
    state.performanceEndDate = elements.performanceEndDate.value;
    if (state.performanceStartDate && state.performanceEndDate && state.performanceStartDate > state.performanceEndDate) {
      if (event?.target === elements.performanceStartDate) {
        state.performanceEndDate = state.performanceStartDate;
        elements.performanceEndDate.value = state.performanceEndDate;
      } else {
        state.performanceStartDate = state.performanceEndDate;
        elements.performanceStartDate.value = state.performanceStartDate;
      }
    }
    state.platform = elements.platform.value;
    state.region = elements.region.value;
    state.status = elements.status.value;
    state.ipType = elements.ipType.value;
    state.product = elements.product.value;
    state.search = elements.search.value.trim();
    state.performanceProduct = elements.performanceProduct.value;
    if (productFilterChanged) {
      state.performanceProduct = state.product;
      if (state.product !== "all") {
        const focus = calendarFocusForProject(state.product);
        if (focus) {
          state.calendarMonth = clampCalendarMonth(focus.month);
          state.calendarSelectedDate = focus.date;
        }
      }
    }
    if (![elements.performanceStartDate, elements.performanceEndDate, elements.performanceProduct].includes(event?.target)) {
      state.ipActivityPage = 1;
      state.schedulePage = 1;
      state.projectPage = 1;
    }
    elements.performanceDateRangeLabel.textContent = `${state.performanceStartDate || "最早"} — ${state.performanceEndDate || "最新"}`;
    render();
  }

  applyNameLanguage(state.nameLanguage);
  elements.generatedAt.textContent = formatGeneratedAt(meta.generatedAt);
  elements.latestProjectDate.textContent = meta.latestProjectDate ? `项目：${meta.latestProjectDate}` : "等待首次导入";
  renderProjectSourceFreshness();
  elements.footerSource.textContent = `持续补全历史与未来项目：当前收录 ${numberFormat.format(projects.length)} 个真实项目、${numberFormat.format(releases.length)} 个地区平台版本；地区采用七市场口径，公告覆盖、官方商店检查与逐区核验数据严格区分。`;
  populateFilters();
  syncControls();
  render();

  if (elements.nameLanguage) {
    elements.nameLanguage.value = state.nameLanguage;
    elements.nameLanguage.addEventListener("change", () => {
      state.nameLanguage = nameLocalization?.setMode?.(elements.nameLanguage.value) || elements.nameLanguage.value;
      applyNameLanguage(state.nameLanguage);
      populateFilters();
      syncControls();
      render();
    });
    window.addEventListener("storage", (event) => {
      if (event.key !== nameLocalization?.storageKey || !event.newValue || event.newValue === state.nameLanguage) return;
      state.nameLanguage = event.newValue;
      elements.nameLanguage.value = state.nameLanguage;
      applyNameLanguage(state.nameLanguage);
      populateFilters();
      syncControls();
      render();
    });
  }

  for (const element of [
    elements.performanceStartDate, elements.performanceEndDate,
    elements.platform, elements.region,
    elements.status, elements.ipType, elements.product, elements.performanceProduct,
  ]) element.addEventListener("change", updateStateAndRender);
  elements.search.addEventListener("input", updateStateAndRender);
  const updateCalendarPeriod = () => {
    state.calendarMonth = clampCalendarMonth(`${elements.calendarYearSelect.value}-${elements.calendarMonthSelect.value}`);
    state.calendarSelectedDate = `${state.calendarMonth}-01`;
    render();
  };
  elements.calendarYearSelect.addEventListener("change", updateCalendarPeriod);
  elements.calendarMonthSelect.addEventListener("change", updateCalendarPeriod);
  elements.calendarPrevMonth.addEventListener("click", () => {
    state.calendarMonth = clampCalendarMonth(shiftMonth(state.calendarMonth, -1));
    state.calendarSelectedDate = `${state.calendarMonth}-01`;
    render();
  });
  elements.calendarNextMonth.addEventListener("click", () => {
    state.calendarMonth = clampCalendarMonth(shiftMonth(state.calendarMonth, 1));
    state.calendarSelectedDate = `${state.calendarMonth}-01`;
    render();
  });
  elements.calendarToday.addEventListener("click", () => {
    state.calendarMonth = clampCalendarMonth(today.slice(0, 7));
    state.calendarSelectedDate = today;
    render();
  });
  elements.calendarGrid.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const dateTarget = event.target.closest("[data-calendar-date]");
    if (!dateTarget) return;
    state.calendarSelectedDate = dateTarget.dataset.calendarDate;
    render();
  });
  const selectCalendarProject = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("[data-project-id]");
    const projectId = button?.dataset.projectId;
    if (!projectById.has(projectId)) return;
    state.product = projectId;
    state.performanceProduct = projectId;
    state.selectedIp = "all";
    state.ipActivityPage = 1;
    state.schedulePage = 1;
    state.projectPage = 1;
    syncControls();
    render();
  };
  elements.calendarAgendaList.addEventListener("click", selectCalendarProject);
  elements.calendarWindowList.addEventListener("click", selectCalendarProject);
  elements.ipActivityBody.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".ip-activity-select");
    if (!button) return;
    const ipKey = button.dataset.ipKey;
    const isSelecting = state.selectedIp !== ipKey;
    state.selectedIp = isSelecting ? ipKey : "all";
    if (isSelecting) {
      const focus = calendarFocusForIp(ipKey);
      if (focus) {
        state.calendarMonth = clampCalendarMonth(focus.month);
        state.calendarSelectedDate = focus.date;
      }
    }
    state.performanceProduct = "all";
    state.schedulePage = 1;
    state.projectPage = 1;
    render();
  });
  elements.clearIpDrilldown.addEventListener("click", () => {
    state.selectedIp = "all";
    state.performanceProduct = "all";
    state.schedulePage = 1;
    state.projectPage = 1;
    render();
  });
  elements.performancePanel.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".performance-product-select");
    if (!button) return;
    const projectId = button.dataset.performanceProjectId;
    if (!projectById.has(projectId)) return;
    state.performanceProduct = projectId;
    render();
  });
  elements.clearPerformanceProduct.addEventListener("click", () => {
    state.product = "all";
    state.performanceProduct = "all";
    state.ipActivityPage = 1;
    state.schedulePage = 1;
    state.projectPage = 1;
    syncControls();
    render();
  });
  for (const pagination of [elements.ipActivityPagination, elements.schedulePagination, elements.projectPagination]) {
    pagination.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button[data-page-state][data-page]");
      if (!button || button.disabled || !(button.dataset.pageState in state)) return;
      state[button.dataset.pageState] = Number(button.dataset.page);
      render();
    });
  }
  elements.reset.addEventListener("click", () => {
    Object.assign(state, {
      performanceStartDate: defaultPerformanceStartDate, performanceEndDate: defaultPerformanceEndDate,
      platform: "all", region: "all",
      status: "all", ipType: "all", product: "all", search: "", performanceProduct: "all", selectedIp: "all",
      calendarMonth: clampCalendarMonth(today.slice(0, 7)), calendarSelectedDate: today,
      ipActivityPage: 1, schedulePage: 1, projectPage: 1,
    });
    syncControls();
    render();
  });
})();
