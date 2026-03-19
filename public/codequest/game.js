/* ═══════════════════════════════════════════
   CODEQUEST — game.js (multi-language edition)
═══════════════════════════════════════════ */

// ──────────────────────────────────────────
// STATE
// ──────────────────────────────────────────
let ALL_PUZZLES = [];
let gamePuzzles = [];
let currentIdx = 0;
let totalScore = 0;
let totalErrors = 0;
let perfectLevels = 0;
let hearts = 3;
let levelErrors = 0;
let filledBlanks = {};
let checked = false;
let selectedToken = null;
let currentLang = 'python';

// ──────────────────────────────────────────
// LANGUAGE CONFIG
// ──────────────────────────────────────────
const LANG_CONFIG = {
  python: {
    file: 'quest_python.json',
    label: 'Python',
    icon: '🐍',
    color: '#4facfe',
    accent: '#43e97b',
    desc: '100 задач по Python'
  },
  csharp: {
    file: 'quest_csharp.json',
    label: 'C#',
    icon: '💜',
    color: '#9b59b6',
    accent: '#c678dd',
    desc: '100 задач по C#'
  }
};

// ──────────────────────────────────────────
// LOAD PUZZLES FROM JSON
// ──────────────────────────────────────────
async function loadPuzzles(lang) {
  const cfg = LANG_CONFIG[lang];
  try {
    const response = await fetch(cfg.file + '?v=' + Date.now());
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const text = await response.text();
    ALL_PUZZLES = JSON.parse(text);
    if (!Array.isArray(ALL_PUZZLES) || ALL_PUZZLES.length === 0) {
      throw new Error('Empty or invalid JSON');
    }
    return true;
  } catch (e) {
    console.error('Failed to load puzzles:', e);
    ALL_PUZZLES = [];
    return false;
  }
}

// ──────────────────────────────────────────
// LOCAL STORAGE
// ──────────────────────────────────────────
function loadStats(lang) {
  return {
    bestScore: parseInt(localStorage.getItem(`cq_best_${lang}`) || '0'),
    gamesPlayed: parseInt(localStorage.getItem(`cq_games_${lang}`) || '0'),
  };
}
function saveStats(lang, score) {
  const s = loadStats(lang);
  if (score > s.bestScore) localStorage.setItem(`cq_best_${lang}`, score);
  localStorage.setItem(`cq_games_${lang}`, s.gamesPlayed + 1);
}

// ──────────────────────────────────────────
// SCREEN NAVIGATION
// ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goMenu() {
  updateMenuStats();
  showScreen('menuScreen');
}

function updateMenuStats() {
  const s = loadStats(currentLang);
  document.getElementById('menuBestScore').textContent = s.bestScore || '—';
  document.getElementById('menuGamesPlayed').textContent = s.gamesPlayed;
}

// ──────────────────────────────────────────
// LANGUAGE SELECTION
// ──────────────────────────────────────────
function selectLang(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  const cfg = LANG_CONFIG[lang];
  document.getElementById('logoSub').textContent = cfg.desc;
  document.getElementById('langIcon').textContent = cfg.icon;
  updateMenuStats();

  document.documentElement.style.setProperty('--lang-color', cfg.color);
  document.documentElement.style.setProperty('--lang-accent', cfg.accent);
}

