js
const GITHUB_CONFIG = {
  owner: "Nansen629",
  repo: "report",
  branch: "main",
  path: "reports.json",
  token: "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"
};

let reports = [];
let currentId = null;
let currentSha = null;

const adminRecordList = document.getElementById("adminRecordList");
const statusEl = document.getElementById("status");

const typeEl = document.getElementById("type");
const dateEl = document.getElementById("date");
const authorEl = document.getElementById("author");
const titleEl = document.getElementById("title");

const overviewInput = document.getElementById("overviewInput");
const reviewInput = document.getElementById("reviewInput");
const nextWorkInput = document.getElementById("nextWorkInput");
const aiPromotionInput = document.getElementById("aiPromotionInput");

const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const newBtn = document.getElementById("newBtn");
const reloadBtn = document.getElementById("reloadBtn");
const copyTextBtn = document.getElementById("copyTextBtn");

function setStatus(text) {
  statusEl.textContent = text;
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatChineseDate(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function getFriday(date) {
  const monday = getMonday(date);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday;
}

function makeId(type, date) {
  return `${type}-${date}`;
}

function getDefaultTitle() {
  const author = authorEl.value.trim() || "阿吞";
  const selectedDate = new Date(dateEl.value);

  if (typeEl.value === "daily") {
    return `${author} ${formatChineseDate(selectedDate)}日报`;
  }

  const monday = getMonday(selectedDate);
  const friday = getFriday(selectedDate);
  return `${author} ${formatChineseDate(monday)}-${formatChineseDate(friday)}周报`;
}

function updateLabels() {
  const isDaily = typeEl.value === "daily";

  document.getElementById("overviewLabel").textContent =
    `一、${isDaily ? "今日" : "本周"}工作概述`;

  document.getElementById("reviewLabel").textContent =
    `二、${isDaily ? "今日" : "本周"}复盘与收获`;

  document.getElementById("nextWorkLabel").textContent =
    `三、${isDaily ? "明日" : "下周"}待开展工作 & 一句话思路`;
}

function sortReports(list) {
  return [...list].sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}

function formatType(type) {
  return type === "daily" ? "日报" : "周报";
}

function encodeBase64Unicode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64Unicode(base64) {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}

function getGithubApiUrl() {
  const { owner, repo, path } = GITHUB_CONFIG;
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}

function getGithubHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_CONFIG.token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json"
  };
}

