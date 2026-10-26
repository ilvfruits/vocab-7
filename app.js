// ============================================================================
// app.js — Grade 7 Vocabulary Quiz
// Handles: loading questions, filtering, rendering, grading, option shuffling,
// progress tracking integration, and weak-word practice mode.
// ============================================================================

// ---------- State ----------
let bank = { units: [], questions: [] };
let currentQuiz = [];
let startTime = 0;

// ---------- Elements ----------
const startScreen  = document.getElementById("start-screen");
const quizScreen   = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const unitSelect = document.getElementById("unit-select");
const typeSelect = document.getElementById("type-select");   // may be null
const numSelect  = document.getElementById("num-select");

const startBtn  = document.getElementById("start-btn");
const quizForm  = document.getElementById("quiz-form");
const submitBtn = document.getElementById("submit-btn");

const resultsList  = document.getElementById("results-list");
const scoreHeading = document.getElementById("score-heading");
const progressInfo = document.getElementById("progress-info");
const bankInfo     = document.getElementById("bank-info");
const restartBtn   = document.getElementById("restart-btn");

const homeQuizBtn   = document.getElementById("home-btn-quiz");
const homeResultBtn = document.getElementById("home-btn-result");
const weakBtn       = document.getElementById("weak-words-btn");

const errorBox = document.getElementById("error-box");

// ============================================================================
// Helpers
// ============================================================================

function show(section) {
  [startScreen, quizScreen, resultScreen].forEach(s => (s.hidden = true));
  section.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Return a NEW question object with options shuffled and the answer index
 * remapped so grading still works.
 *
 * Special cases:
 *  - true_false: keep options in their original order (True, False) so they
 *    read naturally. Nothing is gained by randomizing two fixed options.
 *  - fill_blank: sort options alphabetically so students can scan the word
 *    bank quickly. The correct index is remapped to match.
 */
function shuffleOptions(q) {
  if (q.type === "true_false") return q;

  if (q.type === "fill_blank") {
    const tagged = q.options.map((text, i) => ({ text, isCorrect: i === q.answer }));
    tagged.sort((a, b) => a.text.localeCompare(b.text));
    return {
      ...q,
      options: tagged.map(o => o.text),
      answer: tagged.findIndex(o => o.isCorrect),
    };
  }

  // multiple_choice (or unknown): fully random
  const tagged = q.options.map((text, i) => ({ text, isCorrect: i === q.answer }));
  const shuffled = shuffle(tagged);
  return {
    ...q,
    options: shuffled.map(o => o.text),
    answer: shuffled.findIndex(o => o.isCorrect),
  };
}

function shuffleQuizOptions(questions) {
  return questions.map(shuffleOptions);
}

function goHome() {
  quizForm.innerHTML = "";
  resultsList.innerHTML = "";
  progressInfo.textContent = "";
  scoreHeading.textContent = "Results";
  clearError();
  show(startScreen);
}

// ============================================================================
// Load question bank
// ============================================================================

async function loadBank() {
  try {
    // Cache-buster ensures updated questions.json is picked up on reload
    const res = await fetch("questions.json?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    bank = await res.json();

    if (!Array.isArray(bank.questions) || bank.questions.length === 0) {
      throw new Error("questions.json contains no questions.");
    }

    // Build unit dropdown from "units" array plus any unit found in questions
    const unitSet = new Set(bank.units || []);
    bank.questions.forEach(q => q.unit && unitSet.add(q.unit));

    unitSelect.innerHTML = `<option value="all">All units</option>`;
    [...unitSet].forEach(u => {
      const opt = document.createElement("option");
      opt.value = u;
      opt.textContent = u;
      unitSelect.appendChild(opt);
    });

    // Show type breakdown in the subtitle (sanity check for JSON edits)
    const counts = { multiple_choice: 0, fill_blank: 0, true_false: 0, other: 0 };
    bank.questions.forEach(q => {
      if (counts[q.type] !== undefined) counts[q.type]++;
      else counts.other++;
    });

    bankInfo.textContent =
      `${bank.questions.length} questions loaded ` +
      `(MC: ${counts.multiple_choice}, Fill: ${counts.fill_blank}, T/F: ${counts.true_false})`;

    startBtn.disabled = false;
  } catch (err) {
    bankInfo.textContent = "Could not load questions.";
    showError("Failed to load questions.json — " + err.message);
    startBtn.disabled = true;
    console.error("[loadBank]", err);
  }
}

// ============================================================================
// Start quiz
// ============================================================================

function startQuiz() {
  clearError();

  const unit = unitSelect.value;
  const type = typeSelect ? typeSelect.value : "all";
  const num  = parseInt(numSelect.value, 10) || 10;

  let pool = bank.questions;
  if (unit !== "all") pool = pool.filter(q => q.unit === unit);
  if (type !== "all") pool = pool.filter(q => q.type === type);

  console.log(`[startQuiz] unit=${unit} type=${type} pool=${pool.length}`);

  if (pool.length === 0) {
    showError(
      `No questions match these filters (unit: ${unit}, type: ${type}). ` +
      `Try "All units" or "All types".`
    );
    return;
  }

  // Select questions randomly, then shuffle each question's option order.
  currentQuiz = shuffleQuizOptions(shuffle(pool).slice(0, num));
  startTime = Date.now();
  renderQuiz();
  show(quizScreen);
}

// ============================================================================
// Render quiz
// ============================================================================

function renderQuiz() {
  progressInfo.textContent =
    `${currentQuiz.length} question${currentQuiz.length === 1 ? "" : "s"}`;
  quizForm.innerHTML = "";

  currentQuiz.forEach((q, i) => {
    const card = document.createElement("div");
    card.className = "card question";

    const qnum = document.createElement("p");
    qnum.className = "qnum";
    const typeLabel =
      q.type === "fill_blank"  ? "Fill in the blank" :
      q.type === "true_false"  ? "True / False" :
                                 "Multiple choice";
    qnum.textContent = `Question ${i + 1} · ${q.unit || ""} · ${typeLabel}`;
    card.appendChild(qnum);

    const qtext = document.createElement("p");
    qtext.className = "qtext";
    qtext.textContent = q.question;
    card.appendChild(qtext);

    q.options.forEach((opt, idx) => {
      const label = document.createElement("label");
      label.className = "option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "q" + q.id;
      input.value = String(idx);
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + opt));
      card.appendChild(label);
    });

    quizForm.appendChild(card);
  });
}

