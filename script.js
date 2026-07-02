const countdown = document.querySelector("[data-countdown]");
const countdownLabel = document.querySelector("[data-countdown-label]");
const countdownOpenLink = document.querySelector(".countdown-open-link");
const characterOpenLinks = document.querySelectorAll("[data-character-link]");
const linkConfig = window.DENGZHOU_LINKS || {};
const CDN_BASE = "https://cdn.jsdelivr.net/gh/mophygame/fusheng-scroll-activity@main/";
const assetUrl = (path) => `${CDN_BASE}${path}`;
const lanternGrid = document.querySelector("[data-lantern-grid]");
const lanternStatus = document.querySelector("[data-lantern-status]");
const lanternIgnite = document.querySelector(".lantern-ignite");
const lanternIgniteTitle = document.querySelector("#lantern-ignite-title");
const lanternDialog = document.querySelector(".lantern-dialog");
const lanternDialogTitle = document.querySelector("#lantern-dialog-title");
const lanternDialogImage = document.querySelector(".lantern-dialog-image");
const lanternDialogCaption = document.querySelector(".lantern-dialog-caption");
const lanternDialogDownload = document.querySelector(".lantern-dialog-download");

const loadingGate = document.querySelector(".loading-gate");
const loadingProgress = document.querySelector(".loading-progress span");
const loadingStatus = document.querySelector(".loading-status");
const introGate = document.querySelector(".intro-gate");
const introSlider = document.querySelector(".intro-slider");
const introSliderTrack = document.querySelector(".intro-slider-track");
const introMatch = document.querySelector(".intro-match");
const introVideo = document.querySelector(".intro-video");
const bgMusic = document.querySelector(".bg-music");
const musicToggle = document.querySelector(".music-toggle");
let introStarted = false;
let introDragging = false;
let shouldResumeMusicAfterVideo = false;
let activeMusicPausingVideo = null;
let bgMusicFadeFrame = null;
let serverTaipeiDateString = null;

function applyLinkConfig() {
  if (countdownOpenLink && linkConfig.collection) {
    countdownOpenLink.href = linkConfig.collection;
  }

  characterOpenLinks.forEach((link) => {
    const card = link.closest("[data-character]");
    const characterId = card?.dataset.character;
    const characterUrl = linkConfig.characters?.[characterId];
    if (characterUrl) link.href = characterUrl;
  });
}

applyLinkConfig();

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = src;
  });
}

function preloadVideoMetadata(src) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const done = () => {
      video.removeEventListener("loadedmetadata", done);
      video.removeEventListener("canplay", done);
      video.removeEventListener("error", done);
      resolve();
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("loadedmetadata", done, { once: true });
    video.addEventListener("canplay", done, { once: true });
    video.addEventListener("error", done, { once: true });
    video.src = src;
    video.load();
  });
}

