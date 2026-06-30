const CONFIG = {
  timezone: "Asia/Taipei",
  timeApi: "https://worldtimeapi.org/api/timezone/Asia/Taipei",
  windows: [
    {
      id: "day1",
      date: "2026-07-25",
      start: "16:00",
      end: "20:00",
      code: "520mumain",
    },
    {
      id: "day2",
      date: "2026-07-26",
      start: "16:00",
      end: "20:00",
      code: "如沐絮眠活動大成功",
    },
  ],
  gemsPerCode: 1000,
  drawCost: 100,
  testCodes: [
    {
      code: "我有很多錢",
      id: "rich-test",
      startDate: "2026-06-30",
      endDate: "2026-07-07",
      gems: 5000,
    },
  ],
};

const RARITY_META = {
  USR: { title: "烈疾風絮", color: "#ff6a45", glow: "rgba(255, 106, 69, 0.42)" },
  UR: { title: "晝星期回", color: "#ffe08a", glow: "rgba(255, 224, 138, 0.36)" },
  SSR: { title: "餘皆燼然", color: "#d7a4ff", glow: "rgba(215, 164, 255, 0.3)" },
  SR: { title: "與回復響", color: "#80c8ff", glow: "rgba(128, 200, 255, 0.24)" },
  S: { title: "燈火如晝", color: "#8dffb2", glow: "rgba(141, 255, 178, 0.2)" },
  R: { title: "初見微光", color: "#d8c7ac", glow: "rgba(216, 199, 172, 0.16)" },
};

const NORMAL_RATES = [
  ["USR", 0.05],
  ["UR", 1],
  ["SSR", 8.95],
  ["SR", 20],
  ["S", 30],
  ["R", 40],
];

const GUARANTEE_RATES = [
  ["USR", 0.05],
  ["UR", 2],
  ["SSR", 97.95],
];

const CARD_COUNTS = {
  USR: 2,
  UR: 6,
  SSR: 12,
  SR: 15,
  S: 15,
  R: 20,
};

const CARD_SUFFIXES = [
  "朱雀門",
  "長明燈",
  "焚城夜",
  "絮中書",
  "封王詔",
  "殘卷一",
  "月照宮牆",
  "玄甲影",
  "燼風過",
  "天街雨",
  "舊夢痕",
  "馬蹄聲",
  "宮鈴落",
  "紅燭灰",
  "浮生契",
  "故人燈",
  "星河渡",
  "霜雪書",
  "未央火",
  "回聲令",
];

const CARD_IMAGE_FALLBACKS = {
  USR: "assets/cards/cardbg-landscape.webp",
  UR: "assets/card_interface/cardbg-landscape.webp",
  SSR: "assets/card_interface/cardbg-landscape.webp",
  SR: "assets/card_interface/cardbg-landscape.webp",
  S: "assets/card_interface/cardbg-landscape.webp",
  R: "assets/card_interface/cardbg-landscape.webp",
};

const RARITY_ORDER = {
  R: 0,
  S: 1,
  SR: 2,
  SSR: 3,
  UR: 4,
  USR: 5,
};

const CINEMATIC_COPY = {
  R: "微光浮水，初見命定。",
  S: "燈火如晝，河燈次第亮起。",
  SR: "青綠靈光迴響，生息繞卡而生。",
  SSR: "餘燼燃起，赤金火潮破水而出。",
  UR: "星河倒映，命運法陣展開。",
  USR: "烈風捲絮，白金神光照徹長夜。",
};

const CARD_EFFECT_VIDEOS = {
  R: "assets/card-effect-R.mp4",
  S: "assets/card-effect-S.mp4",
  SR: "assets/card-effect-SR.mp4",
  SSR: "assets/card-effect-SSR.mp4",
  UR: "assets/card-effect-UR.mp4",
  USR: "assets/card-effect-USR.mp4",
};

const stateKey = makeKey("state");
const codeKey = makeKey("code");
const resultKey = makeKey("result");