// ============================================================================
// Grade
// ============================================================================

function gradeQuiz() {
  let score = 0;
  const results = [];

  currentQuiz.forEach(q => {
    const picked = quizForm.querySelector(`input[name="q${q.id}"]:checked`);
    const userChoice = picked ? parseInt(picked.value, 10) : null;
    const correct = userChoice !== null && userChoice === q.answer;
    if (correct) score++;
    results.push({ q, userChoice, correct });
  });

  // Record for progress tracking (safe if progress.js isn't loaded)
  if (window.Progress) {
    try {
      window.Progress.recordAttempt({
        unit: unitSelect.value,
        type: typeSelect ? typeSelect.value : "all",
        score,
        total: results.length,
        durationMs: Date.now() - startTime,
        results,
      });
    } catch (err) {
      console.warn("[gradeQuiz] Progress recording failed:", err);
    }
  }

  renderResults(score, results);
  show(resultScreen);
}

// ============================================================================
// Render results
// ============================================================================

function renderResults(score, results) {
  scoreHeading.textContent = `Your Score: ${score} / ${results.length}`;
  resultsList.innerHTML = "";

  results.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "card question " + (r.correct ? "correct" : "wrong");

    const qtext = document.createElement("p");
    qtext.className = "qtext";
    qtext.textContent = `${i + 1}. ${r.q.question}`;
    card.appendChild(qtext);

    const yourP = document.createElement("p");
    yourP.innerHTML =
      "Your answer: " +
      (r.userChoice !== null
        ? "<strong>" + r.q.options[r.userChoice] + "</strong>"
        : "<em>No answer</em>");
    card.appendChild(yourP);

    if (!r.correct) {
      const correctP = document.createElement("p");
      correctP.innerHTML =
        "Correct answer: <strong>" + r.q.options[r.q.answer] + "</strong>";
      card.appendChild(correctP);
    }

    if (r.q.explanation) {
      const exp = document.createElement("p");
      exp.className = "explanation";
      exp.textContent = "💡 " + r.q.explanation;
      card.appendChild(exp);
    }

    resultsList.appendChild(card);
  });
}

// ============================================================================
// Practice weak words
// ============================================================================

function startWeakWordsQuiz() {
  clearError();

  if (!window.Progress) {
    showError("Progress tracking isn't available on this page.");
    return;
  }

  let weakWords;
  try {
    weakWords = window.Progress.getStats().weakest.map(w => w.word);
  } catch (err) {
    showError("Could not read weak words: " + err.message);
    return;
  }

  if (!weakWords || weakWords.length === 0) {
    showError(
      "No weak words yet — take a few quizzes first. " +
      "A word needs at least 2 attempts with accuracy below 70% to appear here."
    );
    return;
  }

  // Match questions whose correct answer is one of the weak words
  const pool = bank.questions.filter(q => {
    const ans = String(q.options[q.answer] || "").toLowerCase().trim();
    return weakWords.includes(ans);
  });

  if (pool.length === 0) {
    showError(
      "Could not match weak words to questions. " +
      "This can happen if the question bank changed since your last attempt."
    );
    return;
  }

  currentQuiz = shuffleQuizOptions(shuffle(pool).slice(0, 10));
  startTime = Date.now();
  renderQuiz();
  show(quizScreen);
}

// ============================================================================
// Wiring
// ============================================================================

startBtn.addEventListener("click", startQuiz);
submitBtn.addEventListener("click", gradeQuiz);
restartBtn.addEventListener("click", goHome);

if (homeQuizBtn)   homeQuizBtn.addEventListener("click", goHome);
if (homeResultBtn) homeResultBtn.addEventListener("click", goHome);
if (weakBtn)       weakBtn.addEventListener("click", startWeakWordsQuiz);

startBtn.disabled = true;
loadBank();