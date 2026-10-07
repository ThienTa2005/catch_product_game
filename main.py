"""Arcade Product Catching Game with AI Hand Tracking & Rich Visual FX.
Pop & Colorful Arcade Edition.
"""
from pathlib import Path
import os
import time
import math
import random
import json
import threading
import queue
import urllib.request
import urllib.parse
import webbrowser
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

from PIL import Image, ImageTk, ImageDraw, ImageOps

from engine import Game
from sound import sound_manager
from bg_remover import remove_background

BASE = Path(__file__).resolve().parent

MODEL_URL = ('https://storage.googleapis.com/mediapipe-models/hand_landmarker/'
             'hand_landmarker/float16/1/hand_landmarker.task')
RECORD_FILE = BASE / "highscore.json"
W, H = 960, 540

def load_records():
    if RECORD_FILE.exists():
        try:
            with open(RECORD_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {"high_score": 0, "max_combo": 0, "total_games": 0}

def save_records(data):
    try:
        with open(RECORD_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception:
        pass


class Particle:
    __slots__ = ('x', 'y', 'vx', 'vy', 'color', 'size', 'life', 'max_life', 'shape')

    def __init__(self, x, y, vx, vy, color, size, life, shape='circle'):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.color = color
        self.size = size
        self.life = life
        self.max_life = life
        self.shape = shape

    def update(self, dt):
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vy += 320.0 * dt  # Gravity
        self.vx *= 0.98        # Air resistance
        self.life -= dt
        return self.life > 0


class Shockwave:
    __slots__ = ('x', 'y', 'radius', 'max_radius', 'color', 'life', 'max_life')

    def __init__(self, x, y, max_radius=55, color='#38EF7D'):
        self.x = x
        self.y = y
        self.radius = 12.0
        self.max_radius = max_radius
        self.color = color
        self.life = 0.35
        self.max_life = 0.35

    def update(self, dt):
        self.life -= dt
        prog = 1.0 - (self.life / self.max_life)
        self.radius = 12.0 + (self.max_radius - 12.0) * prog
        return self.life > 0


class FloatingText:
    __slots__ = ('x', 'y', 'text', 'color', 'size', 'life', 'max_life', 'is_combo')

    def __init__(self, x, y, text, color, size=28, is_combo=False):
        self.x = x
        self.y = y
        self.text = text
        self.color = color
        self.size = size
        self.life = 0.85
        self.max_life = 0.85
        self.is_combo = is_combo

    def update(self, dt):
        self.life -= dt
        self.y -= 55.0 * dt
        return self.life > 0


class App:
    def __init__(self, root: tk.Tk):
        self.root = root
        root.title('🎮 HỨNG SẢN PHẨM ARCADE • AI Hand Tracking')
        root.configure(bg='#0F0C24')
        root.minsize(980, 720)

        self.records = load_records()
        self.high_score = self.records.get('high_score', 0)

        self.cap = self.detector = None
        self.running = self.paused = self.loading = self.closed = False
        self.mouse = None
        self.fullscreen = False

        self.particles: list[Particle] = []
        self.shockwaves: list[Shockwave] = []
        self.float_texts: list[FloatingText] = []

        self.shake_duration = 0.0
        self.shake_intensity = 0.0

        self.photos: list[ImageTk.PhotoImage] = []
        self.base_pil_squares: list[Image.Image] = []
        self.rotated_photos_cache: dict = {}
        self.thumb_photos: list[ImageTk.PhotoImage] = []
        self.images: list[Image.Image] = []
        self.paths: list[str] = []
        self.game_over_sound_played = False

        self.jobs = queue.Queue()
        self.frame_id = 0
        self.last_stamp = 0
        self.failures = 0
        self.idle_anim_time = 0.0

        self.voucher_target = 15
        self.voucher_awarded = False
        self.show_voucher_modal = False
        self.voucher_shared = False
        self.voucher_code = "CATCH15-VIP"
        self.share_feedback_time = 0.0

        self.mode = tk.StringVar(value='Webcam / bàn tay thật')
        self.status = tk.StringVar(value='Bấm [▶ Bắt đầu] để bật camera và chơi game!')
        self.show_region = tk.BooleanVar(value=True)
        self.show_settings = tk.BooleanVar(value=False)
        self.auto_remove_bg = tk.BooleanVar(value=True)



        self.apply_theme()
        self.build_ui()

        # Keyboard shortcuts
        root.bind('<space>', self.key_pause)
        root.bind('<F11>', self.toggle_fullscreen)
        root.bind('<Escape>', lambda e: self.exit_fullscreen())
        root.protocol('WM_DELETE_WINDOW', self.close)

        # Load product images from assets/products
        self.load_default_products()
        self.game = Game(images=len(self.images))

        self.previous = time.monotonic()
        root.after(25, self.tick)

    def apply_theme(self):
        style = ttk.Style()
        try:
            style.theme_use('clam')
        except Exception:
            pass

        style.configure('TFrame', background='#0F0C24')
        style.configure('TLabel', background='#0F0C24', foreground='#E2E8F0', font=('Arial', 10))
        style.configure('TCheckbutton', background='#0F0C24', foreground='#CBD5E1', font=('Arial', 10, 'bold'))
        style.map('TCheckbutton', background=[('active', '#0F0C24')])

    def build_ui(self):
        # 1. TOP HEADER BAR
        header = tk.Frame(self.root, bg='#181438', padx=18, pady=10)
        header.pack(fill='x')

        left_box = tk.Frame(header, bg='#181438')
        left_box.pack(side='left')

        badge = tk.Label(left_box, text='✨ POP ARCADE EDITION', fg='#F472B6', bg='#2E1065',
                         font=('Arial', 8, 'bold'), padx=8, pady=2)
        badge.pack(anchor='w', pady=(0, 2))

        title = tk.Label(left_box, text='🎮 HỨNG SẢN PHẨM', fg='#FBBF24', bg='#181438',
                         font=('Arial', 18, 'bold'))
        title.pack(anchor='w')

        right_box = tk.Frame(header, bg='#181438')
        right_box.pack(side='right')

        # Trophy Card
        self.trophy_card = tk.Label(right_box, text=f'🏆 KỶ LỤC: {self.high_score}',
                                    fg='#FCD34D', bg='#282050', font=('Arial', 11, 'bold'),
                                    padx=12, pady=6, relief='ridge', borderwidth=1)
        self.trophy_card.pack(side='left', padx=6)

        # Score Card
        self.score_card = tk.Label(right_box, text='⭐ ĐIỂM: 0',
                                   fg='#34D399', bg='#064E3B', font=('Arial', 14, 'bold'),
                                   padx=16, pady=6, relief='ridge', borderwidth=1)
        self.score_card.pack(side='left', padx=6)

        # Voucher Status Button
        self.voucher_btn = tk.Button(right_box, text=f'🎁 Voucher ({self.voucher_target}đ)',
                                     fg='#FEF08A', bg='#312E81', activebackground='#4338CA',
                                     activeforeground='white', font=('Arial', 10, 'bold'),
                                     padx=10, pady=5, relief='flat', cursor='hand2',
                                     command=self.open_voucher_modal)
        self.voucher_btn.pack(side='left', padx=4)

        # Sound toggle button
        self.sound_btn = tk.Button(right_box, text='🔊 Âm thanh', fg='white', bg='#8B5CF6',
                                   activebackground='#7C3AED', activeforeground='white',
                                   font=('Arial', 10, 'bold'), padx=10, pady=5, relief='flat',
                                   cursor='hand2', command=self.toggle_sound)
        self.sound_btn.pack(side='left', padx=4)

        # Fullscreen button
        fs_btn = tk.Button(right_box, text='⛶ F11', fg='#CBD5E1', bg='#334155',
                           activebackground='#475569', activeforeground='white',
                           font=('Arial', 10, 'bold'), padx=8, pady=5, relief='flat',
                           cursor='hand2', command=self.toggle_fullscreen)
        fs_btn.pack(side='left', padx=4)

        # 2. MAIN CANVAS
        canvas_wrap = tk.Frame(self.root, bg='#0F0C24')
        canvas_wrap.pack(padx=14, pady=(10, 4))

        self.canvas = tk.Canvas(canvas_wrap, width=W, height=H, bg='#161334',
                               highlightthickness=2, highlightbackground='#4F46E5')
        self.canvas.pack()
        self.canvas.bind('<Motion>', self.canvas_motion)
        self.canvas.bind('<Leave>', self.canvas_leave)
        self.canvas.bind('<Button-1>', self.canvas_click)


        # 3. PRODUCT THUMBNAIL GALLERY TRAY
        self.tray_frame = tk.Frame(self.root, bg='#1A163B', padx=12, pady=6)
        self.tray_frame.pack(fill='x', padx=14, pady=4)

        self.tray_label = tk.Label(self.tray_frame, text='📦 KHO SẢN PHẨM RƠI NGẪU NHIÊN (0 ảnh):',
                                   fg='#38BDF8', bg='#1A163B', font=('Arial', 9, 'bold'))
        self.tray_label.pack(side='left', padx=(0, 10))

        self.thumbs_container = tk.Frame(self.tray_frame, bg='#1A163B')
        self.thumbs_container.pack(side='left', fill='x', expand=True)

        tray_actions = tk.Frame(self.tray_frame, bg='#1A163B')
        tray_actions.pack(side='right')

        btn_pick_new = tk.Button(tray_actions, text='📁 Chọn bộ ảnh mới', fg='#1E293B', bg='#FBBF24',
                                 activebackground='#F59E0B', font=('Arial', 9, 'bold'),
                                 relief='flat', padx=8, pady=3, cursor='hand2', command=self.choose_replace)
        btn_pick_new.pack(side='left', padx=3)

        btn_add_more = tk.Button(tray_actions, text='➕ Thêm ảnh', fg='white', bg='#06B6D4',
                                 activebackground='#0891B2', font=('Arial', 9, 'bold'),
                                 relief='flat', padx=8, pady=3, cursor='hand2', command=self.choose_append)
        btn_add_more.pack(side='left', padx=3)

        btn_default = tk.Button(tray_actions, text='↺ Mẫu gốc', fg='#CBD5E1', bg='#475569',
                                activebackground='#64748B', font=('Arial', 9, 'bold'),
                                relief='flat', padx=8, pady=3, cursor='hand2', command=self.load_default_products)
        btn_default.pack(side='left', padx=3)

        bg_chk = ttk.Checkbutton(tray_actions, text='✂️ Tự xóa nền', variable=self.auto_remove_bg)
        bg_chk.pack(side='left', padx=(6, 2))


        # 4. PRIMARY CONTROLS BAR
        controls = tk.Frame(self.root, bg='#181438', padx=14, pady=8)
        controls.pack(fill='x', padx=14, pady=4)

        self.start_button = tk.Button(controls, text='▶ BẮT ĐẦU / CHƠI LẠI', fg='white', bg='#10B981',
                                      activebackground='#059669', activeforeground='white',
                                      font=('Arial', 11, 'bold'), padx=16, pady=6, relief='flat',
                                      cursor='hand2', command=self.start)
        self.start_button.pack(side='left', padx=5)

        self.pause_button = tk.Button(controls, text='⏸ Tạm dừng (Space)', fg='white', bg='#6366F1',
                                      activebackground='#4F46E5', activeforeground='white',
                                      font=('Arial', 10, 'bold'), padx=12, pady=6, relief='flat',
                                      cursor='hand2', command=self.pause)
        self.pause_button.pack(side='left', padx=5)

        tk.Label(controls, text='Chế độ:', fg='#94A3B8', bg='#181438',
                 font=('Arial', 10, 'bold')).pack(side='left', padx=(10, 4))

        mode_cb = ttk.Combobox(controls, textvariable=self.mode, state='readonly', width=22,
                               values=['Webcam / bàn tay thật', 'Thử bằng chuột (không camera)'])
        mode_cb.pack(side='left', padx=4)

        region_cb = ttk.Checkbutton(controls, text='Khiên bàn tay', variable=self.show_region)
        region_cb.pack(side='left', padx=8)

        self.settings_toggle_btn = tk.Button(controls, text='⚙️ Cài đặt ▼', fg='#CBD5E1', bg='#334155',
                                             activebackground='#475569', font=('Arial', 9, 'bold'),
                                             relief='flat', padx=10, pady=5, cursor='hand2',
                                             command=self.toggle_settings_panel)
        self.settings_toggle_btn.pack(side='right', padx=4)

        # 5. EXPANDABLE SETTINGS PANEL
        self.settings_frame = tk.Frame(self.root, bg='#141032', padx=14, pady=8,
                                       highlightthickness=1, highlightbackground='#312E81')
        # (Not packed by default, toggled via self.show_settings)

        self.values = {}
        settings_defs = [
            ('gain', 'Điểm bắt (+)', 1),
            ('loss', 'Điểm trừ (-)', 1),
            ('speed', 'Tốc độ px/s', 180),
            ('interval', 'Nhịp rơi (s)', 1.2),
            ('size', 'Cỡ ảnh px', 68),
            ('duration', 'Thời gian (giây)', 60),
            ('voucher_pts', 'Điểm Voucher', 15),
            ('camera', 'Camera ID', 0)
        ]


        preset_box = tk.Frame(self.settings_frame, bg='#141032')
        preset_box.pack(fill='x', pady=(0, 6))

        tk.Label(preset_box, text='Độ khó nhanh:', fg='#A5B4FC', bg='#141032',
                 font=('Arial', 9, 'bold')).pack(side='left', padx=(0, 6))

        tk.Button(preset_box, text='🍀 Dễ (130px/s, 1.5s)', fg='white', bg='#059669',
                  font=('Arial', 8, 'bold'), relief='flat', padx=6, pady=2, cursor='hand2',
                  command=lambda: self.apply_preset(130, 1.5, 60)).pack(side='left', padx=2)
        tk.Button(preset_box, text='⚡ Tiêu chuẩn (180px/s, 1.2s)', fg='white', bg='#D97706',
                  font=('Arial', 8, 'bold'), relief='flat', padx=6, pady=2, cursor='hand2',
                  command=lambda: self.apply_preset(180, 1.2, 60)).pack(side='left', padx=2)
        tk.Button(preset_box, text='🔥 Thử thách (260px/s, 0.8s)', fg='white', bg='#DC2626',
                  font=('Arial', 8, 'bold'), relief='flat', padx=6, pady=2, cursor='hand2',
                  command=lambda: self.apply_preset(260, 0.8, 60)).pack(side='left', padx=2)

        inputs_grid = tk.Frame(self.settings_frame, bg='#141032')
        inputs_grid.pack(fill='x')

        for col, (key, label, default) in enumerate(settings_defs):
            tk.Label(inputs_grid, text=label, fg='#CBD5E1', bg='#141032',
                     font=('Arial', 8, 'bold')).grid(row=0, column=col, padx=5, sticky='w')
            v = tk.StringVar(value=str(default))
            self.values[key] = v
            e = tk.Entry(inputs_grid, textvariable=v, width=10, bg='#1E1B4B', fg='#F8FAFC',
                         insertbackground='white', relief='flat', font=('Arial', 9))
            e.grid(row=1, column=col, padx=5, pady=3)

        # 6. BOTTOM STATUS BAR
        status_bar = tk.Frame(self.root, bg='#0F0C24', padx=14, pady=4)
        status_bar.pack(fill='x')

        self.status_label = tk.Label(status_bar, textvariable=self.status, fg='#A5B4FC', bg='#0F0C24',
                                     font=('Arial', 9), wraplength=940)
        self.status_label.pack(side='left')

    def toggle_settings_panel(self):
        cur = self.show_settings.get()
        self.show_settings.set(not cur)
        if not cur:
            self.settings_frame.pack(fill='x', padx=14, pady=2, before=self.status_label.master)
            self.settings_toggle_btn.config(text='⚙️ Cài đặt ▲')
        else:
            self.settings_frame.pack_forget()
            self.settings_toggle_btn.config(text='⚙️ Cài đặt ▼')

    def apply_preset(self, speed: float, interval: float, duration: int):
        self.values['speed'].set(str(speed))
        self.values['interval'].set(str(interval))
        self.values['duration'].set(str(duration))

    def toggle_sound(self):
        state = sound_manager.toggle()
        if state:
            self.sound_btn.config(text='🔊 Âm thanh', bg='#8B5CF6')
            sound_manager.play('catch')
        else:
            self.sound_btn.config(text='🔇 Đã tắt', bg='#475569')

    def toggle_fullscreen(self, event=None):
        self.fullscreen = not self.fullscreen
        self.root.attributes('-fullscreen', self.fullscreen)

    def exit_fullscreen(self):
        self.fullscreen = False
        self.root.attributes('-fullscreen', False)

    def key_pause(self, event):
        focused = self.root.focus_get()
        if not isinstance(focused, (ttk.Entry, tk.Entry)):
            self.pause()
            return 'break'

    def canvas_motion(self, event):
        self.mouse = (event.x, event.y)
        ex, ey = event.x, event.y
        cx, cy = W / 2, H / 2
        card_w, card_h = 660, 430
        x1, y1 = cx - card_w / 2, cy - card_h / 2
        x2, y2 = cx + card_w / 2, cy + card_h / 2

        if self.show_voucher_modal:
            # Check button hit areas
            if (x2 - 38 <= ex <= x2 - 10 and y1 + 10 <= ey <= y1 + 38) or \
               (cx - 290 <= ex <= cx - 20 and y1 + 290 <= ey <= y1 + 342) or \
               (cx + 20 <= ex <= cx + 290 and y1 + 290 <= ey <= y1 + 342) or \
               (cx - 180 <= ex <= cx + 40 and y1 + 360 <= ey <= y1 + 402) or \
               (cx + 60 <= ex <= cx + 240 and y1 + 360 <= ey <= y1 + 402) or \
               (cx + 190 <= ex <= cx + 270 and y1 + 122 <= ey <= y1 + 162):
                self.root.config(cursor='hand2')
                return
            self.root.config(cursor='arrow')
            return

        if not self.running and getattr(self, 'game', None) and self.game.finished:
            card_h_go = 430
            # Check voucher button in game over or restart button
            if (self.voucher_awarded or self.game.score >= self.voucher_target) and (cx - 200 <= ex <= cx + 200 and cy + 118 <= ey <= cy + 158):
                self.root.config(cursor='hand2')
                return
            if (cx - 190 <= ex <= cx + 190 and cy + card_h_go / 2 - 45 <= ey <= cy + card_h_go / 2 - 10):
                self.root.config(cursor='hand2')
                return

        self.root.config(cursor='arrow')

    def canvas_leave(self, event):
        self.mouse = None
        self.root.config(cursor='arrow')

    def open_voucher_modal(self):
        self.show_voucher_modal = True
        self.paused = True
        sound_manager.pause_bgm()
        sound_manager.play('voucher')

    def share_voucher(self, open_network=None):
        self.voucher_shared = True
        score_val = max(self.voucher_target, self.game.score if hasattr(self, 'game') else self.voucher_target)
        share_text = (
            f"🎉 Mình vừa xuất sắc đạt {score_val} điểm trong game Hứng Sản Phẩm Arcade!\n"
            f"🎁 Mở khóa thành công Voucher VIP: {self.voucher_code} (Giảm 30% / Quà tặng hấp dẫn)!\n"
            f"👉 Cùng tham gia hứng sản phẩm và săn voucher may mắn ngay nhé!"
        )
        try:
            self.root.clipboard_clear()
            self.root.clipboard_append(share_text)
            self.root.update()
        except Exception:
            pass

        self.share_feedback_time = time.monotonic() + 5.0
        sound_manager.play('fever')
        self.spawn_confetti(W / 2, H / 2, is_combo=True)

        if open_network == 'facebook':
            try:
                encoded = urllib.parse.quote(share_text)
                webbrowser.open(f'https://www.facebook.com/sharer/sharer.php?u=https://arcade.game&quote={encoded}')
            except Exception:
                pass
        elif open_network == 'zalo':
            try:
                webbrowser.open('https://chat.zalo.me')
            except Exception:
                pass

    def canvas_click(self, event):
        ex, ey = event.x, event.y
        cx, cy = W / 2, H / 2
        card_w, card_h = 660, 430
        x1, y1 = cx - card_w / 2, cy - card_h / 2
        x2, y2 = cx + card_w / 2, cy + card_h / 2

        if self.show_voucher_modal:
            # 1. Close X button
            if x2 - 38 <= ex <= x2 - 10 and y1 + 10 <= ey <= y1 + 38:
                self.show_voucher_modal = False
                self.paused = False
                self.root.config(cursor='arrow')
                return

            # 2. Share Journey button
            if cx - 290 <= ex <= cx - 20 and y1 + 290 <= ey <= y1 + 342:
                self.share_voucher()
                return

            # 3. Share to Facebook button
            if cx + 20 <= ex <= cx + 290 and y1 + 290 <= ey <= y1 + 342:
                self.share_voucher(open_network='facebook')
                return

            # 4. Resume Playing button
            if cx - 180 <= ex <= cx + 40 and y1 + 360 <= ey <= y1 + 402:
                self.show_voucher_modal = False
                self.paused = False
                sound_manager.resume_bgm()
                self.root.config(cursor='arrow')
                return

            # 5. Open Zalo button
            if cx + 60 <= ex <= cx + 240 and y1 + 360 <= ey <= y1 + 402:
                self.share_voucher(open_network='zalo')
                return

            # 6. Copy Code only
            if cx + 190 <= ex <= cx + 270 and y1 + 122 <= ey <= y1 + 162:
                try:
                    self.root.clipboard_clear()
                    self.root.clipboard_append(self.voucher_code)
                    self.root.update()
                    self.share_feedback_time = time.monotonic() + 4.0
                    sound_manager.play('catch')
                except Exception:
                    pass
                return
            return

        # Check click during Game Over
        if not self.running and getattr(self, 'game', None) and self.game.finished:
            card_h_go = 430
            # Check if clicked "Xem & Chia sẻ Voucher"
            if self.voucher_awarded or self.game.score >= self.voucher_target:
                if cx - 200 <= ex <= cx + 200 and cy + 118 <= ey <= cy + 158:
                    self.open_voucher_modal()
                    return

            # Restart button
            if cx - 190 <= ex <= cx + 190 and cy + card_h_go / 2 - 45 <= ey <= cy + card_h_go / 2 - 10:
                self.start()
                return

            self.start()


    def update_thumbs_tray(self):
        # Clear existing thumb widgets
        for widget in self.thumbs_container.winfo_children():
            widget.destroy()

        self.thumb_photos.clear()
        self.tray_label.config(text=f'📦 SẢN PHẨM RƠI NGẪU NHIÊN ({len(self.images)} ảnh):')

        # Show up to 10 thumbnails
        max_show = 10
        for i, img in enumerate(self.images[:max_show]):
            thumb = img.copy()
            thumb.thumbnail((36, 36), Image.Resampling.LANCZOS)
            bg = Image.new('RGBA', (36, 36), (0, 0, 0, 0))
            bg.alpha_composite(thumb, ((36 - thumb.width) // 2, (36 - thumb.height) // 2))
            photo = ImageTk.PhotoImage(bg)
            self.thumb_photos.append(photo)

            lbl = tk.Label(self.thumbs_container, image=photo, bg='#282050',
                           relief='solid', borderwidth=1, padx=2, pady=2)
            lbl.pack(side='left', padx=3)

        if len(self.images) > max_show:
            extra = len(self.images) - max_show
            more_lbl = tk.Label(self.thumbs_container, text=f'+{extra} khác',
                                fg='#FCD34D', bg='#1A163B', font=('Arial', 8, 'bold'))
            more_lbl.pack(side='left', padx=4)

    def load_images_from_list(self, paths: list[str], append: bool = False):
        new_images, valid, bad = [], [], []
        do_remove = self.auto_remove_bg.get()
        for path in paths:
            ext = Path(path).suffix.lower()
            if ext not in ('.png', '.jpg', '.jpeg', '.webp', '.bmp'):
                continue
            try:
                with Image.open(path) as im:
                    loaded = ImageOps.exif_transpose(im)
                    if do_remove:
                        loaded = remove_background(loaded)
                    else:
                        loaded = loaded.convert('RGBA')
                    new_images.append(loaded)
                valid.append(str(path))
            except Exception:
                bad.append(Path(path).name)

        if append:
            self.images.extend(new_images)
            self.paths.extend(valid)
        else:
            if new_images:
                self.images = new_images
                self.paths = valid

        if not self.images:
            self.load_default_products()
            return

        self.update_thumbs_tray()
        if bad:
            messagebox.showwarning('Không đọc được một số ảnh',
                                   'Các tệp sau bị lỗi hoặc không đúng định dạng:\n' + '\n'.join(bad))

    def load_default_products(self):
        auto = sorted((BASE / 'assets' / 'products').glob('*'))
        images, valid = [], []
        do_remove = self.auto_remove_bg.get()
        for p in auto:
            if p.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp', '.bmp'):
                try:
                    with Image.open(p) as im:
                        loaded = ImageOps.exif_transpose(im)
                        if do_remove:
                            loaded = remove_background(loaded)
                        else:
                            loaded = loaded.convert('RGBA')
                        images.append(loaded)
                    valid.append(str(p))
                except Exception:
                    pass

        if not images:
            # Fallback simple sprite if no files found
            im = Image.new('RGBA', (120, 120), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            d.rounded_rectangle((25, 20, 95, 100), 16, fill='#F59E0B', outline='#D97706', width=4)
            d.text((40, 50), "★ DEMO", fill='#FFFFFF')
            images = [im]

        self.images, self.paths = images, valid
        self.update_thumbs_tray()
        self.status.set(f'Đã nạp {len(self.images)} sản phẩm mặc định. Bấm Bắt đầu để chơi!')
        if not self.running:
            self.draw_idle()

    def choose_replace(self):
        if self.loading:
            return
        paths = filedialog.askopenfilenames(
            title='Chọn bộ ảnh sản phẩm mới (chọn 1 hoặc nhiều ảnh)',
            filetypes=[('Ảnh sản phẩm', '*.png *.jpg *.jpeg *.webp *.bmp')]
        )
        if paths:
            self.running = False
            self.release()
            self.status.set(f'🔄 Đang nạp và tự động tách nền cho {len(paths)} ảnh...')
            self.root.update_idletasks()
            self.load_images_from_list(paths, append=False)
            self.status.set(f'✅ Đã nạp {len(self.images)} sản phẩm (đã tự động tách nền trong suốt). Nhấn Bắt đầu để chơi!')
            self.draw_idle()

    def choose_append(self):
        if self.loading:
            return
        paths = filedialog.askopenfilenames(
            title='Chọn thêm ảnh sản phẩm vào kho',
            filetypes=[('Ảnh sản phẩm', '*.png *.jpg *.jpeg *.webp *.bmp')]
        )
        if paths:
            self.status.set(f'🔄 Đang nạp và tự động tách nền cho {len(paths)} ảnh mới...')
            self.root.update_idletasks()
            self.load_images_from_list(paths, append=True)
            self.status.set(f'✅ Đã bổ sung thành công! Hiện có {len(self.images)} sản phẩm (đã tách nền) rơi ngẫu nhiên.')
            if self.running:
                # Refresh photos scaling
                self.prepare_game_photos()
                self.game.images = len(self.images)


    def prepare_game_photos(self):
        self.photos = []
        self.base_pil_squares = []
        self.rotated_photos_cache = {}
        sz = self.game.size
        for original in self.images:
            im = original.copy()
            im.thumbnail((sz, sz), Image.Resampling.LANCZOS)
            canvas_square = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
            ox = (sz - im.width) // 2
            oy = (sz - im.height) // 2
            canvas_square.alpha_composite(im, (ox, oy))
            self.base_pil_squares.append(canvas_square)
            self.photos.append(ImageTk.PhotoImage(canvas_square))

    def get_rotated_photo(self, img_idx: int, angle_deg: float):
        if not hasattr(self, 'base_pil_squares') or not self.base_pil_squares:
            return self.photos[img_idx % len(self.photos)]
        idx = img_idx % len(self.base_pil_squares)
        snap_angle = round(angle_deg / 5.0) * 5 % 360
        cache_key = (idx, snap_angle)
        if cache_key in self.rotated_photos_cache:
            return self.rotated_photos_cache[cache_key]
        
        base_img = self.base_pil_squares[idx]
        if snap_angle == 0:
            photo = ImageTk.PhotoImage(base_img)
        else:
            rot_img = base_img.rotate(-snap_angle, resample=Image.Resampling.BILINEAR, expand=False)
            photo = ImageTk.PhotoImage(rot_img)
            
        self.rotated_photos_cache[cache_key] = photo
        return photo

    def draw_idle(self):
        self.canvas.delete('all')
        t = self.idle_anim_time

        # Animated backdrop grid & floating stars
        for i in range(12):
            sx = (math.sin(t * 0.8 + i * 1.5) * 0.5 + 0.5) * W
            sy = (math.cos(t * 0.6 + i * 2.1) * 0.5 + 0.5) * (H - 40)
            star_color = '#FDE68A' if i % 2 == 0 else '#C084FC'
            self.canvas.create_text(sx, sy, text='✦' if i % 2 == 0 else '✧',
                                   fill=star_color, font=('Arial', 12 + (i % 6)))

        # Floating preview products
        if self.images:
            num_preview = min(5, len(self.images))
            spacing = W / (num_preview + 1)
            for i in range(num_preview):
                px = spacing * (i + 1)
                py = 100 + math.sin(t * 2.5 + i) * 15
                if i < len(self.thumb_photos):
                    self.canvas.create_image(px, py, image=self.thumb_photos[i], anchor='center')

        # Title Card
        self.canvas.create_text(W / 2, H / 2 - 50, text='🎮 HỨNG SẢN PHẨM ARCADE ✨',
                               fill='#FDE047', font=('Arial', 26, 'bold'))

        self.canvas.create_text(W / 2, H / 2,
                               text='Đưa bàn tay thật trước camera để đón hứng các sản phẩm đang rơi!\n'
                                    'Bắt liên tiếp để tích lũy COMBO và bùng nổ điểm số!',
                               fill='#E0E7FF', font=('Arial', 14), justify='center')

        # Feature badges
        self.canvas.create_rectangle(W / 2 - 290, H / 2 + 35, W / 2 + 290, H / 2 + 75,
                                    fill='#1E1B4B', outline='#6366F1', width=1)
        self.canvas.create_text(W / 2, H / 2 + 55,
                               text='🖐️ AI Nhận Diện 2 Tay  |  🔥 Combo Streak  |  🔊 Âm Thanh Sống Động  |  📦 Đa Ảnh',
                               fill='#38BDF8', font=('Arial', 11, 'bold'))

        # Start prompt with pulsing glow
        pulse_color = '#34D399' if int(t * 3) % 2 == 0 else '#10B981'
        self.canvas.create_text(W / 2, H / 2 + 115,
                               text='▶ BẤM "BẮT ĐẦU" HOẶC NHẤN SPACE ĐỂ CHƠI NGAY!',
                               fill=pulse_color, font=('Arial', 15, 'bold'))

        self.canvas.create_text(W / 2, H - 25,
                               text='F11: Toàn màn hình  •  Space: Tạm dừng  •  Hỗ trợ tải lên bộ ảnh tùy thích',
                               fill='#94A3B8', font=('Arial', 10))

    def get_settings(self):
        v = {k: float(x.get()) for k, x in self.values.items()}
        bounds = {
            'gain': (0, 10000), 'loss': (0, 10000), 'speed': (20, 1500),
            'interval': (0.1, 10), 'size': (24, 180), 'duration': (0, 3600),
            'voucher_pts': (1, 10000), 'camera': (0, 10)
        }
        for k, (lo, hi) in bounds.items():
            if not lo <= v[k] <= hi:
                raise ValueError(f'{k} phải trong khoảng {lo}–{hi}.')
        for k in ['gain', 'loss', 'size', 'duration', 'voucher_pts', 'camera']:
            if not v[k].is_integer():
                raise ValueError(f'{k} phải là số nguyên.')
            v[k] = int(v[k])
        return v

    def start(self):
        if self.loading:
            return
        try:
            opts = self.get_settings()
        except ValueError as e:
            messagebox.showerror('Kiểm tra cài đặt', str(e))
            return

        self.running = False
        self.release()

        cam = opts.pop('camera')
        self.voucher_target = int(opts.pop('voucher_pts', 15))
        self.voucher_awarded = False
        self.show_voucher_modal = False
        self.voucher_shared = False
        self.voucher_code = f"CATCH{self.voucher_target}-VIP"
        self.voucher_btn.config(text=f'🎁 Voucher ({self.voucher_target}đ)', bg='#312E81')

        self.game = Game(**opts, images=len(self.images))

        self.particles.clear()
        self.shockwaves.clear()
        self.float_texts.clear()
        self.shake_duration = 0.0

        self.paused = False
        self.use_mouse = self.mode.get().startswith('Thử')

        self.prepare_game_photos()

        self.game_over_sound_played = False
        sound_manager.play('countdown')
        sound_manager.play_bgm()

        if self.use_mouse:
            self.running = True
            self.status.set('🎮 Chế độ Chuột: Di chuyển chuột trong khung để hứng vật rơi! (Space: Tạm dừng)')
            return

        self.loading = True
        self.start_button.config(state='disabled')
        self.status.set('🔄 Đang khởi tạo Camera và AI nhận diện bàn tay MediaPipe…')
        threading.Thread(target=self.initialize_camera, args=(cam,), daemon=True).start()

    def initialize_camera(self, camera):
        cap = detector = None
        try:
            import cv2
            import mediapipe as mp

            model = BASE / 'models' / 'hand_landmarker.task'
            model.parent.mkdir(exist_ok=True)
            if not model.exists():
                temp = model.with_suffix('.download')
                try:
                    with urllib.request.urlopen(MODEL_URL, timeout=60) as r, open(temp, 'wb') as f:
                        while True:
                            data = r.read(1024 * 256)
                            if not data:
                                break
                            f.write(data)
                    temp.replace(model)
                finally:
                    temp.unlink(missing_ok=True)

            detector = mp.tasks.vision.HandLandmarker.create_from_options(
                mp.tasks.vision.HandLandmarkerOptions(
                    base_options=mp.tasks.BaseOptions(model_asset_path=str(model)),
                    running_mode=mp.tasks.vision.RunningMode.VIDEO,
                    num_hands=2,
                    min_hand_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
            )

            cap = cv2.VideoCapture(camera, cv2.CAP_DSHOW) if os.name == 'nt' else cv2.VideoCapture(camera)
            if not cap.isOpened():
                cap.release()
                cap = cv2.VideoCapture(camera)
            if not cap.isOpened():
                raise RuntimeError('Không mở được camera. Vui lòng kiểm tra quyền hoặc đổi Camera ID.')

            cap.set(cv2.CAP_PROP_FRAME_WIDTH, W)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, H)

            if self.closed:
                cap.release()
                detector.close()
                return

            self.jobs.put(('ready', cap, detector, cv2, mp))
        except Exception as e:
            if cap is not None:
                cap.release()
            if detector is not None:
                detector.close()
            self.jobs.put(('error', str(e)))

    def pause(self):
        if self.running and not self.game.finished:
            self.paused = not self.paused
            if self.paused:
                sound_manager.pause_bgm()
                self.status.set('Tạm dừng trò chơi.')
            else:
                sound_manager.resume_bgm()
                self.status.set('Tiếp tục chơi!')

    def trigger_shake(self, intensity=4.0, duration=0.15):
        self.shake_intensity = intensity
        self.shake_duration = duration

    def spawn_confetti(self, x, y, is_combo=False):
        colors = ['#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#A78BFA', '#FFFFFF', '#F87171']
        count = 24 if is_combo else 16
        for _ in range(count):
            ang = random.uniform(0, 6.28)
            spd = random.uniform(90, 320)
            vx = math.cos(ang) * spd
            vy = math.sin(ang) * spd - random.uniform(50, 160)
            col = random.choice(colors)
            sz = random.uniform(3, 7)
            life = random.uniform(0.35, 0.7)
            self.particles.append(Particle(x, y, vx, vy, col, sz, life))

        self.shockwaves.append(Shockwave(x, y, max_radius=60 if is_combo else 45))

    def spawn_miss_particles(self, x, y):
        for _ in range(10):
            vx = random.uniform(-60, 60)
            vy = random.uniform(-100, -20)
            col = random.choice(['#EF4444', '#F87171', '#94A3B8'])
            sz = random.uniform(3, 6)
            life = random.uniform(0.25, 0.45)
            self.particles.append(Particle(x, y, vx, vy, col, sz, life))

    def tick(self):
        if self.closed:
            return

        now = time.monotonic()
        dt = min(now - self.previous, 0.1)
        self.previous = now
        self.idle_anim_time += dt

        # Process background jobs
        try:
            while not self.jobs.empty():
                res = self.jobs.get_nowait()
                self.loading = False
                self.start_button.config(state='normal')
                if res[0] == 'error':
                    self.status.set('Lỗi camera! Bạn có thể chọn chế độ "Thử bằng chuột".')
                    messagebox.showerror('Không khởi động được Camera', res[1])
                else:
                    _, self.cap, self.detector, self.cv2, self.mp = res
                    self.failures = 0
                    self.running = True
                    self.status.set('Camera sẵn sàng! Đưa bàn tay vào khung hình để hứng sản phẩm!')

            if self.running:
                self.render_frame(dt, now)
            else:
                self.draw_idle()
                if self.show_voucher_modal:
                    self.render_voucher_modal(now)

        except Exception as e:
            self.running = False
            self.release()
            self.status.set('Đã dừng do sự cố. Nhấn Bắt đầu để thử lại.')
            messagebox.showerror('Lỗi khi chơi', str(e))

        self.root.after(16, self.tick)

    def render_frame(self, dt: float, now: float):
        hands = []
        self.canvas.delete('all')

        # Camera / Mouse input
        ox, oy = 0, 0
        hand_landmarks_list = []

        if self.use_mouse:
            if self.mouse:
                mx, my = self.mouse
                hands = [(mx - 75, my - 12, mx + 75, my + 16)]
        else:
            ok, frame = self.cap.read()
            if not ok:
                self.failures += 1
                if self.failures > 30:
                    raise RuntimeError('Mất tín hiệu camera. Kiểm tra kết nối webcam rồi bấm Bắt đầu.')
                return
            self.failures = 0
            frame = self.cv2.flip(frame, 1)

            fh, fw = frame.shape[:2]
            scale = min(W / fw, H / fh)
            rw, rh = round(fw * scale), round(fh * scale)
            rgb = self.cv2.cvtColor(self.cv2.resize(frame, (rw, rh)), self.cv2.COLOR_BGR2RGB)

            stamp = max(self.last_stamp + 1, int(now * 1000))
            self.last_stamp = stamp
            result = self.detector.detect_for_video(
                self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=rgb), stamp
            )

            ox, oy = (W - rw) // 2, (H - rh) // 2
            self.camera_photo = ImageTk.PhotoImage(Image.fromarray(rgb))
            self.canvas.create_image(ox, oy, image=self.camera_photo, anchor='nw')

            for landmarks in result.hand_landmarks:
                hand_landmarks_list.append(landmarks)
                # Palm + finger roots
                points = [(landmarks[i].x * rw + ox, landmarks[i].y * rh + oy) for i in (0, 5, 9, 13, 17)]
                xs, ys = zip(*points)
                left, right = min(xs) - 16, max(xs) + 16
                top, bottom = min(ys) - 10, max(ys) + 10
                hands.append((left, top, right, bottom))

        # Screen Shake calculation
        shake_dx, shake_dy = 0.0, 0.0
        if self.shake_duration > 0:
            self.shake_duration -= dt
            shake_dx = random.uniform(-self.shake_intensity, self.shake_intensity)
            shake_dy = random.uniform(-self.shake_intensity, self.shake_intensity)

        # Draw Futuristic Hand Tracking & Catch Shield
        if self.show_region.get():
            if self.use_mouse and self.mouse:
                mx, my = self.mouse
                # Render Cute Arcade Catcher Saucer
                self.canvas.create_oval(mx - 80, my - 8, mx + 80, my + 26,
                                       fill='#1E1B4B', outline='#06B6D4', width=3)
                self.canvas.create_line(mx - 75, my, mx + 75, my,
                                       fill='#38BDF8', width=4)
                self.canvas.create_oval(mx - 15, my + 4, mx + 15, my + 18,
                                       fill='#F59E0B', outline='#FEF08A')
                self.canvas.create_text(mx, my - 18, text='✨ ĐĨA HỨNG ✨',
                                       fill='#38BDF8', font=('Arial', 9, 'bold'))
            else:
                # Draw finger bones & landmarks
                for lms in hand_landmarks_list:
                    connections = [
                        (0, 1), (1, 2), (2, 3), (3, 4),        # Thumb
                        (0, 5), (5, 6), (6, 7), (7, 8),        # Index
                        (5, 9), (9, 10), (10, 11), (11, 12),    # Middle
                        (9, 13), (13, 14), (14, 15), (15, 16), # Ring
                        (13, 17), (17, 18), (18, 19), (19, 20),# Pinky
                        (0, 17)                                 # Palm base
                    ]
                    rw_val, rh_val = (W - 2 * ox), (H - 2 * oy)
                    for p1, p2 in connections:
                        x1 = lms[p1].x * rw_val + ox
                        y1 = lms[p1].y * rh_val + oy
                        x2 = lms[p2].x * rw_val + ox
                        y2 = lms[p2].y * rh_val + oy
                        self.canvas.create_line(x1, y1, x2, y2, fill='#38BDF8', width=2)

                    # Highlight finger tips and palm center
                    for i in (4, 8, 12, 16, 20, 0, 9):
                        px = lms[i].x * rw_val + ox
                        py = lms[i].y * rh_val + oy
                        col = '#F472B6' if i in (4, 8, 12, 16, 20) else '#34D399'
                        self.canvas.create_oval(px - 4, py - 4, px + 4, py + 4, fill=col, outline='white')

                # Draw glowing Catch Shields for each hand
                for left, top, right, bottom in hands:
                    cx = (left + right) / 2
                    # Energy barrier line
                    self.canvas.create_line(left - 5, top, right + 5, top, fill='#34D399', width=5)
                    self.canvas.create_line(left, top, right, top, fill='#A7F3D0', width=2)

                    # Glowing bounding aura
                    self.canvas.create_rectangle(left, top, right, bottom, outline='#06B6D4', width=2, dash=(4, 3))

                    # Corner accents
                    cw = 14
                    for corner_x, corner_y in [(left, top), (right, top), (left, bottom), (right, bottom)]:
                        dx = cw if corner_x == left else -cw
                        dy = cw if corner_y == top else -cw
                        self.canvas.create_line(corner_x, corner_y, corner_x + dx, corner_y, fill='#FCD34D', width=3)
                        self.canvas.create_line(corner_x, corner_y, corner_x, corner_y + dy, fill='#FCD34D', width=3)

                    # Badge label
                    self.canvas.create_text(cx, top - 14, text='✦ BÀN TAY HỨNG ✦',
                                           fill='#34D399', font=('Arial', 9, 'bold'))

        # Engine Update
        if not self.paused:
            events = self.game.update(dt, hands)
            for ev in events:
                x, y, label, good = ev[0], ev[1], ev[2], ev[3]
                combo = ev[4] if len(ev) > 4 else 0

                if good:
                    if combo >= 7:
                        sound_manager.play('fever')
                    elif combo >= 3:
                        sound_manager.play('combo')
                    else:
                        sound_manager.play('catch')

                    self.spawn_confetti(x + self.game.size / 2, y, is_combo=(combo >= 3))
                    self.trigger_shake(intensity=5.0 if combo >= 3 else 3.0)

                    col = '#F59E0B' if combo >= 2 else '#34D399'
                    sz = 34 if combo >= 5 else (30 if combo >= 2 else 26)
                    self.float_texts.append(FloatingText(x, y, label, col, size=sz, is_combo=(combo >= 2)))
                else:
                    sound_manager.play('miss')
                    self.spawn_miss_particles(x + self.game.size / 2, y)
                    self.trigger_shake(intensity=3.5)
                    self.float_texts.append(FloatingText(x, y, label, '#EF4444', size=26))

        # Check High Score
        if self.game.score > self.high_score:
            self.high_score = self.game.score
            self.records['high_score'] = self.high_score
            save_records(self.records)
            self.trophy_card.config(text=f'🏆 KỶ LỤC: {self.high_score}')

        # Check Voucher Unlock
        if self.game.score >= self.voucher_target and not self.voucher_awarded:
            self.voucher_awarded = True
            self.show_voucher_modal = True
            self.paused = True
            self.voucher_btn.config(text='🎁 VOUCHER: ĐÃ MỞ!', bg='#F59E0B')
            sound_manager.pause_bgm()
            sound_manager.play('voucher')
            self.spawn_confetti(W / 2, H / 2, is_combo=True)
            self.status.set(f'🎉 XUẤT SẮC! Bạn đã đạt {self.voucher_target} điểm và mở khóa VOUCHER ĐẶC BIỆT! Hãy chia sẻ để sử dụng!')

        # Draw Falling Product Items with varied orientations (horizontal, vertical, diagonal, tumble)
        for item in self.game.items:
            img_idx = item.image % len(self.photos)
            item_x = item.x + shake_dx
            item_y = item.y + shake_dy
            cx = item_x + item.size / 2
            cy = item_y + item.size / 2

            # Subtle drop shadow
            self.canvas.create_oval(item_x + 6, item_y + item.size - 4,
                                   item_x + item.size - 6, item_y + item.size + 8,
                                   fill='#0A081D', outline='')

            photo = self.get_rotated_photo(img_idx, item.angle)
            self.canvas.create_image(cx, cy, image=photo, anchor='center')

        # Shockwaves rendering
        self.shockwaves = [sw for sw in self.shockwaves if sw.update(dt)]
        for sw in self.shockwaves:
            self.canvas.create_oval(sw.x - sw.radius, sw.y - sw.radius,
                                   sw.x + sw.radius, sw.y + sw.radius,
                                   outline=sw.color, width=2)

        # Particles rendering
        self.particles = [p for p in self.particles if p.update(dt)]
        for p in self.particles:
            self.canvas.create_oval(p.x - p.size, p.y - p.size, p.x + p.size, p.y + p.size,
                                   fill=p.color, outline='')

        # Floating Score Text rendering
        self.float_texts = [ft for ft in self.float_texts if ft.update(dt)]
        for ft in self.float_texts:
            # Text shadow
            self.canvas.create_text(ft.x + 27, ft.y + 2, text=ft.text,
                                   fill='#000000', font=('Arial', ft.size, 'bold'))
            self.canvas.create_text(ft.x + 25, ft.y, text=ft.text,
                                   fill=ft.color, font=('Arial', ft.size, 'bold'))

        # ================= IN-GAME HUD =================
        # Top-Left HUD Card (Score & Record)
        self.canvas.create_rectangle(14, 12, 280, 88, fill='#110E2D', outline='#4F46E5', width=2)
        self.canvas.create_text(26, 32, anchor='w', text=f'⭐ ĐIỂM: {self.game.score}',
                               fill='#FDE047', font=('Arial', 19, 'bold'))
        self.canvas.create_text(26, 64, anchor='w',
                               text=f'🏆 Kỷ lục: {self.high_score}  •  Combo tối đa: {self.game.max_combo}',
                               fill='#94A3B8', font=('Arial', 10, 'bold'))

        # Top-Center Dynamic Combo Badge (when combo >= 2)
        if self.game.combo >= 2:
            cb_text = f'🔥 COMBO x{self.game.combo}!' if self.game.combo < 5 else f'⚡ SUPER COMBO x{self.game.combo}!!'
            cb_color = '#F59E0B' if self.game.combo < 5 else '#EC4899'
            pulse = math.sin(now * 12) * 4
            self.canvas.create_rectangle(W / 2 - 140, 14 + pulse, W / 2 + 140, 60 + pulse,
                                        fill='#1F1338', outline=cb_color, width=2)
            self.canvas.create_text(W / 2, 37 + pulse, text=cb_text,
                                   fill=cb_color, font=('Arial', 16, 'bold'))

        # Top-Right HUD Card (Timer & Accuracy)
        remaining = max(0, int(self.game.duration - self.game.elapsed + 0.999))
        time_text = f'{remaining}s' if self.game.duration else '∞'

        self.canvas.create_rectangle(W - 270, 12, W - 14, 88, fill='#110E2D', outline='#4F46E5', width=2)
        time_col = '#34D399' if remaining > 20 else ('#F59E0B' if remaining > 10 else '#EF4444')
        self.canvas.create_text(W - 256, 32, anchor='w', text=f'⏳ Thời gian: {time_text}',
                               fill=time_col, font=('Arial', 17, 'bold'))

        # Time progress bar
        if self.game.duration:
            bar_w = 230
            prog = remaining / self.game.duration
            self.canvas.create_rectangle(W - 256, 48, W - 256 + bar_w, 54, fill='#1E1B4B', outline='')
            self.canvas.create_rectangle(W - 256, 48, W - 256 + (bar_w * prog), 54, fill=time_col, outline='')

        acc = self.game.accuracy
        self.canvas.create_text(W - 256, 70, anchor='w',
                               text=f'🎯 Bắt: {self.game.caught}  •  Hụt: {self.game.missed}  ({acc:.0f}%)',
                               fill='#CBD5E1', font=('Arial', 10, 'bold'))

        # Update Top Header Score Card
        self.score_card.config(text=f'⭐ ĐIỂM: {self.game.score}')

        # Hand detection status indicator at bottom
        if not hands and not self.use_mouse:
            self.canvas.create_rectangle(W / 2 - 200, H - 42, W / 2 + 200, H - 12,
                                        fill='#311313', outline='#EF4444', width=1)
            self.canvas.create_text(W / 2, H - 27,
                                   text='⚠️ Chưa thấy bàn tay — Hãy đưa tay vào khung hình!',
                                   fill='#FCA5A5', font=('Arial', 11, 'bold'))

        # ================= PAUSE OVERLAY =================
        if self.paused and not self.show_voucher_modal:
            self.canvas.create_rectangle(0, 0, W, H, fill='#0B091B', stipple='gray50')
            self.canvas.create_rectangle(W / 2 - 200, H / 2 - 70, W / 2 + 200, H / 2 + 70,
                                        fill='#181438', outline='#6366F1', width=3)
            self.canvas.create_text(W / 2, H / 2 - 25, text='⏸ TẠM DỪNG',
                                   fill='#FBBF24', font=('Arial', 24, 'bold'))
            self.canvas.create_text(W / 2, H / 2 + 25, text='Nhấn Space hoặc nút Tạm dừng để tiếp tục',
                                   fill='#E2E8F0', font=('Arial', 12))

        # ================= VOUCHER POPUP OVERLAY =================
        if self.show_voucher_modal:
            self.render_voucher_modal(now)

        # ================= GAME OVER / VICTORY OVERLAY =================
        if self.game.finished:
            if not self.game_over_sound_played:
                self.game_over_sound_played = True
                sound_manager.stop_bgm()
                sound_manager.play('gameover')
            if not self.show_voucher_modal:
                self.render_game_over_overlay()

    def render_voucher_modal(self, now: float):
        # 1. Dark backdrop curtain
        self.canvas.create_rectangle(0, 0, W, H, fill='#070517', stipple='gray75')

        # 2. Main Outer Card
        cx, cy = W / 2, H / 2
        card_w, card_h = 660, 430
        x1, y1 = cx - card_w / 2, cy - card_h / 2
        x2, y2 = cx + card_w / 2, cy + card_h / 2

        # Glowing border box
        self.canvas.create_rectangle(x1, y1, x2, y2, fill='#161238', outline='#F59E0B', width=3)
        self.canvas.create_rectangle(x1 + 4, y1 + 4, x2 - 4, y2 - 4, outline='#8B5CF6', width=1)

        # Close X button top right
        self.canvas.create_rectangle(x2 - 38, y1 + 10, x2 - 10, y1 + 38, fill='#2B1A4A', outline='#6366F1')
        self.canvas.create_text(x2 - 24, y1 + 24, text='✕', fill='#F87171', font=('Arial', 14, 'bold'))

        # Header Titles
        score_val = max(self.voucher_target, self.game.score if hasattr(self, 'game') else self.voucher_target)
        self.canvas.create_text(cx, y1 + 32, text=f'🎉 CHÚC MỪNG BẠN ĐẠT {score_val} ĐIỂM! 🎉',
                               fill='#FDE047', font=('Arial', 18, 'bold'))
        self.canvas.create_text(cx, y1 + 56, text='BẠN ĐÃ MỞ KHÓA VOUCHER QUÀ TẶNG ĐẶC BIỆT!',
                               fill='#C084FC', font=('Arial', 11, 'bold'))

        # 3. Voucher Ticket Card
        tx1, ty1 = cx - 290, y1 + 78
        tx2, ty2 = cx + 290, y1 + 195
        self.canvas.create_rectangle(tx1, ty1, tx2, ty2, fill='#25184F', outline='#FBBF24', width=2)
        # Notch cut-outs
        notch_r = 14
        self.canvas.create_oval(tx1 - notch_r, (ty1 + ty2)/2 - notch_r, tx1 + notch_r, (ty1 + ty2)/2 + notch_r, fill='#161238', outline='#FBBF24', width=2)
        self.canvas.create_oval(tx2 - notch_r, (ty1 + ty2)/2 - notch_r, tx2 + notch_r, (ty1 + ty2)/2 + notch_r, fill='#161238', outline='#FBBF24', width=2)

        # Dashed dividing line
        div_x = cx - 100
        self.canvas.create_line(div_x, ty1 + 10, div_x, ty2 - 10, fill='#FBBF24', dash=(5, 3), width=2)

        # Left ticket area
        self.canvas.create_text((tx1 + div_x) / 2, ty1 + 32, text='🏷️ GIẢM 30%', fill='#FDE047', font=('Arial', 17, 'bold'))
        self.canvas.create_text((tx1 + div_x) / 2, ty1 + 58, text='QUÀ TẶNG TRI ÂN', fill='#38BDF8', font=('Arial', 10, 'bold'))
        self.canvas.create_text((tx1 + div_x) / 2, ty1 + 84, text='Áp dụng toàn sàn', fill='#94A3B8', font=('Arial', 9))

        # Right ticket area
        self.canvas.create_text(cx + 90, ty1 + 25, text='MÃ VOUCHER ĐẶC BIỆT:', fill='#CBD5E1', font=('Arial', 10, 'bold'))
        # Code Box
        self.canvas.create_rectangle(cx - 70, ty1 + 42, cx + 180, ty1 + 86, fill='#130D2E', outline='#FDE047', width=2, dash=(6, 3))
        self.canvas.create_text(cx + 55, ty1 + 64, text=self.voucher_code, fill='#FDE047', font=('Arial', 19, 'bold'))

        # Quick Copy Code button
        self.canvas.create_rectangle(cx + 190, ty1 + 44, cx + 270, ty1 + 84, fill='#7C3AED', outline='#A78BFA')
        self.canvas.create_text(cx + 230, ty1 + 64, text='📋 Chép mã', fill='white', font=('Arial', 9, 'bold'))

        self.canvas.create_text(cx + 90, ty1 + 102, text='Hạn sử dụng: 30 ngày kể từ ngày kích hoạt', fill='#94A3B8', font=('Arial', 9))

        # 4. Requirement banner: "Để sử dụng voucher, hãy chia sẻ hành trình cho bạn bè!"
        req_y = y1 + 218
        self.canvas.create_rectangle(cx - 290, req_y - 18, cx + 290, req_y + 22, fill='#311A5E', outline='#F59E0B', width=2)
        self.canvas.create_text(cx, req_y + 2, text='📢 Để sử dụng voucher, hãy chia sẻ hành trình cho bạn bè!',
                               fill='#FDE047', font=('Arial', 12, 'bold'))

        # 5. Share feedback text / status guide
        fb_y = y1 + 265
        if self.voucher_shared or (now < self.share_feedback_time):
            self.canvas.create_text(cx, fb_y, text='✅ ĐÃ SAO CHÉP LỜI CHIA SẺ & MÃ VOUCHER! (VOUCHER ĐÃ KÍCH HOẠT)',
                                   fill='#34D399', font=('Arial', 11, 'bold'))
        else:
            self.canvas.create_text(cx, fb_y, text='👉 Bấm [CHIA SẺ HÀNH TRÌNH] bên dưới để kích hoạt voucher và gửi cho bạn bè!',
                                   fill='#CBD5E1', font=('Arial', 10))

        # 6. Action Buttons
        # Button 1: Share Journey
        bx1, by1 = cx - 290, y1 + 290
        bx2, by2 = cx - 20, y1 + 342
        self.canvas.create_rectangle(bx1, by1, bx2, by2, fill='#059669', outline='#34D399', width=2)
        self.canvas.create_text((bx1 + bx2) / 2, (by1 + by2) / 2, text='📤 CHIA SẺ HÀNH TRÌNH',
                               fill='white', font=('Arial', 13, 'bold'))

        # Button 2: Share to Facebook
        fx1, fy1 = cx + 20, y1 + 290
        fx2, fy2 = cx + 290, y1 + 342
        self.canvas.create_rectangle(fx1, fy1, fx2, fy2, fill='#1877F2', outline='#60A5FA', width=2)
        self.canvas.create_text((fx1 + fx2) / 2, (fy1 + fy2) / 2, text='🌐 CHIA SẺ FACEBOOK',
                               fill='white', font=('Arial', 12, 'bold'))

        # Button 3: Resume Playing
        rx1, ry1 = cx - 180, y1 + 360
        rx2, ry2 = cx + 40, y1 + 402
        self.canvas.create_rectangle(rx1, ry1, rx2, ry2, fill='#0284C7', outline='#38BDF8', width=2)
        self.canvas.create_text((rx1 + rx2) / 2, (ry1 + ry2) / 2, text='▶ TIẾP TỤC CHƠI NGAY',
                               fill='white', font=('Arial', 11, 'bold'))

        # Button 4: Open Zalo
        zx1, zy1 = cx + 60, y1 + 360
        zx2, zy2 = cx + 240, y1 + 402
        self.canvas.create_rectangle(zx1, zy1, zx2, zy2, fill='#0068FF', outline='#93C5FD', width=2)
        self.canvas.create_text((zx1 + zx2) / 2, (zy1 + zy2) / 2, text='💬 MỞ ZALO CHAT',
                               fill='white', font=('Arial', 11, 'bold'))

    def render_game_over_overlay(self):
        # Semi-transparent dark curtain
        self.canvas.create_rectangle(0, 0, W, H, fill='#0B091B', stipple='gray75')

        # Main Victory Card
        card_w, card_h = 580, 430
        cx, cy = W / 2, H / 2
        self.canvas.create_rectangle(cx - card_w / 2, cy - card_h / 2,
                                    cx + card_w / 2, cy + card_h / 2,
                                    fill='#161238', outline='#FBBF24', width=3)

        # Header Title
        self.canvas.create_text(cx, cy - card_h / 2 + 35, text='🎉 HẾT GIỜ! TỔNG KẾT VÁN ĐẤU 🎉',
                               fill='#FDE047', font=('Arial', 19, 'bold'))

        rank, rank_title, rank_color = self.game.get_rank()

        # Rank Announcement Badge
        self.canvas.create_rectangle(cx - 160, cy - card_h / 2 + 65, cx + 160, cy - card_h / 2 + 115,
                                    fill='#231B50', outline=rank_color, width=2)
        self.canvas.create_text(cx, cy - card_h / 2 + 90, text=f'HẠNG {rank}: {rank_title}',
                               fill=rank_color, font=('Arial', 14, 'bold'))

        # High score banner if record reached
        if self.game.score >= self.high_score and self.game.score > 0:
            self.canvas.create_text(cx, cy - card_h / 2 + 130, text='🏆 KỶ LỤC MỚI ĐƯỢC THIẾT LẬP!',
                                   fill='#34D399', font=('Arial', 12, 'bold'))

        # Stats breakdown
        stat_y = cy - 20
        self.canvas.create_text(cx - 120, stat_y, text='⭐ Tổng điểm:', fill='#CBD5E1', font=('Arial', 13))
        self.canvas.create_text(cx + 100, stat_y, text=f'{self.game.score}', fill='#FDE047', font=('Arial', 16, 'bold'))

        self.canvas.create_text(cx - 120, stat_y + 28, text='🎯 Bắt trúng / Bỏ lỡ:', fill='#CBD5E1', font=('Arial', 13))
        self.canvas.create_text(cx + 100, stat_y + 28, text=f'{self.game.caught} / {self.game.missed}', fill='#34D399', font=('Arial', 14, 'bold'))

        self.canvas.create_text(cx - 120, stat_y + 56, text='🔥 Combo cao nhất:', fill='#CBD5E1', font=('Arial', 13))
        self.canvas.create_text(cx + 100, stat_y + 56, text=f'x{self.game.max_combo}', fill='#F59E0B', font=('Arial', 14, 'bold'))

        self.canvas.create_text(cx - 120, stat_y + 84, text='📊 Tỷ lệ chính xác:', fill='#CBD5E1', font=('Arial', 13))
        self.canvas.create_text(cx + 100, stat_y + 84, text=f'{self.game.accuracy:.1f}%', fill='#38BDF8', font=('Arial', 14, 'bold'))

        # Unlocked Voucher claim banner in Game Over
        if self.voucher_awarded or self.game.score >= self.voucher_target:
            self.canvas.create_rectangle(cx - 200, cy + 118, cx + 200, cy + 158,
                                        fill='#25184F', outline='#FBBF24', width=2)
            self.canvas.create_text(cx, cy + 138,
                                   text=f'🎁 VOUCHER: {self.voucher_code} (BẤM ĐỂ XEM & CHIA SẺ)',
                                   fill='#FDE047', font=('Arial', 10, 'bold'))

        # Restart instruction prompt
        self.canvas.create_rectangle(cx - 190, cy + card_h / 2 - 45, cx + 190, cy + card_h / 2 - 10,
                                    fill='#059669', outline='#34D399', width=2)
        self.canvas.create_text(cx, cy + card_h / 2 - 27, text='▶ BẤM VÀO ĐÂY ĐỂ CHƠI LẠI',
                               fill='white', font=('Arial', 13, 'bold'))


    def release(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        if self.detector is not None:
            self.detector.close()
            self.detector = None

    def close(self):
        self.closed = True
        sound_manager.close()
        self.release()
        while not self.jobs.empty():
            res = self.jobs.get_nowait()
            if res[0] == 'ready':
                res[1].release()
                res[2].close()
        self.root.destroy()


if __name__ == '__main__':
    root = tk.Tk()
    App(root)
    root.mainloop()