const statusEl = document.querySelector("[data-status]");
const gemsEls = document.querySelectorAll("[data-gems]");
const cardCountEls = document.querySelectorAll("[data-card-count]");
const codeForm = document.querySelector("[data-code-form]");
const codeInput = document.querySelector("#serial-code");
const codeMessage = document.querySelector("[data-code-message]");
const resultsEl = document.querySelector("[data-results]");
const loadingGate = document.querySelector(".loading-gate");
const loadingProgress = document.querySelector(".loading-progress span");
const loadingStatus = document.querySelector(".loading-status");
const gemBurst = document.querySelector("[data-gem-burst]");
const cinematic = document.querySelector("[data-cinematic]");
const cinematicVideo = document.querySelector("[data-cinematic-video]");
const cinematicCards = document.querySelector("[data-cinematic-cards]");
const cinematicFinal = document.querySelector("[data-cinematic-final]");
const cinematicText = document.querySelector("[data-cinematic-text]");
const drawButtons = document.querySelectorAll("[data-draw]");
const modalOpenButtons = document.querySelectorAll("[data-modal-open]");
const modalCloseButtons = document.querySelectorAll("[data-modal-close]");
const modals = document.querySelectorAll("[data-modal]");
const resultTabButtons = document.querySelectorAll("[data-result-tab]");

const cards = createCards();
let clock = getLocalTaipeiClock();
let state = loadState();
let audioContext = null;
let activeResultTab = getDefaultResultTab();

init();

async function init() {
  const initialLoading = prepareInitialLoading();
  renderAll();
  queueAssetPreload();
  syncServerTime();
  document.addEventListener("pointerdown", handlePointerSound);
  codeForm?.addEventListener("submit", handleCodeSubmit);
  drawButtons.forEach((button) => {
    button.addEventListener("click", () => handleDraw(Number(button.dataset.draw)));
  });
  modalOpenButtons.forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.modalOpen));
  });
  resultTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeResultTab = button.dataset.resultTab;
      renderResults(loadResults());
    });
  });
  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeActiveModal);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeActiveModal();
  });
  await initialLoading;
}

async function syncServerTime() {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3000);
    const response = await fetch(CONFIG.timeApi, {
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    if (!response.ok) throw new Error("Time API unavailable");
    const data = await response.json();
    if (typeof data.datetime !== "string") throw new Error("Invalid time API response");
    clock = parseApiClock(data.datetime);
    renderAll(true);
  } catch {
    renderAll(false);
  }
}

function handleCodeSubmit(event) {
  event.preventDefault();
  playUiSound("tap");
  const code = codeInput.value.trim();
  const testCode = getAvailableTestCode(code);
  if (testCode) {
    state.gems += testCode.gems;
    state.testModeUntil = testCode.endDate;
    state.testModeId = testCode.id;
    saveState();
    codeInput.value = "";
    setCodeMessage(`測試序號已注入 ${testCode.gems} 盞燈，測試抽卡已開啟至 ${formatDate(testCode.endDate)}。`, true);
    renderAll();
    playGemBurst();
    return;
  }

  const activeWindow = getActiveWindow();

  if (!activeWindow) {
    if (isKnownTestCode(code)) {
      setCodeMessage("此測試序號目前不在有效日期內。", false);
      return;
    }
    setCodeMessage("目前不在抽卡活動開放時段。", false);
    return;
  }

  if (code !== activeWindow.code) {
    setCodeMessage("序號不符合今日召令，請確認後再輸入。", false);
    return;
  }

  const usedCodes = loadUsedCodes();
  const codeFingerprint = fingerprint(`${activeWindow.id}:${activeWindow.code}`);
  if (usedCodes.includes(codeFingerprint)) {
    setCodeMessage("此序號已在本裝置兌換過。", false);
    return;
  }

  usedCodes.push(codeFingerprint);
  saveUsedCodes(usedCodes);
  state.gems += CONFIG.gemsPerCode;
  saveState();
  codeInput.value = "";
  setCodeMessage("寶石注入成功，召令已被燈火記住。", true);
  renderAll();
  playGemBurst();
}

