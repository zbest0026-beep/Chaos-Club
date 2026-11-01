// WEB AUDIO SYNTHESIZER FOR SOUND EFFECTS
const AudioEngine = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playClick() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  },
  playWrong() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  },
  playWin() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.16); // G5
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
};

// STATE & PROGRESS MANAGEMENT
const STATE = {
  totalPoints: 0,
  gamesPlayed: 0,
  personalBest: 0,
  bests: { panic: 0, impostor: 0, quiz: 0 },
  dailyClaimed: false,
  achievements: {}
};

const ACHIEVEMENTS_DEF = [
  { id: 'masher', name: 'Professional Button Masher', desc: 'Score 30+ pts in Button Panic' },
  { id: 'disappointment', name: 'Certified Disappointment', desc: 'Finish a game with negative points' },
  { id: 'braincell', name: 'One Braincell Remaining', desc: 'Get 50+ pts in Braincell.exe' },
  { id: 'hawk_eye', name: 'Suspiciously Intelligent', desc: 'Score 40+ pts in Spot the Impostor' },
  { id: 'enthusiast', name: 'Chaos Enthusiast', desc: 'Play at least 10 mini-games' }
];

const MICROCOPYS = [
  '"Your brain has approximately three working cells."',
  '"Impressive. Not in a good way."',
  '"The leaderboard doesn\'t judge. We do."',
  '"Did you mean to click that, or was it a spasm?"',
  '"Congratulations on achieving absolute minimum efficiency."'
];

function loadState() {
  const saved = localStorage.getItem('CHAOS_CLUB_PWA_STATE');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(STATE, parsed);
    } catch(e) {}
  }
  updateUI();
}

function saveState() {
  localStorage.setItem('CHAOS_CLUB_PWA_STATE', JSON.stringify(STATE));
  updateUI();
}

function updateUI() {
  document.getElementById('nav-total-pts').textContent = STATE.totalPoints;
  document.getElementById('dash-total-pts').textContent = STATE.totalPoints;
  document.getElementById('dash-games-played').textContent = STATE.gamesPlayed;
  document.getElementById('dash-personal-best').textContent = STATE.personalBest;
  
  document.getElementById('best-panic').textContent = STATE.bests.panic || 0;
  document.getElementById('best-impostor').textContent = STATE.bests.impostor || 0;
  document.getElementById('best-quiz').textContent = STATE.bests.quiz || 0;

  // Daily Challenge state
  const dailyBtn = document.getElementById('claim-daily-btn');
  const dailyProg = document.getElementById('daily-progress');
  const panicBest = STATE.bests.panic || 0;
  const progressPercent = Math.min(100, Math.max(0, (panicBest / 50) * 100));
  dailyProg.style.width = `${progressPercent}%`;
  
  if (STATE.dailyClaimed) {
    dailyBtn.disabled = true;
    dailyBtn.textContent = 'CLAIMED';
  } else if (panicBest >= 50) {
    dailyBtn.disabled = false;
    dailyBtn.textContent = 'CLAIM +100';
  } else {
    dailyBtn.disabled = true;
    dailyBtn.textContent = 'LOCKED';
  }

  // Render Achievements
  const container = document.getElementById('achievements-container');
  container.innerHTML = '';
  ACHIEVEMENTS_DEF.forEach(ach => {
    const isUnlocked = !!STATE.achievements[ach.id];
    const card = document.createElement('div');
    card.className = `achieve-card ${isUnlocked ? 'unlocked' : ''}`;
    card.innerHTML = `
      <div class="achieve-name">${isUnlocked ? '🏆 ' : '🔒 '}${ach.name}</div>
      <div class="achieve-desc">${ach.desc}</div>
    `;
    container.appendChild(card);
  });
}

function checkAchievements(gameId, score) {
  if (gameId === 'panic' && score >= 30) unlockAch('masher');
  if (score < 0) unlockAch('disappointment');
  if (gameId === 'quiz' && score >= 50) unlockAch('braincell');
  if (gameId === 'impostor' && score >= 40) unlockAch('hawk_eye');
  if (STATE.gamesPlayed >= 10) unlockAch('enthusiast');
}

function unlockAch(id) {
  if (!STATE.achievements[id]) {
    STATE.achievements[id] = true;
    AudioEngine.playWin();
    saveState();
  }
}

function claimDailyReward() {
  if (!STATE.dailyClaimed && (STATE.bests.panic || 0) >= 50) {
    STATE.dailyClaimed = true;
    STATE.totalPoints += 100;
    AudioEngine.playWin();
    saveState();
  }
}

// NAVIGATION ENGINE
function showScreen(screenId) {
  stopCurrentGame();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');
  
  // Randomize hero microcopy
  if (screenId === 'dashboard') {
    const mc = MICROCOPYS[Math.floor(Math.random() * MICROCOPYS.length)];
    document.getElementById('hero-microcopy').textContent = mc;
  }
}

