const noteInformation = {
  "ど": { className: "note-do", frequency: 261.63 },
  "れ": { className: "note-re", frequency: 293.66 },
  "み": { className: "note-mi", frequency: 329.63 },
  "ふぁ": { className: "note-fa", frequency: 349.23 },
  "ふぁ♯": { className: "note-fs", frequency: 369.99 },
  "そ": { className: "note-so", frequency: 392.00 },
  "ら": { className: "note-la", frequency: 440.00 },
  "し": { className: "note-si", frequency: 493.88 },
  "ど↑": { className: "note-do", frequency: 523.25 },
  "れ↑": { className: "note-re", frequency: 587.33 },
  "み↑": { className: "note-mi", frequency: 659.25 }
};

function makeBar(bar, part, notes, section) {
  return notes.map((item) => {
    if (typeof item === "string") {
      return { bar, part, note: item, section, duration: 1 };
    }
    return { bar, part, section, duration: 1, ...item };
  });
}

const xylophoneSong = [
  ...makeBar(1, "木琴①", ["み","そ","そ","やすみ"], "前半"),
  ...makeBar(2, "木琴①", ["ふぁ","ら","ら","やすみ"], "前半"),
  ...makeBar(3, "木琴②", ["し","し","ら","し"], "前半"),
  ...makeBar(4, "木琴②", ["ど↑","れ↑","み↑","やすみ"], "前半"),
  ...makeBar(5, "木琴①", ["み","そ","そ","やすみ"], "前半"),
  ...makeBar(6, "木琴①", ["ふぁ","ら","ら","やすみ"], "前半"),
  ...makeBar(7, "木琴②", ["し","し","ら","し"], "前半"),
  ...makeBar(8, "木琴②", ["ど↑","ど↑","ど↑","やすみ"], "前半"),
  ...makeBar(9, "木琴①", ["み↑","ど↑","そ","やすみ"], "後半"),
  ...makeBar(10, "木琴①", ["ふぁ","ら","ら","やすみ"], "後半"),
  ...makeBar(11, "木琴②", ["し","し","ら","し"], "後半"),
  ...makeBar(12, "木琴②", ["ど↑","れ↑","み↑","やすみ"], "後半"),
  ...makeBar(13, "木琴①", ["み↑","ど↑","そ","やすみ"], "後半"),
  ...makeBar(14, "木琴①", ["ふぁ","ら","ら","やすみ"], "後半"),
  ...makeBar(15, "木琴②", ["し","し","ら","し"], "後半"),
  ...makeBar(16, "木琴②", ["ど↑","ど↑","ど↑","やすみ"], "後半")
];

const bellSong = [];
for (let repeat = 0; repeat < 4; repeat += 1) {
  const startBar = repeat * 4 + 1;
  const section = repeat < 2 ? "前半" : "後半";
  bellSong.push(
    ...makeBar(startBar, "ベル①", ["み","そ","そ","やすみ"], section),
    ...makeBar(startBar + 1, "ベル②", ["ふぁ","ら","ら","やすみ"], section),
    ...makeBar(startBar + 2, "ベル③", ["し","し","し","し"], section),
    ...makeBar(startBar + 3, "ベル③", ["ど↑","ど↑","ど↑","やすみ"], section)
  );
}

const bassSong = [];
for (let repeat = 0; repeat < 4; repeat += 1) {
  const startBar = repeat * 4 + 1;
  const section = repeat < 2 ? "前半" : "後半";
  bassSong.push(
    ...makeBar(startBar, "ベース⑥", ["ど","やすみ","み","やすみ"], section),
    ...makeBar(startBar + 1, "ベース⑥", ["ふぁ","やすみ","ふぁ♯","やすみ"], section),
    ...makeBar(startBar + 2, "ベース⑥", ["そ","ふぁ","み","れ"], section),
    ...makeBar(startBar + 3, "ベース⑥", [
      { note: "ど", duration: 2, display: "どー" },
      { note: "そ", duration: 2, display: "そー" }
    ], section)
  );
}

const currentNoteElement = document.getElementById("currentNote");
const waitingArea = document.getElementById("waitingArea");
const waitingText = document.getElementById("waitingText");
const melodyElement = document.getElementById("melody");
const modeMessage = document.getElementById("modeMessage");
const actionMessage = document.getElementById("actionMessage");

const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const stopButton = document.getElementById("stopButton");
const speedButtons = document.querySelectorAll(".speed-button");
const instrumentButtons = document.querySelectorAll(".instrument-button");
const xylophoneKeys = document.querySelectorAll(".xylophone-key");
const bassKeys = document.querySelectorAll("[data-bass-note]");

