/**
 * IT 211 RAM • Main Application Controller
 */

let currentQuestionIndex = 0;
let filteredCards = [...FLASHCARDS];
let currentCardIndex = 0;
let isCardFlipped = false;

function switchTab(tabId) {
  let targetId = tabId;
  if (!document.getElementById(targetId) && document.getElementById(targetId + '-tab')) {
    targetId = targetId + '-tab';
  }
  const el = document.getElementById(targetId);
  if (!el) return;

  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));

  el.classList.add('active');
  const targetBtn = Array.from(document.querySelectorAll('.nav-tab-btn')).find(b => {
    const onclick = b.getAttribute('onclick') || '';
    return onclick.includes(targetId) || onclick.includes(tabId);
  });
  if (targetBtn) targetBtn.classList.add('active');

  if (targetId === 'dfd-tab') {
    setTimeout(() => {
      if (typeof updateCanvasViewBox === 'function') updateCanvasViewBox();
      if (typeof fitCanvasToElements === 'function') fitCanvasToElements();
    }, 60);
  }
}

function loadRandomQuestion() {
  currentQuestionIndex = Math.floor(Math.random() * QUESTION_BANK.length);
  const q = QUESTION_BANK[currentQuestionIndex];
  document.getElementById('q-category').innerText = q.category;
  document.getElementById('q-title').innerText = q.title;

  let fullDesc = q.desc;
  if (q.scenario) {
    fullDesc += `<br><br><strong style="color: var(--primary); display: flex; align-items: center; gap: 6px; margin-bottom: 4px;"><svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> Systems Analysis &amp; Business Task:</strong>${q.scenario}`;
  }
  document.getElementById('q-desc').innerHTML = fullDesc;

  document.getElementById('essay-text').value = "";
  updateWordCount();

  // Reset results
  document.getElementById('score-val').innerText = "--";
  document.getElementById('score-circle').className = "score-circle";
  document.getElementById('verdict-title').innerText = "Awaiting Submission";
  document.getElementById('verdict-subtitle').innerText = "Click 'Run Automated Exam Audit' to evaluate your essay.";
  document.getElementById('verdict-badge').innerText = "IDLE";
  document.getElementById('verdict-badge').className = "badge badge-blue";
  document.getElementById('metric-tokens').innerText = `0 / ${q.requiredKeywords.length}`;
  document.getElementById('metric-density').innerText = "0%";
  document.getElementById('metric-penalties').innerText = "0";
  document.getElementById('scan-status').innerText = "WAITING";
  document.getElementById('regex-log-output').innerHTML = `<span style="color: #64748b;">// Ready for scenario [${q.id}]. Awaiting student text...</span>`;
  document.getElementById('detailed-feedback').innerHTML = "Write your essay on the left and submit.";
  showToast(`Loaded: ${q.title}`, "info");
}

function updateWordCount() {
  const text = document.getElementById('essay-text').value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const chars = text.length;
  document.getElementById('word-count').innerText = words;
  document.getElementById('char-count').innerText = chars;
}

function loadExemplarAnswer() {
  const q = QUESTION_BANK[currentQuestionIndex];
  document.getElementById('essay-text').value = q.exemplar;
  updateWordCount();
  showToast("Loaded model 30/30 Systems Analyst answer!", "info");
}