async function fetchReportsFromGithub() {
  const url = `${getGithubApiUrl()}?ref=${encodeURIComponent(GITHUB_CONFIG.branch)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getGithubHeaders()
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`读取 GitHub 文件失败：${response.status} ${text}`);
  }

  const file = await response.json();
  currentSha = file.sha;

  const content = decodeBase64Unicode(file.content || "");
  const parsed = JSON.parse(content || "[]");

  reports = Array.isArray(parsed) ? parsed : [];
}

async function saveReportsToGithub(message) {
  const jsonText = JSON.stringify(reports, null, 2);

  const body = {
    message,
    content: encodeBase64Unicode(jsonText),
    branch: GITHUB_CONFIG.branch,
    sha: currentSha
  };

  const response = await fetch(getGithubApiUrl(), {
    method: "PUT",
    headers: getGithubHeaders(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`写入 GitHub 文件失败：${response.status} ${text}`);
  }

  const result = await response.json();
  currentSha = result.content.sha;
}

function renderAdminList() {
  adminRecordList.innerHTML = "";

  if (reports.length === 0) {
    adminRecordList.innerHTML = `<div class="empty-state">暂无记录</div>`;
    return;
  }

  sortReports(reports).forEach((report) => {
    const item = document.createElement("div");
    item.className =
      "record-item" + (currentId === report.id ? " active" : "");

    item.innerHTML = `
      <div class="record-item-title">${report.title || "未命名记录"}</div>
      <div class="record-item-meta">${formatType(report.type)} · ${report.date}</div>
    `;

    item.addEventListener("click", () => {
      fillForm(report);
      renderAdminList();
    });

    adminRecordList.appendChild(item);
  });
}

function fillForm(report) {
  currentId = report.id;

  typeEl.value = report.type || "weekly";
  dateEl.value = report.date || todayString();
  titleEl.value = report.title || "";
  overviewInput.value = report.overview || "";
  reviewInput.value = report.review || "";
  nextWorkInput.value = report.nextWork || "";
  aiPromotionInput.value = report.aiPromotion || "";

  updateLabels();
  setStatus(`正在编辑：${report.title || report.id}`);
}

function clearForm() {
  currentId = null;

  typeEl.value = "weekly";
  dateEl.value = todayString();
  titleEl.value = "";
  overviewInput.value = "";
  reviewInput.value = "";
  nextWorkInput.value = "";
  aiPromotionInput.value = "";

  updateLabels();
  titleEl.value = getDefaultTitle();

  setStatus("已新建空白记录。");
  renderAdminList();
}

function collectFormData() {
  const type = typeEl.value;
  const date = dateEl.value;
  const id = makeId(type, date);

  return {
    id,
    type,
    date,
    title: titleEl.value.trim() || getDefaultTitle(),
    overview: overviewInput.value.trim(),
    review: reviewInput.value.trim(),
    nextWork: nextWorkInput.value.trim(),
    aiPromotion: aiPromotionInput.value.trim(),
    updatedAt: new Date().toISOString()
  };
}

function buildReportText(report) {
  const isDaily = report.type === "daily";

  return `${report.title}

一、${isDaily ? "今日" : "本周"}工作概述：

${report.overview || "暂无填写"}

二、${isDaily ? "今日" : "本周"}复盘与收获：

${report.review || "暂无填写"}

三、${isDaily ? "明日" : "下周"}待开展工作：

${report.nextWork || "暂无填写"}

四、AI for 宣发

${report.aiPromotion || "暂无填写"}`;
}

async function handleSave() {
  try {
    if (!dateEl.value) {
      alert("请先选择日期。");
      return;
    }

    setStatus("正在同步最新数据...");
    saveBtn.disabled = true;

    await fetchReportsFromGithub();

    const data = collectFormData();
    const index = reports.findIndex((item) => item.id === data.id);

    if (index >= 0) {
      reports[index] = {
        ...reports[index],
        ...data
      };
    } else {
      reports.push(data);
    }

    setStatus("正在写入 GitHub...");
    await saveReportsToGithub(`save report ${data.id}`);

    currentId = data.id;
    renderAdminList();

    setStatus("保存成功，已同步到 GitHub。导师页稍等几十秒刷新即可看到。");
  } catch (error) {
    console.error(error);
    alert(error.message);
    setStatus("保存失败，请检查 Token、仓库名、分支名和 reports.json。");
  } finally {
    saveBtn.disabled = false;
  }
}

async function handleDelete() {
  try {
    const data = collectFormData();
    const targetId = currentId || data.id;

    if (!targetId) return;

    const confirmed = confirm("确认删除当前记录吗？");
    if (!confirmed) return;

    setStatus("正在同步最新数据...");
    deleteBtn.disabled = true;

    await fetchReportsFromGithub();

    reports = reports.filter((item) => item.id !== targetId);

    setStatus("正在写入 GitHub...");
    await saveReportsToGithub(`delete report ${targetId}`);

    clearForm();
    renderAdminList();

    setStatus("删除成功，已同步到 GitHub。");
  } catch (error) {
    console.error(error);
    alert(error.message);
    setStatus("删除失败。");
  } finally {
    deleteBtn.disabled = false;
  }
}

async function init() {
  try {
    dateEl.value = todayString();
    authorEl.value = localStorage.getItem("report-author") || "阿吞";
    updateLabels();
    titleEl.value = getDefaultTitle();

    setStatus("正在从 GitHub 读取数据...");
    await fetchReportsFromGithub();

    renderAdminList();
    setStatus("数据加载完成，可以开始填写。");
  } catch (error) {
    console.error(error);
    setStatus("读取失败，请检查 admin.js 里的 GitHub 配置。");
    alert(error.message);
  }
}

typeEl.addEventListener("change", () => {
  updateLabels();
  titleEl.value = getDefaultTitle();
});

dateEl.addEventListener("change", () => {
  titleEl.value = getDefaultTitle();
});

authorEl.addEventListener("input", () => {
  localStorage.setItem("report-author", authorEl.value);
  titleEl.value = getDefaultTitle();
});

saveBtn.addEventListener("click", handleSave);
deleteBtn.addEventListener("click", handleDelete);
newBtn.addEventListener("click", clearForm);

reloadBtn.addEventListener("click", async () => {
  try {
    setStatus("正在刷新数据...");
    await fetchReportsFromGithub();
    renderAdminList();
    setStatus("刷新完成。");
  } catch (error) {
    alert(error.message);
    setStatus("刷新失败。");
  }
});

copyTextBtn.addEventListener("click", async () => {
  const data = collectFormData();
  await navigator.clipboard.writeText(buildReportText(data));
  setStatus("已复制当前文本。");
});

init();