function waitForVideoReady(video) {
  return new Promise((resolve) => {
    if (!video || video.readyState >= 2) {
      resolve();
      return;
    }

    const done = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("canplay", done);
      video.removeEventListener("error", done);
      resolve();
    };

    video.addEventListener("loadeddata", done, { once: true });
    video.addEventListener("canplay", done, { once: true });
    video.addEventListener("error", done, { once: true });
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

function trackLoadingTasks(tasks) {
  let completed = 0;
  setLoadingProgress(0.08);

  return Promise.all(tasks.map((task) => task.finally(() => {
    completed += 1;
    setLoadingProgress(completed / tasks.length);
  })));
}

function hideLoadingGate() {
  if (!loadingGate || loadingGate.classList.contains("is-hidden")) return;
  setLoadingProgress(1);
  loadingGate.classList.add("is-hidden");
  loadingGate.classList.remove("is-visible");
  document.body.classList.remove("is-preloading");
  window.setTimeout(() => {
    loadingGate.hidden = true;
  }, 720);
}

function showLoadingGate() {
  if (!loadingGate || loadingGate.classList.contains("is-hidden")) return;
  loadingGate.hidden = false;
  window.requestAnimationFrame(() => {
    loadingGate.classList.add("is-visible");
  });
}

const loadingRevealDelay = 360;
const maximumLoadingTime = 4000;
let criticalAssetsLoaded = false;
let secondaryWarmStarted = false;
const landingImage = window.matchMedia("(max-width: 1000px)").matches
  ? "assets/bg_landing＿mobile.webp"
  : "assets/bg_landing.webp";
const criticalAssetsReady = trackLoadingTasks([
  preloadImage(landingImage),
  preloadImage("assets/title.webp?v=2"),
  preloadImage("assets/icon_logo.webp"),
  preloadImage("assets/icon_fire.webp"),
  preloadImage("assets/icon_totop_dark.webp"),
  preloadImage("assets/icon_totop_light.webp"),
  waitForVideoReady(introVideo),
]);

const secondaryAssets = [
  "assets/bg_video.webp",
  "assets/bg_video_foreground.webp",
  "assets/bg_twoside.webp",
  "assets/bg_video2_foreground.webp",
  "assets/bg_reward.webp",
  "assets/bg_reward_mobile.webp",
  "assets/bg_people.webp",
  "assets/bg_stone.webp",
  "assets/author_mu.webp",
  "assets/author_mian.webp",
  "assets/character_01.webp",
  "assets/character_02.webp",
  "assets/character_03.webp",
  "assets/character_04.webp",
  "assets/character_05.webp",
  "assets/icon_play.webp",
  "assets/icon_mute.webp",
  "assets/icon_light.webp",
  "assets/bg_people2.webp",
  "assets/bg_people3.webp",
];

function warmSecondaryAssets() {
  if (secondaryWarmStarted) return;
  secondaryWarmStarted = true;
  secondaryAssets.forEach((src) => preloadImage(src));
  preloadVideoMetadata(assetUrl("assets/ancient.mp4"));
  preloadVideoMetadata(assetUrl("assets/modern.mp4"));
}

function scheduleSecondaryWarmup() {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warmSecondaryAssets, { timeout: 2500 });
  } else {
    window.setTimeout(warmSecondaryAssets, 900);
  }
}

window.setTimeout(() => {
  if (!criticalAssetsLoaded) showLoadingGate();
}, loadingRevealDelay);

criticalAssetsReady.finally(() => {
  criticalAssetsLoaded = true;
  hideLoadingGate();
  scheduleSecondaryWarmup();
});

window.setTimeout(() => {
  if (!criticalAssetsLoaded) {
    criticalAssetsLoaded = true;
    hideLoadingGate();
    scheduleSecondaryWarmup();
  }
}, maximumLoadingTime);

function setMusicState(isPlaying) {
  musicToggle?.classList.toggle("is-playing", isPlaying);
  musicToggle?.setAttribute("aria-pressed", String(isPlaying));
  musicToggle?.setAttribute("aria-label", isPlaying ? "息聲，關閉背景音樂" : "聞曲，開啟背景音樂");
  const musicToggleText = musicToggle?.querySelector(".music-toggle-text");
  if (musicToggleText) musicToggleText.textContent = isPlaying ? "聞曲" : "息聲";
}

const bgMusicTargetVolume = 0.42;

function isBackgroundMusicAudible() {
  return Boolean(bgMusic && !bgMusic.paused && bgMusic.volume > 0.01);
}

function stopBackgroundMusicFade() {
  if (!bgMusicFadeFrame) return;
  window.cancelAnimationFrame(bgMusicFadeFrame);
  bgMusicFadeFrame = null;
}

function fadeBackgroundMusicVolume(fromVolume, toVolume, duration) {
  if (!bgMusic) return;
  stopBackgroundMusicFade();

  if (!duration) {
    bgMusic.volume = toVolume;
    return;
  }

  const startedAt = performance.now();
  const step = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    bgMusic.volume = fromVolume + (toVolume - fromVolume) * eased;

    if (progress < 1) {
      bgMusicFadeFrame = window.requestAnimationFrame(step);
    } else {
      bgMusicFadeFrame = null;
      bgMusic.volume = toVolume;
    }
  };

  bgMusicFadeFrame = window.requestAnimationFrame(step);
}

