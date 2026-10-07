"""Generate retro arcade WAV sound effects and lively background music without external dependencies."""
import math
import struct
import wave
import random
from pathlib import Path

SOUNDS_DIR = Path(__file__).resolve().parent / "assets" / "sounds"
SOUNDS_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 22050

def write_wav(filename: Path, samples: list[float], peak: float = 0.95):
    """Write 16-bit mono PCM wav file with automatic peak normalization."""
    max_amp = max(abs(s) for s in samples) if samples else 1.0
    scale = (peak / max_amp) if max_amp > 0.0001 else 1.0
    with wave.open(str(filename), 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        data = bytearray()
        for s in samples:
            val = max(-1.0, min(1.0, s * scale))
            data.extend(struct.pack('<h', int(val * 32767)))
        wf.writeframes(data)

def gen_tone(freq: float, duration: float, decay=True, wave_type='sine', gain=0.9):
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
        res.append(val * env * gain)
    return res

def gen_catch():
    """Crisp, punchy, energetic high arcade coin/chime - loud and joyful."""
    # Dual harmonic layers: Punchy bell attack + soaring crystalline shimmer
    duration = 0.18
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        rel = i / n
        
        # Rapid upward pitch swoop: 1046Hz (C6) -> 1760Hz (A6)
        freq1 = 1046.0 + 714.0 * min(1.0, rel * 4.0)
        # Sparkling overtone: 2093Hz (C7) -> 2637Hz (E7)
        freq2 = 2093.0 + 544.0 * min(1.0, rel * 4.0)
        
        # Bright transient sparkle at 3136Hz (G7) in first 35ms
        sparkle = math.sin(2 * math.pi * 3136.0 * t) * ((1.0 - rel) ** 3) if t < 0.035 else 0.0
        
        p1 = (freq1 * t) % 1.0
        tri1 = 4.0 * abs(p1 - 0.5) - 1.0
        sine1 = math.sin(2 * math.pi * freq1 * t)
        tone1 = 0.6 * tri1 + 0.4 * sine1
        
        sine2 = math.sin(2 * math.pi * freq2 * t)
        
        # Snappy attack, strong presence, natural decay
        env = (1.0 - rel) ** 0.82
        val = (tone1 * 0.70 + sine2 * 0.40 + sparkle * 0.35) * env
        samples.append(val)
        
    write_wav(SOUNDS_DIR / "catch.wav", samples, peak=0.99)

def gen_combo():
    # Tri-tone arpeggio (C6, E6, G6)
    samples = gen_tone(1046, 0.04, decay=False, wave_type='sine', gain=0.9)
    samples += gen_tone(1318, 0.04, decay=False, wave_type='sine', gain=0.95)
    samples += gen_tone(1568, 0.15, decay=True, wave_type='triangle', gain=1.0)
    write_wav(SOUNDS_DIR / "combo.wav", samples, peak=0.98)

def gen_fever():
    # Sparkling fanfare (G5, C6, E6, G6)
    samples = gen_tone(784, 0.05, decay=False, wave_type='sine', gain=0.85)
    samples += gen_tone(1046, 0.05, decay=False, wave_type='sine', gain=0.9)
    samples += gen_tone(1318, 0.05, decay=False, wave_type='sine', gain=0.95)
    samples += gen_tone(2093, 0.22, decay=True, wave_type='triangle', gain=1.0)
    write_wav(SOUNDS_DIR / "fever.wav", samples, peak=0.98)

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
        samples.append(val * env * 0.8)
    write_wav(SOUNDS_DIR / "miss.wav", samples, peak=0.85)

def gen_game_over():
    # Cheerful arcade melody
    notes = [523, 659, 784, 1046]
    samples = []
    for f in notes:
        samples += gen_tone(f, 0.09, decay=True, wave_type='triangle', gain=0.9)
    write_wav(SOUNDS_DIR / "gameover.wav", samples, peak=0.95)

def gen_countdown():
    # Short crisp click/blip
    samples = gen_tone(900, 0.06, decay=True, wave_type='sine', gain=0.9)
    write_wav(SOUNDS_DIR / "countdown.wav", samples, peak=0.90)

def gen_voucher():
    # Grand celebratory fanfare (C5, G5, C6, E6, G6)
    notes = [(523, 0.08), (784, 0.08), (1046, 0.08), (1318, 0.08), (1568, 0.28)]
    samples = []
    for f, d in notes:
        samples += gen_tone(f, d, decay=True, wave_type='triangle', gain=0.95)
    write_wav(SOUNDS_DIR / "voucher.wav", samples, peak=0.98)

def note_freq(name: str) -> float:
    NOTES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
             'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
             'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
    letter = name[:-1]
    octave = int(name[-1])
    semitone = NOTES[letter] + (octave + 1) * 12
    return 440.0 * (2.0 ** ((semitone - 69) / 12.0))

def gen_bgm():
    """Synthesize lively, upbeat, cheerful retro-arcade background music (BGM).
    Balanced moderate volume (~0.38 peak) to perfectly complement game sound FX.
    """
    BPM = 132
    beat_dur = 60.0 / BPM
    step_dur = beat_dur / 4.0  # 16th note
    total_steps = 32 * 4       # 8-bar loop (128 sixteenth steps)
    total_duration = total_steps * step_dur
    total_samples = int(SAMPLE_RATE * total_duration)

    buffer = [0.0] * total_samples

    def add_tone(track_buffer, start_time, duration, freq, wave_type='pulse25', gain=0.2, attack=0.01, decay_to=0.4):
        start_idx = int(start_time * SAMPLE_RATE)
        num_s = int(duration * SAMPLE_RATE)
        for i in range(num_s):
            idx = (start_idx + i) % total_samples
            t = i / SAMPLE_RATE
            rel = i / num_s
            
            if t < attack:
                env = t / attack
            else:
                env = 1.0 - (1.0 - decay_to) * ((rel - attack) / (1.0 - attack))
            
            phase = (freq * t) % 1.0
            if wave_type == 'square':
                val = 0.5 if phase < 0.5 else -0.5
            elif wave_type == 'pulse25':
                val = 0.55 if phase < 0.25 else -0.45
            elif wave_type == 'triangle':
                val = 4.0 * abs(phase - 0.5) - 1.0
            elif wave_type == 'sine':
                val = math.sin(2 * math.pi * phase)
            elif wave_type == 'noise':
                val = (random.random() * 2.0 - 1.0)
            else:
                val = math.sin(2 * math.pi * phase)
                
            track_buffer[idx] += val * env * gain

    # 8-bar cheerful progression: C - G - Am - Em - F - C - F - G
    chords = [
        ('C4', 'E4', 'G4', 'C3'),
        ('G3', 'B3', 'D4', 'G2'),
        ('A3', 'C4', 'E4', 'A2'),
        ('E3', 'G3', 'B3', 'E2'),
        ('F3', 'A3', 'C4', 'F2'),
        ('C4', 'E4', 'G4', 'C3'),
        ('F3', 'A3', 'C4', 'F2'),
        ('G3', 'B3', 'D4', 'G2'),
    ]

    # Catchy, bouncy retro arcade melody
    melody_notes = [
        # Bar 1: C
        (0, 'C5', 2), (2, 'E5', 2), (4, 'G5', 2), (6, 'E5', 2), (8, 'C5', 2), (10, 'D5', 2), (12, 'E5', 3), (15, 'G5', 1),
        # Bar 2: G
        (16, 'D5', 2), (18, 'B4', 2), (20, 'G4', 2), (22, 'B4', 2), (24, 'D5', 2), (26, 'E5', 2), (28, 'D5', 3), (31, 'B4', 1),
        # Bar 3: Am
        (32, 'C5', 2), (34, 'A4', 2), (36, 'E4', 2), (38, 'A4', 2), (40, 'C5', 2), (42, 'D5', 2), (44, 'E5', 3), (47, 'C5', 1),
        # Bar 4: Em
        (48, 'B4', 2), (50, 'G4', 2), (52, 'E4', 2), (54, 'G4', 2), (56, 'B4', 2), (58, 'C5', 2), (60, 'B4', 3), (63, 'G4', 1),
        # Bar 5: F
        (64, 'A4', 2), (66, 'C5', 2), (68, 'F5', 2), (70, 'E5', 2), (72, 'D5', 2), (74, 'C5', 2), (76, 'A4', 3), (79, 'C5', 1),
        # Bar 6: C
        (80, 'G4', 2), (82, 'C5', 2), (84, 'E5', 2), (86, 'G5', 2), (88, 'E5', 2), (90, 'C5', 2), (92, 'G4', 3), (95, 'E4', 1),
        # Bar 7: F
        (96, 'F4', 2), (98, 'A4', 2), (100, 'C5', 2), (102, 'E5', 2), (104, 'D5', 2), (106, 'C5', 2), (108, 'D5', 3), (111, 'E5', 1),
        # Bar 8: G
        (112, 'G5', 2), (114, 'F5', 2), (116, 'D5', 2), (118, 'B4', 2), (120, 'G4', 2), (122, 'A4', 2), (124, 'B4', 3), (127, 'D5', 1),
    ]

    for step_start, note, dur_steps in melody_notes:
        t_start = step_start * step_dur
        dur = dur_steps * step_dur * 0.88
        f = note_freq(note)
        add_tone(buffer, t_start, dur, f, wave_type='pulse25', gain=0.22, attack=0.008, decay_to=0.35)

    # Groovy walking bassline (bouncy triangle wave)
    for bar_idx, chord in enumerate(chords):
        root = chord[3]
        f_root = note_freq(root)
        f_oct = f_root * 2.0
        f_fifth = f_root * 1.5
        bar_step = bar_idx * 16

        bass_pattern = [
            (0, f_root, 2.5),
            (3, f_oct, 1.2),
            (4, f_root, 2.0),
            (7, f_fifth, 1.2),
            (8, f_root, 2.5),
            (11, f_oct, 1.2),
            (12, f_root, 2.0),
            (15, f_fifth, 1.2)
        ]
        for s_offset, f_val, d_val in bass_pattern:
            t_s = (bar_step + s_offset) * step_dur
            add_tone(buffer, t_s, d_val * step_dur * 0.85, f_val, wave_type='triangle', gain=0.28, attack=0.01, decay_to=0.4)

    # Off-beat staccato chords
    for bar_idx, chord in enumerate(chords):
        bar_step = bar_idx * 16
        c_notes = [note_freq(chord[0]), note_freq(chord[1]), note_freq(chord[2])]
        for beat_step in [4, 6, 12, 14]:
            t_s = (bar_step + beat_step) * step_dur
            for cf in c_notes:
                add_tone(buffer, t_s, 1.3 * step_dur, cf, wave_type='sine', gain=0.09, attack=0.005, decay_to=0.2)

    # Crisp percussion (hi-hat, soft kick, snare)
    for step in range(total_steps):
        t_s = step * step_dur
        # Hi-hat on every other 16th note
        if step % 2 == 0:
            accent = (step % 4 == 2)
            add_tone(buffer, t_s, 0.03, 3500, wave_type='noise', gain=0.06 if accent else 0.03, attack=0.002, decay_to=0.05)
        # Kick on beats 1 & 3
        if step % 16 in [0, 8]:
            k_len = int(0.06 * SAMPLE_RATE)
            k_start = int(t_s * SAMPLE_RATE)
            for ki in range(k_len):
                kt = ki / SAMPLE_RATE
                k_freq = 150.0 * (1.0 - kt / 0.06) + 45.0
                k_env = (1.0 - kt / 0.06) ** 2
                k_val = math.sin(2 * math.pi * k_freq * kt) * k_env * 0.22
                idx = (k_start + ki) % total_samples
                buffer[idx] += k_val
        # Snare on beats 2 & 4
        if step % 16 in [4, 12]:
            s_len = int(0.07 * SAMPLE_RATE)
            s_start = int(t_s * SAMPLE_RATE)
            for si in range(s_len):
                st = si / SAMPLE_RATE
                s_env = (1.0 - st / 0.07) ** 1.8
                s_tone = math.sin(2 * math.pi * 210.0 * st) * 0.12
                s_noise = (random.random() * 2.0 - 1.0) * 0.14
                idx = (s_start + si) % total_samples
                buffer[idx] += (s_tone + s_noise) * s_env

    # Moderate volume ("nhạc nền vừa phải") so SFX remain clear & prominent
    write_wav(SOUNDS_DIR / "bgm.wav", buffer, peak=0.40)


if __name__ == '__main__':
    gen_catch()
    gen_combo()
    gen_fever()
    gen_miss()
    gen_game_over()
    gen_countdown()
    gen_voucher()
    gen_bgm()
    print("All arcade sound effects and background music generated successfully!")
