let reports = [];
let currentId = null;
let gistId = localStorage.getItem("report-gist-id") || "";
let gistToken = localStorage.getItem("report-gist-token") || "";

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

function ensureGistConfig() {
  if (!gistId) {
    gistId = prompt("请输入你的 Gist ID：") || "";
    if (gistId) {
      localStorage.setItem("report-gist-id", gistId.trim());
    }
  }

  if (!gistToken) {
    gistToken = prompt("请输入你的 GitHub Token。注意：只需要 gist 权限：") || "";
    if (gistToken) {
      localStorage.setItem("report-gist-token", gistToken.trim());
    }
  }

  if (!gistId || !gistToken) {
    throw new Error("缺少 Gist ID 或 GitHub Token。");
  }
}

async function fetchReportsFromGist() {
  ensureGistConfig();

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${gistToken}`,
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`读取 Gist 失败：${response.status} ${text}`);
  }

  const gist = await response.json();
  const file = gist.files["reports.json"];

  if (!file) {
    throw new Error("Gist 中没有 reports.json 文件。");
  }

  reports = JSON.parse(file.content || "[]");
  if (!Array.isArray(reports)) reports = [];
}

async function saveReportsToGist() {
  ensureGistConfig();

  const payload = {
    files: {
      "reports.json": {
        content: JSON.stringify(reports, null, 2)
      }
    }
  };

  console.log("准备写入 Gist：", gistId);
  console.log("准备写入内容：", payload.files["reports.json"].content);

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${gistToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`写入 Gist 失败：${response.status} ${text}`);
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    throw new Error("写入后 GitHub 返回内容无法解析。");
  }

  const file = result.files && result.files["reports.json"];
  if (!file) {
    throw new Error("写入后未在 Gist 返回结果中找到 reports.json。");
  }

  const savedContent = file.content || "";
  const expectedContent = payload.files["reports.json"].content;

  if (savedContent.trim() !== expectedContent.trim()) {
    console.warn("写入内容与返回内容不完全一致。");
    console.log("期望内容：", expectedContent);
    console.log("返回内容：", savedContent);
  }

  console.log("Gist 写入成功：", result.html_url);
  return result;
}

  sortReports(reports).forEach((report) => {
    const item = document.createElement("div");
    item.className = "record-item" + (currentId === report.id ? " active" : "");

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

    setStatus("正在读取 Gist 最新数据...");
    saveBtn.disabled = true;

    await fetchReportsFromGist();

    const data = collectFormData();
    const index = reports.findIndex((item) => item.id === data.id);

    if (index >= 0) {
      reports[index] = { ...reports[index], ...data };
    } else {
      reports.push(data);
    }

    setStatus("正在保存到 Gist...");
    await saveReportsToGist();

    currentId = data.id;
    renderAdminList();

    setStatus("保存成功，已同步到 Gist。导师页刷新后即可看到。");
  } catch (error) {
    console.error(error);
    alert(error.message);
    setStatus("保存失败，请检查 Gist ID 和 Token。");
  } finally {
    saveBtn.disabled = false;
  }
}

async function handleDelete() {
  try {
    const data = collectFormData();
    const targetId = currentId || data.id;

    const confirmed = confirm("确认删除当前记录吗？");
    if (!confirmed) return;

    setStatus("正在读取 Gist 最新数据...");
    deleteBtn.disabled = true;

    await fetchReportsFromGist();

    reports = reports.filter((item) => item.id !== targetId);

    setStatus("正在保存到 Gist...");
    await saveReportsToGist();

    clearForm();
    renderAdminList();

    setStatus("删除成功，已同步到 Gist。");
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

    setStatus("正在从 Gist 读取数据...");
    await fetchReportsFromGist();

    renderAdminList();
    setStatus("数据加载完成，可以开始填写。");
  } catch (error) {
    console.error(error);
    setStatus("初次使用：请点击刷新数据或保存时输入 Gist ID 和 Token。");
  }
}

function safeBind(element, eventName, handler, name) {
  if (!element) {
    console.warn(`未找到页面元素：${name}`);
    if (statusEl) {
      statusEl.textContent = `页面元素缺失：${name}`;
    }
    return;
  }

  element.addEventListener(eventName, handler);
}

safeBind(typeEl, "change", () => {
  updateLabels();
  titleEl.value = getDefaultTitle();
}, "type");

safeBind(dateEl, "change", () => {
  titleEl.value = getDefaultTitle();
}, "date");

safeBind(authorEl, "input", () => {
  localStorage.setItem("report-author", authorEl.value);
  titleEl.value = getDefaultTitle();
}, "author");

safeBind(saveBtn, "click", handleSave, "saveBtn");
safeBind(deleteBtn, "click", handleDelete, "deleteBtn");
safeBind(newBtn, "click", clearForm, "newBtn");

safeBind(reloadBtn, "click", async () => {
  try {
    setStatus("正在刷新 Gist 数据...");
    await fetchReportsFromGist();
    renderAdminList();
    setStatus("刷新完成。");
  } catch (error) {
    alert(error.message);
    setStatus("刷新失败。");
  }
}, "reloadBtn");

safeBind(copyTextBtn, "click", async () => {
  const data = collectFormData();
  await navigator.clipboard.writeText(buildReportText(data));
  setStatus("已复制当前文本。");
}, "copyTextBtn");

init();