async function handleDraw(count) {
  playUiSound("summon");
  const drawWindow = getCurrentDrawWindow();
  if (!drawWindow) {
    setCodeMessage("目前不在抽卡活動開放時段。", false);
    return;
  }

  const totalCost = count * CONFIG.drawCost;
  if (state.gems < totalCost) {
    setCodeMessage("寶石不足，請先輸入當日序號。", false);
    return;
  }

  state.gems -= totalCost;
  const pulls = [];
  for (let index = 0; index < count; index += 1) {
    const isGuaranteed = state.pityCount === 9;
    const rarity = rollRarity(isGuaranteed);
    pulls.push(pickCard(rarity));
    state.pityCount = isGuaranteed ? 0 : state.pityCount + 1;
  }

  saveState();
  renderAll();
  await playDrawCinematic(pulls);
  const stampedPulls = pulls.map((card) => ({
    ...card,
    windowId: drawWindow.id,
    drawDate: drawWindow.date,
  }));
  activeResultTab = drawWindow.id;
  const previousResults = loadResults();
  const nextResults = [...stampedPulls, ...previousResults].slice(0, 60);
  saveResults(nextResults);
  renderResults(nextResults, stampedPulls.length);
}

function renderAll(isServerSynced = null) {
  const activeWindow = getActiveWindow();
  const drawWindow = getCurrentDrawWindow();
  const upcoming = getUpcomingWindow();
  const syncedText = isServerSynced === true ? "線上台北時間已校正。" : isServerSynced === false ? "" : "";

  if (statusEl) {
    if (activeWindow) {
      statusEl.textContent = `${formatDate(activeWindow.date)} ${activeWindow.start}-${activeWindow.end} 召令開啟中。${syncedText}`;
    } else if (drawWindow?.isTest) {
      statusEl.textContent = `測試召令開啟中，可測試抽卡至 ${formatDate(drawWindow.endDate)}。${syncedText}`;
    } else if (upcoming) {
      statusEl.textContent = `下一場召令：${formatDate(upcoming.date)} ${upcoming.start}-${upcoming.end}。${syncedText}`;
    } else {
      statusEl.textContent = `限時召令已結束。${syncedText}`;
    }
  }

  gemsEls.forEach((element) => {
    element.textContent = String(state.gems);
  });
  drawButtons.forEach((button) => {
    const count = Number(button.dataset.draw);
    button.disabled = !drawWindow || state.gems < count * CONFIG.drawCost;
  });
  renderResults(loadResults());
}

function renderResults(results, highlightCount = 0) {
  if (!resultsEl) return;
  const normalizedResults = normalizeResults(results);
  const visibleResults = normalizedResults.filter((card) => getResultWindowId(card) === activeResultTab);
  resultsEl.innerHTML = "";
  renderResultTabs(normalizedResults);
  cardCountEls.forEach((element) => {
    element.textContent = `${getWindowLabel(activeResultTab)} 已抽 ${Math.min(visibleResults.length, 10)}/10 張`;
  });
  visibleResults.forEach((card, index) => {
    const meta = RARITY_META[card.rarity];
    const item = document.createElement("article");
    item.className = `summon-card rare-${card.rarity.toLowerCase()}`;
    item.style.setProperty("--rarity-color", meta.color);
    item.style.setProperty("--card-glow", meta.glow);
    item.style.setProperty("--card-image", `url("${card.image}")`);
    item.style.animationDelay = `${Math.min(index, highlightCount - 1) * 80}ms`;
    item.innerHTML = `
      <div class="card-art">
        <img src="${card.image}" alt="${card.name}" onerror="this.onerror=null;this.src='${getFallbackCardImage(card.rarity)}';">
      </div>
      <div class="card-rarity">${card.rarity}</div>
      <h3 class="card-name">${card.name}</h3>
      <p class="card-title">${meta.title}</p>
    `;
    resultsEl.append(item);
  });
}

function renderResultTabs(results) {
  resultTabButtons.forEach((button) => {
    const tabId = button.dataset.resultTab;
    const count = results.filter((card) => getResultWindowId(card) === tabId).length;
    const isActive = tabId === activeResultTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.textContent = `${getWindowLabel(tabId)} 抽卡紀錄（${Math.min(count, 10)}/10）`;
  });
}

