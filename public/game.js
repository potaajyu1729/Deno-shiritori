//定数
const MAX_LIVES = 3;
const WORDS_PER_LEVEL = 5; //レベルアップ基準
const COUNTDOWN_SECONDS = 5; //ミス後再開カウントダウン
const HS_KEY = "shiritori_highscore";
const ACH_KEY = "shiritori_achievements";
const ADMIN_PASSWORD = "admin";

//最低文字数
function getMinLength(level) {
  return Math.min(2 + Math.floor((level - 1) / 2), 6);
}

//制限時間
function getTimeLimit(level) {
  return Math.max(6, 15 - (level - 1));
}

//開始単語候補
const START_WORDS = [
  "しりとり", "いんたーねっと", "いんたーんしっぷ", "こうせんせい", "ぷろぐらむ",
  "ねこ", "たんい", "かだい", "げんご", "こんぱいら",
];

//小文字→大文字
const SMALL_TO_LARGE = {
  "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お",
  "っ": "つ", "ゃ": "や", "ゅ": "ゆ", "ょ": "よ", "ゎ": "わ",
};

function normalizeChar(char) {
  return SMALL_TO_LARGE[char] ?? char;
}

function lastCharOf(word) {
  //長音符
  let index = word.length - 1;
  while (index > 0 && word[index] === "ー") index--;
  return normalizeChar(word[index]);
}

function firstCharOf(word) {
  return normalizeChar(word[0]);
}

const shiritori = {
  previousWord: START_WORDS[0],
  usedWords: [START_WORDS[0]],
};

//開始単語ランダム
function resetShiritori() {
  shiritori.previousWord =
    START_WORDS[Math.floor(Math.random() * START_WORDS.length)];
  shiritori.usedWords = [shiritori.previousWord];
  return shiritori.previousWord;
}

//判定
function validateWord(nextWord, minLength) {
  //ひらがな
  if (!/^[ぁ-んー]+$/.test(nextWord)) {
    return { ok: false, errorMessage: "ひらがなのみ入力してください。" };
  }
  //最低文字数
  if (nextWord.length < minLength) {
    return {
      ok: false,
      errorMessage: `${minLength}文字以上の単語を入力してください。`,
    };
  }
  //繋がり判定
  if (lastCharOf(shiritori.previousWord) !== firstCharOf(nextWord)) {
    return {
      ok: false,
      errorMessage: `「${lastCharOf(shiritori.previousWord)}」から始まる単語を入力してください。`,
    };
  }
  //使用済み
  if (shiritori.usedWords.includes(nextWord)) {
    return { ok: false, errorMessage: "その単語はすでに使われています。" };
  }
  //ん
  if (nextWord.endsWith("ん")) {
    return { ok: false, errorMessage: "『ん』で終わる単語は使えません。" };
  }
  //成功
  shiritori.previousWord = nextWord;
  shiritori.usedWords.push(nextWord);
  return {
    ok: true,
    previousWord: nextWord,
    length: nextWord.length,
    nextChar: lastCharOf(nextWord),
  };
}

//変数たち
const ACHIEVEMENTS = [
  { id: "first_word", name: "はじめの一歩", desc: "最初の単語を成功させる" },
  { id: "combo5", name: "コンボ5", desc: "5コンボを達成する" },
  { id: "combo10", name: "コンボマスター", desc: "10コンボを達成する" },
  { id: "score100", name: "得点王", desc: "スコア100に到達する" },
  { id: "score500", name: "スコアハンター", desc: "スコア500に到達する" },
  { id: "level5", name: "言葉の達人", desc: "レベル5に到達する" },
  { id: "longword", name: "ロングワード", desc: "6文字以上の言葉を入力する" },
  { id: "flawless", name: "ノーミス", desc: "ミスなしでレベル3に到達する" },
];

//状態
const state = {
  phase: "idle",
  //idle | playing | countdown | gameover
  score: 0,
  combo: 0,
  maxCombo: 0,
  level: 1,
  lives: MAX_LIVES,
  wordsThisLevel: 0,
  totalWords: 0,
  lostLifeThisGame: false,
  timeLeft: 0,
  timeLimit: 0,
  timerId: null,
  countdownId: null,
  unlocked: loadAchievements(),
};

const el = {
  score: document.getElementById("scoreValue"),
  highScore: document.getElementById("highScoreValue"),
  level: document.getElementById("levelValue"),
  lives: document.getElementById("livesValue"),
  timerBar: document.getElementById("timerBar"),
  timerText: document.getElementById("timerText"),
  combo: document.getElementById("comboDisplay"),
  nextCharHint: document.getElementById("nextCharHint"),
  minLengthHint: document.getElementById("minLengthHint"),
  previousWord: document.getElementById("previousWord"),
  form: document.getElementById("wordForm"),
  input: document.getElementById("nextWordInput"),
  sendButton: document.getElementById("nextWordSendButton"),
  message: document.getElementById("message"),
  startButton: document.getElementById("startButton"),
  achievementsButton: document.getElementById("achievementsButton"),
  resetHighScoreButton: document.getElementById("resetHighScoreButton"),
  countdownOverlay: document.getElementById("countdownOverlay"),
  countdownNumber: document.getElementById("countdownNumber"),
  countdownReason: document.getElementById("countdownReason"),
  gameOverOverlay: document.getElementById("gameOverOverlay"),
  finalScore: document.getElementById("finalScore"),
  recordMessage: document.getElementById("recordMessage"),
  finalStats: document.getElementById("finalStats"),
  retryButton: document.getElementById("retryButton"),
  achievementsOverlay: document.getElementById("achievementsOverlay"),
  achievementList: document.getElementById("achievementList"),
  closeAchievementsButton: document.getElementById("closeAchievementsButton"),
};

