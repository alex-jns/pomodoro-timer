const MODES = {
  focus: {
    label: "Focus Session",
    shortLabel: "Focus",
    minutes: 25,
    accent: "#0f766e",
    hint: "Pick a task and begin your sprint."
  },
  shortBreak: {
    label: "Short Break",
    shortLabel: "Short Break",
    minutes: 5,
    accent: "#ff8c42",
    hint: "Step away for a quick reset."
  },
  longBreak: {
    label: "Long Break",
    shortLabel: "Long Break",
    minutes: 15,
    accent: "#7c3aed",
    hint: "Recharge before your next deep session."
  },
  deepFocus: {
    label: "Deep Focus",
    shortLabel: "Deep Focus",
    minutes: 50,
    accent: "#1d4ed8",
    hint: "A longer block for demanding study work."
  }
};

const timerDisplay = document.getElementById("timerDisplay");
const timerMode = document.getElementById("timerMode");
const timerHint = document.getElementById("timerHint");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const taskInput = document.getElementById("taskInput");
const currentTask = document.getElementById("currentTask");
const completedPomodoros = document.getElementById("completedPomodoros");
const currentModeLabel = document.getElementById("currentModeLabel");
const focusMinutes = document.getElementById("focusMinutes");
const cycleCount = document.getElementById("cycleCount");
const themeToggle = document.getElementById("themeToggle");
const youtubePlayer = document.getElementById("youtubePlayer");
const youtubeUrl = document.getElementById("youtubeUrl");
const loadVideoBtn = document.getElementById("loadVideoBtn");
const resetVideoBtn = document.getElementById("resetVideoBtn");
const embedStatus = document.getElementById("embedStatus");
const progressCircle = document.querySelector(".progress");
const modeButtons = document.querySelectorAll(".mode-card");
const audioContext = window.AudioContext ? new window.AudioContext() : null;

let activeMode = "focus";
let totalSeconds = MODES[activeMode].minutes * 60;
let remainingSeconds = totalSeconds;
let timerId = null;
let completedCount = 0;
let totalFocusSeconds = 0;
let finishedCycles = 0;
let isDarkMode = window.localStorage.getItem("focus-flow-theme") === "dark";
const defaultVideoId = "jfKfPfyJRdk";

const ringLength = 2 * Math.PI * 92;
progressCircle.style.strokeDasharray = `${ringLength}`;

function formatTime(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

function formatFocusTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes === 0) {
    return `${secs}s`;
  }

  return `${minutes}m ${String(secs).padStart(2, "0")}s`;
}

function syncTaskLabel() {
  const value = taskInput.value.trim();
  currentTask.textContent = value || "No task selected yet.";
}

function updateProgress() {
  const progress = 1 - remainingSeconds / totalSeconds;
  progressCircle.style.strokeDashoffset = `${ringLength * (1 - progress)}`;
}

function render() {
  const mode = MODES[activeMode];
  timerDisplay.textContent = formatTime(remainingSeconds);
  timerMode.textContent = mode.label;
  timerHint.textContent = mode.hint;
  currentModeLabel.textContent = mode.shortLabel;
  focusMinutes.textContent = formatFocusTime(totalFocusSeconds);
  progressCircle.style.stroke = mode.accent;
  document.documentElement.style.setProperty("--accent", mode.accent);
  startPauseBtn.textContent = timerId ? "Pause" : "Start";
  updateProgress();
}

function extractYouTubeVideoId(value) {
  const input = value.trim();

  if (!input) {
    return null;
  }

  const shortMatch = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) {
    return shortMatch[1];
  }

  const embedMatch = input.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) {
    return embedMatch[1];
  }

  const watchMatch = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    return watchMatch[1];
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  return null;
}

function setYouTubeVideo(videoId, statusMessage, persist = true) {
  youtubePlayer.src = `https://www.youtube.com/embed/${videoId}`;
  embedStatus.textContent = statusMessage;

  if (persist) {
    window.localStorage.setItem("focus-flow-video-id", videoId);
  }
}

function playAlarm() {
  if (!audioContext) {
    return;
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  const pattern = [
    { frequency: 880, duration: 0.18, delay: 0 },
    { frequency: 1174.66, duration: 0.18, delay: 0.22 },
    { frequency: 1567.98, duration: 0.32, delay: 0.44 }
  ];

  const startAt = audioContext.currentTime + 0.02;

  pattern.forEach((note) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, startAt + note.delay);

    gainNode.gain.setValueAtTime(0.0001, startAt + note.delay);
    gainNode.gain.exponentialRampToValueAtTime(0.2, startAt + note.delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + note.delay + note.duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startAt + note.delay);
    oscillator.stop(startAt + note.delay + note.duration + 0.03);
  });
}

function applyTheme() {
  document.body.classList.toggle("dark", isDarkMode);
  themeToggle.textContent = isDarkMode ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-pressed", String(isDarkMode));
}

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
  startPauseBtn.textContent = "Start";
}

function resetTimer() {
  stopTimer();
  totalSeconds = MODES[activeMode].minutes * 60;
  remainingSeconds = totalSeconds;
  render();
}

function completeCycle() {
  stopTimer();
  playAlarm();
  finishedCycles += 1;
  cycleCount.textContent = String(finishedCycles);

  if (activeMode === "focus" || activeMode === "deepFocus") {
    completedCount += 1;
    completedPomodoros.textContent = String(completedCount);
  }

  timerHint.textContent = "Session complete. Reset or switch modes for the next round.";
}

function tick() {
  if (activeMode === "focus" || activeMode === "deepFocus") {
    totalFocusSeconds += 1;
  }

  if (remainingSeconds <= 1) {
    remainingSeconds = 0;
    render();
    completeCycle();
    return;
  }

  remainingSeconds -= 1;
  render();
}

function setMode(modeKey) {
  activeMode = modeKey;
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === modeKey);
  });
  resetTimer();
}

startPauseBtn.addEventListener("click", () => {
  if (timerId) {
    stopTimer();
    return;
  }

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  timerId = window.setInterval(tick, 1000);
  startPauseBtn.textContent = "Pause";
});

resetBtn.addEventListener("click", resetTimer);

themeToggle.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  window.localStorage.setItem("focus-flow-theme", isDarkMode ? "dark" : "light");
  applyTheme();
});

loadVideoBtn.addEventListener("click", () => {
  const videoId = extractYouTubeVideoId(youtubeUrl.value);

  if (!videoId) {
    embedStatus.textContent = "That link did not look like a valid YouTube video URL.";
    return;
  }

  setYouTubeVideo(videoId, "Loaded your custom YouTube video.");
});

resetVideoBtn.addEventListener("click", () => {
  youtubeUrl.value = "";
  setYouTubeVideo(defaultVideoId, "Loaded with the default lofi stream.");
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

taskInput.addEventListener("input", syncTaskLabel);

applyTheme();
setYouTubeVideo(
  window.localStorage.getItem("focus-flow-video-id") || defaultVideoId,
  "Loaded with your saved study video.",
  false
);
syncTaskLabel();
render();
