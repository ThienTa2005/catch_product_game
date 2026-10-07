"""Generate retro arcade WAV sound effects without external dependencies."""
import math
import struct
import wave
from pathlib import Path

SOUNDS_DIR = Path(__file__).resolve().parent / "assets" / "sounds"
SOUNDS_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 22050

def write_wav(filename: Path, samples: list[float]):
    with wave.open(str(filename), 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        data = bytearray()
        for s in samples:
            val = max(-1.0, min(1.0, s))
            data.extend(struct.pack('<h', int(val * 32767)))
        wf.writeframes(data)

def gen_tone(freq: float, duration: float, decay=True, wave_type='sine'):
    n = int(SAMPLE_RATE * duration)
    res = []
    for i in range(n):
        t = i / SAMPLE_RATE
        if wave_type == 'sine':
            val = math.sin(2 * math.pi * freq * t)
        elif wave_type == 'triangle':
            phase = (freq * t) % 1.0
            val = 4.0 * abs(phase - 0.5) - 1.0
        elif wave_type == 'square':
            val = 0.6 if math.sin(2 * math.pi * freq * t) > 0 else -0.6
        else:
            val = math.sin(2 * math.pi * freq * t)
        
        env = (1.0 - i / n) if decay else 1.0
        res.append(val * env * 0.7)
    return res

def gen_catch():
    # Crisp cheerful high chime (880Hz -> 1320Hz)
    samples = gen_tone(880, 0.05, decay=False, wave_type='triangle')
    samples += gen_tone(1320, 0.12, decay=True, wave_type='sine')
    write_wav(SOUNDS_DIR / "catch.wav", samples)

def gen_combo():
    # Tri-tone arpeggio (C6, E6, G6)
    samples = gen_tone(1046, 0.04, decay=False, wave_type='sine')
    samples += gen_tone(1318, 0.04, decay=False, wave_type='sine')
    samples += gen_tone(1568, 0.14, decay=True, wave_type='triangle')
    write_wav(SOUNDS_DIR / "combo.wav", samples)

def gen_fever():
    # Sparkling fanfare (G5, C6, E6, G6)
    samples = gen_tone(784, 0.05, decay=False, wave_type='sine')
    samples += gen_tone(1046, 0.05, decay=False, wave_type='sine')
    samples += gen_tone(1318, 0.05, decay=False, wave_type='sine')
    samples += gen_tone(2093, 0.22, decay=True, wave_type='triangle')
    write_wav(SOUNDS_DIR / "fever.wav", samples)

def gen_miss():
    # Low descending thud (320Hz -> 160Hz)
    duration = 0.15
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 320 - (160 * (i / n))
        val = math.sin(2 * math.pi * freq * t)
        env = (1.0 - (i / n)) ** 1.5
        samples.append(val * env * 0.6)
    write_wav(SOUNDS_DIR / "miss.wav", samples)

def gen_game_over():
    # Cheerful arcade melody
    notes = [523, 659, 784, 1046]
    samples = []
    for f in notes:
        samples += gen_tone(f, 0.09, decay=True, wave_type='triangle')
    write_wav(SOUNDS_DIR / "gameover.wav", samples)

def gen_countdown():
    # Short crisp click/blip
    samples = gen_tone(900, 0.06, decay=True, wave_type='sine')
    write_wav(SOUNDS_DIR / "countdown.wav", samples)

def gen_voucher():
    # Grand celebratory fanfare (C5, G5, C6, E6, G6)
    notes = [(523, 0.08), (784, 0.08), (1046, 0.08), (1318, 0.08), (1568, 0.28)]
    samples = []
    for f, d in notes:
        samples += gen_tone(f, d, decay=True, wave_type='triangle')
    write_wav(SOUNDS_DIR / "voucher.wav", samples)


if __name__ == '__main__':
    gen_catch()
    gen_combo()
    gen_fever()
    gen_miss()
    gen_game_over()
    gen_countdown()
    gen_voucher()
    print("Sound effects generated successfully!")