function loadHighScore() {
  return Number(localStorage.getItem(HS_KEY) || 0);
}
function saveHighScore(value) {
  localStorage.setItem(HS_KEY, String(value));
}
function loadAchievements() {
  try {
    return JSON.parse(localStorage.getItem(ACH_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveAchievements(list) {
  localStorage.setItem(ACH_KEY, JSON.stringify(list));
}

//更新
function renderHud() {
  el.score.textContent = state.score;
  el.highScore.textContent = loadHighScore();
  el.level.textContent = state.level;
  el.lives.textContent =
    "♥ ".repeat(state.lives).trim() + " ♡".repeat(MAX_LIVES - state.lives);
  el.minLengthHint.textContent = getMinLength(state.level);
}

function renderNextChar(word) {
  let index = word.length - 1;
  while (index > 0 && word[index] === "ー") index--;
  el.nextCharHint.textContent = word[index];
}

function setPreviousWord(word) {
  el.previousWord.textContent = `前の単語: ${word}`;
  renderNextChar(word);
}

function showMessage(text, type) {
  el.message.textContent = text;
  el.message.className = "message" + (type ? ` message-${type}` : "");
}

function renderCombo() {
  if (state.combo >= 2) {
    el.combo.textContent = `${state.combo} コンボ!`;
    el.combo.classList.remove("combo-pop");
    void el.combo.offsetWidth;
    el.combo.classList.add("combo-pop", "combo-active");
  } else {
    el.combo.textContent = "";
    el.combo.classList.remove("combo-active");
  }
}

//時間
function startTimer() {
  stopTimer();
  state.timeLimit = getTimeLimit(state.level);
  state.timeLeft = state.timeLimit;
  updateTimerUI();
  state.timerId = setInterval(() => {
    state.timeLeft -= 0.1;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateTimerUI();
      stopTimer();
      handleMistake("時間切れ！");
      return;
    }
    updateTimerUI();
  }, 100);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerUI() {
  const ratio = Math.max(0, state.timeLeft / state.timeLimit);
  el.timerBar.style.width = `${ratio * 100}%`;
  el.timerText.textContent = Math.ceil(state.timeLeft) + "s";
  el.timerBar.classList.toggle("timer-danger", ratio <= 0.3);
}

function startGame() {
  const previousWord = resetShiritori();

  state.phase = "playing";
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.level = 1;
  state.lives = MAX_LIVES;
  state.wordsThisLevel = 0;
  state.totalWords = 0;
  state.lostLifeThisGame = false;

  hide(el.gameOverOverlay);
  hide(el.countdownOverlay);
  el.startButton.textContent = "ゲーム中...";
  el.startButton.disabled = true;
  enableInput(true);
  setPreviousWord(previousWord);
  renderHud();
  renderCombo();
  showMessage("スタート！言葉をつなげよう", "info");
  el.input.value = "";
  el.input.focus();
  startTimer();
}

function submitWord(event) {
  event.preventDefault();
  if (state.phase !== "playing") return;

  const nextWord = el.input.value.trim();
  if (!nextWord) return;

  const result = validateWord(nextWord, getMinLength(state.level));

  if (!result.ok) {
    handleMistake(result.errorMessage);
    return;
  }

  handleSuccess(nextWord, result);
}

function handleSuccess(word, data) {
  //スコア
  const base = word.length * 10;
  const comboBonus = state.combo * 5;
  const levelBonus = state.level * 2;
  const gained = base + comboBonus + levelBonus;

  state.score += gained;
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.wordsThisLevel += 1;
  state.totalWords += 1;

  setPreviousWord(data.previousWord);
  el.input.value = "";
  el.input.focus();
  renderHud();
  renderCombo();
  showMessage(`+${gained} ナイス！`, "success");

  Effects.floatingScore(`+${gained}`, el.input);
  Effects.burst(el.previousWord, state.combo >= 5 ? 24 : 12);

  checkAchievements(word);

  //レベル
  if (state.wordsThisLevel >= WORDS_PER_LEVEL) {
    levelUp();
  } else {
    startTimer();
  }
}

function levelUp() {
  state.level += 1;
  state.wordsThisLevel = 0;
  renderHud();
  showMessage(`レベル ${state.level}！最低${getMinLength(state.level)}文字に`, "info");
  Effects.levelUp(state.level);
  checkAchievements();
  startTimer();
}

function handleMistake(reason) {
  stopTimer();
  state.combo = 0;
  state.lives -= 1;
  state.lostLifeThisGame = true;
  renderHud();
  renderCombo();
  Effects.shake(document.querySelector(".app"));
  showMessage(reason, "error");

  if (state.lives <= 0) {
    gameOver();
  } else {
    startCountdown(reason);
  }
}

function startCountdown(reason) {
  state.phase = "countdown";
  enableInput(false);
  el.countdownReason.textContent = reason;
  let remaining = COUNTDOWN_SECONDS;
  el.countdownNumber.textContent = remaining;
  show(el.countdownOverlay);
  popCountdown();

  state.countdownId = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(state.countdownId);
      state.countdownId = null;
      hide(el.countdownOverlay);
      resumePlaying();
      return;
    }
    el.countdownNumber.textContent = remaining;
    popCountdown();
  }, 1000);
}

function popCountdown() {
  el.countdownNumber.classList.remove("count-pop");
  void el.countdownNumber.offsetWidth;
  el.countdownNumber.classList.add("count-pop");
}

function resumePlaying() {
  state.phase = "playing";
  enableInput(true);
  showMessage("再開！", "info");
  el.input.value = "";
  el.input.focus();
  startTimer();
}

function gameOver() {
  state.phase = "gameover";
  enableInput(false);
  el.startButton.textContent = "ゲーム開始";
  el.startButton.disabled = false;

  const prevHigh = loadHighScore();
  const isNewRecord = state.score > prevHigh;
  if (isNewRecord) saveHighScore(state.score);

  el.finalScore.textContent = state.score;
  el.recordMessage.textContent = isNewRecord
    ? "新記録達成！"
    : `ハイスコア: ${prevHigh}`;
  el.recordMessage.classList.toggle("new-record", isNewRecord);
  el.finalStats.textContent =
    `到達レベル ${state.level} ・ 最大コンボ ${state.maxCombo} ・ 単語数 ${state.totalWords}`;

  renderHud();
  show(el.gameOverOverlay);
  if (isNewRecord) Effects.levelUp("NEW RECORD");
}

//実績
function unlock(id) {
  if (state.unlocked.includes(id)) return;
  state.unlocked.push(id);
  saveAchievements(state.unlocked);
  const ach = ACHIEVEMENTS.find((a) => a.id === id);
  if (ach) Effects.toast(`実績解除: ${ach.name}`);
}

function checkAchievements(word) {
  if (state.totalWords >= 1) unlock("first_word");
  if (state.combo >= 5) unlock("combo5");
  if (state.combo >= 10) unlock("combo10");
  if (state.score >= 100) unlock("score100");
  if (state.score >= 500) unlock("score500");
  if (state.level >= 5) unlock("level5");
  if (word && word.length >= 6) unlock("longword");
  if (state.level >= 3 && !state.lostLifeThisGame) unlock("flawless");
}

function renderAchievementList() {
  el.achievementList.innerHTML = "";
  for (const ach of ACHIEVEMENTS) {
    const done = state.unlocked.includes(ach.id);
    const li = document.createElement("li");
    li.className = "achievement-item" + (done ? " unlocked" : " locked");
    li.innerHTML = `
      <span class="achievement-badge">${done ? "★" : "☆"}</span>
      <span class="achievement-text">
        <strong>${done ? ach.name : "？？？"}</strong>
        <small>${ach.desc}</small>
      </span>`;
    el.achievementList.appendChild(li);
  }
}

//リセット
function resetAllRecords() {
  const input = window.prompt("全記録をリセットします。パスワードを入力してください。");
  if (input === null) return;
  if (input !== ADMIN_PASSWORD) {
    showMessage("パスワードが違います。", "error");
    return;
  }
  localStorage.removeItem(HS_KEY);
  localStorage.removeItem(ACH_KEY);
  state.unlocked = [];
  renderHud();
  showMessage("全ての記録をリセットしました。", "info");
}

function enableInput(enabled) {
  el.input.disabled = !enabled;
  el.sendButton.disabled = !enabled;
}
function show(node) {
  node.hidden = false;
}
function hide(node) {
  node.hidden = true;
}

let isComposing = false;
el.input.addEventListener("compositionstart", () => {
  isComposing = true;
});
el.input.addEventListener("compositionend", () => {
  isComposing = false;
});
el.form.addEventListener("submit", (e) => {
  if (isComposing) {
    e.preventDefault();
    return;
  }
  submitWord(e);
});
el.startButton.addEventListener("click", startGame);
el.retryButton.addEventListener("click", startGame);
el.resetHighScoreButton.addEventListener("click", resetAllRecords);
el.achievementsButton.addEventListener("click", () => {
  renderAchievementList();
  show(el.achievementsOverlay);
});
el.closeAchievementsButton.addEventListener("click", () => {
  hide(el.achievementsOverlay);
});

function init() {
  renderHud();
  setPreviousWord(shiritori.previousWord);
  showMessage("「ゲーム開始」でスタート", "info");
}

init();