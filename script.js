const noteInformation = {
  "ど": {
    className: "note-do",
    frequency: 261.63
  },
  "れ": {
    className: "note-re",
    frequency: 293.66
  },
  "み": {
    className: "note-mi",
    frequency: 329.63
  },
  "ふぁ": {
    className: "note-fa",
    frequency: 349.23
  },
  "そ": {
    className: "note-so",
    frequency: 392.0
  },
  "ら": {
    className: "note-la",
    frequency: 440.0
  },
  "し": {
    className: "note-si",
    frequency: 493.88
  },
  "ど↑": {
    className: "note-do",
    frequency: 523.25
  },
  "れ↑": {
    className: "note-re",
    frequency: 587.33
  },
  "み↑": {
    className: "note-mi",
    frequency: 659.25
  }
};

const song = [
  "み",
  "そ",
  "そ",
  "やすみ",
  "ふぁ",
  "ら",
  "ら",
  "やすみ",
  "し",
  "し",
  "ら",
  "し",
  "ど↑",
  "れ↑",
  "み↑",
  "やすみ"
];

const currentNoteElement = document.getElementById("currentNote");
const waitingArea = document.getElementById("waitingArea");
const waitingText = document.getElementById("waitingText");
const melodyElement = document.getElementById("melody");

const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const stopButton = document.getElementById("stopButton");
const speedButtons = document.querySelectorAll(".speed-button");
const xylophoneKeys = document.querySelectorAll(".xylophone-key");

let currentIndex = 0;
let timer = null;
let speed = 1100;
let audioContext = null;

function createMelodyDisplay() {
  melodyElement.innerHTML = "";

  song.forEach((note, index) => {
    const noteBox = document.createElement("div");

    noteBox.classList.add("melody-note");
    noteBox.dataset.index = index;

    if (note === "やすみ") {
      noteBox.textContent = "休";
      noteBox.classList.add("rest-note");
    } else {
      noteBox.textContent = note;
      noteBox.classList.add(noteInformation[note].className);
    }

    melodyElement.appendChild(noteBox);
  });
}

function clearNoteClasses() {
  currentNoteElement.className = "current-note";

  xylophoneKeys.forEach((key) => {
    key.classList.remove("active");
  });
}

function updateMelodyPosition() {
  const melodyNotes = document.querySelectorAll(".melody-note");

  melodyNotes.forEach((noteBox, index) => {
    noteBox.classList.remove("current", "finished");

    if (index < currentIndex) {
      noteBox.classList.add("finished");
    }

    if (index === currentIndex) {
      noteBox.classList.add("current");

      noteBox.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    }
  });
}

function playTone(frequency) {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(
    0.18,
    audioContext.currentTime
  );

  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.45
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.45);
}

function showCurrentNote() {
  clearNoteClasses();
  updateMelodyPosition();

  if (currentIndex >= song.length) {
    finishSong();
    return;
  }

  const note = song[currentIndex];

  if (note === "やすみ") {
    currentNoteElement.textContent = "やすみ";
    currentNoteElement.classList.add("rest-note");

    waitingArea.classList.remove("playing");
    waitingText.textContent = "まってね";
  } else {
    const information = noteInformation[note];

    currentNoteElement.textContent = note;
    currentNoteElement.classList.add(
      information.className,
      "flash"
    );

    waitingArea.classList.add("playing");
    waitingText.textContent = "たたこう！";

    const activeKey = document.querySelector(
      `.xylophone-key[data-note="${note}"]`
    );

    if (activeKey) {
      activeKey.classList.add("active");
    }

    playTone(information.frequency);

    setTimeout(() => {
      currentNoteElement.classList.remove("flash");
    }, 250);
  }
}

function nextNote() {
  if (currentIndex >= song.length) {
    finishSong();
    return;
  }

  showCurrentNote();
  currentIndex += 1;
}

function startSong() {
  if (timer) {
    return;
  }

  if (currentIndex >= song.length) {
    currentIndex = 0;
  }

  nextNote();

  timer = setInterval(() => {
    if (currentIndex >= song.length) {
      finishSong();
      return;
    }

    nextNote();
  }, speed);
}

function pauseSong() {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = null;

  waitingArea.classList.remove("playing");
  waitingText.textContent = "いちじていし";
}

function stopSong() {
  if (timer) {
    clearInterval(timer);
  }

  timer = null;
  currentIndex = 0;

  clearNoteClasses();

  currentNoteElement.textContent = "み";
  currentNoteElement.classList.add("note-mi");

  waitingArea.classList.remove("playing");
  waitingText.textContent = "まってね";

  updateMelodyPosition();
}

function finishSong() {
  if (timer) {
    clearInterval(timer);
  }

  timer = null;
  clearNoteClasses();

  currentNoteElement.textContent = "おしまい";
  currentNoteElement.classList.add("rest-note");

  waitingArea.classList.remove("playing");
  waitingText.textContent = "できた！";

  const melodyNotes =
    document.querySelectorAll(".melody-note");

  melodyNotes.forEach((noteBox) => {
    noteBox.classList.remove("current");
    noteBox.classList.add("finished");
  });
}

function changeSpeed(newSpeed, selectedButton) {
  speed = Number(newSpeed);

  speedButtons.forEach((button) => {
    button.classList.remove("selected");
  });

  selectedButton.classList.add("selected");

  if (timer) {
    clearInterval(timer);

    timer = setInterval(() => {
      if (currentIndex >= song.length) {
        finishSong();
        return;
      }

      nextNote();
    }, speed);
  }
}

startButton.addEventListener("click", startSong);
pauseButton.addEventListener("click", pauseSong);
stopButton.addEventListener("click", stopSong);

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    changeSpeed(
      button.dataset.speed,
      button
    );
  });
});

createMelodyDisplay();
stopSong();