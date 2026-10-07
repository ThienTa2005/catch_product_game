/**
 * ============================================================
 * 🎮 HỨNG SẢN PHẨM ARCADE • POP & COLORFUL ARCADE EDITION
 * Client-Side AI Hand Tracking with Google MediaPipe Tasks Vision
 * 100% Zero-Latency In-Browser Canvas 2D Game Loop
 * ============================================================
 */

import {
  FilesetResolver,
  FaceLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// --- GAME CONSTANTS & DEFAULT PRODUCTS ---
const W = 960;
const H = 540;

const DEFAULT_PRODUCT_URLS = [
  "assets/products/bubble_tea.png",
  "assets/products/gem_diamond.png",
  "assets/products/gift_box.png",
  "assets/products/glazed_donut.png",
  "assets/products/soda_can.png",
  "assets/products/star_coin.png"
];

const DEFAULT_SETTINGS = {
  gain: 1,
  loss: 1,
  speed: 180,
  interval: 1.2,
  size: 68,
  duration: 60,
  voucherPts: 15
};

// ================= AUDIO MANAGER =================
class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('arcade_sound_enabled') !== 'false';
    this.audioContext = null;
    this.cache = {};

    const soundNames = ['catch', 'combo', 'countdown', 'fever', 'gameover', 'miss', 'voucher'];
    soundNames.forEach(name => {
      const audio = new Audio(`assets/sounds/${name}.wav`);
      audio.preload = 'auto';
      if (name === 'catch') audio.volume = 1.0; // scoring sound max volume
      this.cache[name] = audio;
    });

    this.bgmAudio = new Audio('assets/sounds/bgm.wav');
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.28; // moderate, balanced BGM volume
    this.bgmPlaying = false;
    this.bgmPaused = false;
  }

  initContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioContext = new AudioCtx();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('arcade_sound_enabled', this.enabled);
    if (!this.enabled) {
      this.pauseBgm();
    } else {
      if (this.bgmPlaying) {
        this.resumeBgm();
      }
      this.play('catch');
    }
    return this.enabled;
  }

  playBgm() {
    if (!this.enabled) return;
    this.initContext();
    this.bgmPlaying = true;
    this.bgmPaused = false;
    try {
      this.bgmAudio.currentTime = 0;
      const prom = this.bgmAudio.play();
      if (prom) prom.catch(() => {});
    } catch (e) {}
  }

  pauseBgm() {
    if (!this.bgmAudio) return;
    try {
      this.bgmAudio.pause();
      this.bgmPaused = true;
    } catch (e) {}
  }

  resumeBgm() {
    if (!this.enabled || !this.bgmAudio || !this.bgmPlaying) return;
    this.initContext();
    this.bgmPaused = false;
    try {
      const prom = this.bgmAudio.play();
      if (prom) prom.catch(() => {});
    } catch (e) {}
  }

  stopBgm() {
    this.bgmPlaying = false;
    this.bgmPaused = false;
    if (!this.bgmAudio) return;
    try {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    } catch (e) {}
  }

  play(name) {
    if (!this.enabled) return;
    this.initContext();

    const audio = this.cache[name];
    if (audio) {
      try {
        audio.currentTime = 0;
        if (name === 'catch') audio.volume = 1.0;
        const prom = audio.play();
        if (prom) prom.catch(() => this.playSynth(name));
      } catch (e) {
        this.playSynth(name);
      }
    } else {
      this.playSynth(name);
    }
  }

  // Web Audio Synth Fallback
  playSynth(type) {
    if (!this.enabled || !this.audioContext) return;
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'catch') {
        // High, crisp, loud arcade coin ping
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1046, now); // C6
        osc.frequency.exponentialRampToValueAtTime(2093, now + 0.12); // C7
        gain.gain.setValueAtTime(0.75, now); // Louder sound!
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);

        // Bright sparkling overtone
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2637, now); // E7
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        gain2.gain.setValueAtTime(0.35, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc2.start(now);
        osc2.stop(now + 0.14);
      } else if (type === 'combo' || type === 'fever') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.06);
        osc.frequency.setValueAtTime(783.99, now + 0.12);
        osc.frequency.setValueAtTime(1046.50, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'miss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'voucher') {
        osc.type = 'square';
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.setValueAtTime(freq, now + idx * 0.08);
          g.gain.setValueAtTime(0.2, now + idx * 0.08);
          g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.15);
          o.start(now + idx * 0.08);
          o.stop(now + idx * 0.08 + 0.15);
        });
      }
    } catch (e) {}
  }
}

// ================= FX PARTICLES & FLOATING TEXTS =================
class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 320.0 * dt; // Gravity
    this.vx *= 0.98;
    this.life -= dt;
    return this.life > 0;
  }
}

class Shockwave {
  constructor(x, y, maxRadius = 55, color = '#38EF7D') {
    this.x = x;
    this.y = y;
    this.radius = 12.0;
    this.maxRadius = maxRadius;
    this.color = color;
    this.life = 0.35;
    this.maxLife = 0.35;
  }

  update(dt) {
    this.life -= dt;
    const prog = 1.0 - (this.life / this.maxLife);
    this.radius = 12.0 + (this.maxRadius - 12.0) * prog;
    return this.life > 0;
  }
}

class FloatingText {
  constructor(x, y, text, color, size = 28, isCombo = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 0.85;
    this.maxLife = 0.85;
    this.isCombo = isCombo;
  }

  update(dt) {
    this.life -= dt;
    this.y -= 55.0 * dt;
    return this.life > 0;
  }
}

// ================= GAME ENGINE =================
class Item {
  constructor(x, y, size, speed, imageIdx, wobblePhase = 0, angle = 0, baseAngle = 0, rotSpeed = 0, mode = 'vertical') {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.image = imageIdx;
    this.wobblePhase = wobblePhase;
    this.angle = angle;
    this.baseAngle = baseAngle;
    this.rotSpeed = rotSpeed;
    this.mode = mode;
  }
}

function checkCatches(item, oldY, hands) {
  // Swept collision
  for (const h of hands) {
    if (
      item.x + item.size > h.left &&
      item.x < h.right &&
      oldY + item.size <= h.bottom &&
      item.y + item.size >= h.top
    ) {
      return true;
    }
  }
  return false;
}

class Engine {
  constructor(opts = {}) {
    this.width = opts.width || W;
    this.height = opts.height || H;
    this.gain = opts.gain || 1;
    this.loss = opts.loss || 1;
    this.speed = opts.speed || 180;
    this.interval = opts.interval || 1.2;
    this.size = opts.size || 68;
    this.duration = opts.duration !== undefined ? opts.duration : 60;
    this.images = Math.max(opts.images || 1, 1);
    this.reset();
  }

  reset() {
    this.score = 0;
    this.caught = 0;
    this.missed = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.elapsed = 0.0;
    this.spawnIn = 0.4;
    this.items = [];
    this.finished = false;
  }

  get accuracy() {
    const total = this.caught + this.missed;
    return total > 0 ? (this.caught / total) * 100 : 100;
  }

  getRank() {
    const acc = this.accuracy;
    if (this.score >= 50 || (this.caught >= 30 && acc >= 90)) {
      return { rank: 'S', title: 'Huyền Thoại Bắt Quà! 👑', color: '#F59E0B' };
    } else if (this.score >= 30 || (this.caught >= 20 && acc >= 80)) {
      return { rank: 'A', title: 'Tay Hứng Siêu Đẳng! 🌟', color: '#10B981' };
    } else if (this.score >= 15 || this.caught >= 10) {
      return { rank: 'B', title: 'Khá Xuất Sắc! 🚀', color: '#06B6D4' };
    } else {
      return { rank: 'C', title: 'Cố Lên Nhé! 🍀', color: '#F43F5E' };
    }
  }