function normalizeResults(results) {
  return results.map((card) => {
    if (card.windowId || card.drawDate) return card;
    const fallbackWindow = CONFIG.windows[0];
    return {
      ...card,
      windowId: fallbackWindow.id,
      drawDate: fallbackWindow.date,
    };
  });
}

function getResultWindowId(card) {
  if (card.windowId) return card.windowId;
  return CONFIG.windows.find((windowItem) => windowItem.date === card.drawDate)?.id || CONFIG.windows[0].id;
}

function getWindowLabel(windowId) {
  if (windowId === "rich-test") return "測試";
  const windowItem = CONFIG.windows.find((item) => item.id === windowId) || CONFIG.windows[0];
  return formatDate(windowItem.date);
}

function getDefaultResultTab() {
  return CONFIG.windows.find((windowItem) => windowItem.date === clock?.date)?.id || CONFIG.windows[0].id;
}

function openModal(name) {
  const target = [...modals].find((modal) => modal.dataset.modal === name);
  if (!target) return;
  modals.forEach((modal) => {
    modal.hidden = modal !== target;
    modal.classList.toggle("is-open", modal === target);
  });
  document.body.classList.add("is-modal-open");
  window.setTimeout(() => {
    const focusTarget = target.querySelector("input, button:not(.summon-modal-backdrop), a");
    focusTarget?.focus();
  }, 40);
}

function closeActiveModal() {
  const openModalElement = [...modals].find((modal) => !modal.hidden);
  if (!openModalElement) return;
  openModalElement.classList.remove("is-open");
  openModalElement.hidden = true;
  document.body.classList.remove("is-modal-open");
}

function getActiveWindow() {
  return CONFIG.windows.find((windowItem) => {
    if (clock.date !== windowItem.date) return false;
    return compareTime(clock.time, windowItem.start) >= 0 && compareTime(clock.time, windowItem.end) < 0;
  }) || null;
}

function getCurrentDrawWindow() {
  const activeWindow = getActiveWindow();
  if (activeWindow) return activeWindow;
  if (!isTestModeActive()) return null;
  return {
    id: state.testModeId || "rich-test",
    date: clock.date,
    endDate: state.testModeUntil,
    isTest: true,
  };
}

function getUpcomingWindow() {
  return CONFIG.windows.find((windowItem) => {
    if (clock.date < windowItem.date) return true;
    return clock.date === windowItem.date && compareTime(clock.time, windowItem.end) < 0;
  }) || null;
}

function getAvailableTestCode(code) {
  return CONFIG.testCodes.find((item) => (
    code === item.code && clock.date >= item.startDate && clock.date <= item.endDate
  )) || null;
}

function isKnownTestCode(code) {
  return CONFIG.testCodes.some((item) => item.code === code);
}

function isTestModeActive() {
  return Boolean(state.testModeUntil && clock.date <= state.testModeUntil);
}

function rollRarity(isGuaranteed) {
  const rates = isGuaranteed ? GUARANTEE_RATES : NORMAL_RATES;
  const roll = Math.random() * 100;
  let cursor = 0;
  for (const [rarity, rate] of rates) {
    cursor += rate;
    if (roll < cursor) return rarity;
  }
  return rates[rates.length - 1][0];
}

