/**
 * ============================================================
 * 🎮 HỨNG SẢN PHẨM ARCADE • POP & COLORFUL ARCADE EDITION
 * Client-Side AI Hand Tracking with Google MediaPipe Tasks Vision
 * 100% Zero-Latency In-Browser Canvas 2D Game Loop
 * ============================================================
 */

import {
  FilesetResolver,
  HandLandmarker
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
      this.cache[name] = audio;
    });
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
    if (this.enabled) this.play('catch');
    return this.enabled;
  }

  play(name) {
    if (!this.enabled) return;
    this.initContext();

    const audio = this.cache[name];
    if (audio) {
      try {
        audio.currentTime = 0;
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
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
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
  constructor(x, y, size, speed, imageIdx, wobblePhase = 0) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.image = imageIdx;
    this.wobblePhase = wobblePhase;
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
      this.items.push(new Item(randX, -this.size, this.size, randSpeed, randImg, randPhase));
      this.spawnIn += this.interval;
    }

    const events = [];
    const keep = [];

    for (const item of this.items) {
      const oldY = item.y;
      item.y += item.speed * dt;
      item.wobblePhase += dt * 3.0;

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

    // Products & Images
    this.productImages = [];
    this.autoRemoveBg = true;

    // MediaPipe Hand Landmarker
    this.handLandmarker = null;
    this.isModelLoading = false;
    this.cameraStream = null;
    this.detectedHands = [];
    this.handLandmarksList = [];

    // Loop timing
    this.lastTime = performance.now();
    this.idleTime = 0;

    this.initDOM();
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
    this.fileInput = document.getElementById('product-file-input');
    this.resetDefaultBtn = document.getElementById('reset-default-products-btn');
    this.autoRemoveBgChk = document.getElementById('auto-remove-bg-chk');

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

    // Welcome start buttons
    document.getElementById('welcome-start-camera-btn').addEventListener('click', () => {
      this.modeSelect.value = 'camera';
      this.startGame();
    });
    document.getElementById('welcome-start-mouse-btn').addEventListener('click', () => {
      this.modeSelect.value = 'mouse';
      this.startGame();
    });

    // Control bar
    this.mainStartBtn.addEventListener('click', () => this.startGame());
    this.mainPauseBtn.addEventListener('click', () => this.togglePause());

    this.modeSelect.addEventListener('change', (e) => {
      this.mode = e.target.value;
      this.useMouse = (this.mode === 'mouse');
      if (this.useMouse) {
        this.touchHint.style.display = this.isTouchDevice ? 'block' : 'none';
        this.setStatus('🎮 Chế độ Chuột / Cảm ứng: Di chuyển chuột hoặc ngón tay để hứng sản phẩm!');
      } else {
        this.touchHint.style.display = 'none';
        this.setStatus('📷 Chế độ Webcam: Bàn tay thật đang hoạt động.');
      }
    });

    this.settingsToggleBtn.addEventListener('click', () => {
      const isHidden = this.settingsDrawer.style.display === 'none';
      this.settingsDrawer.style.display = isHidden ? 'flex' : 'none';
      this.settingsToggleBtn.textContent = isHidden ? '⚙️ Cài đặt ▲' : '⚙️ Cài đặt ▼';
    });

    // Presets
    document.getElementById('preset-easy-btn').addEventListener('click', (e) => this.applyPreset(130, 1.5, 60, e.target));
    document.getElementById('preset-normal-btn').addEventListener('click', (e) => this.applyPreset(180, 1.2, 60, e.target));
    document.getElementById('preset-hard-btn').addEventListener('click', (e) => this.applyPreset(260, 0.8, 60, e.target));

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

    // Product Management
    this.fileInput.addEventListener('change', (e) => this.handleCustomImagesUpload(e));
    this.resetDefaultBtn.addEventListener('click', () => this.loadDefaultProducts());
    this.autoRemoveBgChk.addEventListener('change', (e) => {
      this.autoRemoveBg = e.target.checked;
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

  // Load 6 Default Images
  async loadDefaultProducts() {
    this.productImages = [];
    const promises = DEFAULT_PRODUCT_URLS.map((url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ img, url });
        img.onerror = () => resolve(null);
        img.src = url;
      });
    });

    const results = await Promise.all(promises);
    this.productImages = results.filter(Boolean);
    this.renderThumbnails();
  }

  // Render Product Thumbnails Tray
  renderThumbnails() {
    this.thumbsList.innerHTML = '';
    this.productCountLabel.textContent = `(${this.productImages.length} ảnh)`;

    this.productImages.forEach((item, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'thumb-item';
      thumb.title = `Sản phẩm ${idx + 1}`;

      const img = document.createElement('img');
      img.src = item.url;
      thumb.appendChild(img);

      if (this.productImages.length > 1) {
        const delBtn = document.createElement('button');
        delBtn.className = 'thumb-delete-btn';
        delBtn.innerHTML = '✕';
        delBtn.title = 'Xóa ảnh này';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.productImages.splice(idx, 1);
          this.renderThumbnails();
        });
        thumb.appendChild(delBtn);
      }

      this.thumbsList.appendChild(thumb);
    });

    if (this.engine) {
      this.engine.images = Math.max(1, this.productImages.length);
    }
  }

  // Handle Custom Uploaded Photos + Client-Side Canvas Background Removal
  async handleCustomImagesUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    this.setStatus(`⏳ Đang xử lý ${files.length} ảnh sản phẩm...`);

    for (const file of files) {
      const dataUrl = await this.readFileAsDataURL(file);
      const rawImg = await this.loadImageElement(dataUrl);

      let processedUrl = dataUrl;
      if (this.autoRemoveBg) {
        processedUrl = this.removeImageBackground(rawImg);
      }

      const finalImg = await this.loadImageElement(processedUrl);
      this.productImages.push({ img: finalImg, url: processedUrl });
    }

    this.renderThumbnails();
    this.setStatus(`✅ Đã thêm ${files.length} ảnh sản phẩm vào kho ngẫu nhiên!`);
    event.target.value = '';
  }

  readFileAsDataURL(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  loadImageElement(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }

  // Fast Client-Side Canvas Background Remover (Studio White / Corner Color Removal)
  removeImageBackground(img) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = img.naturalWidth || img.width;
    offCanvas.height = img.naturalHeight || img.height;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0);

    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imgData.data;
    const len = data.length;

    // Sample top-left corner color as baseline
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];

    const threshold = 35;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Check distance to corner background or near pure white
      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      const isWhite = r > 230 && g > 230 && b > 230;

      if (dist < threshold || isWhite) {
        data[i + 3] = 0; // Alpha = 0 (Transparent)
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    return offCanvas.toDataURL('image/png');
  }

  // Settings Presets
  applyPreset(speed, interval, duration, targetBtn) {
    document.getElementById('cfg-speed').value = speed;
    document.getElementById('cfg-interval').value = interval;
    document.getElementById('cfg-duration').value = duration;

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    if (targetBtn) targetBtn.classList.add('active');
  }

  getSettingsFromInputs() {
    return {
      gain: Math.max(1, parseInt(document.getElementById('cfg-gain').value || '1', 10)),
      loss: Math.max(0, parseInt(document.getElementById('cfg-loss').value || '1', 10)),
      speed: Math.max(50, parseFloat(document.getElementById('cfg-speed').value || '180')),
      interval: Math.max(0.3, parseFloat(document.getElementById('cfg-interval').value || '1.2')),
      size: Math.max(30, parseInt(document.getElementById('cfg-size').value || '68', 10)),
      duration: Math.max(0, parseInt(document.getElementById('cfg-duration').value || '60', 10)),
      voucherPts: Math.max(5, parseInt(document.getElementById('cfg-voucher').value || '15', 10)),
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

    this.useMouse = (this.modeSelect.value === 'mouse');

    this.sound.play('countdown');

    if (this.useMouse) {
      this.running = true;
      this.touchHint.style.display = this.isTouchDevice ? 'block' : 'none';
      this.setStatus('🎮 Chế độ Chuột: Di chuyển trong khung để hứng sản phẩm rơi!');
      return;
    }

    // Camera Mode: Initialize MediaPipe & Webcam
    if (!this.handLandmarker) {
      await this.initMediaPipe();
    } else {
      if (!this.cameraStream) {
        await this.startWebcam();
      }
    }

    this.running = true;
    this.setStatus('📷 Camera sẵn sàng! Đưa bàn tay vào khung hình để bắt đầu hứng quà!');
  }

  // MediaPipe Vision HandLandmarker Initializer
  async initMediaPipe() {
    this.loadingOverlay.style.display = 'flex';
    this.loaderStatusText.textContent = 'Đang tải mô hình AI nhận diện bàn tay MediaPipe...';

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.loaderStatusText.textContent = 'Đang bật Camera webcam của bạn...';
      await this.startWebcam();
      this.loadingOverlay.style.display = 'none';
    } catch (err) {
      console.error("MediaPipe Init Error:", err);
      this.loadingOverlay.style.display = 'none';
      this.setStatus('⚠️ Không thể bật Camera (hoặc bị chặn). Tự động chuyển sang Chế độ Chuột!');
      this.modeSelect.value = 'mouse';
      this.useMouse = true;
      this.running = true;
    }
  }

  // Start Webcam Video Stream
  async startWebcam() {
    try {
      const constraints = {
        video: {
          width: { ideal: 960 },
          height: { ideal: 540 },
          facingMode: "user"
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.cameraStream = stream;
      this.video.srcObject = stream;
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
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

  // Render Idle Background when game not running
  renderIdle(timestamp) {
    // Subtle cyberpunk background grid
    this.ctx.fillStyle = '#0F0B26';
    this.ctx.fillRect(0, 0, W, H);

    // Glowing arcade circles
    const pulse = Math.sin(timestamp * 0.003) * 15;
    this.ctx.beginPath();
    this.ctx.arc(W / 2, H / 2, 160 + pulse, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(W / 2, H / 2, 220 + pulse * 1.5, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  // Main Active Game Frame
  updateAndRenderGame(dt, timestamp) {
    let hands = [];
    this.handLandmarksList = [];

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
      this.ctx.fillStyle = '#110D2C';
      this.ctx.fillRect(0, 0, W, H);

      if (this.mousePos) {
        const mx = this.mousePos.x;
        const my = this.mousePos.y;
        hands.push({ left: mx - 75, top: my - 12, right: mx + 75, bottom: my + 16 });
      }
    } else {
      // Camera Video Frame Render (Mirrored selfie view)
      if (this.video && this.video.readyState >= 2) {
        this.ctx.save();
        this.ctx.translate(W, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, 0, 0, W, H);
        this.ctx.restore();

        // Darken camera slightly for vibrant neon contrast
        this.ctx.fillStyle = 'rgba(11, 8, 30, 0.28)';
        this.ctx.fillRect(0, 0, W, H);

        // AI Hand Detection
        if (this.handLandmarker) {
          try {
            const detections = this.handLandmarker.detectForVideo(this.video, timestamp);
            if (detections && detections.landmarks) {
              for (const landmarks of detections.landmarks) {
                this.handLandmarksList.push(landmarks);

                // Palm + finger roots: points [0, 5, 9, 13, 17]
                // Mirrored coordinates: (1.0 - lm.x)
                const palmPoints = [0, 5, 9, 13, 17].map(i => {
                  return {
                    x: (1.0 - landmarks[i].x) * W,
                    y: landmarks[i].y * H
                  };
                });

                const xs = palmPoints.map(p => p.x);
                const ys = palmPoints.map(p => p.y);
                const left = Math.min(...xs) - 20;
                const right = Math.max(...xs) + 20;
                const top = Math.min(...ys) - 14;
                const bottom = Math.max(...ys) + 14;

                hands.push({ left, top, right, bottom });
              }
            }
          } catch (e) {}
        }
      }
    }

    // 2. DRAW HAND SKELETON / SHIELDS
    if (this.showShieldChk.checked) {
      if (this.useMouse && this.mousePos) {
        const mx = this.mousePos.x;
        const my = this.mousePos.y;

        // Arcade Catcher Saucer
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.ellipse(mx, my + 8, 80, 16, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(30, 27, 75, 0.85)';
        this.ctx.strokeStyle = '#06B6D4';
        this.ctx.lineWidth = 3;
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(mx - 75, my);
        this.ctx.lineTo(mx + 75, my);
        this.ctx.strokeStyle = '#38BDF8';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(mx, my + 10, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = '#F59E0B';
        this.ctx.strokeStyle = '#FEF08A';
        this.ctx.lineWidth = 2;
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#38BDF8';
        this.ctx.font = 'bold 10px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✨ ĐĨA HỨNG ✨', mx, my - 16);
        this.ctx.restore();
      } else {
        // Draw MediaPipe Hand Skeletons
        for (const lms of this.handLandmarksList) {
          const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],        // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],        // Index
            [5, 9], [9, 10], [10, 11], [11, 12],    // Middle
            [9, 13], [13, 14], [14, 15], [15, 16], // Ring
            [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
            [0, 17]                                // Palm Base
          ];

          this.ctx.save();
          this.ctx.strokeStyle = '#38BDF8';
          this.ctx.lineWidth = 2;

          for (const [p1, p2] of connections) {
            const x1 = (1.0 - lms[p1].x) * W;
            const y1 = lms[p1].y * H;
            const x2 = (1.0 - lms[p2].x) * W;
            const y2 = lms[p2].y * H;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
          }

          // Tip & Palm Dots
          [4, 8, 12, 16, 20, 0, 9].forEach((idx) => {
            const px = (1.0 - lms[idx].x) * W;
            const py = lms[idx].y * H;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            this.ctx.fillStyle = [4, 8, 12, 16, 20].includes(idx) ? '#F472B6' : '#34D399';
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1.5;
            this.ctx.fill();
            this.ctx.stroke();
          });
          this.ctx.restore();
        }

        // Glowing Catch Shields
        for (const h of hands) {
          const cx = (h.left + h.right) / 2;

          this.ctx.save();
          // Energy Line Top Barrier
          this.ctx.beginPath();
          this.ctx.moveTo(h.left - 5, h.top);
          this.ctx.lineTo(h.right + 5, h.top);
          this.ctx.strokeStyle = '#34D399';
          this.ctx.lineWidth = 5;
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.moveTo(h.left, h.top);
          this.ctx.lineTo(h.right, h.top);
          this.ctx.strokeStyle = '#A7F3D0';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();

          // Dashed aura
          this.ctx.strokeStyle = '#06B6D4';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([4, 3]);
          this.ctx.strokeRect(h.left, h.top, h.right - h.left, h.bottom - h.top);
          this.ctx.setLineDash([]);

          // Corner brackets
          const cw = 14;
          this.ctx.strokeStyle = '#FCD34D';
          this.ctx.lineWidth = 3;
          [
            [h.left, h.top, cw, 0, 0, cw],
            [h.right, h.top, -cw, 0, 0, cw],
            [h.left, h.bottom, cw, 0, 0, -cw],
            [h.right, h.bottom, -cw, 0, 0, -cw]
          ].forEach(([bx, by, dx, dy, ex, ey]) => {
            this.ctx.beginPath();
            this.ctx.moveTo(bx + dx, by + dy);
            this.ctx.lineTo(bx, by);
            this.ctx.lineTo(bx + ex, by + ey);
            this.ctx.stroke();
          });

          // Label
          this.ctx.fillStyle = '#34D399';
          this.ctx.font = 'bold 10px Outfit';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('✦ BÀN TAY HỨNG ✦', cx, h.top - 12);
          this.ctx.restore();
        }
      }
    }

    // 3. ENGINE UPDATE
    if (!this.paused) {
      const events = this.engine.update(dt, hands);
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

    // 4. DRAW FALLING ITEMS
    for (const item of this.engine.items) {
      const imgObj = this.productImages[item.image % this.productImages.length];
      const wobble = Math.sin(item.wobblePhase) * 6;
      const rx = item.x + shakeDx + wobble;
      const ry = item.y + shakeDy;

      // Drop Shadow
      this.ctx.beginPath();
      this.ctx.ellipse(rx + item.size / 2, ry + item.size + 4, item.size * 0.4, item.size * 0.15, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(10, 8, 29, 0.45)';
      this.ctx.fill();

      // Product Image
      if (imgObj && imgObj.img) {
        this.ctx.drawImage(imgObj.img, rx, ry, item.size, item.size);
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

    // 7. DRAW FLOATING TEXTS
    this.floatTexts = this.floatTexts.filter(ft => ft.update(dt));
    for (const ft of this.floatTexts) {
      this.ctx.save();
      this.ctx.font = `bold ${ft.size}px Outfit, sans-serif`;
      this.ctx.textAlign = 'center';

      // Shadow
      this.ctx.fillStyle = '#000000';
      this.ctx.fillText(ft.text, ft.x + 25 + 2, ft.y + 2);

      // Color
      this.ctx.fillStyle = ft.color;
      this.ctx.fillText(ft.text, ft.x + 25, ft.y);
      this.ctx.restore();
    }

    // 8. IN-GAME HUD OVERLAYS
    this.renderHUD(timestamp);

    // 9. PAUSED SCREEN OVERLAY
    if (this.paused) {
      this.ctx.fillStyle = 'rgba(11, 9, 27, 0.7)';
      this.ctx.fillRect(0, 0, W, H);

      this.ctx.save();
      this.ctx.fillStyle = '#181438';
      this.ctx.strokeStyle = '#6366F1';
      this.ctx.lineWidth = 3;
      this.ctx.fillRect(W / 2 - 200, H / 2 - 70, 400, 140);
      this.ctx.strokeRect(W / 2 - 200, H / 2 - 70, 400, 140);

      this.ctx.fillStyle = '#FBBF24';
      this.ctx.font = 'bold 26px Orbitron';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⏸ TẠM DỪNG', W / 2, H / 2 - 15);

      this.ctx.fillStyle = '#E2E8F0';
      this.ctx.font = '14px Outfit';
      this.ctx.fillText('Nhấn Space hoặc nút Tạm dừng để tiếp tục', W / 2, H / 2 + 30);
      this.ctx.restore();
    }

    // 10. GAME OVER TRIGGER
    if (this.engine.finished && !this.gameoverModal.style.display || this.gameoverModal.style.display === 'none') {
      if (this.engine.finished && this.running) {
        this.onGameOver();
      }
    }
  }

  // Draw Vibrant Arcade HUD
  renderHUD(timestamp) {
    // Top-Left HUD (Score & Highscore)
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(17, 14, 45, 0.85)';
    this.ctx.strokeStyle = '#4F46E5';
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(14, 12, 270, 76);
    this.ctx.strokeRect(14, 12, 270, 76);

    this.ctx.fillStyle = '#FDE047';
    this.ctx.font = 'bold 20px Orbitron';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`⭐ ĐIỂM: ${this.engine.score}`, 26, 42);

    this.ctx.fillStyle = '#94A3B8';
    this.ctx.font = 'bold 11px Outfit';
    this.ctx.fillText(`🏆 Kỷ lục: ${this.highScore}  •  Max Combo: ${this.engine.maxCombo}`, 26, 70);

    // Top-Center Combo Banner
    if (this.engine.combo >= 2) {
      const isFever = this.engine.combo >= 5;
      const cbText = isFever ? `⚡ SUPER COMBO x${this.engine.combo}!!` : `🔥 COMBO x${this.engine.combo}!`;
      const cbCol = isFever ? '#EC4899' : '#F59E0B';
      const pulse = Math.sin(timestamp * 0.012) * 4;

      this.ctx.fillStyle = 'rgba(31, 19, 56, 0.9)';
      this.ctx.strokeStyle = cbCol;
      this.ctx.lineWidth = 2;
      this.ctx.fillRect(W / 2 - 140, 14 + pulse, 280, 46);
      this.ctx.strokeRect(W / 2 - 140, 14 + pulse, 280, 46);

      this.ctx.fillStyle = cbCol;
      this.ctx.font = 'bold 17px Orbitron';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(cbText, W / 2, 43 + pulse);
    }

    // Top-Right HUD (Time & Accuracy)
    const remaining = Math.max(0, Math.ceil(this.engine.duration - this.engine.elapsed));
    const timeText = this.engine.duration ? `${remaining}s` : '∞';

    this.ctx.fillStyle = 'rgba(17, 14, 45, 0.85)';
    this.ctx.strokeStyle = '#4F46E5';
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(W - 270, 12, 256, 76);
    this.ctx.strokeRect(W - 270, 12, 256, 76);

    const timeCol = remaining > 20 ? '#34D399' : (remaining > 10 ? '#F59E0B' : '#EF4444');
    this.ctx.fillStyle = timeCol;
    this.ctx.font = 'bold 18px Orbitron';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`⏳ Thời gian: ${timeText}`, W - 256, 40);

    // Timer Progress Bar
    if (this.engine.duration) {
      const barW = 228;
      const prog = remaining / this.engine.duration;
      this.ctx.fillStyle = '#1E1B4B';
      this.ctx.fillRect(W - 256, 50, barW, 6);
      this.ctx.fillStyle = timeCol;
      this.ctx.fillRect(W - 256, 50, barW * prog, 6);
    }

    const acc = this.engine.accuracy;
    this.ctx.fillStyle = '#CBD5E1';
    this.ctx.font = 'bold 11px Outfit';
    this.ctx.fillText(`🎯 Bắt: ${this.engine.caught}  •  Hụt: ${this.engine.missed} (${acc.toFixed(0)}%)`, W - 256, 72);

    // Hand indicator alert if hands not detected in camera mode
    if (!this.useMouse && this.handLandmarksList.length === 0) {
      this.ctx.fillStyle = 'rgba(49, 19, 19, 0.85)';
      this.ctx.strokeStyle = '#EF4444';
      this.ctx.lineWidth = 1;
      this.ctx.fillRect(W / 2 - 200, H - 42, 400, 30);
      this.ctx.strokeRect(W / 2 - 200, H - 42, 400, 30);

      this.ctx.fillStyle = '#FCA5A5';
      this.ctx.font = 'bold 12px Outfit';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚠️ Chưa thấy bàn tay — Hãy đưa tay vào trước webcam!', W / 2, H - 22);
    }
    this.ctx.restore();
  }

  // ================= GAME OVER MODAL =================
  onGameOver() {
    this.running = false;
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
    this.modalVoucherCode.textContent = this.voucherCode;
    this.voucherModal.style.display = 'flex';
  }

  closeVoucherModal() {
    this.voucherModal.style.display = 'none';
    if (this.running) this.paused = false;
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
        <td style="font-family: Orbitron; font-weight: 800; color: #34D399;">${entry.score}</td>
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