function playBackgroundMusic(options = {}) {
  if (!bgMusic) return;
  stopBackgroundMusicFade();
  if (options.restart) {
    try {
      bgMusic.currentTime = 0;
    } catch {
      // Some mobile browsers can reject seeks before audio metadata is ready.
    }
  }
  const targetVolume = options.volume ?? bgMusicTargetVolume;
  const startVolume = options.startVolume ?? targetVolume;
  bgMusic.volume = startVolume;
  if (targetVolume > 0) setMusicState(true);
  bgMusic.play()
    .then(() => {
      setMusicState(true);
      fadeBackgroundMusicVolume(startVolume, targetVolume, options.fadeDuration ?? 0);
    })
    .catch(() => setMusicState(false));
}

function startIntroBackgroundMusic() {
  playBackgroundMusic({
    restart: true,
    startVolume: bgMusicTargetVolume,
    volume: bgMusicTargetVolume,
    fadeDuration: 0,
  });
}

function ensureIntroMusicAudible() {
  if (!bgMusic) return;
  if (!bgMusic.paused && bgMusic.volume > 0.01) {
    setMusicState(true);
    return;
  }
  playBackgroundMusic({
    startVolume: Math.max(bgMusic.volume, 0.08),
    volume: bgMusicTargetVolume,
    fadeDuration: 420,
  });
}

function pauseMusicForVideo(video) {
  if (!bgMusic || !video || video === activeMusicPausingVideo) return;
  shouldResumeMusicAfterVideo = !bgMusic.paused;
  activeMusicPausingVideo = video;
  if (shouldResumeMusicAfterVideo) {
    bgMusic.pause();
  }
  stopBackgroundMusicFade();
}

function resumeMusicAfterVideo(video) {
  if (!bgMusic || video !== activeMusicPausingVideo) return;
  activeMusicPausingVideo = null;
  if (shouldResumeMusicAfterVideo) {
    playBackgroundMusic();
  }
  shouldResumeMusicAfterVideo = false;
}

introVideo?.play?.().catch(() => {});

function setIntroSliderProgress(progress) {
  if (!introSlider || !introSliderTrack || !introMatch) return;
  const max = Math.max(0, introSliderTrack.clientWidth - introMatch.offsetWidth - 24);
  const value = Math.max(0, Math.min(progress, max));
  const percent = max ? Math.round((value / max) * 100) : 0;

  introSlider.style.setProperty("--slider-progress", `${value}px`);
  introSlider.style.setProperty("--slider-max", `${max}px`);
  introSlider.setAttribute("aria-valuenow", String(percent));
}

function completeIntroSlider() {
  if (introStarted || !introGate || !introVideo) return;
  introStarted = true;
  introDragging = false;

  setIntroSliderProgress(introSliderTrack.clientWidth);
  introSlider?.classList.remove("is-dragging");
  introSlider?.classList.add("is-complete");
  introGate.classList.add("is-igniting", "is-loading-igniting");
  startIntroBackgroundMusic();

  window.setTimeout(() => {
    introGate.classList.remove("is-loading-igniting");
    introGate.classList.add("is-transitioning", "is-lantern-rise", "is-inking");
  }, 2000);

  window.setTimeout(() => {
    document.body.classList.remove("is-intro-open");
    ensureIntroMusicAudible();
  }, 2450);

  window.setTimeout(() => {
    introGate.classList.add("is-hidden");
    window.setTimeout(() => {
      introGate.hidden = true;
      introVideo.pause();
    }, 500);
  }, 3650);
}

function updateIntroDrag(clientX) {
  if (!introSliderTrack || !introMatch) return;
  const rect = introSliderTrack.getBoundingClientRect();
  const max = Math.max(0, introSliderTrack.clientWidth - introMatch.offsetWidth - 24);
  const progress = clientX - rect.left - introMatch.offsetWidth / 2;
  setIntroSliderProgress(progress);

  if (max && progress >= max * 0.92) {
    completeIntroSlider();
  }
}

introMatch?.addEventListener("pointerdown", (event) => {
  if (introStarted) return;
  introDragging = true;
  introSlider?.classList.add("is-dragging");
  introMatch.setPointerCapture?.(event.pointerId);
  updateIntroDrag(event.clientX);
});

introMatch?.addEventListener("pointermove", (event) => {
  if (!introDragging || introStarted) return;
  updateIntroDrag(event.clientX);
});

function stopIntroDrag() {
  if (!introDragging || introStarted) return;
  introDragging = false;
  introSlider?.classList.remove("is-dragging");
  setIntroSliderProgress(0);
}