function pickCard(rarity) {
  const pool = cards.filter((card) => card.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function createCards() {
  const list = [];
  Object.entries(CARD_COUNTS).forEach(([rarity, count]) => {
    const meta = RARITY_META[rarity];
    for (let index = 0; index < count; index += 1) {
      const suffix = CARD_SUFFIXES[index % CARD_SUFFIXES.length];
      list.push({
        id: `${rarity}-${String(index + 1).padStart(2, "0")}`,
        rarity,
        name: `${meta.title}・${suffix}`,
        image: getCardImage(rarity, index),
      });
    }
  });
  return list;
}

function getCardImage(rarity, index) {
  const serial = String(index + 1).padStart(2, "0");
  return `assets/cards/${rarity}-${serial}.webp`;
}

function playGemBurst() {
  if (!gemBurst) return;
  playUiSound("gem");
  gemBurst.hidden = false;
  window.setTimeout(() => {
    gemBurst.hidden = true;
  }, 1500);
}

async function playDrawCinematic(pulls) {
  if (!cinematic) return;

  for (let index = 0; index < pulls.length; index += 1) {
    await playSingleDrawCinematic(pulls[index], index, pulls.length);
  }
}

async function playSingleDrawCinematic(card, index = 0, total = 1) {
  if (!cinematic || !card) return;

  const themeRarity = card.rarity;
  setCinematicTheme(themeRarity);
  renderCinematicCards(card, index, total);
  renderFinalCard(card);

  cinematic.hidden = false;
  cinematic.classList.remove("is-card-phase", "is-collecting");
  cinematic.classList.add("is-video-phase");
  if (cinematicText) {
    cinematicText.textContent = CINEMATIC_COPY[themeRarity] || "卡影凝成，燈火翻明。";
  }
  playUiSound("circle");
  scheduleCinematicSounds(1);

  await playEffectVideo(themeRarity);

  cinematic.classList.remove("is-video-phase");
  cinematic.classList.add("is-card-phase");
  if (cinematicText) cinematicText.textContent = "燈影自光中浮現。";
  playUiSound("shine");
  await wait(3350);

  cinematic.classList.add("is-collecting");
  if (cinematicText) cinematicText.textContent = "卡影已現，收錄至我的卡片。";
  playUiSound("flip");
  await wait(950);

  cleanupCinematic();
  if (index < total - 1) {
    await wait(260);
  }
}

function renderCinematicCards(card, index = 0, total = 1) {
  if (!cinematicCards) return;
  cinematicCards.innerHTML = "";
  cinematicCards.classList.toggle("is-ten", total > 1);
  const rarity = card?.rarity || "R";
  if (cinematicText) {
    const progress = total > 1 ? `第 ${index + 1} / ${total} 盞｜` : "";
    cinematicText.textContent = `${progress}${CINEMATIC_COPY[rarity] || "卡影凝成，燈火翻明。"}`;
  }
}

function renderFinalCard(card) {
  if (!cinematicFinal || !card) return;
  const meta = RARITY_META[card.rarity];
  cinematicFinal.style.setProperty("--rarity-color", meta.color);
  cinematicFinal.style.setProperty("--card-glow", meta.glow);
  cinematicFinal.style.setProperty("--card-image", `url("${card.image}")`);
  cinematicFinal.innerHTML = `
    <article class="cinematic-final-card-inner rare-${card.rarity.toLowerCase()}">
      <div class="cinematic-card-flipper">
        <div class="cinematic-card-side cinematic-card-back" aria-hidden="true">
          <img src="assets/card_interface/cardbg-landscape.webp" alt="">
        </div>
        <div class="cinematic-card-side cinematic-card-front">
          <img src="${card.image}" alt="${card.name}" onerror="this.onerror=null;this.src='${getFallbackCardImage(card.rarity)}';">
          <b>${card.name}</b>
          <span><strong>${card.rarity}</strong> ${meta.title}</span>
        </div>
      </div>
      <span class="electric-border" aria-hidden="true">
        <span class="electric-edge electric-edge-top"></span>
        <span class="electric-edge electric-edge-right"></span>
        <span class="electric-edge electric-edge-bottom"></span>
        <span class="electric-edge electric-edge-left"></span>
      </span>
    </article>
  `;
}

function getFallbackCardImage(rarity) {
  return CARD_IMAGE_FALLBACKS[rarity] || "assets/card_interface/card.webp";
}

function setCinematicTheme(rarity) {
  if (!cinematic) return;
  cinematic.classList.remove("theme-r", "theme-s", "theme-sr", "theme-ssr", "theme-ur", "theme-usr");
  if (rarity) cinematic.classList.add(`theme-${rarity.toLowerCase()}`);
}

function playEffectVideo(rarity) {
  const source = CARD_EFFECT_VIDEOS[rarity];
  if (!cinematicVideo || !source) return wait(350);

  return new Promise((resolve) => {
    let resolved = false;
    let pauseGuard = true;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      pauseGuard = false;
      cinematicVideo.removeEventListener("ended", finish);
      cinematicVideo.removeEventListener("error", finish);
      cinematicVideo.removeEventListener("pause", resumeIfInterrupted);
      resolve();
    };
    const resumeIfInterrupted = () => {
      if (!pauseGuard || resolved || cinematicVideo.ended) return;
      const resumePromise = cinematicVideo.play();
      if (resumePromise?.catch) resumePromise.catch(() => {});
    };

    cinematicVideo.src = source;
    cinematicVideo.controls = false;
    cinematicVideo.defaultMuted = false;
    cinematicVideo.muted = false;
    cinematicVideo.volume = 1;
    cinematicVideo.playsInline = true;
    cinematicVideo.currentTime = 0;
    cinematicVideo.load();
    cinematicVideo.addEventListener("ended", finish, { once: true });
    cinematicVideo.addEventListener("error", finish, { once: true });
    cinematicVideo.addEventListener("pause", resumeIfInterrupted);

    const playPromise = cinematicVideo.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        window.setTimeout(finish, 600);
      });
    }
  });
}