// ──────────────────────────────────────────
// GAME START
// ──────────────────────────────────────────
async function startGame() {
  const btnInner = document.querySelector('.btn-play-inner');
  if (btnInner) {
    btnInner.innerHTML = '⏳ Загрузка...';
  }

  const ok = await loadPuzzles(currentLang);

  if (btnInner) {
    btnInner.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="6,3 20,12 6,21" fill="white"/></svg> Играть`;
  }

  if (!ok || ALL_PUZZLES.length === 0) {
    alert(
      'Не удалось загрузить задачи.\n\n' +
      'Убедитесь, что:\n' +
      '• Файл "' + LANG_CONFIG[currentLang].file + '" находится в той же папке\n' +
      '• Вы открываете игру через локальный сервер (не через file://)\n\n' +
      'Запустите: python -m http.server 8000\n' +
      'Затем откройте: http://localhost:8000'
    );
    return;
  }

  const pool = [...ALL_PUZZLES];
  gamePuzzles = [];
  for (let i = 0; i < 10 && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    gamePuzzles.push(pool.splice(idx, 1)[0]);
  }

  currentIdx = 0;
  totalScore = 0;
  totalErrors = 0;
  perfectLevels = 0;
  hearts = 3;

  showScreen('gameScreen');
  renderPuzzle();
}

// ──────────────────────────────────────────
// RENDER PUZZLE
// ──────────────────────────────────────────
function renderPuzzle() {
  filledBlanks = {};
  checked = false;
  selectedToken = null;
  levelErrors = 0;

  const p = gamePuzzles[currentIdx];
  const progress = (currentIdx / 10 * 100);

  document.getElementById('hdrProgressBar').style.width = progress + '%';
  document.getElementById('hdrProgressTxt').textContent = (currentIdx + 1) + ' / 10';
  document.getElementById('hdrScore').textContent = totalScore;
  updateHearts();

  const linesHtml = buildLines(p);
  const tokensHtml = buildTokens(p);

  document.getElementById('gameBody').innerHTML = `
    <div class="char-area">
      <svg class="char-svg" viewBox="0 0 80 80" fill="none">${charSVG()}</svg>
      <div class="bubble">${p.instruction}</div>
    </div>

    <div class="code-card">
      <div class="code-lang-bar">
        <div class="lang-dots"><span></span><span></span><span></span></div>
        <div class="lang-name">${p.language || currentLang}</div>
      </div>
      <div class="code-lines" id="codeLines">${linesHtml}</div>
    </div>

    <div class="tokens-section">
      <div class="tokens-label">Выбери нужные блоки 👇</div>
      <div class="tokens-grid" id="tokensGrid">${tokensHtml}</div>
    </div>

    <div class="result-banner" id="resultBanner">
      <div class="rb-icon" id="rbIcon"></div>
      <div>
        <div class="rb-text-main" id="rbMain"></div>
        <div class="rb-text-sub" id="rbSub"></div>
      </div>
    </div>

    <div class="action-row">
      <button class="btn-hint" onclick="skipLevel()" title="Пропустить">⏭</button>
      <button class="btn-check" id="btnCheck" onclick="checkAnswer()">Проверить ✓</button>
      <button class="btn-next" id="btnNext" onclick="nextLevel()">Дальше →</button>
    </div>
  `;

  setupInteractions(p);
}

function buildLines(p) {
  return p.lines.map((line, li) => {
    let content = '';
    if (line.static) {
      content = line.static;
    } else {
      content += line.prefix || '';
      if (line.blank !== undefined) {
        content += `<span class="blank" id="blank-${line.blank}" data-blank="${line.blank}"></span>`;
      }
      if (line.blank2 !== undefined) {
        content += line.suffix || '';
        content += `<span class="blank" id="blank-${line.blank2}" data-blank="${line.blank2}"></span>`;
        content += line.suffix2 || '';
      } else {
        content += line.suffix || '';
      }
    }
    const cls = line.editable ? 'code-line is-editable' : 'code-line';
    return `<div class="${cls}" data-line="${li}">
      <span class="line-num">${li+1}</span>
      <span class="line-arrow"></span>
      <span class="line-code">${content}</span>
    </div>`;
  }).join('');
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTokens(p) {
  const shuffled = shuffleArray(p.tokens);
  return shuffled.map(t => `
    <div class="token t-${t.type}" id="token-${t.id}" data-id="${t.id}" data-text="${encodeURIComponent(t.text)}">
      ${t.text}
    </div>
  `).join('');
}

// ──────────────────────────────────────────
// INTERACTIONS
// ──────────────────────────────────────────
function setupInteractions(p) {
  const grid = document.getElementById('tokensGrid');
  const lines = document.getElementById('codeLines');

  grid.querySelectorAll('.token').forEach(tok => {
    tok.addEventListener('click', () => onTokenClick(tok, p));
    setupTokenDrag(tok);
  });

  lines.querySelectorAll('.blank').forEach(blank => {
    blank.addEventListener('click', () => onBlankClick(blank, p));
    blank.addEventListener('dragover', e => { e.preventDefault(); blank.classList.add('drag-over'); });
    blank.addEventListener('dragleave', () => blank.classList.remove('drag-over'));
    blank.addEventListener('drop', e => { e.preventDefault(); blank.classList.remove('drag-over'); onDrop(blank, p); });
  });
}

let dragData = null;
function setupTokenDrag(tok) {
  tok.setAttribute('draggable', 'true');
  tok.addEventListener('dragstart', e => {
    dragData = { id: tok.dataset.id, text: decodeURIComponent(tok.dataset.text) };
    tok.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  tok.addEventListener('dragend', () => tok.classList.remove('dragging'));
}

function onDrop(blank, p) {
  if (!dragData || checked) return;
  fillBlank(parseInt(blank.dataset.blank), dragData.id, dragData.text);
  dragData = null;
}

function onTokenClick(tok, p) {
  if (checked || tok.classList.contains('used')) return;
  const id = tok.dataset.id;
  const text = decodeURIComponent(tok.dataset.text);

  const targeted = document.querySelector('.blank.selected-target');
  if (targeted) {
    targeted.classList.remove('selected-target');
    fillBlank(parseInt(targeted.dataset.blank), id, text);
    selectedToken = null;
    return;
  }

  if (selectedToken === id) {
    tok.classList.remove('selected');
    selectedToken = null;
    return;
  }
  document.querySelectorAll('.token.selected').forEach(t => t.classList.remove('selected'));
  tok.classList.add('selected');
  selectedToken = id;

  const blanks = document.querySelectorAll('.blank:not(.filled)');
  if (blanks.length > 0) {
    tok.classList.remove('selected');
    selectedToken = null;
    fillBlank(parseInt(blanks[0].dataset.blank), id, text);
  }
}

function onBlankClick(blank, p) {
  if (checked) return;
  const bi = parseInt(blank.dataset.blank);

  if (blank.classList.contains('filled')) {
    clearBlank(bi);
    return;
  }

  document.querySelectorAll('.blank.selected-target').forEach(b => b.classList.remove('selected-target'));
  if (selectedToken) {
    const tok = document.getElementById('token-' + selectedToken);
    const text = decodeURIComponent(tok.dataset.text);
    tok.classList.remove('selected');
    const prevSel = selectedToken;
    selectedToken = null;
    fillBlank(bi, prevSel, text);
  } else {
    blank.classList.add('selected-target');
  }
}

function fillBlank(bi, tokenId, text) {
  if (filledBlanks[bi]) clearBlank(bi);
  filledBlanks[bi] = { id: tokenId, text };
  const slot = document.getElementById('blank-' + bi);
  if (!slot) return;
  slot.classList.remove('selected-target');
  slot.classList.add('filled');
  slot.textContent = text;
  slot.style.minWidth = Math.max(48, text.length * 10 + 20) + 'px';
  const tok = document.getElementById('token-' + tokenId);
  if (tok) tok.classList.add('used');
}

function clearBlank(bi) {
  const prev = filledBlanks[bi];
  if (!prev) return;
  delete filledBlanks[bi];
  const slot = document.getElementById('blank-' + bi);
  if (slot) { slot.classList.remove('filled','correct','wrong'); slot.textContent = ''; }
  const tok = document.getElementById('token-' + prev.id);
  if (tok) tok.classList.remove('used');
}

// ──────────────────────────────────────────
// CHECK ANSWER
// ──────────────────────────────────────────
function checkAnswer() {
  const p = gamePuzzles[currentIdx];
  const allFilled = p.blanks.every((_, i) => filledBlanks[i] !== undefined);
  if (!allFilled) {
    const btn = document.getElementById('btnCheck');
    btn.classList.add('penalty-flash');
    setTimeout(() => btn.classList.remove('penalty-flash'), 500);
    return;
  }

  checked = true;
  let allCorrect = true;

  p.blanks.forEach((blank, i) => {
    const slot = document.getElementById('blank-' + i);
    if (!slot) return;
    const filled = filledBlanks[i];
    if (filled && filled.text === blank.answer) {
      slot.classList.remove('filled');
      slot.classList.add('correct');
    } else {
      slot.classList.remove('filled');
      slot.classList.add('wrong');
      allCorrect = false;
    }
  });

  const banner = document.getElementById('resultBanner');
  const btnCheck = document.getElementById('btnCheck');
  const btnNext = document.getElementById('btnNext');
  btnCheck.disabled = true;

  if (allCorrect) {
    if (levelErrors === 0) perfectLevels++;
    const levelScore = Math.max(0, 10 + hearts * 3 - levelErrors * 2);
    totalScore += levelScore;
    document.getElementById('hdrScore').textContent = totalScore;

    banner.className = 'result-banner success show';
    document.getElementById('rbIcon').textContent = levelErrors === 0 ? '🎉' : '✅';
    document.getElementById('rbMain').textContent = levelErrors === 0 ? 'Идеально!' : 'Верно!';
    document.getElementById('rbSub').textContent = `+${levelScore} очков` + (levelErrors > 0 ? ` (−${levelErrors*2} за ошибки)` : '');
    btnNext.classList.add('show');
    spawnConfetti(levelErrors === 0 ? 60 : 30);
  } else {
    levelErrors++;
    totalErrors++;
    hearts = Math.max(0, hearts - 1);
    updateHearts();

    banner.className = 'result-banner error show';
    document.getElementById('rbIcon').textContent = hearts === 0 ? '💀' : '💔';
    document.getElementById('rbMain').textContent = hearts === 0 ? 'Жизней нет...' : 'Не совсем верно';
    document.getElementById('rbSub').textContent = `Ошибка #${levelErrors} на этом уровне. Попробуй ещё!`;

    setTimeout(() => {
      if (hearts === 0) {
        showResultScreen();
        return;
      }
      banner.className = 'result-banner';
      checked = false;
      btnCheck.disabled = false;
      p.blanks.forEach((_, i) => {
        const slot = document.getElementById('blank-' + i);
        if (slot && slot.classList.contains('wrong')) clearBlank(i);
      });
    }, 1800);
  }
}