function gradeEssay() {
  const text = document.getElementById('essay-text').value;
  const q = QUESTION_BANK[currentQuestionIndex];
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  if (words < 15) {
    showToast("Please write at least 15 words before running the audit.", "warning");
    return;
  }

  let matchedKeywords = [];
  let missingKeywords = [];
  let triggeredTraps = [];

  // Calculate keyword matches
  let earnedPoints = 0;
  let totalPossibleWeights = 0;

  q.requiredKeywords.forEach(kw => {
    totalPossibleWeights += kw.weight;
    if (kw.regex.test(text)) {
      earnedPoints += kw.weight;
      matchedKeywords.push(kw.term);
    } else {
      missingKeywords.push(kw.term);
    }
  });

  // Check for penalty traps
  let penaltyPoints = 0;
  q.traps.forEach(trap => {
    if (trap.regex.test(text)) {
      penaltyPoints += trap.penalty;
      triggeredTraps.push(trap);
    }
  });

  // Base score calculation normalized to 30
  let keywordRatio = earnedPoints / totalPossibleWeights;
  let baseScore = keywordRatio * 30;

  // Apply penalties
  let finalScore = Math.round(baseScore - penaltyPoints);
  if (finalScore < 0) finalScore = 0;
  if (finalScore > 30) finalScore = 30;

  // Word count brevity penalty if under 50 words
  if (words < 50 && finalScore > 12) {
    finalScore = 12;
  }

  // UI Updates
  document.getElementById('score-val').innerText = finalScore;
  document.getElementById('metric-tokens').innerText = `${matchedKeywords.length} / ${q.requiredKeywords.length}`;
  const densityPercent = Math.round((matchedKeywords.length / q.requiredKeywords.length) * 100);
  document.getElementById('metric-density').innerText = `${densityPercent}%`;
  document.getElementById('metric-penalties').innerText = `-${penaltyPoints} pts`;

  const circle = document.getElementById('score-circle');
  const badge = document.getElementById('verdict-badge');
  const vTitle = document.getElementById('verdict-title');
  const vSub = document.getElementById('verdict-subtitle');

  if (finalScore >= 24) {
    circle.className = "score-circle pass";
    badge.className = "badge badge-green";
    badge.innerText = "PASS (EXEMPLARY)";
    vTitle.innerText = "Systems Analyst Grade: A";
    vSub.innerText = "High token density. Canonical definitions and syntax constraints verified.";
  } else if (finalScore >= 16) {
    circle.className = "score-circle";
    circle.style.borderColor = "#f59e0b";
    circle.style.color = "#d97706";
    badge.className = "badge badge-amber";
    badge.innerText = "MARGINAL (C/D)";
    vTitle.innerText = "Marginal Token Density";
    vSub.innerText = "Missing several mandatory terms. Vulnerable to automated regex penalties.";
  } else {
    circle.className = "score-circle fail";
    badge.className = "badge badge-red";
    badge.innerText = "FAIL (DEDUCTIONS)";
    vTitle.innerText = "Critical Token Deficit";
    vSub.innerText = "Lacks canonical keywords or triggered critical automated deductions.";
  }

  // Console output
  document.getElementById('scan-status').innerText = "AUDIT COMPLETE";
  let consoleHtml = "";
  matchedKeywords.forEach(k => {
    consoleHtml += `<span class="matched-tag">[PASS] MATCHED_TOKEN: [${k}]</span>`;
  });
  missingKeywords.forEach(k => {
    consoleHtml += `<span class="missing-tag">[FAIL] MISSING_TOKEN: [${k}] (Regex lookup failed)</span>`;
  });
  triggeredTraps.forEach(t => {
    consoleHtml += `<span class="trap-tag">[WARN] PENALTY TRIGGERED: -${t.penalty}pts [${t.reason}]</span>`;
  });
  document.getElementById('regex-log-output').innerHTML = consoleHtml;

  // Detailed Diagnostic Feedback
  let feedbackHtml = `
    <p><strong>Total Words:</strong> ${words} words. <strong>Keyword Matches:</strong> ${matchedKeywords.length} / ${q.requiredKeywords.length}.</p>
    <div style="margin: 8px 0;">
      <span style="color: var(--success); font-weight: 700;">Tokens Detected:</span> ${matchedKeywords.join(", ") || "None"}.
    </div>
    <div style="margin: 8px 0;">
      <span style="color: var(--danger); font-weight: 700;">Tokens You Missed (Why points dropped):</span> ${missingKeywords.join(", ") || "None! Perfect."}.
    </div>
  `;

  if (triggeredTraps.length > 0) {
    feedbackHtml += `
      <div style="margin-top: 10px; background: #fee2e2; padding: 8px; border-radius: 6px; border-left: 3px solid #dc2626; color: #991b1b;">
        <strong>Fatal Misconceptions Detected:</strong><br>
        ${triggeredTraps.map(t => `• ${t.reason}`).join("<br>")}
      </div>
    `;
  }

  feedbackHtml += `
    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border);">
      <strong>Analyst Prescription:</strong> Click <em>"Load Model 30/30 Answer"</em> above to observe how every sentence avoids fluff and immediately satisfies the automated keyword dictionary.
    </div>
  `;

  document.getElementById('detailed-feedback').innerHTML = feedbackHtml;
}

/* ========================================================
   FLASHCARD LOGIC
   ======================================================== */
function filterCards(category) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (event && event.currentTarget) event.currentTarget.classList.add('active');

  if (category === 'all') {
    filteredCards = [...FLASHCARDS];
  } else {
    filteredCards = FLASHCARDS.filter(c => c.module === category);
  }

  currentCardIndex = 0;
  showCard();
}

function showCard() {
  isCardFlipped = false;
  document.getElementById('flashcard-element').classList.remove('is-flipped');

  const card = filteredCards[currentCardIndex];
  document.getElementById('fc-category').innerText = card.category;
  document.getElementById('fc-counter').innerText = `Card ${currentCardIndex + 1} / ${filteredCards.length}`;
  document.getElementById('fc-question').innerText = card.question;
  document.getElementById('fc-answer').innerHTML = card.answer;
}

function flipCard() {
  isCardFlipped = !isCardFlipped;
  document.getElementById('flashcard-element').classList.toggle('is-flipped');
}

function nextCard() {
  currentCardIndex = (currentCardIndex + 1) % filteredCards.length;
  showCard();
}

function prevCard() {
  currentCardIndex = (currentCardIndex - 1 + filteredCards.length) % filteredCards.length;
  showCard();
}

function randomCard() {
  currentCardIndex = Math.floor(Math.random() * filteredCards.length);
  showCard();
}

// Window load init
window.addEventListener('DOMContentLoaded', async () => {
  loadRandomQuestion();
  const hash = window.location.hash || '';
  if (hash.includes('preset=') || hash.includes('dfd=') || hash.includes('share=') || hash.includes('p=') || hash.includes('m=')) {
    switchTab('dfd-tab');
    if (typeof checkUrlHashForSharedDiagram === 'function') {
      await checkUrlHashForSharedDiagram();
    }
  } else {
    loadPerfectDfdPreset();
  }
  showCard();
});