function cleanupCinematic() {
  if (!cinematic) return;
  cinematic.hidden = true;
  cinematic.classList.remove("is-video-phase", "is-card-phase", "is-collecting");
  if (cinematicCards) cinematicCards.innerHTML = "";
  if (cinematicFinal) cinematicFinal.innerHTML = "";
  if (cinematicVideo) {
    cinematicVideo.pause();
    cinematicVideo.removeAttribute("src");
    cinematicVideo.load();
  }
  setCinematicTheme(null);
}

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = src;
  });
}

function setLoadingProgress(progress) {
  if (!loadingGate) return;
  const normalized = Math.max(0.08, Math.min(progress, 1));
  const percent = Math.round(normalized * 100);
  loadingGate.style.setProperty("--loading-progress", String(normalized));
  if (loadingStatus) loadingStatus.textContent = `載入中 ${percent}%`;
  if (loadingProgress) loadingProgress.setAttribute("aria-valuenow", String(percent));
}

function showLoadingGate() {
  if (!loadingGate || loadingGate.classList.contains("is-hidden")) return;
  loadingGate.hidden = false;
  window.requestAnimationFrame(() => {
    loadingGate.classList.add("is-visible");
  });
}

function hideLoadingGate() {
  if (!loadingGate || loadingGate.classList.contains("is-hidden")) {
    document.body.classList.remove("is-preloading");
    return;
  }
  setLoadingProgress(1);
  loadingGate.classList.add("is-hidden");
  loadingGate.classList.remove("is-visible");
  document.body.classList.remove("is-preloading");
  window.setTimeout(() => {
    loadingGate.hidden = true;
  }, 720);
}

async function prepareInitialLoading() {
  if (!loadingGate) {
    document.body.classList.remove("is-preloading");
    return;
  }

  const revealDelay = 360;
  const maxWait = 4000;
  let completed = 0;
  const assets = [
    "assets/card_interface/background.webp",
    "assets/bg_summon.webp",
    "assets/title.webp?v=2",
    "assets/card_interface/card.webp",
    "assets/card_interface/cardbg-landscape.webp",
    "assets/card_interface/button.webp",
    "assets/icon_light.webp",
    "assets/bg_loading.webp",
  ];

  setLoadingProgress(0.08);
  const revealTimer = window.setTimeout(showLoadingGate, revealDelay);
  const tasks = assets.map((source) => preloadImage(source).finally(() => {
    completed += 1;
    setLoadingProgress(completed / assets.length);
  }));
  await Promise.race([
    Promise.all(tasks),
    wait(maxWait),
  ]);
  window.clearTimeout(revealTimer);
  if (loadingGate.hidden) {
    setLoadingProgress(1);
    document.body.classList.remove("is-preloading");
    loadingGate.classList.add("is-hidden");
    return;
  }
  hideLoadingGate();
}

function queueAssetPreload() {
  const run = () => preloadSummonAssets();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1600 });
    return;
  }
  window.setTimeout(run, 900);
}