// ──────────────────────────────────────────
// NEXT / SKIP
// ──────────────────────────────────────────
function nextLevel() {
  currentIdx++;
  if (currentIdx >= 10) {
    showResultScreen();
  } else {
    renderPuzzle();
    document.getElementById('gameBody').scrollTop = 0;
  }
}

function skipLevel() {
  totalErrors += 2;
  nextLevel();
}

// ──────────────────────────────────────────
// RESULT SCREEN
// ──────────────────────────────────────────
function showResultScreen() {
  saveStats(currentLang, totalScore);

  document.getElementById('rScore').textContent = totalScore;
  document.getElementById('rErrors').textContent = totalErrors;
  document.getElementById('rPerfect').textContent = perfectLevels + '/10';

  const cfg = LANG_CONFIG[currentLang];
  document.getElementById('resultLangBadge').textContent = cfg.icon + ' ' + cfg.label;

  const rankEl = document.getElementById('resultRank');
  let rank, rankCls, emoji;
  if (totalScore >= 120) { rank = 'Ранг S — Мастер кода!'; rankCls = 'rank-s'; emoji = '🏆'; }
  else if (totalScore >= 90) { rank = 'Ранг A — Отлично!'; rankCls = 'rank-a'; emoji = '🥇'; }
  else if (totalScore >= 60) { rank = 'Ранг B — Хорошая работа!'; rankCls = 'rank-b'; emoji = '🥈'; }
  else { rank = 'Ранг C — Продолжай практиковаться!'; rankCls = 'rank-c'; emoji = '🎖'; }

  rankEl.className = 'result-rank ' + rankCls;
  rankEl.textContent = rank;

  document.getElementById('resultTrophy').textContent = emoji;
  document.getElementById('resultTitle').textContent = 'Игра завершена!';
  document.getElementById('resultSub').textContent = `${cfg.icon} ${cfg.label} — все 10 уровней!`;

  showScreen('resultScreen');
  spawnConfetti(totalErrors < 3 ? 80 : 40);
}