let activeGameRunner = null;
function stopCurrentGame() {
  if (activeGameRunner && activeGameRunner.cleanup) {
    activeGameRunner.cleanup();
  }
  activeGameRunner = null;
}

// GAME 1: BUTTON PANIC LOGIC
const BUTTON_PANIC = {
  score: 0,
  durationMs: 20000,
  endTime: 0,
  timerInterval: null,
  currentTask: null,
  doNothingEvaluated: false,

  start() {
    this.score = 0;
    this.endTime = Date.now() + this.durationMs;
    document.getElementById('panic-score').textContent = '0';
    showScreen('game-panic');
    this.nextTask();

    this.timerInterval = setInterval(() => {
      const remaining = Math.max(0, this.endTime - Date.now());
      document.getElementById('panic-timer').textContent = (remaining / 1000).toFixed(1);
      
      // Do nothing check evaluation
      if (this.currentTask && this.currentTask.type === 'nothing' && !this.doNothingEvaluated) {
        if (Date.now() >= this.currentTask.evalAt) {
          this.score += 5;
          document.getElementById('panic-score').textContent = this.score;
          this.doNothingEvaluated = true;
          AudioEngine.playWin();
          this.nextTask();
        }
      }

      if (remaining <= 0) {
        this.end();
      }
    }, 50);

    activeGameRunner = this;
  },

  nextTask() {
    this.doNothingEvaluated = false;
    const colors = ['red', 'blue', 'green', 'yellow'];
    const r = Math.random();
    
    if (r < 0.35) {
      const target = colors[Math.floor(Math.random() * colors.length)];
      this.currentTask = { type: 'press', target };
      document.getElementById('panic-instruction').textContent = `PRESS ${target.toUpperCase()}!`;
      document.getElementById('panic-instruction').style.borderColor = 'var(--accent)';
    } else if (r < 0.70) {
      const avoid = colors[Math.floor(Math.random() * colors.length)];
      this.currentTask = { type: 'avoid', avoid };
      document.getElementById('panic-instruction').textContent = `DONT PRESS ${avoid.toUpperCase()}!`;
      document.getElementById('panic-instruction').style.borderColor = '#E9C46A';
    } else {
      this.currentTask = { type: 'nothing', evalAt: Date.now() + 1800 };
      document.getElementById('panic-instruction').textContent = `DO ABSOLUTELY NOTHING!`;
      document.getElementById('panic-instruction').style.borderColor = '#2A9D8F';
    }
  },

  handlePress(color) {
    if (!this.currentTask) return;
    
    if (this.currentTask.type === 'press') {
      if (color === this.currentTask.target) {
        this.score += 5;
        AudioEngine.playClick();
      } else {
        this.score -= 5;
        AudioEngine.playWrong();
      }
      this.nextTask();
    } else if (this.currentTask.type === 'avoid') {
      if (color !== this.currentTask.avoid) {
        this.score += 5;
        AudioEngine.playClick();
      } else {
        this.score -= 5;
        AudioEngine.playWrong();
      }
      this.nextTask();
    } else if (this.currentTask.type === 'nothing') {
      this.score -= 5;
      AudioEngine.playWrong();
      this.nextTask();
    }
    document.getElementById('panic-score').textContent = this.score;
  },

  cleanup() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  },

  end() {
    this.cleanup();
    finishGame('panic', this.score);
  }
};

function handlePanicBtn(color) {
  BUTTON_PANIC.handlePress(color);
}

// GAME 2: SPOT THE IMPOSTOR LOGIC
const SPOT_IMPOSTOR = {
  score: 0,
  durationMs: 30000,
  endTime: 0,
  timerInterval: null,
  targetIndex: -1,

  start() {
    this.score = 0;
    this.endTime = Date.now() + this.durationMs;
    document.getElementById('impostor-score').textContent = '0';
    showScreen('game-impostor');
    this.nextRound();

    this.timerInterval = setInterval(() => {
      const remaining = Math.max(0, this.endTime - Date.now());
      document.getElementById('impostor-timer').textContent = (remaining / 1000).toFixed(1);
      if (remaining <= 0) this.end();
    }, 50);

    activeGameRunner = this;
  },

  nextRound() {
    const symbolPairs = [
      { main: '💀', imp: '☠️' },
      { main: '🔥', imp: '💥' },
      { main: '⚡', imp: '🌩️' },
      { main: '👁️', imp: '🧿' },
      { main: '🎲', imp: '🎯' },
      { main: '🤡', imp: '🎭' }
    ];
    const pair = symbolPairs[Math.floor(Math.random() * symbolPairs.length)];
    this.targetIndex = Math.floor(Math.random() * 9);

    const grid = document.getElementById('impostor-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'impostor-cell';
      cell.textContent = i === this.targetIndex ? pair.imp : pair.main;
      cell.onclick = () => this.handlePick(i);
      grid.appendChild(cell);
    }
  },

  handlePick(idx) {
    if (idx === this.targetIndex) {
      this.score += 5;
      AudioEngine.playClick();
    } else {
      this.score -= 5;
      AudioEngine.playWrong();
    }
    document.getElementById('impostor-score').textContent = this.score;
    this.nextRound();
  },

  cleanup() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  },

  end() {
    this.cleanup();
    finishGame('impostor', this.score);
  }
};