const xylophoneModeButtons = document.getElementById("xylophoneModeButtons");
const bellModeButtons = document.getElementById("bellModeButtons");
const bassModeButtons = document.getElementById("bassModeButtons");
const colorInstrumentArea = document.getElementById("colorInstrumentArea");
const bassKeyboardArea = document.getElementById("bassKeyboardArea");

let selectedInstrument = "xylophone";
let selectedMode = "all";
let currentSong = xylophoneSong;
let currentIndex = 0;
let timer = null;
let speed = 1100;
let audioContext = null;

function partNameFromMode() {
  if (selectedInstrument === "bass") return "ベース⑥";
  if (selectedMode === "part1") return selectedInstrument === "xylophone" ? "木琴①" : "ベル①";
  if (selectedMode === "part2") return selectedInstrument === "xylophone" ? "木琴②" : "ベル②";
  if (selectedMode === "part3") return "ベル③";
  return null;
}

function partNumber(part) {
  if (part.includes("①")) return "①";
  if (part.includes("②")) return "②";
  if (part.includes("③")) return "③";
  return "⑥";
}

function eventDisplay(event) {
  return event.display || event.note;
}

function createMelodyDisplay() {
  melodyElement.innerHTML = "";
  currentSong.forEach((event, index) => {
    const box = document.createElement("div");
    box.classList.add("melody-note");
    box.dataset.index = index;

    if (event.note === "やすみ") {
      box.textContent = "休";
      box.classList.add("rest-note");
    } else {
      box.textContent = `${partNumber(event.part)}${eventDisplay(event)}`;
      box.classList.add(noteInformation[event.note].className);
    }

    box.title = `${event.section}・${event.bar}小節・${event.part}`;
    melodyElement.appendChild(box);
  });
}

function clearHighlights() {
  currentNoteElement.className = "current-note";

  xylophoneKeys.forEach((key) => {
    key.classList.remove("active");
    key.style.transform = "";
    key.style.filter = "";
    key.style.outline = "";
    key.style.opacity = "";
    key.textContent = key.dataset.note;
  });

  bassKeys.forEach((key) => key.classList.remove("active-bass"));
}

function updateMelodyPosition() {
  document.querySelectorAll(".melody-note").forEach((box, index) => {
    box.classList.remove("current", "finished");
    if (index < currentIndex) box.classList.add("finished");
    if (index === currentIndex) {
      box.classList.add("current");
      box.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  });
}

function playTone(frequency, duration = 1) {
  if (!audioContext) audioContext = new AudioContext();

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const soundLength = Math.max(0.35, speed / 1000 * duration * 0.7);

  oscillator.type = selectedInstrument === "bass" ? "triangle" : "sine";
  oscillator.frequency.value = selectedInstrument === "bass" ? frequency / 2 : frequency;
  gain.gain.setValueAtTime(0.18, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + soundLength);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + soundLength);
}

function showPartnerKey(key, note, number) {
  key.textContent = `${note} ${number}`;
  key.style.transform = "translateY(-6px) scale(1.03)";
  key.style.filter = "brightness(1.08)";
  key.style.outline = "4px dashed #777";
  key.style.opacity = "0.75";
}

function showCurrentEvent() {
  clearHighlights();
  updateMelodyPosition();

  if (currentIndex >= currentSong.length) {
    finishSong();
    return;
  }

  const event = currentSong[currentIndex];
  const note = event.note;
  const selectedPart = partNameFromMode();
  const isMyTurn = selectedInstrument === "bass" || selectedMode === "all" || event.part === selectedPart;

  if (note === "やすみ") {
    currentNoteElement.textContent = "やすみ";
    currentNoteElement.classList.add("rest-note");
    waitingArea.classList.remove("playing");
    waitingText.textContent = "まってね";
    return;
  }

  const info = noteInformation[note];
  const number = partNumber(event.part);
  const display = eventDisplay(event);

  if (isMyTurn) {
    currentNoteElement.textContent = `${display} ${number}`;
    currentNoteElement.classList.add(info.className, "flash");
    waitingArea.classList.add("playing");
    waitingText.textContent = `${event.part}の ばん！`;

    if (selectedInstrument === "bass") {
      const key = document.querySelector(`[data-bass-note="${note}"]`);
      if (key) key.classList.add("active-bass");
    } else {
      const key = document.querySelector(`.xylophone-key[data-note="${note}"]`);
      if (key) {
        key.classList.add("active");
        key.textContent = `${note} ${number}`;
      }
    }
  } else {
    currentNoteElement.textContent = "やすみ";
    currentNoteElement.classList.add("rest-note");
    waitingArea.classList.remove("playing");
    waitingText.innerHTML = `${event.part}が えんそう中<br>${partNumber(selectedPart)}は まってね`;

    const key = document.querySelector(`.xylophone-key[data-note="${note}"]`);
    if (key) showPartnerKey(key, note, number);
  }

  playTone(info.frequency, event.duration);
  setTimeout(() => currentNoteElement.classList.remove("flash"), 250);
}