introMatch?.addEventListener("pointerup", stopIntroDrag);
introMatch?.addEventListener("pointercancel", stopIntroDrag);

introSlider?.addEventListener("keydown", (event) => {
  if (introStarted) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    completeIntroSlider();
  }
});

window.addEventListener("resize", () => {
  if (!introStarted) setIntroSliderProgress(0);
});

setIntroSliderProgress(0);

function updateCountdown() {
  if (!countdown) return;

  const target = new Date(countdown.dataset.countdown).getTime();
  const remaining = Math.max(0, target - Date.now());
  const isOpen = remaining === 0;
  const values = {
    days: Math.floor(remaining / 86400000),
    hours: Math.floor((remaining / 3600000) % 24),
    minutes: Math.floor((remaining / 60000) % 60),
    seconds: Math.floor((remaining / 1000) % 60),
  };

  Object.entries(values).forEach(([key, value]) => {
    const element = countdown.querySelector(`[data-${key}]`);
    if (element) element.textContent = String(value).padStart(2, "0");
  });

  if (countdownLabel) countdownLabel.textContent = isOpen ? "燈晝開啟" : "距離燈晝重啟";
  if (countdownOpenLink) countdownOpenLink.hidden = !isOpen || !linkConfig.collection;
  characterOpenLinks.forEach((link) => {
    link.hidden = !isOpen || link.getAttribute("href") === "#";
  });
}

updateCountdown();
setInterval(updateCountdown, 1000);

const lanternStorageKey = "dengzhou-lit-lanterns";
const lanterns = Array.isArray(linkConfig.dailyLanterns) ? linkConfig.dailyLanterns.slice(0, 7) : [];

function getTaipeiDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getCurrentTaipeiDateString() {
  return serverTaipeiDateString || getTaipeiDateString();
}

async function syncTaipeiDateFromServer() {
  if (!lanternGrid || !lanterns.length) return;

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3000);
    const response = await fetch("https://worldtimeapi.org/api/timezone/Asia/Taipei", {
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    if (!response.ok) throw new Error("Time API unavailable");

    const data = await response.json();
    const datetime = typeof data.datetime === "string" ? data.datetime : "";
    const datePart = datetime.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) throw new Error("Invalid time API response");

    serverTaipeiDateString = datePart;
    renderDailyLanterns();
  } catch {
    serverTaipeiDateString = null;
  }
}

function readLitLanterns() {
  try {
    const value = JSON.parse(localStorage.getItem(lanternStorageKey) || "[]");
    return Array.isArray(value) ? new Set(value) : new Set();
  } catch {
    return new Set();
  }
}

function saveLitLanterns(litLanterns) {
  localStorage.setItem(lanternStorageKey, JSON.stringify([...litLanterns]));
}

function isLanternToday(lantern, todayString) {
  return lantern.date === todayString;
}

function isLanternPast(lantern, todayString) {
  return lantern.date < todayString;
}

function formatLanternDate(dateString) {
  const [, month, day] = dateString.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function setLanternStatus(message, detail = "") {
  if (!lanternStatus) return;
  lanternStatus.textContent = "";
  const messageLine = document.createElement("span");
  messageLine.textContent = message;
  lanternStatus.append(messageLine);

  if (detail) {
    const detailLine = document.createElement("span");
    detailLine.className = "daily-lantern-status-line";
    detailLine.textContent = detail;
    lanternStatus.append(detailLine);
  }

  if (serverTaipeiDateString) {
    const syncedLine = document.createElement("span");
    syncedLine.className = "daily-lantern-status-line";
    syncedLine.textContent = "（時間已依台北線上時間校正）";
    lanternStatus.append(syncedLine);
  }
}

function playLanternIgnition(lantern) {
  return new Promise((resolve) => {
    if (!lanternIgnite) {
      resolve();
      return;
    }

    if (lanternIgniteTitle) lanternIgniteTitle.textContent = `點燃${lantern.title}`;
    lanternIgnite.hidden = false;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      lanternIgnite.classList.add("is-playing");
    });

    window.setTimeout(() => {
      lanternIgnite.classList.remove("is-playing");
      lanternIgnite.hidden = true;
      resolve();
    }, 1250);
  });
}