// GAME 3: BRAINCELL.EXE LOGIC
const BRAINCELL_QUIZ = {
  score: 0,
  qIndex: 0,
  questions: [],
  
  bank: [
    { q: "What color is red when it's dark?", opts: ["Dark Red", "Black", "Still Red", "Invisible"], ans: 1 },
    { q: "Evaluate logic: true && !false || false", opts: ["true", "false", "undefined", "NaN"], ans: 0 },
    { q: "If 2 + 2 = 4, what is 3 + 3?", opts: ["5", "6", "9", "Chaos"], ans: 1 },
    { q: "Which icon is a lightning bolt?", opts: ["⚡", "🔥", "💀", "👁️"], ans: 0 },
    { q: "Next number in sequence: 2, 4, 8, 16, __", opts: ["20", "24", "32", "64"], ans: 2 },
    { q: "How many brain cells do you currently have active?", opts: ["3", "1", "0", "-5"], ans: 0 },
    { q: "What happens if you click the wrong answer?", opts: ["You lose points", "You win", "Nothing", "App crashes"], ans: 0 },
    { q: "Which symbol means NOT equal in JS?", opts: ["=", "==", "!=", "=>"], ans: 2 },
    { q: "What is 15 % 4?", opts: ["3", "1", "2", "0"], ans: 0 },
    { q: "Are you enjoying this pointless torture?", opts: ["Yes", "No", "Maybe", "Send help"], ans: 0 }
  ],

  start() {
    this.score = 0;
    this.qIndex = 0;
    this.questions = [...this.bank].sort(() => Math.random() - 0.5).slice(0, 10);
    document.getElementById('quiz-score').textContent = '0';
    showScreen('game-quiz');
    this.renderQ();

    activeGameRunner = this;
  },

  renderQ() {
    if (this.qIndex >= this.questions.length) {
      this.end();
      return;
    }
    const q = this.questions[this.qIndex];
    document.getElementById('quiz-progress-text').textContent = `${this.qIndex + 1} / 10`;
    document.getElementById('quiz-question').textContent = q.q;

    const optContainer = document.getElementById('quiz-options');
    optContainer.innerHTML = '';
    q.opts.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
      btn.onclick = () => this.handleAns(idx, btn);
      optContainer.appendChild(btn);
    });
  },

  handleAns(idx, btnEl) {
    const q = this.questions[this.qIndex];
    const allBtns = document.querySelectorAll('.quiz-opt-btn');
    allBtns.forEach(b => b.disabled = true);

    if (idx === q.ans) {
      this.score += 5;
      btnEl.classList.add('correct');
      AudioEngine.playClick();
    } else {
      btnEl.classList.add('wrong');
      allBtns[q.ans].classList.add('correct');
      AudioEngine.playWrong();
    }

    document.getElementById('quiz-score').textContent = this.score;

    setTimeout(() => {
      this.qIndex++;
      this.renderQ();
    }, 800);
  },

  cleanup() {},

  end() {
    finishGame('quiz', this.score);
  }
};

// GLOBAL GAME ENTRY & FINISH
function startGame(gameId) {
  if (gameId === 'panic') BUTTON_PANIC.start();
  if (gameId === 'impostor') SPOT_IMPOSTOR.start();
  if (gameId === 'quiz') BRAINCELL_QUIZ.start();
}

function finishGame(gameId, score) {
  STATE.gamesPlayed++;
  STATE.totalPoints += score;
  if (score > (STATE.bests[gameId] || 0)) STATE.bests[gameId] = score;
  if (score > STATE.personalBest) STATE.personalBest = score;

  checkAchievements(gameId, score);
  saveState();

  // Show Modal
  const modal = document.getElementById('score-overlay');
  document.getElementById('modal-final-score').textContent = `${score} PTS`;
  
  const comments = MICROCOPYS;
  document.getElementById('modal-comment').textContent = comments[Math.floor(Math.random() * comments.length)];
  
  document.getElementById('modal-retry-btn').onclick = () => {
    modal.classList.add('hidden');
    startGame(gameId);
  };

  modal.classList.remove('hidden');
}

// PWA REGISTRATION
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.classList.remove('hidden');
    installBtn.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        installBtn.classList.add('hidden');
      });
    });
  }
});

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  loadState();
});
