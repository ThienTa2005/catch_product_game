"""Sound effects manager for the Arcade Game."""
from pathlib import Path
import os
import threading

BASE = Path(__file__).resolve().parent
SOUNDS_DIR = BASE / "assets" / "sounds"

class SoundManager:
    def __init__(self):
        self.enabled = True
        self.can_play = os.name == 'nt'
        if self.can_play:
            try:
                import winsound
                self.winsound = winsound
            except ImportError:
                self.can_play = False
        else:
            self.can_play = False

    def toggle(self) -> bool:
        self.enabled = not self.enabled
        return self.enabled

    def play(self, sound_name: str):
        if not self.enabled or not self.can_play:
            return
        
        sound_path = SOUNDS_DIR / f"{sound_name}.wav"
        if not sound_path.exists():
            return
        
        def _play():
            try:
                self.winsound.PlaySound(
                    str(sound_path),
                    self.winsound.SND_FILENAME | self.winsound.SND_ASYNC | self.winsound.SND_NODEFAULT
                )
            except Exception:
                pass
        
        threading.Thread(target=_play, daemon=True).start()

sound_manager = SoundManager()
