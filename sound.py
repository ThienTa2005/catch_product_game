"""Sound effects and background music manager for the Arcade Game."""
from pathlib import Path
import os
import threading
import ctypes

BASE = Path(__file__).resolve().parent
SOUNDS_DIR = BASE / "assets" / "sounds"

class SoundManager:
    def __init__(self):
        self.enabled = True
        self.can_play = os.name == 'nt'
        self.bgm_playing = False
        self.bgm_paused = False
        self.winmm = None
        self.winsound = None

        if self.can_play:
            try:
                import winsound
                self.winsound = winsound
                self.winmm = ctypes.windll.winmm
            except Exception:
                self.can_play = False

    def toggle(self) -> bool:
        self.enabled = not self.enabled
        if not self.enabled:
            if self.bgm_playing:
                self.pause_bgm()
        else:
            if self.bgm_playing and self.bgm_paused:
                self.resume_bgm()
            self.play('catch')
        return self.enabled

    def play(self, sound_name: str):
        if not self.enabled or not self.can_play or not self.winsound:
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

    def play_bgm(self):
        """Start playing lively looping background music with moderate volume."""
        if not self.enabled or not self.can_play or not self.winmm:
            return
        bgm_path = SOUNDS_DIR / "bgm.wav"
        if not bgm_path.exists():
            return
        
        try:
            self.winmm.mciSendStringW('close bgm', None, 0, None)
            open_cmd = f'open "{str(bgm_path)}" type mpegvideo alias bgm'
            self.winmm.mciSendStringW(open_cmd, None, 0, None)
            # Moderate volume (scale 0-1000, 320 = 32% volume)
            self.winmm.mciSendStringW('setaudio bgm volume to 320', None, 0, None)
            self.winmm.mciSendStringW('play bgm repeat', None, 0, None)
            self.bgm_playing = True
            self.bgm_paused = False
        except Exception:
            pass

    def pause_bgm(self):
        if not self.can_play or not self.winmm or not self.bgm_playing:
            return
        try:
            self.winmm.mciSendStringW('pause bgm', None, 0, None)
            self.bgm_paused = True
        except Exception:
            pass

    def resume_bgm(self):
        if not self.enabled or not self.can_play or not self.winmm or not self.bgm_playing:
            return
        try:
            self.winmm.mciSendStringW('resume bgm', None, 0, None)
            self.bgm_paused = False
        except Exception:
            pass

    def stop_bgm(self):
        if not self.can_play or not self.winmm:
            return
        try:
            self.winmm.mciSendStringW('stop bgm', None, 0, None)
            self.winmm.mciSendStringW('close bgm', None, 0, None)
            self.bgm_playing = False
            self.bgm_paused = False
        except Exception:
            pass

    def close(self):
        self.stop_bgm()

sound_manager = SoundManager()
