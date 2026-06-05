const RAW_REPORTS_URL = "https://gist.githubusercontent.com/Nansen629/40932f1a155e19e95477628e8e2ed4ea/reports.json";

let allReports = [];
let currentReport = null;

const typeFilter = document.getElementById("typeFilter");
const searchInput = document.getElementById("searchInput");
const recordList = document.getElementById("recordList");
const emptyState = document.getElementById("emptyState");
const detailContent = document.getElementById("detailContent");
const copyBtn = document.getElementById("copyBtn");

function setEmptyText(text) {
  if (emptyState) {
    emptyState.textContent = text;
    emptyState.classList.remove("hidden");
  }

  if (detailContent) {
    detailContent.classList.add("hidden");
  }
}

function formatType(type) {
  return type === "daily" ? "日报" : "周报";
}

function sortReports(reports) {
  return [...reports].sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}

function normalizeText(text) {
  return text || "暂无填写";
}

function buildReportText(report) {
  const isDaily = report.type === "daily";

  return `${report.title}

一、${isDaily ? "今日" : "本周"}工作概述：

${normalizeText(report.overview)}

二、${isDaily ? "今日" : "本周"}复盘与收获：

${normalizeText(report.review)}

三、${isDaily ? "明日" : "下周"}待开展工作：

${normalizeText(report.nextWork)}

四、AI for 宣发

${normalizeText(report.aiPromotion)}`;
}

function getFilteredReports() {
  const type = typeFilter ? typeFilter.value : "all";
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

  return sortReports(allReports).filter((report) => {
    const matchType = type === "all" || report.type === type;

    const fullText = [
      report.title,
      report.date,
      report.overview,
      report.review,
      report.nextWork,
      report.aiPromotion
    ]
      .join(" ")
      .toLowerCase();

    const matchKeyword = !keyword || fullText.includes(keyword);

    return matchType && matchKeyword;
  });
}

function renderList() {
  const reports = getFilteredReports();

  if (!recordList) {
    setEmptyText("页面结构异常：没有找到历史记录列表。");
    return;
  }

  recordList.innerHTML = "";

  if (reports.length === 0) {
    recordList.innerHTML = `<div class="empty-state">暂无匹配记录</div>`;
    renderDetail(null);
    return;
  }

  reports.forEach((report) => {
    const item = document.createElement("div");
    item.className =
      "record-item" + (currentReport && currentReport.id === report.id ? " active" : "");

    item.innerHTML = `
      <div class="record-item-title">${report.title || "未命名记录"}</div>
      <div class="record-item-meta">${formatType(report.type)} · ${report.date}</div>
    `;

    item.addEventListener("click", () => {
      renderDetail(report);
      renderList();
    });

    recordList.appendChild(item);
  });

  if (!currentReport || !reports.some((item) => item.id === currentReport.id)) {
    renderDetail(reports[0]);
  }
}

function renderDetail(report) {
  currentReport = report;

  if (!report) {
    setEmptyText("暂无日报/周报记录");
    return;
  }

  const isDaily = report.type === "daily";

  emptyState.classList.add("hidden");
  detailContent.classList.remove("hidden");

  document.getElementById("detailType").textContent = formatType(report.type);
  document.getElementById("detailTitle").textContent = report.title || "未命名记录";
  document.getElementById("detailDate").textContent = report.date || "";

  document.getElementById("overviewTitle").textContent =
    `一、${isDaily ? "今日" : "本周"}工作概述`;
  document.getElementById("reviewTitle").textContent =
    `二、${isDaily ? "今日" : "本周"}复盘与收获`;
  document.getElementById("nextWorkTitle").textContent =
    `三、${isDaily ? "明日" : "下周"}待开展工作`;

  document.getElementById("overview").textContent = normalizeText(report.overview);
  document.getElementById("review").textContent = normalizeText(report.review);
  document.getElementById("nextWork").textContent = normalizeText(report.nextWork);
  document.getElementById("aiPromotion").textContent = normalizeText(report.aiPromotion);
}


async function loadReports() {
  try {
    setEmptyText("正在加载记录...");

    const response = await fetch(`${RAW_REPORTS_URL}?t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`无法读取 Gist Raw 数据：${response.status} ${text}`);
    }

    const data = await response.json();
    allReports = Array.isArray(data) ? data : [];

    renderList();
  } catch (error) {
    console.error(error);
    setEmptyText(error.message || "加载失败，请检查 Gist Raw 链接。");
  }
}

loadReports();
