# Automexa hero background: original abstract "gold silk" loop, made for this site (no third-party footage).
import numpy as np, subprocess, sys
W, H, FPS, SECS = int(sys.argv[1]), int(sys.argv[2]), 24, 10
OUT = sys.argv[3]
N = FPS * SECS
rng = np.random.default_rng(7)
x = np.linspace(0, 1, W, dtype=np.float32)[None, :]
y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
aspect = W / H
gold = np.array([212, 175, 55], np.float32) / 255
hi = np.array([250, 226, 150], np.float32) / 255
bg = np.array([9, 8, 6], np.float32) / 255
# ribbons: (base y, amplitude, freq, phase, width, intensity, speed multiple, tilt)
ribbons = []
PORTRAIT = H > W
for k in range(9):
    ribbons.append(dict(y0=0.18 + 0.075 * k + rng.uniform(-0.03, 0.03), a=rng.uniform(0.04, 0.11), f=rng.uniform(0.8, 1.8),
                        ph=rng.uniform(0, 6.28), w=rng.uniform(0.0025, 0.007), i=rng.uniform(0.35, 0.9), s=int(rng.integers(1, 3)) * (1 if k % 2 else -1),
                        tilt=rng.uniform(-0.25, 0.1)))
for k in range(3):
    ribbons.append(dict(y0=rng.uniform(0.3, 0.8), a=rng.uniform(0.06, 0.12), f=rng.uniform(0.5, 1.0), ph=rng.uniform(0, 6.28), w=rng.uniform(0.03, 0.05), i=0.22, s=1 if k % 2 else -1, tilt=rng.uniform(-0.2, 0.2)))
orbs = [dict(cx=rng.uniform(0, 1), cy=rng.uniform(0, 1), r=rng.uniform(0.05, 0.14), i=rng.uniform(0.08, 0.2), ax=rng.uniform(0.03, 0.08), ay=rng.uniform(0.02, 0.06), ph=rng.uniform(0, 6.28)) for _ in range(7)]
grain_bank = [rng.normal(0, 1, (H, W)).astype(np.float32) for _ in range(6)]
vign = 1 - 0.55 * (((x - 0.5) * 1.2) ** 2 + ((y - 0.5) * 1.4) ** 2) * 2
vign = np.clip(vign, 0.25, 1)[..., None]
sm = lambda e0, e1, z: np.clip((z - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((z - e0) / (e1 - e0), 0, 1))
# keep the text side calm: brighter to the right (landscape) or towards the bottom (portrait)
MASK = (0.28 + 0.72 * sm(0.2, 0.95, y + 0 * x)) if PORTRAIT else (0.3 + 0.7 * sm(0.18, 0.8, x + 0 * y))
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "ffv1", OUT], stdin=subprocess.PIPE)
for n in range(N):
    t = n / N * 2 * np.pi  # one full period -> seamless loop
    field = np.zeros((H, W), np.float32)
    for r in ribbons:
        yc = r["y0"] + r["tilt"] * (x - 0.5) + r["a"] * np.sin(2 * np.pi * r["f"] * x * 1.0 + r["ph"] + r["s"] * t) \
             + 0.025 * np.sin(2 * np.pi * 2.3 * x - r["s"] * t + r["ph"] * 0.5)
        d = (y - yc) ** 2
        field += r["i"] * (np.exp(-d / (r["w"] ** 2)) + 0.18 * np.exp(-d / ((r["w"] * 9) ** 2)))
    glow = np.zeros((H, W), np.float32)
    for o in orbs:
        cx = o["cx"] + o["ax"] * np.sin(t + o["ph"]); cy = o["cy"] + o["ay"] * np.cos(t + o["ph"] * 1.3)
        glow += o["i"] * np.exp(-(((x - cx) * aspect) ** 2 + (y - cy) ** 2) / (o["r"] ** 2))
    # soft diagonal light sweep, periodic
    sweep = 0.10 * np.exp(-((x * 0.8 + y * 0.6 - (0.7 + 0.5 * np.sin(t))) ** 2) / 0.05)
    v = field * 0.85 + glow + sweep
    v = v * MASK
    v = 1 - np.exp(-v * 1.25)  # soft tone-map
    hot = np.clip(field - 0.6, 0, 1)[..., None]
    col = bg + v[..., None] * gold * 1.05 + hot * (hi - gold) * 0.8
    col = col * vign
    col += grain_bank[n % 6][..., None] * 0.012
    frame = (np.clip(col, 0, 1) * 255).astype(np.uint8)
    ff.stdin.write(frame.tobytes())
ff.stdin.close(); ff.wait()
print("done", OUT)
