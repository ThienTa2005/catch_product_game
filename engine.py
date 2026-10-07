"""Game rules independent of camera/UI; coordinates measured in pixels."""
from dataclasses import dataclass
import math
import random

@dataclass
class Item:
    x: float
    y: float
    size: int
    speed: float
    image: int
    wobble_phase: float = 0.0
    angle: float = 0.0
    base_angle: float = 0.0
    rot_speed: float = 0.0
    orientation_mode: str = 'vertical'

def catches(item, old_y, hands):
    # Swept bottom edge avoids skipping a hand at low frame rates.
    for left, top, right, bottom in hands:
        if (item.x + item.size > left and item.x < right
                and old_y + item.size <= bottom
                and item.y + item.size >= top):
            return True
    return False

class Game:
    def __init__(self, width=960, height=540, gain=1, loss=1, speed=180,
                 interval=1.2, size=68, duration=60, images=1):
        self.width, self.height = width, height
        self.gain, self.loss, self.speed = gain, loss, speed
        self.interval, self.size, self.duration = interval, size, duration
        self.images = max(images, 1)
        self.reset()

    def reset(self):
        self.score = self.caught = self.missed = 0
        self.combo = self.max_combo = 0
        self.elapsed = 0.0
        self.spawn_in = 0.4
        self.items = []
        self.finished = False

    @property
    def accuracy(self) -> float:
        total = self.caught + self.missed
        return (self.caught / total * 100.0) if total > 0 else 100.0

    def get_rank(self) -> tuple[str, str, str]:
        """Return (Rank letter, Title, Hex color) based on performance."""
        acc = self.accuracy
        if self.score >= 50 or (self.caught >= 30 and acc >= 90):
            return 'S', 'Huyền Thoại Bắt Quà! 👑', '#F59E0B'
        elif self.score >= 30 or (self.caught >= 20 and acc >= 80):
            return 'A', 'Tay Hứng Siêu Đẳng! 🌟', '#10B981'
        elif self.score >= 15 or self.caught >= 10:
            return 'B', 'Khá Xuất Sắc! 🚀', '#06B6D4'
        else:
            return 'C', 'Cố Lên Nhé! 🍀', '#F43F5E'

    def update(self, dt, hands):
        if self.finished:
            return []
        if self.duration:
            dt = min(dt, max(0, self.duration - self.elapsed))
        self.elapsed += dt
        self.spawn_in -= dt
        if self.spawn_in <= 0:
            # Vary orientations: Vertical (dọc), Horizontal (ngang), Diagonal (chéo), Tumble (lẫn lộn xoay)
            orient_modes = ['vertical', 'horizontal', 'diagonal_left', 'diagonal_right', 'tumble']
            mode = random.choice(orient_modes)
            
            if mode == 'vertical':
                base_angle = random.choice([0.0, 180.0])
                rot_speed = random.uniform(-15.0, 15.0)
            elif mode == 'horizontal':
                base_angle = random.choice([90.0, 270.0, -90.0])
                rot_speed = random.uniform(-20.0, 20.0)
            elif mode == 'diagonal_left':
                base_angle = random.choice([-35.0, -45.0, -55.0, 135.0])
                rot_speed = random.uniform(-25.0, 25.0)
            elif mode == 'diagonal_right':
                base_angle = random.choice([35.0, 45.0, 55.0, 225.0])
                rot_speed = random.uniform(-25.0, 25.0)
            else: # tumble (xoay lẫn lộn)
                base_angle = random.uniform(0.0, 360.0)
                rot_speed = random.choice([-1.0, 1.0]) * random.uniform(60.0, 120.0)
            
            self.items.append(Item(
                random.uniform(0, max(0, self.width - self.size)),
                -self.size,
                self.size,
                self.speed * random.uniform(0.9, 1.1),
                random.randrange(self.images),
                random.uniform(0, 6.28),
                base_angle,
                base_angle,
                rot_speed,
                mode
            ))
            self.spawn_in += self.interval
        events, keep = [], []
        for item in self.items:
            old_y = item.y
            item.y += item.speed * dt
            item.wobble_phase += dt * 3.0
            
            # Dynamic angle update based on orientation mode
            if item.orientation_mode == 'tumble':
                item.angle = (item.angle + item.rot_speed * dt) % 360.0
            else:
                sway = math.sin(item.wobble_phase) * 10.0
                item.angle = (item.base_angle + sway) % 360.0

            if catches(item, old_y, hands):
                self.combo += 1
                if self.combo > self.max_combo:
                    self.max_combo = self.combo
                self.score += self.gain
                self.caught += 1
                txt = f'+{self.gain}' if self.combo < 2 else f'+{self.gain} 🔥x{self.combo}'
                events.append((item.x, max(35, item.y), txt, True, self.combo))
            elif item.y >= self.height:
                self.combo = 0
                self.score -= self.loss
                self.missed += 1
                events.append((item.x, self.height - 60, f'-{self.loss}', False, 0))
            else:
                keep.append(item)
        self.items = keep
        self.finished = bool(self.duration and self.elapsed >= self.duration)
        return events