function openLanternDialog(lantern) {
  if (!lanternDialog || !lanternDialogImage || !lanternDialogDownload) return;

  if (lanternDialogTitle) lanternDialogTitle.textContent = `${lantern.name} · ${lantern.title}`;
  lanternDialogImage.src = lantern.image;
  lanternDialogImage.alt = `${lantern.name}角色照片`;
  if (lanternDialogCaption) {
    lanternDialogCaption.innerHTML = `<span>${formatLanternDate(lantern.date)} 已點亮</span><span>收下 ${lantern.name} 的燈影。</span>`;
  }
  lanternDialogDownload.href = lantern.image;
  lanternDialogDownload.download = lantern.downloadName || `${lantern.name}.webp`;
  lanternDialogDownload.dataset.downloadUrl = lantern.image;
  lanternDialogDownload.dataset.downloadName = lantern.downloadName || `${lantern.name}.webp`;
  lanternDialog.hidden = false;
  document.body.style.overflow = "hidden";
  lanternDialog.querySelector(".lantern-dialog-close")?.focus();
}

async function downloadLanternImage(event) {
  event.preventDefault();
  const downloadUrl = lanternDialogDownload?.dataset.downloadUrl;
  const downloadName = lanternDialogDownload?.dataset.downloadName || "dengzhou-lantern.webp";
  if (!downloadUrl) return;

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error("Image download failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = downloadName;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = downloadName;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
  }
}

function closeLanternDialog() {
  if (!lanternDialog) return;
  lanternDialog.hidden = true;
  document.body.style.overflow = "";
}

function renderDailyLanterns() {
  if (!lanternGrid || !lanterns.length) return;

  const todayString = getCurrentTaipeiDateString();
  const litLanterns = readLitLanterns();
  const todayLanterns = lanterns.filter((lantern) => isLanternToday(lantern, todayString));
  const litCount = lanterns.filter((_, index) => litLanterns.has(String(index + 1))).length;
  const missedCount = lanterns.filter((lantern, index) => isLanternPast(lantern, todayString) && !litLanterns.has(String(index + 1))).length;
  if (todayString < lanterns[0].date) {
    setLanternStatus("燈火尚未抵達，請於 07/03 回來點燈。");
  } else if (todayLanterns.length) {
    setLanternStatus(
      todayLanterns.length > 1
        ? `請輕觸點燃今日的 『第六盞燈、第七盞燈』。`
        : `請輕觸點燃今日的『${todayLanterns[0].title}』。`,
      "錯過的燈火無法重燃，已點亮的祈願，則為你長明不滅。"
    );
  } else if (todayString > lanterns[lanterns.length - 1].date) {
    setLanternStatus(`六日點燈已結束。已點亮 ${litCount} 盞，錯過 ${missedCount} 盞。`);
  } else {
    setLanternStatus("今日沒有新天燈，已點亮的燈仍可再次查看。");
  }

  lanternGrid.innerHTML = "";
  lanterns.forEach((lantern, index) => {
    const lanternId = String(index + 1);
    const isToday = isLanternToday(lantern, todayString);
    const isPast = isLanternPast(lantern, todayString);
    const isLit = litLanterns.has(lanternId);
    const isMissed = isPast && !isLit;
    const canOpen = isLit || isToday;
    const button = document.createElement("button");
    button.className = "daily-lantern";
    button.type = "button";
    button.disabled = !canOpen;
    button.classList.toggle("is-available", isToday && !isLit);
    button.classList.toggle("is-lit", isLit);
    button.classList.toggle("is-missed", isMissed);
    button.setAttribute("aria-pressed", String(isLit));
    button.innerHTML = `
      <span class="daily-lantern-icon" aria-hidden="true"></span>
      <span class="daily-lantern-date">${formatLanternDate(lantern.date)}</span>
      <span class="daily-lantern-title">${lantern.title}</span>
      <span class="daily-lantern-name">${lantern.name}</span>
      <span class="daily-lantern-action">${isLit ? "已點亮" : isToday ? "點亮天燈" : isMissed ? "已錯過" : "尚未開放"}</span>
    `;

    button.addEventListener("click", async (event) => {
      if (!canOpen) return;
      let shouldPlayIgnition = false;
      if (!isLit && isToday && event.isTrusted) {
        litLanterns.add(lanternId);
        saveLitLanterns(litLanterns);
        renderDailyLanterns();
        shouldPlayIgnition = true;
      }
      if (shouldPlayIgnition) await playLanternIgnition(lantern);
      openLanternDialog(lantern);
    });

    lanternGrid.append(button);
  });
}