// ──────────────────────────────────────────
// CLAIM REWARD
// ──────────────────────────────────────────
function claimReward() {
  const payload = `codeQuest_${currentLang}_${totalScore}_${perfectLevels}_${totalErrors}`;

  const url = `https://t.me/FernieXBot?start=${payload}`;
  window.open(url, '_blank');

  saveStats(currentLang, totalScore);
  goMenu();
}

// ──────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────
function updateHearts() {
  const el = document.getElementById('heartsRow');
  if (!el) return;
  el.innerHTML = [0,1,2].map(i => `<span>${i < hearts ? '❤️' : '🖤'}</span>`).join('');
}

function spawnConfetti(count = 50) {
  const colors = ['#6c63ff','#ff6584','#43e97b','#f7971e','#74b9ff','#fd79a8','#ffeaa7'];
  const c = document.getElementById('confettiContainer');
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'cp';
    el.style.cssText = `
      left:${Math.random()*100}vw;
      width:${Math.random()*9+5}px;
      height:${Math.random()*9+5}px;
      border-radius:${Math.random()>.5?'50%':'3px'};
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${Math.random()*2+1.5}s;
      animation-delay:${Math.random()*0.6}s;
    `;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

function charSVG() {
  return `
    <ellipse cx="40" cy="60" rx="22" ry="15" fill="#6c63ff" opacity="0.85"/>
    <circle cx="40" cy="30" r="18" fill="#ffeaa7"/>
    <ellipse cx="33" cy="28" rx="3" ry="4" fill="#2d3436"/>
    <ellipse cx="47" cy="28" rx="3" ry="4" fill="#2d3436"/>
    <circle cx="34.5" cy="26.5" r="1.2" fill="white"/>
    <circle cx="48.5" cy="26.5" r="1.2" fill="white"/>
    <path d="M33 36 Q40 42 47 36" stroke="#2d3436" stroke-width="2" stroke-linecap="round" fill="none"/>
    <circle cx="22" cy="29" r="5" fill="#6c63ff"/>
    <circle cx="58" cy="29" r="5" fill="#6c63ff"/>
    <rect x="16" y="63" width="48" height="12" rx="3" fill="#1e2235"/>
    <rect x="18" y="64" width="44" height="8" rx="2" fill="#0d0f1a"/>
    <rect x="21" y="66" width="16" height="1.5" rx="1" fill="#6c63ff" opacity="0.9"/>
    <rect x="21" y="69" width="10" height="1.5" rx="1" fill="#43e97b" opacity="0.9"/>
    <rect x="33" y="69" width="8" height="1.5" rx="1" fill="#ff6584" opacity="0.9"/>
  `;
}

// ──────────────────────────────────────────
// INIT
// ──────────────────────────────────────────
selectLang('python');

