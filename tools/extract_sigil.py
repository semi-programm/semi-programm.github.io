"""ロゴ画像から、線（骨組み）・点・塗りつぶし部分を取り出して JSON にする。"""
import json
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize, disk
from scipy.ndimage import binary_opening, binary_dilation
from skimage import measure

SRC = sys.argv[1]
OUT = sys.argv[2]

im = np.array(Image.open(SRC).convert("RGBA")).astype(float)
lum = im[..., 0] * .299 + im[..., 1] * .587 + im[..., 2] * .114
ink = ((255 - lum) * im[..., 3] / 255) > 128
dt = ndi.distance_transform_edt(ink)

ys, xs = np.nonzero(ink)
cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
S = (ys.max() - ys.min()) / 2  # 高さを -1..1 にする


def norm(x, y):
    return [round((x - cx) / S, 4), round(-(y - cy) / S, 4)]


# 1) 塗りつぶし部分（胴体など）: 太い線より太いところだけ残す
solid = binary_opening(ink, structure=disk(22))
lab, n = ndi.label(solid)
solids = []
for i in range(1, n + 1):
    m = lab == i
    if m.sum() < 600:
        continue
    cs = measure.find_contours(np.pad(m, 1).astype(float), 0.5)
    c = max(cs, key=len)
    c = measure.approximate_polygon(c, tolerance=1.2)
    solids.append([norm(p[1] - 1, p[0] - 1) for p in c])

# 2) 点（羽の上の丸）: 線より太く、塗りつぶしより小さい円
rest = ink & ~binary_dilation(solid, structure=disk(3))
dots = []
mx = ndi.maximum_filter(dt, size=25)
cand = (dt == mx) & (dt > 15.5) & rest
lab2, n2 = ndi.label(cand)
for i in range(1, n2 + 1):
    yy, xx = np.nonzero(lab2 == i)
    x, y = xx.mean(), yy.mean()
    r = dt[int(round(y)), int(round(x))]
    # 本物の点は、少し外側の円周がほとんど空いている（細い筋が2本通るだけ）。太い線の角は埋まっている
    ang = np.linspace(0, 2 * np.pi, 72, endpoint=False)
    ring = [ink[int(round(y + (r + 7) * np.sin(t))), int(round(x + (r + 7) * np.cos(t)))] for t in ang]
    # 羽の点はどれも半径19px前後。太い線の角や羽の先（丸い端）は、半径か円周で外れる
    if np.mean(ring) >= 0.5 or not (18.8 <= r <= 19.8):
        continue
    dots.append(norm(x, y) + [round(r / S, 4)])

# 3) 線: 塗りつぶしを除いた部分の骨組みをたどる
sk = skeletonize(ink & ~binary_dilation(solid, structure=disk(2)))
H, W = sk.shape
nb = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
pts = set(zip(*np.nonzero(sk)))


def neighbors(p):
    y, x = p
    return [(y + dy, x + dx) for dy, dx in nb if (y + dy, x + dx) in pts]


deg = {p: len(neighbors(p)) for p in pts}
nodes = {p for p in pts if deg[p] != 2}
visited = set()
paths = []


def walk(a, b):
    path = [a, b]
    prev, cur = a, b
    while cur not in nodes:
        nxt = [q for q in neighbors(cur) if q != prev and frozenset((cur, q)) not in visited]
        if not nxt:
            break
        visited.add(frozenset((cur, nxt[0])))
        prev, cur = cur, nxt[0]
        path.append(cur)
        if cur == a:
            break
    return path


for a in nodes:
    for b in neighbors(a):
        e = frozenset((a, b))
        if e in visited:
            continue
        visited.add(e)
        paths.append(walk(a, b))

# 節点の無い輪（小さな輪っか）
left = {p for p in pts if p not in nodes and all(frozenset((p, q)) not in visited for q in neighbors(p))}
while left:
    a = left.pop()
    nbs = neighbors(a)
    visited.add(frozenset((a, nbs[0])))
    pth = walk(a, nbs[0])
    left -= set(pth)
    paths.append(pth)


def rdp(points, eps):
    if len(points) < 3:
        return points
    a, b = np.array(points[0], float), np.array(points[-1], float)
    ab = b - a
    L = np.hypot(*ab)
    P = np.array(points, float)
    if L == 0:
        d = np.hypot(*(P - a).T)
    else:
        Q = P - a
        d = np.abs(ab[0] * Q[:, 1] - ab[1] * Q[:, 0]) / L
    i = int(d.argmax())
    if d[i] > eps:
        return rdp(points[: i + 1], eps)[:-1] + rdp(points[i:], eps)
    return [points[0], points[-1]]


out_paths = []
for pth in paths:
    if len(pth) < 14:  # 骨組みのひげ（短い枝）は捨てる
        continue
    hw = float(np.median([dt[p] for p in pth]))
    simp = rdp([(p[1], p[0]) for p in pth], 1.4)
    out_paths.append({"p": [norm(x, y) for x, y in simp], "w": round(hw / S, 4), "len": len(pth)})

# 上から順に描く
out_paths.sort(key=lambda o: -max(p[1] for p in o["p"]))
data = {"paths": [{"p": o["p"], "w": o["w"]} for o in out_paths], "dots": dots, "solids": solids}
json.dump(data, open(OUT, "w"), separators=(",", ":"))
print("paths", len(out_paths), "points", sum(len(o["p"]) for o in out_paths), "dots", len(dots), "solids", len(solids),
      "widths", sorted({round(o["w"] * S) for o in out_paths}))
