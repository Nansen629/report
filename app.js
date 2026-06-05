js
let allReports = [];
let currentReport = null;

const typeFilter = document.getElementById("typeFilter");
const searchInput = document.getElementById("searchInput");
const recordList = document.getElementById("recordList");
const emptyState = document.getElementById("emptyState");
const detailContent = document.getElementById("detailContent");
const copyBtn = document.getElementById("copyBtn");

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
  const type = typeFilter.value;
  const keyword = searchInput.value.trim().toLowerCase();

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
    emptyState.classList.remove("hidden");
    detailContent.classList.add("hidden");
    emptyState.textContent = "暂无日报/周报记录";
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

const PUBLIC_GIST_ID = "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v";

async function loadReports() {
  try {
    const response = await fetch(`https://api.github.com/gists/${PUBLIC_GIST_ID}?t=${Date.now()}`);

    if (!response.ok) {
      throw new Error("无法读取 Gist 数据");
    }

    const gist = await response.json();
    const file = gist.files["reports.json"];

    if (!file) {
      throw new Error("Gist 中没有 reports.json 文件");
    }

    const data = JSON.parse(file.content || "[]");
    allReports = Array.isArray(data) ? data : [];

    renderList();
  } catch (error) {
    console.error(error);
    emptyState.classList.remove("hidden");
    detailContent.classList.add("hidden");
    emptyState.textContent = "加载失败，请检查 Gist ID 是否正确。";
  }
}