function scheduleNext() {
  if (currentIndex >= currentSong.length) {
    finishSong();
    return;
  }

  const event = currentSong[currentIndex];
  showCurrentEvent();
  currentIndex += 1;
  timer = setTimeout(scheduleNext, speed * (event.duration || 1));
}

function startSong() {
  if (timer) return;
  if (currentIndex >= currentSong.length) currentIndex = 0;
  scheduleNext();
}

function pauseSong() {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
  waitingArea.classList.remove("playing");
  waitingText.textContent = "いちじていし";
}

function stopSong() {
  if (timer) clearTimeout(timer);

  timer = null;
  currentIndex = 0;
  clearHighlights();

  currentNoteElement.textContent = selectedInstrument === "bass" ? "ど" : "み";
  currentNoteElement.classList.add(selectedInstrument === "bass" ? "note-do" : "note-mi");
  waitingArea.classList.remove("playing");
  waitingText.textContent = "まってね";
  updateMelodyPosition();
}

function finishSong() {
  if (timer) clearTimeout(timer);

  timer = null;
  clearHighlights();
  currentNoteElement.textContent = "おしまい";
  currentNoteElement.classList.add("rest-note");
  waitingArea.classList.remove("playing");
  waitingText.textContent = "できた！";

  document.querySelectorAll(".melody-note").forEach((box) => {
    box.classList.remove("current");
    box.classList.add("finished");
  });
}

function updateModeMessage() {
  if (selectedInstrument === "xylophone") {
    actionMessage.textContent = "ひかる おとを たたこう";
    modeMessage.textContent = selectedMode === "all"
      ? "もっきん①と②を こうたいで えんそうします"
      : `${partNameFromMode()}を れんしゅうします。あいてのときは きいて まちます`;
  } else if (selectedInstrument === "bells") {
    actionMessage.textContent = "ひかる おとの ベルを ならそう";
    modeMessage.textContent = selectedMode === "all"
      ? "ベル①・②・③を こうたいで えんそうします"
      : `${partNameFromMode()}を れんしゅうします。ほかのベルのときは きいて まちます`;
  } else {
    actionMessage.textContent = "ひかる けんばんを ひこう";
    modeMessage.textContent = "⑥ ベースを れんしゅうします";
  }
}

function changeInstrument(instrument, button) {
  selectedInstrument = instrument;
  selectedMode = instrument === "bass" ? "bass" : "all";
  currentSong = instrument === "xylophone" ? xylophoneSong : instrument === "bells" ? bellSong : bassSong;

  instrumentButtons.forEach((item) => item.classList.remove("selected-mode"));
  button.classList.add("selected-mode");

  xylophoneModeButtons.classList.toggle("hidden", instrument !== "xylophone");
  bellModeButtons.classList.toggle("hidden", instrument !== "bells");
  bassModeButtons.classList.toggle("hidden", instrument !== "bass");
  colorInstrumentArea.classList.toggle("hidden", instrument === "bass");
  bassKeyboardArea.classList.toggle("hidden", instrument !== "bass");

  document.querySelectorAll(".part-button").forEach((item) => item.classList.remove("selected-mode"));
  const group = instrument === "xylophone" ? xylophoneModeButtons : instrument === "bells" ? bellModeButtons : bassModeButtons;
  group.querySelector(".part-button").classList.add("selected-mode");

  stopSong();
  createMelodyDisplay();
  updateModeMessage();
}

function changeMode(mode, button) {
  selectedMode = mode;
  const group = selectedInstrument === "xylophone" ? xylophoneModeButtons : selectedInstrument === "bells" ? bellModeButtons : bassModeButtons;
  group.querySelectorAll(".part-button").forEach((item) => item.classList.remove("selected-mode"));
  button.classList.add("selected-mode");
  stopSong();
  updateModeMessage();
}

function changeSpeed(newSpeed, button) {
  speed = Number(newSpeed);
  speedButtons.forEach((item) => item.classList.remove("selected"));
  button.classList.add("selected");

  if (timer) {
    clearTimeout(timer);
    timer = null;
    scheduleNext();
  }
}

startButton.addEventListener("click", startSong);
pauseButton.addEventListener("click", pauseSong);
stopButton.addEventListener("click", stopSong);

speedButtons.forEach((button) => {
  button.addEventListener("click", () => changeSpeed(button.dataset.speed, button));
});

instrumentButtons.forEach((button) => {
  button.addEventListener("click", () => changeInstrument(button.dataset.instrument, button));
});

document.querySelectorAll(".part-button").forEach((button) => {
  button.addEventListener("click", () => changeMode(button.dataset.mode, button));
});

createMelodyDisplay();
updateModeMessage();
stopSong();