  update(dt, hands) {
    if (this.finished) return [];
    if (this.duration) {
      dt = Math.min(dt, Math.max(0, this.duration - this.elapsed));
    }
    this.elapsed += dt;
    this.spawnIn -= dt;

    if (this.spawnIn <= 0) {
      const randX = Math.random() * Math.max(0, this.width - this.size);
      const randSpeed = this.speed * (0.9 + Math.random() * 0.2);
      const randImg = Math.floor(Math.random() * this.images);
      const randPhase = Math.random() * Math.PI * 2;

      // Random orientation: Vertical (dọc), Horizontal (ngang), Diagonal (chéo), Tumble (lẫn lộn xoay)
      const modes = ['vertical', 'horizontal', 'diagonal_left', 'diagonal_right', 'tumble'];
      const mode = modes[Math.floor(Math.random() * modes.length)];
      let baseAngle = 0;
      let rotSpeed = 0;

      if (mode === 'vertical') {
        baseAngle = Math.random() < 0.5 ? 0 : Math.PI; // đứng thẳng hoặc lộn ngược
        rotSpeed = (Math.random() - 0.5) * 0.3;
      } else if (mode === 'horizontal') {
        baseAngle = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2; // ngang trái hoặc ngang phải (90° hoặc -90°)
        rotSpeed = (Math.random() - 0.5) * 0.4;
      } else if (mode === 'diagonal_left') {
        baseAngle = -(Math.PI / 4) + (Math.random() - 0.5) * 0.25; // chéo trái ~ -45°
        rotSpeed = (Math.random() - 0.5) * 0.5;
      } else if (mode === 'diagonal_right') {
        baseAngle = (Math.PI / 4) + (Math.random() - 0.5) * 0.25; // chéo phải ~ 45°
        rotSpeed = (Math.random() - 0.5) * 0.5;
      } else { // tumble (lẫn lộn xoay tròn)
        baseAngle = Math.random() * Math.PI * 2;
        rotSpeed = (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.5);
      }

      this.items.push(new Item(randX, -this.size, this.size, randSpeed, randImg, randPhase, baseAngle, baseAngle, rotSpeed, mode));
      this.spawnIn += this.interval;
    }

    const events = [];
    const keep = [];

    for (const item of this.items) {
      const oldY = item.y;
      item.y += item.speed * dt;
      item.wobblePhase += dt * 3.0;

      // Dynamic orientation update
      if (item.mode === 'tumble') {
        item.angle += item.rotSpeed * dt;
      } else {
        const sway = Math.sin(item.wobblePhase) * 0.16;
        item.angle = item.baseAngle + sway;
      }

      if (checkCatches(item, oldY, hands)) {
        this.combo += 1;
        if (this.combo > this.maxCombo) {
          this.maxCombo = this.combo;
        }
        this.score += this.gain;
        this.caught += 1;
        const txt = this.combo < 2 ? `+${this.gain}` : `+${this.gain} 🔥x${this.combo}`;
        events.push({ x: item.x, y: Math.max(35, item.y), text: txt, good: true, combo: this.combo });
      } else if (item.y >= this.height) {
        this.combo = 0;
        this.score -= this.loss;
        this.missed += 1;
        events.push({ x: item.x, y: this.height - 60, text: `-${this.loss}`, good: false, combo: 0 });
      } else {
        keep.push(item);
      }
    }

    this.items = keep;
    this.finished = Boolean(this.duration && this.elapsed >= this.duration);
    return events;
  }
}

