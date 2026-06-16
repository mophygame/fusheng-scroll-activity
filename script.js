const countdown = document.querySelector("[data-countdown]");

const introGate = document.querySelector(".intro-gate");
const introEnter = document.querySelector(".intro-enter");
const introVideo = document.querySelector(".intro-video");
const bgMusic = document.querySelector(".bg-music");
const musicToggle = document.querySelector(".music-toggle");
let introStarted = false;
let shouldResumeMusicAfterVideo = false;
let activeMusicPausingVideo = null;

function setMusicState(isPlaying) {
  musicToggle?.classList.toggle("is-playing", isPlaying);
  musicToggle?.setAttribute("aria-pressed", String(isPlaying));
  musicToggle?.setAttribute("aria-label", isPlaying ? "關閉背景音樂" : "開啟背景音樂");
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

introEnter?.addEventListener("click", () => {
  if (introStarted || !introGate || !introVideo) return;
  introStarted = true;

  introGate.classList.add("is-igniting", "is-loading-igniting");

  window.setTimeout(() => {
    introGate.classList.remove("is-loading-igniting");
    introGate.classList.add("is-inking", "is-hidden");
    document.body.classList.remove("is-intro-open");
    playBackgroundMusic();
    window.setTimeout(() => {
      introGate.hidden = true;
      introVideo.pause();
    }, 500);
  }, 2000);
});

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

document.querySelectorAll(".character-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".character-card").forEach((item) => {
      const isCurrent = item === card;
      item.classList.toggle("is-active", isCurrent);
      item.setAttribute("aria-pressed", String(isCurrent));
      item.querySelector(".card-action").textContent = isCurrent ? "已解封" : "揭開殘片";
    });
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