renderDailyLanterns();
syncTaipeiDateFromServer();

lanternDialog?.querySelector(".lantern-dialog-close")?.addEventListener("click", closeLanternDialog);
lanternDialog?.querySelector(".lantern-dialog-backdrop")?.addEventListener("click", closeLanternDialog);
lanternDialogDownload?.addEventListener("click", downloadLanternImage);

const characterGrid = document.querySelector(".character-grid");
const characterCards = document.querySelectorAll(".character-card");
const characterSliderButtons = document.querySelectorAll(".character-slider button");

function setActiveCharacter(card) {
  characterCards.forEach((item, index) => {
    const isCurrent = item === card;
    item.classList.toggle("is-active", isCurrent);
    item.setAttribute("aria-pressed", String(isCurrent));
    item.querySelector(".card-action").textContent = isCurrent ? "已解封" : "揭開殘片";
    characterSliderButtons[index]?.classList.toggle("is-active", isCurrent);
  });
}

characterCards.forEach((card) => {
  card.addEventListener("click", () => {
    setActiveCharacter(card);
  });

  card.addEventListener("keydown", (event) => {
    if (event.target.closest(".character-open-link")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setActiveCharacter(card);
  });
});

characterOpenLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.stopPropagation();
  });
});

characterSliderButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.slide);
    const card = characterCards[index];
    if (!card) return;

    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActiveCharacter(card);
  });
});

let characterScrollTicking = false;
characterGrid?.addEventListener("scroll", () => {
  if (characterScrollTicking || window.matchMedia("(min-width: 1001px)").matches) return;
  characterScrollTicking = true;

  window.requestAnimationFrame(() => {
    const gridRect = characterGrid.getBoundingClientRect();
    const gridCenter = gridRect.left + gridRect.width / 2;
    let closestCard = characterCards[0];
    let closestDistance = Infinity;

    characterCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const distance = Math.abs(cardCenter - gridCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCard = card;
      }
    });

    if (closestCard) setActiveCharacter(closestCard);
    characterScrollTicking = false;
  });
});

const navToggle = document.querySelector(".nav-toggle");
const siteHeader = document.querySelector(".site-header");
const siteNav = document.querySelector(".site-nav");

navToggle?.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

const darkNavSections = document.querySelectorAll(".creator, .final-cta");

if (siteHeader && darkNavSections.length) {
  const activeDarkNavSections = new Set();
  const darkNavObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activeDarkNavSections.add(entry.target);
      } else {
        activeDarkNavSections.delete(entry.target);
      }
    });

    siteHeader.classList.toggle("is-dark-nav", activeDarkNavSections.size > 0);
  }, {
    rootMargin: "-22% 0px -58% 0px",
    threshold: 0,
  });

  darkNavSections.forEach((section) => darkNavObserver.observe(section));
}

const toTop = document.querySelector(".to-top");

toTop?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

musicToggle?.addEventListener("click", () => {
  if (!bgMusic) return;
  if (!isBackgroundMusicAudible()) {
    playBackgroundMusic({
      startVolume: Math.max(bgMusic.volume, 0.08),
      volume: bgMusicTargetVolume,
      fadeDuration: 420,
    });
  } else {
    stopBackgroundMusicFade();
    bgMusic.pause();
    setMusicState(false);
  }
});

bgMusic?.addEventListener("pause", () => setMusicState(false));

const memoryPlayer = document.querySelector(".bgvideo-player");
const memoryVideo = document.querySelector(".bgvideo-media");
const memoryPlay = document.querySelector(".bgvideo-play");
const fateWindowPlayer = document.querySelector(".fate-window-video");
const fateWindowVideo = document.querySelector(".fate-window-media");
const fateWindowPlay = document.querySelector(".fate-window-play");

memoryPlay?.addEventListener("click", () => {
  memoryVideo?.play?.();
});

memoryVideo?.addEventListener("play", () => {
  memoryPlayer?.classList.add("is-playing");
  pauseMusicForVideo(memoryVideo);
});