function preloadSummonAssets() {
  [
    "assets/bg_summon.webp",
    "assets/cardbg.webp",
    "assets/card_interface/card.webp",
    "assets/title.webp?v=2",
    "assets/icon_light.webp",
  ].forEach((source) => preloadImage(source));

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isConstrained = Boolean(connection?.saveData) || /2g/.test(connection?.effectiveType || "");
  Object.values(CARD_EFFECT_VIDEOS).forEach((source) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = isConstrained ? "metadata" : "auto";
    video.src = source;
    video.load();
  });
}

function handlePointerSound(event) {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  playUiSound("tap");
}

function scheduleCinematicSounds(count) {
  window.setTimeout(() => playUiSound("circle"), 620);
  window.setTimeout(() => playUiSound("shine"), 1420);
  const firstFlip = 2350;
  const spacing = count > 1 ? 95 : 0;
  for (let index = 0; index < count; index += 1) {
    window.setTimeout(() => playUiSound("flip"), firstFlip + index * spacing);
  }
}

function playUiSound(type) {
  const context = getAudioContext();
  if (!context) return;
  context.resume?.();

  if (type === "tap") {
    playTone(context, 460, 0.025, 0.035, "triangle");
    playTone(context, 920, 0.018, 0.02, "sine", 0.014);
    return;
  }

  if (type === "gem") {
    [660, 880, 1320].forEach((frequency, index) => {
      playTone(context, frequency, 0.16, 0.07, "sine", index * 0.055);
    });
    return;
  }

  if (type === "summon") {
    playTone(context, 180, 0.32, 0.1, "sawtooth");
    playTone(context, 360, 0.28, 0.06, "triangle", 0.04);
    return;
  }

  if (type === "circle") {
    [196, 294, 392, 588].forEach((frequency, index) => {
      playTone(context, frequency, 0.26, 0.045, "triangle", index * 0.08);
    });
    return;
  }

  if (type === "shine") {
    [880, 1174, 1568].forEach((frequency, index) => {
      playTone(context, frequency, 0.22, 0.055, "sine", index * 0.04);
    });
    return;
  }

  if (type === "flip") {
    playTone(context, 520, 0.06, 0.042, "triangle");
    playTone(context, 1040, 0.08, 0.034, "sine", 0.035);
  }
}

function playTone(context, frequency, duration, volume, type = "sine", delay = 0) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.72), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

function setCodeMessage(message, isSuccess) {
  if (!codeMessage) return;
  codeMessage.textContent = message;
  codeMessage.classList.toggle("is-success", isSuccess);
}

function loadState() {
  const fallback = { gems: 0, pityCount: 0, testModeUntil: "", testModeId: "" };
  try {
    const value = decodeStore(localStorage.getItem(stateKey));
    return {
      gems: Number(value?.gems || 0),
      pityCount: Math.min(Number(value?.pityCount || 0), 9),
      testModeUntil: typeof value?.testModeUntil === "string" ? value.testModeUntil : "",
      testModeId: typeof value?.testModeId === "string" ? value.testModeId : "",
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(stateKey, encodeStore(state));
}

function loadUsedCodes() {
  try {
    const value = decodeStore(localStorage.getItem(codeKey));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveUsedCodes(value) {
  localStorage.setItem(codeKey, encodeStore(value));
}

function loadResults() {
  try {
    const value = decodeStore(localStorage.getItem(resultKey));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveResults(results) {
  localStorage.setItem(resultKey, encodeStore(results));
}

function encodeStore(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).split("").reverse().join(".");
}

function decodeStore(value) {
  if (!value) return null;
  return JSON.parse(decodeURIComponent(escape(atob(value.split(".").reverse().join("")))));
}

function makeKey(label) {
  return `__${fingerprint(`dengzhou-summon:${label}`)}_${fingerprint(label).slice(0, 6)}`;
}

function fingerprint(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getLocalTaipeiClock() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value || "00";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function parseApiClock(datetime) {
  return {
    date: datetime.slice(0, 10),
    time: datetime.slice(11, 16),
  };
}

function compareTime(a, b) {
  return a.localeCompare(b);
}

function formatDate(date) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}
