const countdown = document.querySelector("[data-countdown]");

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
const criticalAssetsReady = trackLoadingTasks([
  preloadImage("assets/bg_landing.webp"),
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
];

function warmSecondaryAssets() {
  if (secondaryWarmStarted) return;
  secondaryWarmStarted = true;
  secondaryAssets.forEach((src) => preloadImage(src));
  preloadVideoMetadata("assets/ancient.mp4");
  preloadVideoMetadata("assets/modern.mp4");
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

function playBackgroundMusic() {
  if (!bgMusic) return;
  bgMusic.volume = 0.42;
  bgMusic.play()
    .then(() => setMusicState(true))
    .catch(() => setMusicState(false));
}

function pauseMusicForVideo(video) {
  if (!bgMusic || !video || video === activeMusicPausingVideo) return;
  shouldResumeMusicAfterVideo = !bgMusic.paused;
  activeMusicPausingVideo = video;
  if (shouldResumeMusicAfterVideo) {
    bgMusic.pause();
  }
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

  window.setTimeout(() => {
    introGate.classList.remove("is-loading-igniting");
    introGate.classList.add("is-transitioning", "is-lantern-rise", "is-inking");
  }, 2000);

  window.setTimeout(() => {
    document.body.classList.remove("is-intro-open");
    playBackgroundMusic();
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
}

updateCountdown();
setInterval(updateCountdown, 1000);

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

const toTop = document.querySelector(".to-top");

toTop?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

musicToggle?.addEventListener("click", () => {
  if (!bgMusic) return;
  if (bgMusic.paused) {
    playBackgroundMusic();
  } else {
    bgMusic.pause();
    setMusicState(false);
  }
});

bgMusic?.addEventListener("play", () => setMusicState(true));
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
    prize: "2000TC金幣+限定個人MV",
    desc: "你與角色的專屬MV。讓這段被記住的羈絆，化作只屬於你的影像篇章。",
  },
  first: {
    rank: "第一名",
    title: "天下魁首",
    prize: "4000TC金幣+專屬網頁",
    desc: "專屬互動破關網頁，讓你查看每個角色的秘密情話與大封王朝的完整歷史篇章。",
  },
  third: {
    rank: "第三名",
    title: "青史留名",
    prize: "1000TC金幣+合照",
    desc: "收集你與心愛角色的合照，將這次相遇留在不會褪色的記憶裡。",
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
  if (rewardDialog && !rewardDialog.hidden) closeRewardDialog();
  if (dialog && !dialog.hidden) closeDialog();
});