// ================= MAIN WEB APPLICATION CONTROLLER =================
class WebArcadeApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.video = document.getElementById('webcam-video');

    this.sound = new SoundManager();
    this.engine = new Engine(DEFAULT_SETTINGS);

    // High Score & Leaderboard
    this.highScore = parseInt(localStorage.getItem('arcade_high_score') || '0', 10);
    this.leaderboard = this.loadLeaderboard();

    // Game state
    this.running = false;
    this.paused = false;
    this.mode = 'camera'; // 'camera' or 'mouse'
    this.useMouse = false;
    this.mousePos = null;
    this.isTouchDevice = 'ontouchstart' in window;

    // Visual FX containers
    this.particles = [];
    this.shockwaves = [];
    this.floatTexts = [];
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Voucher state
    this.voucherTarget = 15;
    this.voucherAwarded = false;
    this.voucherCode = 'CATCH15-VIP';

    // Background image
    this.bgImage = new Image();
    this.bgImage.src = 'assets/background.png';

    // Products & Images
    this.productImages = [];
    this.autoRemoveBg = true;

    // MediaPipe Face & Nose Landmarker & Throttled Tracking
    this.faceLandmarker = null;
    this.isModelLoading = false;
    this.cameraStream = null;
    this.isDetecting = false;
    this.lastVideoTime = -1;
    this.lastDetectTime = 0;
    this.targetNosePos = null;
    this.currentNosePos = null;
    this.targetCatcherWidth = 110;
    this.smoothedCatcherWidth = 110;
    this.hasActiveFace = false;
    this.activeNoseCatcher = null;
    this.faceLandmarksList = [];

    // Loop timing
    this.lastTime = performance.now();
    this.idleTime = 0;

    this.initDOM();
    this.initBrand();
    this.loadDefaultProducts();
    this.updateHeaderStats();
    this.bindEvents();

    // Start render tick
    requestAnimationFrame((t) => this.tick(t));
  }

  // DOM Elements setup
  initDOM() {
    this.highScoreVal = document.getElementById('high-score-val');
    this.currentScoreVal = document.getElementById('current-score-val');
    this.voucherTargetNum = document.getElementById('voucher-target-num');
    this.headerVoucherBtn = document.getElementById('header-voucher-btn');
    this.headerSoundBtn = document.getElementById('header-sound-btn');
    this.headerFsBtn = document.getElementById('header-fs-btn');
    this.headerLbBtn = document.getElementById('header-leaderboard-btn');

    this.arcadeTitleEl = document.querySelector('.arcade-title');
    this.arcadeBadgeEl = document.querySelector('.arcade-badge');

    this.welcomeOverlay = document.getElementById('welcome-overlay');
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.loaderStatusText = document.getElementById('loader-status-text');
    this.touchHint = document.getElementById('touch-hint');

    this.mainStartBtn = document.getElementById('main-start-btn');
    this.mainPauseBtn = document.getElementById('main-pause-btn');
    this.modeSelect = document.getElementById('mode-select');
    this.showShieldChk = document.getElementById('show-shield-chk');
    this.settingsToggleBtn = document.getElementById('settings-toggle-btn');
    this.settingsDrawer = document.getElementById('settings-drawer');

    this.productCountLabel = document.getElementById('product-count-label');
    this.thumbsList = document.getElementById('thumbs-list');

    this.statusMessage = document.getElementById('status-message');

    // Modals
    this.voucherModal = document.getElementById('voucher-modal');
    this.modalVoucherCode = document.getElementById('modal-voucher-code');
    this.voucherCloseX = document.getElementById('voucher-close-x');
    this.voucherCopyBtn = document.getElementById('voucher-copy-btn');
    this.voucherShareFbBtn = document.getElementById('voucher-share-fb-btn');
    this.voucherShareZaloBtn = document.getElementById('voucher-share-zalo-btn');
    this.voucherShareLinkBtn = document.getElementById('voucher-share-link-btn');
    this.voucherContinueBtn = document.getElementById('voucher-continue-game-btn');

    this.gameoverModal = document.getElementById('gameover-modal');
    this.goRankCircle = document.getElementById('go-rank-circle');
    this.goRankTitle = document.getElementById('go-rank-title');
    this.goScoreVal = document.getElementById('go-score-val');
    this.goComboVal = document.getElementById('go-combo-val');
    this.goAccVal = document.getElementById('go-acc-val');
    this.goCaughtVal = document.getElementById('go-caught-val');
    this.goPlayerName = document.getElementById('go-player-name');
    this.goSaveScoreBtn = document.getElementById('go-save-score-btn');
    this.goSaveFeedback = document.getElementById('go-save-feedback');
    this.goReplayBtn = document.getElementById('go-replay-btn');
    this.goViewLbBtn = document.getElementById('go-view-lb-btn');

    this.leaderboardModal = document.getElementById('leaderboard-modal');
    this.lbTableBody = document.getElementById('lb-table-body');
    this.lbCloseX = document.getElementById('lb-close-x');
    this.lbCloseBtn = document.getElementById('lb-close-btn');
    this.lbShareLinkBtn = document.getElementById('lb-share-link-btn');

    // Sync sound state button
    if (!this.sound.enabled) {
      this.headerSoundBtn.classList.add('muted');
      this.headerSoundBtn.textContent = '🔇 Đã tắt';
    }
  }

  // Bind UI Event Listeners
  bindEvents() {
    // Header actions
    this.headerSoundBtn.addEventListener('click', () => {
      const state = this.sound.toggle();
      this.headerSoundBtn.classList.toggle('muted', !state);
      this.headerSoundBtn.textContent = state ? '🔊 Âm thanh' : '🔇 Đã tắt';
    });

    this.headerFsBtn.addEventListener('click', () => this.toggleFullscreen());
    this.headerVoucherBtn.addEventListener('click', () => this.openVoucherModal());
    this.headerLbBtn.addEventListener('click', () => this.openLeaderboardModal());

    // Welcome start button (Chỉ còn chế độ camera AI chóp mũi)
    const welcomeCameraBtn = document.getElementById('welcome-start-camera-btn');
    if (welcomeCameraBtn) {
      welcomeCameraBtn.addEventListener('click', () => {
        this.mode = 'camera';
        this.useMouse = false;
        this.startGame();
      });
    }

    const welcomeMouseBtn = document.getElementById('welcome-start-mouse-btn');
    if (welcomeMouseBtn) {
      welcomeMouseBtn.addEventListener('click', () => {
        this.mode = 'mouse';
        this.useMouse = true;
        this.startGame();
      });
    }

    // Control bar
    this.mainStartBtn.addEventListener('click', () => this.startGame());
    this.mainPauseBtn.addEventListener('click', () => this.togglePause());

    if (this.modeSelect) {
      this.modeSelect.addEventListener('change', (e) => {
        this.mode = e.target.value;
        this.useMouse = (this.mode === 'mouse');
        if (this.useMouse) {
          if (this.touchHint) this.touchHint.style.display = this.isTouchDevice ? 'block' : 'none';
          this.setStatus('🎮 Chế độ Chuột / Cảm ứng: Di chuyển chuột hoặc ngón tay để hứng sản phẩm!');
        } else {
          if (this.touchHint) this.touchHint.style.display = 'none';
          this.setStatus('📷 Chế độ Webcam: AI nhận diện chóp mũi đang hoạt động. Di chuyển mũi để hứng quà!');
        }
      });
    }

    if (this.settingsToggleBtn && this.settingsDrawer) {
      this.settingsToggleBtn.addEventListener('click', () => {
        const isHidden = this.settingsDrawer.style.display === 'none';
        this.settingsDrawer.style.display = isHidden ? 'flex' : 'none';
        this.settingsToggleBtn.textContent = isHidden ? '⚙️ Cài đặt ▲' : '⚙️ Cài đặt ▼';
      });
    }

    // Presets (nếu tồn tại)
    const easyBtn = document.getElementById('preset-easy-btn');
    if (easyBtn) easyBtn.addEventListener('click', (e) => this.applyPreset(130, 1.5, 60, e.target));
    const normalBtn = document.getElementById('preset-normal-btn');
    if (normalBtn) normalBtn.addEventListener('click', (e) => this.applyPreset(180, 1.2, 60, e.target));
    const hardBtn = document.getElementById('preset-hard-btn');
    if (hardBtn) hardBtn.addEventListener('click', (e) => this.applyPreset(260, 0.8, 60, e.target));

    // Canvas Mouse & Touch Tracking
    const getCanvasPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      this.mousePos = getCanvasPos(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (!this.isTouchDevice) this.mousePos = null;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.mousePos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.mousePos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          this.togglePause();
        }
      } else if (e.key === 'F11') {
        e.preventDefault();
        this.toggleFullscreen();
      }
    });

    // Modals events
    this.voucherCloseX.addEventListener('click', () => this.closeVoucherModal());
    this.voucherContinueBtn.addEventListener('click', () => this.closeVoucherModal());
    this.voucherCopyBtn.addEventListener('click', () => this.copyVoucherCode());
    this.voucherShareFbBtn.addEventListener('click', () => this.shareToSocial('facebook'));
    this.voucherShareZaloBtn.addEventListener('click', () => this.shareToSocial('zalo'));
    this.voucherShareLinkBtn.addEventListener('click', () => this.copyGameLink());

    this.goSaveScoreBtn.addEventListener('click', () => this.saveScoreToLeaderboard());
    this.goReplayBtn.addEventListener('click', () => {
      this.gameoverModal.style.display = 'none';
      this.startGame();
    });
    this.goViewLbBtn.addEventListener('click', () => {
      this.gameoverModal.style.display = 'none';
      this.openLeaderboardModal();
    });

    this.lbCloseX.addEventListener('click', () => { this.leaderboardModal.style.display = 'none'; });
    this.lbCloseBtn.addEventListener('click', () => { this.leaderboardModal.style.display = 'none'; });
    this.lbShareLinkBtn.addEventListener('click', () => this.copyGameLink());
  }

  // ================= BRAND INITIALIZATION & APPLY =================
  initBrand() {
    const params = new URLSearchParams(window.location.search);
    let cfg = null;

    // 1. From URL Preset query ?preset=highlands
    const presetParam = params.get('preset');
    if (presetParam && window.BRAND_PRESETS && window.BRAND_PRESETS[presetParam]) {
      cfg = { ...window.BRAND_PRESETS[presetParam] };
    } else if (params.get('brand')) {
      // 2. From URL custom query params
      const bName = params.get('brand');
      cfg = {
        name: bName,
        title: params.get('title') || `HỨNG SẢN PHẨM ${bName.toUpperCase()}`,
        badge: `✨ ${bName.toUpperCase()} PROMO`,
        primaryColor: params.get('color') || '#4F46E5',
        accentColor: params.get('accent') || '#F59E0B',
        voucherCode: params.get('voucher') || `${bName.toUpperCase()}-VIP`,
        voucherDiscount: params.get('discount') || 'GIẢM 25%',
        voucherTarget: parseInt(params.get('target') || '15', 10),
        voucherDesc: `Săn được voucher quà tặng đặc biệt từ ${bName}!`
      };
    } else {
      // 3. From LocalStorage
      try {
        const stored = localStorage.getItem('arcade_brand_config');
        if (stored) cfg = JSON.parse(stored);
      } catch (e) {}
    }

    // 4. Default from window.ACTIVE_BRAND
    if (!cfg) {
      cfg = window.ACTIVE_BRAND || {
        name: "Arcade Pop",
        title: "HỨNG SẢN PHẨM",
        badge: "✨ POP ARCADE EDITION • WEB ONLINE",
        primaryColor: "#4F46E5",
        accentColor: "#F59E0B",
        voucherCode: "CATCH15-VIP",
        voucherDiscount: "GIẢM 20%",
        voucherTarget: 15,
        voucherDesc: "Mở khóa voucher mua sắm giảm giá VIP!"
      };
    }

    this.applyBrandConfig(cfg);
  }

  applyBrandConfig(cfg) {
    this.currentBrand = cfg;

    if (this.arcadeTitleEl) this.arcadeTitleEl.textContent = `🎮 ${cfg.title}`;
    if (this.arcadeBadgeEl) this.arcadeBadgeEl.textContent = cfg.badge || `✨ ${cfg.name.toUpperCase()} PROMO`;
    document.title = `🎮 ${cfg.title} • AI Hand Tracking Game`;

    if (cfg.primaryColor) {
      document.documentElement.style.setProperty('--brand-primary', cfg.primaryColor);
      document.documentElement.style.setProperty('--accent-purple', cfg.primaryColor);
    }
    if (cfg.accentColor) {
      document.documentElement.style.setProperty('--brand-accent', cfg.accentColor);
      document.documentElement.style.setProperty('--accent-gold', cfg.accentColor);
    }

    this.voucherCode = cfg.voucherCode || 'CATCH15-VIP';
    this.voucherTarget = cfg.voucherTarget || 15;
    if (this.modalVoucherCode) this.modalVoucherCode.textContent = this.voucherCode;
    if (this.voucherTargetNum) this.voucherTargetNum.textContent = this.voucherTarget;

    const discountEl = document.querySelector('.ticket-discount');
    if (discountEl && cfg.voucherDiscount) discountEl.textContent = cfg.voucherDiscount;

    const voucherSubEl = document.querySelector('.voucher-sub');
    if (voucherSubEl && cfg.voucherDesc) voucherSubEl.textContent = cfg.voucherDesc;
  }

  // Load Default Images or Brand Configured Images
  // Load Products & Automatically Remove Background Before Web Display
  async loadDefaultProducts() {
    this.productImages = [];
    const sourceUrls = (this.currentBrand && Array.isArray(this.currentBrand.productImages) && this.currentBrand.productImages.length > 0)
      ? this.currentBrand.productImages
      : DEFAULT_PRODUCT_URLS;

    const promises = sourceUrls.map(async (url) => {
      try {
        const rawImg = await this.loadImageElement(url);
        // Automatically remove background for assets products before web display
        const processedUrl = this.removeImageBackground(rawImg);
        const processedImg = await this.loadImageElement(processedUrl);
        return { img: processedImg, url: processedUrl };
      } catch (err) {
        console.warn("Lỗi tải/xử lý ảnh sản phẩm:", url, err);
        return null;
      }
    });

    const results = await Promise.all(promises);
    this.productImages = results.filter(Boolean);
    this.renderThumbnails();
  }

  // Render Product Thumbnails Tray (View Only)
  renderThumbnails() {
    this.thumbsList.innerHTML = '';
    this.productCountLabel.textContent = `(${this.productImages.length} sản phẩm)`;

    this.productImages.forEach((item, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'thumb-item';
      thumb.title = `Sản phẩm ${idx + 1}`;

      const img = document.createElement('img');
      img.src = item.url;
      thumb.appendChild(img);

      this.thumbsList.appendChild(thumb);
    });

    if (this.engine) {
      this.engine.images = Math.max(1, this.productImages.length);
    }
  }

  loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  // Smart Client-Side Background Remover:
  // Tự động xóa phông nền trắng/đơn sắc bao quanh sản phẩm trước khi đưa vào web
  removeImageBackground(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return img.src;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(img, 0, 0);

    const imgData = offCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Kiểm tra nếu 4 góc ảnh đã trong suốt sẵn (ảnh PNG không nền) thì giữ nguyên
    const cornerIndices = [
      0,
      (w - 1) * 4,
      ((h - 1) * w) * 4,
      ((h - 1) * w + (w - 1)) * 4
    ];
    let transparentCorners = 0;
    for (const ci of cornerIndices) {
      if (data[ci + 3] < 30) transparentCorners++;
    }
    if (transparentCorners >= 3) {
      return offCanvas.toDataURL('image/png');
    }

    // 2. Lấy mẫu màu viền/góc xung quanh để nhận diện màu nền
    const samples = [];
    const samplePoints = [
      [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
      [Math.floor(w / 2), 0], [0, Math.floor(h / 2)],
      [w - 1, Math.floor(h / 2)], [Math.floor(w / 2), h - 1]
    ];
    for (const [sx, sy] of samplePoints) {
      const idx = (sy * w + sx) * 4;
      if (data[idx + 3] > 80) {
        samples.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }

    let bgR = 255, bgG = 255, bgB = 255;
    if (samples.length > 0) {
      bgR = samples.reduce((acc, s) => acc + s[0], 0) / samples.length;
      bgG = samples.reduce((acc, s) => acc + s[1], 0) / samples.length;
      bgB = samples.reduce((acc, s) => acc + s[2], 0) / samples.length;
    }

    const isBgPixel = (idx) => {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 50) return true;
      // Trắng hoặc gần trắng studio
      if (r > 225 && g > 225 && b > 225) return true;

      // Khoảng cách màu tới viền nền
      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      return dist < 42;
    };

    // 3. Thuật toán Flood Fill (loang từ mép ngoài vào trong)
    // Đảm bảo không xóa nhầm chữ/họa tiết trắng bên trong sản phẩm
    const visited = new Uint8Array(w * h);
    const queue = [];

    for (let x = 0; x < w; x++) {
      const pTop = x;
      if (isBgPixel(pTop * 4)) { visited[pTop] = 1; queue.push(pTop); }
      const pBottom = (h - 1) * w + x;
      if (isBgPixel(pBottom * 4)) { visited[pBottom] = 1; queue.push(pBottom); }
    }
    for (let y = 0; y < h; y++) {
      const pLeft = y * w;
      if (!visited[pLeft] && isBgPixel(pLeft * 4)) { visited[pLeft] = 1; queue.push(pLeft); }
      const pRight = y * w + (w - 1);
      if (!visited[pRight] && isBgPixel(pRight * 4)) { visited[pRight] = 1; queue.push(pRight); }
    }

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      const cx = curr % w;
      const cy = Math.floor(curr / w);

      // Đặt pixel nền thành trong suốt
      data[curr * 4 + 3] = 0;

      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx < w - 1 ? curr + 1 : -1,
        cy > 0 ? curr - w : -1,
        cy < h - 1 ? curr + w : -1
      ];

      for (const n of neighbors) {
        if (n !== -1 && !visited[n]) {
          if (isBgPixel(n * 4)) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }
    }

    // 4. Khử răng cưa viền (soft antialiasing)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        if (data[idx + 3] > 0) {
          const upA = data[((y - 1) * w + x) * 4 + 3];
          const downA = data[((y + 1) * w + x) * 4 + 3];
          const leftA = data[(y * w + (x - 1)) * 4 + 3];
          const rightA = data[(y * w + (x + 1)) * 4 + 3];
          if (upA === 0 || downA === 0 || leftA === 0 || rightA === 0) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
            if (dist < 55) {
              data[idx + 3] = Math.max(0, Math.min(255, (dist / 55) * 220));
            }
          }
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    return offCanvas.toDataURL('image/png');
  }

  // Settings Presets (nếu có)
  applyPreset(speed, interval, duration, targetBtn) {
    const sEl = document.getElementById('cfg-speed');
    const iEl = document.getElementById('cfg-interval');
    const dEl = document.getElementById('cfg-duration');
    if (sEl) sEl.value = speed;
    if (iEl) iEl.value = interval;
    if (dEl) dEl.value = duration;

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    if (targetBtn) targetBtn.classList.add('active');
  }

  getSettingsFromInputs() {
    const gainEl = document.getElementById('cfg-gain');
    const lossEl = document.getElementById('cfg-loss');
    const speedEl = document.getElementById('cfg-speed');
    const intervalEl = document.getElementById('cfg-interval');
    const sizeEl = document.getElementById('cfg-size');
    const durationEl = document.getElementById('cfg-duration');
    const voucherEl = document.getElementById('cfg-voucher');

    return {
      gain: gainEl ? Math.max(1, parseInt(gainEl.value || '1', 10)) : DEFAULT_SETTINGS.gain,
      loss: lossEl ? Math.max(0, parseInt(lossEl.value || '1', 10)) : DEFAULT_SETTINGS.loss,
      speed: speedEl ? Math.max(50, parseFloat(speedEl.value || '180')) : DEFAULT_SETTINGS.speed,
      interval: intervalEl ? Math.max(0.3, parseFloat(intervalEl.value || '1.2')) : DEFAULT_SETTINGS.interval,
      size: sizeEl ? Math.max(30, parseInt(sizeEl.value || '68', 10)) : DEFAULT_SETTINGS.size,
      duration: durationEl ? Math.max(0, parseInt(durationEl.value || '60', 10)) : DEFAULT_SETTINGS.duration,
      voucherPts: voucherEl ? Math.max(5, parseInt(voucherEl.value || '15', 10)) : (this.currentBrand?.voucherTarget || DEFAULT_SETTINGS.voucherPts),
      images: Math.max(1, this.productImages.length)
    };
  }

  updateHeaderStats() {
    this.highScoreVal.textContent = this.highScore;
    this.currentScoreVal.textContent = this.engine ? this.engine.score : 0;
    this.voucherTargetNum.textContent = this.voucherTarget;
  }

  setStatus(msg) {
    if (this.statusMessage) this.statusMessage.textContent = msg;
  }

  // ================= START GAME & CAMERA SETUP =================
  async startGame() {
    const opts = this.getSettingsFromInputs();
    this.voucherTarget = opts.voucherPts;
    this.voucherAwarded = false;
    this.voucherCode = `CATCH${this.voucherTarget}-VIP`;
    this.modalVoucherCode.textContent = this.voucherCode;
    this.headerVoucherBtn.classList.remove('unlocked');
    this.headerVoucherBtn.textContent = `🎁 Voucher (${this.voucherTarget}đ)`;

    this.engine = new Engine(opts);
    this.particles = [];
    this.shockwaves = [];
    this.floatTexts = [];
    this.shakeDuration = 0;

    this.welcomeOverlay.style.display = 'none';
    this.gameoverModal.style.display = 'none';
    this.voucherModal.style.display = 'none';

    this.paused = false;
    this.mainPauseBtn.disabled = false;
    this.mainPauseBtn.textContent = '⏸ Tạm dừng (Space)';

    this.useMouse = Boolean(this.modeSelect && this.modeSelect.value === 'mouse');

    this.sound.play('countdown');
    this.sound.playBgm();

    if (this.useMouse) {
      this.running = true;
      if (this.touchHint) this.touchHint.style.display = this.isTouchDevice ? 'block' : 'none';
      this.setStatus('🎮 Chế độ Chuột: Di chuyển trong khung để hứng sản phẩm rơi!');
      return;
    }

    // Camera Mode: Initialize MediaPipe & Webcam
    if (!this.faceLandmarker) {
      await this.initMediaPipe();
    } else {
      if (!this.cameraStream) {
        await this.startWebcam();
      }
    }

    this.running = true;
    this.setStatus('📷 Camera sẵn sàng! Di chuyển chóp mũi để đón quà rơi!');
  }

  // MediaPipe Vision FaceLandmarker Initializer (Nhận diện chóp mũi & khuôn mặt)
  async initMediaPipe() {
    this.loadingOverlay.style.display = 'flex';
    this.loaderStatusText.textContent = 'Đang tải mô hình AI nhận diện khuôn mặt & mũi MediaPipe...';

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      const modelUrl = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

      // Thử dùng tăng tốc GPU trước, nếu trình duyệt/máy không hỗ trợ thì fallback sang CPU để không bị crash/đứng hình
      try {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: "VIDEO",
          numFaces: 1, // Tối ưu: chỉ track 1 người để giảm 50% tải xử lý, mượt 60fps
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      } catch (gpuErr) {
        console.warn("GPU delegate không khả dụng, chuyển sang chế độ CPU ổn định:", gpuErr);
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: "CPU"
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      }

      this.loaderStatusText.textContent = 'Đang bật Camera webcam của bạn...';
      await this.startWebcam();
      this.loadingOverlay.style.display = 'none';
    } catch (err) {
      console.error("MediaPipe Face Init Error:", err);
      this.loadingOverlay.style.display = 'none';
      this.setStatus('⚠️ Không thể bật Camera (hoặc bị chặn). Tự động chuyển sang Chế độ Chuột!');
      this.modeSelect.value = 'mouse';
      this.useMouse = true;
      this.running = true;
    }
  }

  // Start Webcam Video Stream với chuẩn phần cứng không lag
  async startWebcam() {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user",
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.cameraStream = stream;
      this.video.srcObject = stream;
      this.video.playsInline = true;
      this.video.muted = true;
      this.video.autoplay = true;

      await new Promise((resolve) => {
        this.video.onloadedmetadata = async () => {
          try {
            await this.video.play();
          } catch (e) {}
          resolve();
        };
      });
    } catch (err) {
      console.warn("Camera stream denied:", err);
      throw err;
    }
  }

  togglePause() {
    if (!this.running || this.engine.finished) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.sound.pauseBgm();
    } else {
      this.sound.resumeBgm();
    }
    this.mainPauseBtn.textContent = this.paused ? '▶ Tiếp tục (Space)' : '⏸ Tạm dừng (Space)';
    this.setStatus(this.paused ? '⏸ Trò chơi đang tạm dừng.' : '▶ Tiếp tục ván đấu!');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  triggerShake(intensity = 4.0, duration = 0.15) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  spawnConfetti(x, y, isCombo = false) {
    const colors = ['#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#A78BFA', '#FFFFFF', '#F87171'];
    const count = isCombo ? 24 : 16;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 90 + Math.random() * 230;
      const vx = Math.cos(ang) * spd;
      const vy = Math.sin(ang) * spd - (50 + Math.random() * 110);
      const col = colors[Math.floor(Math.random() * colors.length)];
      const sz = 3 + Math.random() * 4;
      const life = 0.35 + Math.random() * 0.35;
      this.particles.push(new Particle(x, y, vx, vy, col, sz, life));
    }
    this.shockwaves.push(new Shockwave(x, y, isCombo ? 60 : 45));
  }

  spawnMissParticles(x, y) {
    const colors = ['#EF4444', '#F87171', '#94A3B8'];
    for (let i = 0; i < 10; i++) {
      const vx = (Math.random() - 0.5) * 120;
      const vy = -(20 + Math.random() * 80);
      const col = colors[Math.floor(Math.random() * colors.length)];
      const sz = 3 + Math.random() * 3;
      const life = 0.25 + Math.random() * 0.2;
      this.particles.push(new Particle(x, y, vx, vy, col, sz, life));
    }
  }

  // ================= MAIN RENDER & GAME LOOP =================
  tick(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;
    this.idleTime += dt;

    this.ctx.clearRect(0, 0, W, H);

    if (this.running) {
      this.updateAndRenderGame(dt, timestamp);
    } else {
      this.renderIdle(timestamp);
    }

    requestAnimationFrame((t) => this.tick(t));
  }

  // Map raw MediaPipe landmarks to canvas with exact object-fit: cover center-crop alignment
  videoToCanvas(lm) {
    const vw = (this.video && this.video.videoWidth) ? this.video.videoWidth : W;
    const vh = (this.video && this.video.videoHeight) ? this.video.videoHeight : H;

    const scale = Math.max(W / vw, H / vh);
    const sw = W / scale;
    const sh = H / scale;
    const sx = Math.max(0, (vw - sw) / 2);
    const sy = Math.max(0, (vh - sh) / 2);

    const rawX = lm.x * vw;
    const rawY = lm.y * vh;

    const cropNormX = (rawX - sx) / sw;
    const cropNormY = (rawY - sy) / sh;

    return {
      x: (1.0 - cropNormX) * W, // Mirrored horizontally
      y: cropNormY * H
    };
  }

  // Draw Background Image on Canvas if loaded
  drawBackgroundToCanvas() {
    if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      const bw = this.bgImage.naturalWidth;
      const bh = this.bgImage.naturalHeight;
      const scale = Math.max(W / bw, H / bh);
      const sw = W / scale;
      const sh = H / scale;
      const sx = (bw - sw) / 2;
      const sy = (bh - sh) / 2;
      this.ctx.drawImage(this.bgImage, sx, sy, sw, sh, 0, 0, W, H);
      this.ctx.fillStyle = 'rgba(10, 8, 26, 0.12)';
      this.ctx.fillRect(0, 0, W, H);
      return true;
    }
    return false;
  }

  // Render Idle Background when game not running
  renderIdle(timestamp) {
    if (!this.drawBackgroundToCanvas()) {
      this.ctx.fillStyle = '#0F0B26';
      this.ctx.fillRect(0, 0, W, H);
    }

    // Subtle gentle glow rings
    const pulse = Math.sin(timestamp * 0.003) * 12;
    this.ctx.beginPath();
    this.ctx.arc(W / 2, H / 2, 160 + pulse, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(W / 2, H / 2, 220 + pulse * 1.2, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
  }

  // Main Active Game Frame
  updateAndRenderGame(dt, timestamp) {
    let catchers = [];

    // Screen Shake
    let shakeDx = 0;
    let shakeDy = 0;
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      shakeDx = (Math.random() - 0.5) * this.shakeIntensity * 2;
      shakeDy = (Math.random() - 0.5) * this.shakeIntensity * 2;
    }

    // 1. INPUT PROCESSING
    if (this.useMouse) {
      // Draw background backdrop
      if (!this.drawBackgroundToCanvas()) {
        this.ctx.fillStyle = '#110D2C';
        this.ctx.fillRect(0, 0, W, H);
      }

      if (this.mousePos) {
        const mx = this.mousePos.x;
        const my = this.mousePos.y;
        catchers.push({ left: mx - 75, top: my - 12, right: mx + 75, bottom: my + 16 });
      }
    } else {
      // Camera Video Frame Render (Mirrored selfie view with object-fit: cover)
      if (this.video && this.video.readyState >= 2) {
        const vw = this.video.videoWidth || W;
        const vh = this.video.videoHeight || H;

        // Tự động căn tỷ lệ giữ nguyên khuôn mặt tự nhiên, không méo hình
        const scale = Math.max(W / vw, H / vh);
        const sw = W / scale;
        const sh = H / scale;
        const sx = Math.max(0, (vw - sw) / 2);
        const sy = Math.max(0, (vh - sh) / 2);

        this.ctx.save();
        this.ctx.translate(W, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, sx, sy, sw, sh, 0, 0, W, H);
        this.ctx.restore();

        // Lớp phủ nhẹ dịu mắt, làm nổi bật sản phẩm và thương hiệu
        this.ctx.fillStyle = 'rgba(10, 8, 25, 0.06)';
        this.ctx.fillRect(0, 0, W, H);

        // AI FACE & NOSE DETECTION: Non-blocking, throttled để tránh nghẽn luồng làm đơ camera
        if (this.faceLandmarker && !this.isDetecting && this.video.currentTime !== this.lastVideoTime && (timestamp - this.lastDetectTime >= 30)) {
          this.lastVideoTime = this.video.currentTime;
          this.lastDetectTime = timestamp;
          this.isDetecting = true;

          try {
            const results = this.faceLandmarker.detectForVideo(this.video, timestamp);
            if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
              const landmarks = results.faceLandmarks[0];
              const nosePt = this.videoToCanvas(landmarks[1]);
              const leftCheek = this.videoToCanvas(landmarks[234]);
              const rightCheek = this.videoToCanvas(landmarks[454]);
              const faceWidth = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y) || 120;
              const catcherWidth = Math.max(90, Math.min(160, faceWidth * 0.72));

              this.targetNosePos = { x: nosePt.x, y: nosePt.y };
              this.targetCatcherWidth = catcherWidth;
              this.hasActiveFace = true;
            } else {
              this.hasActiveFace = false;
            }
          } catch (detErr) {
            // Bỏ qua lỗi khung hình bận
          } finally {
            this.isDetecting = false;
          }
        }

        // LERPING 60 FPS: Nội suy mượt mà vị trí chóp mũi theo 60 khung hình/giây
        if (this.targetNosePos) {
          if (!this.currentNosePos) {
            this.currentNosePos = { x: this.targetNosePos.x, y: this.targetNosePos.y };
            this.smoothedCatcherWidth = this.targetCatcherWidth || 110;
          } else {
            const lerpSpeed = 0.38;
            this.currentNosePos.x += (this.targetNosePos.x - this.currentNosePos.x) * lerpSpeed;
            this.currentNosePos.y += (this.targetNosePos.y - this.currentNosePos.y) * lerpSpeed;
            this.smoothedCatcherWidth += (this.targetCatcherWidth - this.smoothedCatcherWidth) * lerpSpeed;
          }

          const nx = this.currentNosePos.x;
          const ny = this.currentNosePos.y;
          const cWidth = this.smoothedCatcherWidth;

          const left = nx - cWidth / 2;
          const right = nx + cWidth / 2;
          const top = ny - 20;
          const bottom = ny + 24;

          catchers.push({ left, top, right, bottom });
          this.activeNoseCatcher = { x: nx, y: ny, width: cWidth, left, top, right, bottom };
        }
      }
    }

    // 2. DRAW NOSE CATCHER / TRAY (Phong cách nhãn hàng tinh tế, thanh lịch)
    if (this.showShieldChk.checked) {
      if (this.useMouse && this.mousePos) {
        const mx = this.mousePos.x;
        const my = this.mousePos.y;

        this.ctx.save();
        // Catcher Capsule
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
          this.ctx.roundRect(mx - 75, my, 150, 14, 7);
        } else {
          this.ctx.rect(mx - 75, my, 150, 14);
        }
        this.ctx.fillStyle = 'rgba(79, 70, 229, 0.8)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#F59E0B';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(mx, my + 7, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '700 11px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🎯 ĐIỂM HỨNG QUÀ', mx, my - 12);
        this.ctx.restore();
      } else if (this.activeNoseCatcher && this.hasActiveFace) {
        const { x: nx, y: ny, width: cWidth, left, right } = this.activeNoseCatcher;

        this.ctx.save();
        // 1. Tinh tế: Vòng halo phát sáng nhẹ nhàng tại chóp mũi
        const pulse = Math.sin(timestamp * 0.007) * 2;
        this.ctx.beginPath();
        this.ctx.arc(nx, ny, 10 + pulse, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#F59E0B';
        this.ctx.lineWidth = 1.8;
        this.ctx.stroke();

        // 2. Điểm tâm chóp mũi trang nhã
        this.ctx.beginPath();
        this.ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();
        this.ctx.strokeStyle = '#F59E0B';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // 3. Khay hứng thương hiệu dạng capsule bo tròn
        const trayY = ny + 10;
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
          this.ctx.roundRect(left, trayY, cWidth, 12, 6);
        } else {
          this.ctx.rect(left, trayY, cWidth, 12);
        }
        this.ctx.fillStyle = 'rgba(79, 70, 229, 0.75)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1.8;
        this.ctx.stroke();

        // 4. Nhãn phong cách chiến dịch thương hiệu
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '700 11px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🎯 ĐIỂM HỨNG QUÀ', nx, ny - 16);
        this.ctx.restore();
      }
    }

    // 3. ENGINE UPDATE
    if (!this.paused) {
      const events = this.engine.update(dt, catchers);
      for (const ev of events) {
        if (ev.good) {
          if (ev.combo >= 7) {
            this.sound.play('fever');
          } else if (ev.combo >= 3) {
            this.sound.play('combo');
          } else {
            this.sound.play('catch');
          }

          this.spawnConfetti(ev.x + this.engine.size / 2, ev.y, ev.combo >= 3);
          this.triggerShake(ev.combo >= 3 ? 5.0 : 3.0);

          const col = ev.combo >= 2 ? '#F59E0B' : '#34D399';
          const sz = ev.combo >= 5 ? 34 : (ev.combo >= 2 ? 30 : 26);
          this.floatTexts.push(new FloatingText(ev.x, ev.y, ev.text, col, sz, ev.combo >= 2));
        } else {
          this.sound.play('miss');
          this.spawnMissParticles(ev.x + this.engine.size / 2, ev.y);
          this.triggerShake(3.5);
          this.floatTexts.push(new FloatingText(ev.x, ev.y, ev.text, '#EF4444', 26));
        }
      }
    }

    // High score check
    if (this.engine.score > this.highScore) {
      this.highScore = this.engine.score;
      localStorage.setItem('arcade_high_score', this.highScore);
    }
    this.updateHeaderStats();

    // Voucher Check
    if (this.engine.score >= this.voucherTarget && !this.voucherAwarded) {
      this.voucherAwarded = true;
      this.headerVoucherBtn.classList.add('unlocked');
      this.headerVoucherBtn.textContent = '🎁 VOUCHER: ĐÃ MỞ!';
      this.sound.play('voucher');
      this.spawnConfetti(W / 2, H / 2, true);
      this.openVoucherModal();
    }

    // 4. DRAW FALLING ITEMS with Varied Orientations (horizontal, vertical, diagonal, tumble)
    for (const item of this.engine.items) {
      const imgObj = this.productImages[item.image % this.productImages.length];
      const wobble = Math.sin(item.wobblePhase) * 6;
      const rx = item.x + shakeDx + wobble;
      const ry = item.y + shakeDy;
      const cx = rx + item.size / 2;
      const cy = ry + item.size / 2;

      // Drop Shadow
      this.ctx.beginPath();
      this.ctx.ellipse(cx, ry + item.size + 4, item.size * 0.42, item.size * 0.16, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(10, 8, 29, 0.42)';
      this.ctx.fill();

      // Product Image with Rotation
      if (imgObj && imgObj.img) {
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(item.angle || 0);
        this.ctx.drawImage(imgObj.img, -item.size / 2, -item.size / 2, item.size, item.size);
        this.ctx.restore();
      }
    }

    // 5. DRAW SHOCKWAVES
    this.shockwaves = this.shockwaves.filter(sw => sw.update(dt));
    for (const sw of this.shockwaves) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = sw.color;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 6. DRAW PARTICLES
    this.particles = this.particles.filter(p => p.update(dt));
    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();
    }

    // 7. DRAW FLOATING TEXTS (Font nhãn hàng thanh lịch)
    this.floatTexts = this.floatTexts.filter(ft => ft.update(dt));
    for (const ft of this.floatTexts) {
      this.ctx.save();
      this.ctx.font = `700 ${ft.size}px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif`;
      this.ctx.textAlign = 'center';

      // Shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillText(ft.text, ft.x + 25 + 1.5, ft.y + 1.5);

      // Color
      this.ctx.fillStyle = ft.color;
      this.ctx.fillText(ft.text, ft.x + 25, ft.y);
      this.ctx.restore();
    }

    // 8. IN-GAME HUD OVERLAYS
    this.renderHUD(timestamp);

    // 9. PAUSED SCREEN OVERLAY
    if (this.paused) {
      this.ctx.fillStyle = 'rgba(11, 9, 27, 0.72)';
      this.ctx.fillRect(0, 0, W, H);

      this.ctx.save();
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
        this.ctx.roundRect(W / 2 - 200, H / 2 - 70, 400, 140, 18);
      } else {
        this.ctx.rect(W / 2 - 200, H / 2 - 70, 400, 140);
      }
      this.ctx.fillStyle = 'rgba(22, 17, 52, 0.95)';
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.fillStyle = '#FBBF24';
      this.ctx.font = '800 24px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⏸ ĐANG TẠM DỪNG', W / 2, H / 2 - 14);

      this.ctx.fillStyle = '#CBD5E1';
      this.ctx.font = '500 14px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
      this.ctx.fillText('Nhấn phím Space hoặc bấm Tiếp tục để trở lại', W / 2, H / 2 + 28);
      this.ctx.restore();
    }

    // 10. GAME OVER TRIGGER
    if (this.engine.finished && !this.gameoverModal.style.display || this.gameoverModal.style.display === 'none') {
      if (this.engine.finished && this.running) {
        this.onGameOver();
      }
    }
  }

  // Draw Brand HUD (Giao diện thẻ bo góc hiện đại, font nhãn hàng)
  renderHUD(timestamp) {
    // Top-Left HUD (Score & Highscore)
    this.ctx.save();
    this.ctx.beginPath();
    if (this.ctx.roundRect) {
      this.ctx.roundRect(14, 12, 260, 72, 14);
    } else {
      this.ctx.rect(14, 12, 260, 72);
    }
    this.ctx.fillStyle = 'rgba(18, 14, 44, 0.72)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    this.ctx.lineWidth = 1.2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#FDE047';
    this.ctx.font = '800 20px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`⭐ Điểm: ${this.engine.score}`, 28, 42);

    this.ctx.fillStyle = '#94A3B8';
    this.ctx.font = '600 12px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText(`🏆 Kỷ lục: ${this.highScore}  •  Combo: x${this.engine.maxCombo}`, 28, 68);

    // Top-Center Combo Banner
    if (this.engine.combo >= 2) {
      const isFever = this.engine.combo >= 5;
      const cbText = isFever ? `⚡ SIÊU COMBO x${this.engine.combo}!!` : `🔥 COMBO x${this.engine.combo}!`;
      const cbCol = isFever ? '#EC4899' : '#F59E0B';
      const pulse = Math.sin(timestamp * 0.012) * 3;

      this.ctx.beginPath();
      if (this.ctx.roundRect) {
        this.ctx.roundRect(W / 2 - 130, 14 + pulse, 260, 42, 21);
      } else {
        this.ctx.rect(W / 2 - 130, 14 + pulse, 260, 42);
      }
      this.ctx.fillStyle = 'rgba(25, 18, 55, 0.88)';
      this.ctx.fill();
      this.ctx.strokeStyle = cbCol;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.fillStyle = cbCol;
      this.ctx.font = '800 15px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(cbText, W / 2, 41 + pulse);
    }

    // Top-Right HUD (Time & Accuracy)
    const remaining = Math.max(0, Math.ceil(this.engine.duration - this.engine.elapsed));
    const timeText = this.engine.duration ? `${remaining}s` : '∞';

    this.ctx.beginPath();
    if (this.ctx.roundRect) {
      this.ctx.roundRect(W - 264, 12, 250, 72, 14);
    } else {
      this.ctx.rect(W - 264, 12, 250, 72);
    }
    this.ctx.fillStyle = 'rgba(18, 14, 44, 0.72)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    this.ctx.lineWidth = 1.2;
    this.ctx.stroke();

    const timeCol = remaining > 20 ? '#34D399' : (remaining > 10 ? '#F59E0B' : '#EF4444');
    this.ctx.fillStyle = timeCol;
    this.ctx.font = '800 18px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`⏳ Thời gian: ${timeText}`, W - 250, 40);

    // Timer Progress Bar
    if (this.engine.duration) {
      const barW = 222;
      const prog = remaining / this.engine.duration;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(W - 250, 48, barW, 5);
      this.ctx.fillStyle = timeCol;
      this.ctx.fillRect(W - 250, 48, barW * prog, 5);
    }

    const acc = this.engine.accuracy;
    this.ctx.fillStyle = '#CBD5E1';
    this.ctx.font = '600 12px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
    this.ctx.fillText(`🎯 Trúng: ${this.engine.caught}  •  Trượt: ${this.engine.missed} (${acc.toFixed(0)}%)`, W - 250, 70);

    // Face indicator alert if face is not visible in camera mode
    if (!this.useMouse && !this.hasActiveFace) {
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
        this.ctx.roundRect(W / 2 - 210, H - 44, 420, 32, 16);
      } else {
        this.ctx.rect(W / 2 - 210, H - 44, 420, 32);
      }
      this.ctx.fillStyle = 'rgba(20, 16, 45, 0.88)';
      this.ctx.fill();
      this.ctx.strokeStyle = '#F59E0B';
      this.ctx.lineWidth = 1.2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#FDE047';
      this.ctx.font = '600 12px "Plus Jakarta Sans", "Be Vietnam Pro", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('💡 Hãy đưa khuôn mặt vào trước camera để đón quà!', W / 2, H - 23);
    }
    this.ctx.restore();
  }

  // ================= GAME OVER MODAL =================
  onGameOver() {
    this.running = false;
    this.sound.stopBgm();
    this.sound.play('gameover');

    const rankInfo = this.engine.getRank();
    this.goRankCircle.textContent = rankInfo.rank;
    this.goRankCircle.style.background = rankInfo.color;
    this.goRankCircle.style.boxShadow = `0 0 24px ${rankInfo.color}`;
    this.goRankTitle.textContent = rankInfo.title;
    this.goRankTitle.style.color = rankInfo.color;

    this.goScoreVal.textContent = this.engine.score;
    this.goComboVal.textContent = this.engine.maxCombo;
    this.goAccVal.textContent = `${this.engine.accuracy.toFixed(0)}%`;
    this.goCaughtVal.textContent = `${this.engine.caught}/${this.engine.caught + this.engine.missed}`;

    this.goSaveFeedback.textContent = '';
    this.gameoverModal.style.display = 'flex';
  }

  // ================= VOUCHER MODAL & SHARE =================
  openVoucherModal() {
    this.paused = true;
    this.sound.pauseBgm();
    this.modalVoucherCode.textContent = this.voucherCode;
    this.voucherModal.style.display = 'flex';
  }

  closeVoucherModal() {
    this.voucherModal.style.display = 'none';
    if (this.running) {
      this.paused = false;
      this.sound.resumeBgm();
    }
  }

  copyVoucherCode() {
    navigator.clipboard.writeText(this.voucherCode).then(() => {
      this.voucherCopyBtn.textContent = '✓ Đã sao chép!';
      setTimeout(() => { this.voucherCopyBtn.textContent = '📋 Sao chép'; }, 2000);
    });
  }

  shareToSocial(network) {
    const scoreVal = this.engine ? Math.max(this.voucherTarget, this.engine.score) : this.voucherTarget;
    const msg = `🎉 Mình vừa chơi game Hứng Sản Phẩm Arcade và đạt ${scoreVal} điểm, săn được Voucher VIP: ${this.voucherCode}! Vào so tài cùng mình nhé!`;
    const shareUrl = encodeURIComponent(window.location.href);
    const encodedMsg = encodeURIComponent(msg);

    if (network === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${encodedMsg}`, '_blank');
    } else if (network === 'zalo') {
      window.open(`https://zalo.me/share?url=${shareUrl}&title=${encodedMsg}`, '_blank');
    }
  }

  copyGameLink() {
    const text = `🎮 Vào chơi thử Game Hứng Sản Phẩm Bằng Bàn Tay AI cùng mình nè: ${window.location.href}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Đã sao chép link game kèm lời mời! Bạn có thể dán gửi cho bạn bè ngay.');
    });
  }

  // ================= LEADERBOARD LOGIC =================
  loadLeaderboard() {
    try {
      const data = localStorage.getItem('arcade_leaderboard');
      if (data) return JSON.parse(data);
    } catch (e) {}

    // Default mock champions
    return [
      { name: "ProGamer_VN", score: 68, combo: 12, rank: "S", date: "Hôm nay" },
      { name: "SuperCat", score: 45, combo: 8, rank: "A", date: "Hôm nay" },
      { name: "ArcadeFan99", score: 32, combo: 5, rank: "A", date: "Hôm qua" },
      { name: "LuckyCatch", score: 24, combo: 4, rank: "B", date: "Hôm qua" },
      { name: "Newbie_Tuan", score: 18, combo: 3, rank: "B", date: "Hôm kia" }
    ];
  }

  saveScoreToLeaderboard() {
    const name = (this.goPlayerName.value || 'Người Chơi Pro').trim();
    const rankInfo = this.engine.getRank();

    const newEntry = {
      name: name,
      score: this.engine.score,
      combo: this.engine.maxCombo,
      rank: rankInfo.rank,
      date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    this.leaderboard.push(newEntry);
    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard = this.leaderboard.slice(0, 10);

    localStorage.setItem('arcade_leaderboard', JSON.stringify(this.leaderboard));
    this.goSaveFeedback.textContent = '✓ Đã ghi danh lên Bảng Xếp Hạng!';
    this.goSaveScoreBtn.disabled = true;
  }

  openLeaderboardModal() {
    this.renderLeaderboardTable();
    this.leaderboardModal.style.display = 'flex';
  }

  renderLeaderboardTable() {
    this.lbTableBody.innerHTML = '';
    this.leaderboard.forEach((entry, idx) => {
      const row = document.createElement('tr');
      const rankNum = idx + 1;
      const rankClass = rankNum <= 3 ? `top-${rankNum}` : '';

      const badgeColors = { S: '#F59E0B', A: '#10B981', B: '#06B6D4', C: '#F43F5E' };
      const col = badgeColors[entry.rank] || '#CBD5E1';

      row.innerHTML = `
        <td class="lb-rank-num ${rankClass}">${rankNum === 1 ? '🥇' : (rankNum === 2 ? '🥈' : (rankNum === 3 ? '🥉' : rankNum))}</td>
        <td style="font-weight: 700;">${entry.name}</td>
        <td style="font-family: 'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif; font-weight: 800; color: #34D399;">${entry.score}</td>
        <td style="color: #FBBF24;">x${entry.combo}</td>
        <td><span class="lb-badge" style="background: ${col}25; color: ${col}; border: 1px solid ${col};">${entry.rank}</span></td>
        <td style="color: #94A3B8; font-size: 0.78rem;">${entry.date}</td>
      `;
      this.lbTableBody.appendChild(row);
    });
  }
}

// Initialize when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.arcadeGame = new WebArcadeApp();
});