memoryVideo?.addEventListener("pause", () => {
  memoryPlayer?.classList.remove("is-playing");
  resumeMusicAfterVideo(memoryVideo);
});

memoryVideo?.addEventListener("ended", () => {
  memoryPlayer?.classList.remove("is-playing");
  resumeMusicAfterVideo(memoryVideo);
});

fateWindowPlay?.addEventListener("click", () => {
  fateWindowVideo?.play?.();
});

fateWindowVideo?.addEventListener("play", () => {
  fateWindowPlayer?.classList.add("is-playing");
});

fateWindowVideo?.addEventListener("pause", () => {
  fateWindowPlayer?.classList.remove("is-playing");
});

fateWindowVideo?.addEventListener("ended", () => {
  fateWindowPlayer?.classList.remove("is-playing");
});

document.querySelectorAll("video").forEach((video) => {
  if (video === introVideo || video === memoryVideo) return;
  if (video.muted && video.loop) return;

  video.addEventListener("play", () => pauseMusicForVideo(video));
  video.addEventListener("pause", () => resumeMusicAfterVideo(video));
  video.addEventListener("ended", () => resumeMusicAfterVideo(video));
});

const rewardDetails = {
  second: {
    rank: "第二名",
    title: "功業無雙",
    prize: "2000TC幣+專屬限定卷軸+限定個人PV(60秒)",
    desc: "你與角色的專屬影片。讓這段被記住的羈絆，化作只屬於你的影像篇章。",
  },
  first: {
    rank: "第一名",
    title: "天下魁首",
    prize: "4000TC幣+專屬限定卷軸+專屬沈浸式互動網站",
    desc: "專屬互動破關網頁，讓你查看每個角色的秘密情話與大封王朝的完整歷史篇章。",
  },
  third: {
    rank: "第三名",
    title: "青史留名",
    prize: "1000TC幣+專屬限定卷軸",
    desc: "收集你與心愛角色的合照，將這次相遇畫在名為起點的卷軸裡。",
  },
};

const rewardDialog = document.querySelector(".reward-dialog");
const rewardDialogRank = document.querySelector(".reward-dialog-rank");
const rewardDialogTitle = document.querySelector("#reward-dialog-title");
const rewardDialogPrize = document.querySelector(".reward-dialog-prize");
const rewardDialogDesc = document.querySelector(".reward-dialog-desc");

function closeRewardDialog() {
  if (!rewardDialog) return;
  rewardDialog.hidden = true;
  document.body.style.overflow = "";
}

document.querySelectorAll(".reward-button").forEach((button) => {
  button.addEventListener("click", () => {
    const detail = rewardDetails[button.dataset.reward];
    if (!detail || !rewardDialog) return;

    rewardDialogRank.textContent = detail.rank;
    rewardDialogTitle.textContent = detail.title;
    rewardDialogPrize.textContent = detail.prize;
    rewardDialogDesc.textContent = detail.desc;
    rewardDialog.hidden = false;
    document.body.style.overflow = "hidden";
    rewardDialog.querySelector(".reward-dialog-close").focus();
  });
});

rewardDialog?.querySelector(".reward-dialog-close").addEventListener("click", closeRewardDialog);
rewardDialog?.querySelector(".reward-dialog-confirm").addEventListener("click", closeRewardDialog);
rewardDialog?.querySelector(".reward-dialog-backdrop").addEventListener("click", closeRewardDialog);

const dialog = document.querySelector(".dialog");
const closeDialog = () => {
  dialog.hidden = true;
  document.body.style.overflow = "";
};

document.querySelectorAll(".js-register").forEach((button) => {
  button.addEventListener("click", () => {
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
    dialog.querySelector(".dialog-close").focus();
  });
});

dialog?.querySelector(".dialog-close").addEventListener("click", closeDialog);
dialog?.querySelector(".dialog-confirm").addEventListener("click", closeDialog);
dialog?.querySelector(".dialog-backdrop").addEventListener("click", closeDialog);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (lanternDialog && !lanternDialog.hidden) closeLanternDialog();
  if (rewardDialog && !rewardDialog.hidden) closeRewardDialog();
  if (dialog && !dialog.hidden) closeDialog();
});
