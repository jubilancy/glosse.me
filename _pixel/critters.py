"""Garden critters: 30 animated 32x32 pixel sprites -> GIF, PNG and SVG.

Run from the repo root:
    uv run --with pillow python _pixel/critters.py

Each critter is a small function that draws shapes onto a 32x32 canvas for a
given animation frame. An outline pass adds the dark edge, so the drawing code
only has to fill shapes. All colours come from one shared palette.
"""
import math
from pathlib import Path
from PIL import Image

W = H = 32
OUT = Path(__file__).resolve().parent.parent / "assets" / "critters"

# One shared palette: plum ink, mossy greens, warm creams and peaches, a cool
# sky and lavender for contrast.
PAL = {
    "ink":   "#2d2438",  # outline and pupils
    "plum":  "#5b4a6b",  # shadow tone
    "moss":  "#3e6b52",
    "leaf":  "#6aa86a",
    "lime":  "#b8d77a",
    "cream": "#f7f0dc",
    "butter": "#f4d66b",
    "peach": "#f2a97e",
    "coral": "#e0685f",
    "rose":  "#eb9fb5",
    "sky":   "#8ec5dc",
    "lav":   "#a99bd8",
    "bark":  "#8b5b45",
    "tan":   "#c9966a",
}
KEYS = list(PAL)


class Canvas:
    def __init__(self, fine=True):
        self.g = [[None] * W for _ in range(H)]
        # `f` is a second layer drawn after the outline, for 1px details such
        # as legs and antennae that shouldn't get a thick outline of their own.
        self.f = Canvas(fine=False) if fine else None

    def p(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H:
            self.g[y][x] = c

    def get(self, x, y):
        return self.g[y][x] if 0 <= x < W and 0 <= y < H else None

    def e(self, cx, cy, rx, ry, c):
        for y in range(H):
            for x in range(W):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1:
                    self.g[y][x] = c

    def ring(self, cx, cy, rx, ry, c):
        """Ellipse outline, painted only over pixels that are already filled."""
        for y in range(H):
            for x in range(W):
                d = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2
                if .7 <= d <= 1 and self.g[y][x]:
                    self.g[y][x] = c

    def r(self, x0, y0, x1, y1, c):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.p(x, y, c)

    def l(self, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = map(round, (x0, y0, x1, y1))
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.p(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def poly(self, pts, c):
        for y in range(H):
            for x in range(W):
                px, py, inside, n = x + .5, y + .5, False, len(pts)
                for i in range(n):
                    (ax, ay), (bx, by) = pts[i], pts[(i + 1) % n]
                    if (ay > py) != (by > py) and px < (bx - ax) * (py - ay) / (by - ay) + ax:
                        inside = not inside
                if inside:
                    self.g[y][x] = c

    def over(self, x0, y0, x1, y1, c):
        """Paint a rectangle, but only where something is already drawn."""
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                if self.get(x, y):
                    self.g[y][x] = c

    def finish(self):
        """Add the ink outline around everything drawn."""
        out = [row[:] for row in self.g]
        for y in range(H):
            for x in range(W):
                if self.g[y][x] is None and any(
                    self.get(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                ):
                    out[y][x] = "ink"
        for y in range(H):
            for x in range(W):
                if self.f.g[y][x]:
                    out[y][x] = self.f.g[y][x]
        return out


def eye(c, x, y, col="ink"):
    c.p(x, y, col)


# --------------------------------------------------------------------------
# critters. Each takes (c, t) where t is the frame number.
# --------------------------------------------------------------------------

def ladybug(c, t):
    w = t % 2
    for i, y in enumerate((12, 16, 20)):  # legs
        o = w if i % 2 else -w
        c.f.l(8, y, 4, y + 2 + o, "ink")
        c.f.l(24, y, 28, y + 2 - o, "ink")
    c.f.l(14, 6, 11 - w, 2, "ink")  # antennae
    c.f.l(18, 6, 21 + w, 2, "ink")
    c.e(16, 9, 5, 3.5, "plum")
    c.e(16, 18, 10, 9.5, "coral")
    c.r(16, 10, 16, 27, "ink")
    c.r(10, 14, 11, 15, "ink"); c.r(21, 14, 22, 15, "ink")
    c.r(9, 20, 10, 21, "ink");  c.r(22, 20, 23, 21, "ink")
    c.r(13, 23, 14, 24, "ink"); c.r(18, 23, 19, 24, "ink")
    c.r(11, 11, 12, 12, "cream")
    c.p(14, 9, "cream"); c.p(18, 9, "cream")


def bee(c, t):
    dy = t % 2
    c.e(14, 10 + dy, 5, 4, "sky")
    c.e(20, 11 + dy, 4, 3, "cream")
    c.e(15, 19 + dy, 9.5, 6.5, "butter")
    c.over(10, 12, 11, 27, "ink"); c.over(16, 12, 17, 27, "ink")
    c.e(25, 18 + dy, 4, 4, "plum")
    c.p(26, 17 + dy, "cream")
    c.f.l(26, 14 + dy, 28, 11 + dy, "ink")
    c.f.l(23, 14 + dy, 22, 11 + dy, "ink")
    c.f.l(5, 20 + dy, 2, 21 + dy, "ink")  # stinger
    c.f.l(12, 25 + dy, 12, 28, "ink"); c.f.l(18, 25 + dy, 18, 28, "ink")


def butterfly(c, t):
    k = (1, .62, 1, .62)[t % 4]
    c.e(16 - 7.5 * k, 11, 7.5 * k, 7.5, "lav")
    c.e(16 + 7.5 * k, 11, 7.5 * k, 7.5, "lav")
    c.e(16 - 5.5 * k, 21, 5.5 * k, 5.5, "rose")
    c.e(16 + 5.5 * k, 21, 5.5 * k, 5.5, "rose")
    c.p(16 - 8 * k, 10, "cream"); c.p(16 + 8 * k - 1, 10, "cream")
    c.p(16 - 5 * k, 20, "cream"); c.p(16 + 5 * k - 1, 20, "cream")
    c.r(15, 7, 16, 26, "plum")
    c.f.l(15, 7, 12, 2, "ink"); c.f.l(16, 7, 19, 2, "ink")


def snail(c, t):
    s = t % 2
    c.e(15, 25, 12.5, 3.5, "tan")
    c.e(25, 20, 4, 5.5, "tan")
    c.f.l(24, 16, 23 - s, 9, "ink"); c.f.l(27, 16, 28 + s, 9, "ink")
    c.f.p(23 - s, 8, "ink"); c.f.p(28 + s, 8, "ink")
    c.p(26, 19, "ink")
    c.e(14, 15, 9.5, 9.5, "rose")
    c.ring(14, 15, 9.5, 9.5, "coral")
    c.ring(14, 15, 6, 6, "coral")
    c.ring(14, 15, 3, 3, "coral")
    c.p(14, 15, "coral")
    c.r(9, 9, 10, 10, "cream")


def frog(c, t):
    c.e(7, 26, 4.5, 3, "leaf"); c.e(25, 26, 4.5, 3, "leaf")
    c.e(16, 21, 10.5, 7.5, "leaf")
    c.e(16, 22, 6, 4.5 + (t % 2) * .6, "cream")
    c.e(16, 14, 9.5, 6.5, "leaf")
    c.e(10, 8, 3.5, 3.5, "leaf"); c.e(22, 8, 3.5, 3.5, "leaf")
    if t % 4 == 3:
        c.r(8, 8, 11, 8, "ink"); c.r(21, 8, 24, 8, "ink")
    else:
        c.r(9, 7, 11, 9, "cream"); c.r(21, 7, 23, 9, "cream")
        c.r(10, 8, 10, 9, "ink"); c.r(22, 8, 22, 9, "ink")
    c.l(11, 16, 21, 16, "moss")
    c.p(13, 12, "moss"); c.p(19, 12, "moss")
    c.r(5, 28, 8, 28, "moss"); c.r(24, 28, 27, 28, "moss")


def toad(c, t):
    c.e(7, 26, 4.5, 3, "tan"); c.e(25, 26, 4.5, 3, "tan")
    c.e(16, 21, 11.5, 7.5, "tan")
    c.e(16, 23, 6, 4, "cream")
    c.e(16, 15, 10, 6, "tan")
    c.e(10, 10, 3, 3, "tan"); c.e(22, 10, 3, 3, "tan")
    c.r(9, 9, 11, 10, "butter"); c.r(21, 9, 23, 10, "butter")
    if t % 2:
        c.r(9, 10, 11, 10, "ink"); c.r(21, 10, 23, 10, "ink")
    else:
        c.r(9, 9, 11, 9, "ink"); c.r(21, 9, 23, 9, "ink")
    for x, y in ((8, 17), (13, 14), (20, 14), (24, 18), (6, 21), (26, 22), (12, 19), (21, 20)):
        c.p(x, y, "bark")
    c.l(11, 17, 21, 17, "bark")


def caterpillar(c, t):
    for i in range(6):
        x = 6 + i * 4.2
        y = 21 - 2 * math.sin((i * 1.1) - t * math.pi / 2)
        col = "leaf" if i % 2 == 0 else "lime"
        if i == 5:
            c.e(x + 1, y - 1, 4.5, 4.5, "coral")
            c.p(x + 2, y - 2, "ink"); c.p(x + 3, y - 2, "cream")
            c.f.l(x, y - 5, x - 2, y - 8, "ink"); c.f.l(x + 3, y - 5, x + 5, y - 8, "ink")
        else:
            c.e(x, y, 3.8, 3.8, col)
            c.f.p(x - 1, y + 4, "ink"); c.f.p(x + 1, y + 4, "ink")
            c.p(x, y - 2, "rose")


def dragonfly(c, t):
    up = t % 2
    wy = 8 if up else 10
    c.e(11, wy, 6.5, 2, "sky"); c.e(20, wy - 1, 6.5, 2, "sky")
    c.e(11, 32 - wy, 6.5, 2, "sky"); c.e(20, 32 - wy + 1, 6.5, 2, "sky")
    c.f.l(12, wy + 2, 12, 15, "ink"); c.f.l(20, wy + 1, 20, 15, "ink")
    c.f.l(12, 32 - wy - 2, 12, 16, "ink"); c.f.l(20, 32 - wy - 1, 20, 16, "ink")
    c.r(3, 15, 22, 16, "moss")
    for x in range(4, 22, 4):
        c.r(x, 15, x + 1, 16, "leaf")
    c.e(25, 16, 3.5, 3, "sky")
    c.e(28, 16, 2.2, 2.6, "leaf")
    c.p(28, 15, "cream"); c.p(29, 15, "ink")
    c.r(23, 14, 23, 17, "plum")


def ant(c, t):
    s = t % 2
    for i, x in enumerate((13, 16, 19)):
        o = s if i % 2 else -s
        c.f.l(x, 19, x - 3 + o, 26, "ink"); c.f.l(x, 19, x + 2 - o, 26, "ink")
    c.e(7, 19, 5.5, 4.5, "bark")
    c.e(15, 17, 3.5, 3.5, "bark")
    c.e(22, 15, 4.5, 4, "bark")
    c.p(24, 14, "cream"); c.p(25, 14, "ink")
    c.f.l(25, 12, 28, 8 - s, "ink"); c.f.l(22, 12, 24, 7 + s, "ink")
    c.p(6, 17, "tan"); c.p(8, 17, "tan")


def spider(c, t):
    dy = (0, 2, 3, 2)[t % 4]
    c.f.l(16, 0, 16, 10 + dy, "plum")
    for sgn in (-1, 1):
        for i, (ox, oy) in enumerate(((7, -5), (9, -1), (9, 4), (6, 8))):
            x0, y0 = 16 + sgn * 3, 17 + dy - 2 + i
            kx, ky = 16 + sgn * (ox + 1), 17 + dy - 4 + oy
            c.f.l(x0, y0, kx, ky, "ink")
            c.f.l(kx, ky, 16 + sgn * (ox + 3), 26 + dy, "ink")
    c.e(16, 19 + dy, 5.5, 5.5, "plum")
    c.e(16, 13 + dy, 3.5, 3, "plum")
    c.r(15, 17 + dy, 16, 19 + dy, "coral")
    c.p(14, 12 + dy, "cream"); c.p(17, 12 + dy, "cream")


def worm(c, t):
    ph = t * math.pi / 2
    for x in range(3, 29):
        y = 19 + 4 * math.sin(x / 2.4 + ph)
        col = "peach" if (x // 3) % 2 else "rose"
        if 20 <= x <= 22:
            col = "coral"
        c.r(x, y - 1.5, x, y + 1.5, col)
    xh = 28
    yh = 19 + 4 * math.sin(xh / 2.4 + ph)
    c.f.p(xh - 1, yh - 1, "ink")
    for x in range(4, 28, 3):
        c.p(x, 19 + 4 * math.sin(x / 2.4 + ph) + 2, "plum")


def hedgehog(c, t):
    s = t % 2
    c.e(14, 18, 12.5, 9.5, "bark")
    for y in range(8, 28):
        for x in range(1, 28):
            if c.get(x, y) == "bark" and (x + y * 2 + s) % 4 == 0 and y < 22:
                c.p(x, y, "plum")
    c.poly([(9, 9), (14, 4), (18, 8), (24, 12), (22, 22), (10, 22)], "plum")
    c.over(2, 8, 25, 21, "plum")
    for x in range(2, 26):  # jagged spine tips along the top edge
        top = next((y for y in range(H) if c.get(x, y)), None)
        if top is not None and top < 14:
            if x % 3 != 2:
                c.p(x, top - 1, "plum")
            if x % 3 == 0:
                c.p(x, top - 2, "plum")
    for y in range(5, 22):
        for x in range(2, 26):
            if c.get(x, y) == "plum" and (x + y + s) % 3 == 0:
                c.p(x, y, "bark")
    c.e(25, 22, 5.5, 4.5, "tan")
    c.p(30, 22, "ink"); c.p(31, 22, "ink")
    c.p(27, 20, "ink")
    c.e(22, 20, 2, 2.5, "tan")
    c.e(9, 27, 3, 1.8, "tan"); c.e(19, 27 + s * 0, 3, 1.8, "tan")


def mouse(c, t):
    s = t % 2
    c.l(5, 24, 2, 20 - s, "rose"); c.l(2, 20 - s, 3, 15 - s, "rose")
    c.e(13, 21, 8.5, 6.5, "tan")
    c.e(13, 24, 6, 3, "cream")
    c.e(22, 18, 5.5, 4.5, "tan")
    c.e(20, 12 - s, 3, 3.2, "tan"); c.e(20, 12 - s, 1.8, 2, "rose")
    c.p(27, 19, "rose"); c.p(26, 19, "rose")
    c.p(24, 17, "ink")
    c.e(10, 27, 3, 1.5, "rose"); c.e(18, 27, 3, 1.5, "rose")
    if s:
        c.p(28, 21, "cream"); c.p(29, 22, "cream")
    else:
        c.p(28, 20, "cream"); c.p(29, 19, "cream")


def rabbit(c, t):
    s = t % 2
    c.e(4.5, 23, 3.2, 3.2, "cream")
    c.e(13, 22, 9.5, 6.5, "cream")
    c.e(21, 15, 5.5, 4.5, "cream")
    c.e(19.5, 6 - s, 2, 5.5, "cream"); c.e(19.5, 7 - s, 1, 4, "rose")
    c.e(24.5 + s, 7, 2, 5, "cream"); c.e(24.5 + s, 8, 1, 3.5, "rose")
    c.p(24, 14, "ink")
    c.p(27, 16 + s, "rose")
    c.e(12, 27, 5, 2, "lav")
    c.e(20, 27, 3, 1.8, "cream")
    c.over(4, 26, 18, 28, "lav")


def squirrel(c, t):
    s = t % 2
    c.e(8 - s, 14, 6.5, 11, "bark")
    c.e(8 - s, 15, 4, 8.5, "tan")
    c.e(15, 22, 6, 6, "bark")
    c.e(17, 24, 3, 3.5, "cream")
    c.e(21, 15, 5, 4.5, "bark")
    c.poly([(18, 12), (18, 7), (22, 10)], "bark")
    c.poly([(23, 11), (25, 7), (26, 12)], "bark")
    c.p(23, 14, "ink"); c.p(26, 16, "ink")
    c.e(24, 24, 2.8, 2.8, "tan"); c.r(23, 20, 24, 21, "bark")
    c.e(12, 28, 3.5, 1.5, "bark"); c.e(19, 28, 3, 1.5, "bark")


def mole(c, t):
    s = t % 2
    c.e(16, 29, 13, 3.5, "bark")
    c.e(16, 20, 9, 8.5, "plum")
    c.poly([(13, 15), (19, 15), (16, 8)], "rose")
    c.e(16, 14, 4, 4, "plum")
    c.poly([(14, 11), (18, 11), (16, 6)], "rose")
    c.p(13, 13, "cream"); c.p(19, 13, "cream")
    c.e(6.5, 22 - s, 3.5, 3.2, "tan"); c.e(25.5, 22 - s, 3.5, 3.2, "tan")
    for x in (4, 6, 8):
        c.p(x, 24 - s, "cream")
    for x in (24, 26, 28):
        c.p(x, 24 - s, "cream")
    if s:
        c.p(3, 18, "bark"); c.p(28, 17, "bark")


def robin(c, t):
    s = t % 2
    c.r(1, 28, 30, 29, "bark")
    c.e(14, 19, 9, 7, "bark")
    c.e(19, 22, 5.5, 5, "coral")
    c.e(21, 13 + s, 5, 5, "bark")
    c.e(23, 15 + s, 3, 3, "coral")
    c.poly([(26, 12 + s), (31, 13 + s), (26, 15 + s)], "butter")
    c.p(23, 12 + s, "ink")
    c.e(11, 19, 5, 3.5, "tan")
    c.r(2, 17 + s * 2, 7, 19 + s * 2, "bark")
    c.l(13, 26, 13, 28, "ink"); c.l(17, 26, 17, 28, "ink")


def owl(c, t):
    c.e(16, 19, 10, 10.5, "bark")
    c.poly([(8, 12), (8, 4), (14, 9)], "bark")
    c.poly([(24, 12), (24, 4), (18, 9)], "bark")
    c.e(16, 23, 6, 6, "tan")
    for y in (21, 24, 27):
        c.l(13, y, 14, y + 1, "bark"); c.l(18, y, 19, y + 1, "bark")
    c.e(11, 14, 4.5, 4.5, "cream"); c.e(21, 14, 4.5, 4.5, "cream")
    c.ring(11, 14, 4.5, 4.5, "butter"); c.ring(21, 14, 4.5, 4.5, "butter")
    if t % 4 == 3:
        c.r(8, 14, 13, 14, "ink"); c.r(19, 14, 24, 14, "ink")
    else:
        c.r(10, 13, 12, 15, "ink"); c.r(20, 13, 22, 15, "ink")
        c.p(10, 13, "cream"); c.p(20, 13, "cream")
    c.poly([(15, 17), (17, 17), (16, 20)], "butter")
    c.e(6.5, 21, 2.5, 6, "plum"); c.e(25.5, 21, 2.5, 6, "plum")
    c.r(12, 29, 14, 29, "butter"); c.r(18, 29, 20, 29, "butter")


def moth(c, t):
    k = (1, .55, 1, .55)[t % 4]
    c.e(16 - 8 * k, 12, 8 * k, 6.5, "tan")
    c.e(16 + 8 * k, 12, 8 * k, 6.5, "tan")
    c.e(16 - 6 * k, 20, 6 * k, 4.5, "lav")
    c.e(16 + 6 * k, 20, 6 * k, 4.5, "lav")
    c.e(16 - 8 * k, 12, 2.2 * k + .5, 2.2, "cream"); c.e(16 + 8 * k, 12, 2.2 * k + .5, 2.2, "cream")
    c.p(16 - 8 * k, 12, "ink"); c.p(16 + 8 * k - 1, 12, "ink")
    c.e(16, 17, 2.5, 8, "cream")
    c.p(15, 11, "ink"); c.p(16, 11, "ink")
    c.f.l(15, 9, 11, 4, "ink"); c.f.l(16, 9, 20, 4, "ink")
    c.f.p(10, 5, "ink"); c.f.p(21, 5, "ink")


def firefly(c, t):
    glow = t % 2
    if glow:
        for x, y in ((16, 29), (11, 27), (21, 27), (9, 23), (23, 23), (16, 31)):
            c.p(x, y, "butter")
    c.e(10.5, 14, 2.5, 5.5, "lav"); c.e(21.5, 14, 2.5, 5.5, "lav")
    c.e(16, 14, 5, 8, "plum")
    c.r(16, 8, 16, 18, "ink")
    c.e(16, 6.5, 3.2, 2.6, "coral")
    c.p(15, 6, "cream"); c.p(17, 6, "cream")
    c.e(16, 23, 4.5, 3.8, "butter" if glow else "lime")
    c.f.l(15, 4, 13, 1, "ink"); c.f.l(17, 4, 19, 1, "ink")
    c.f.l(12, 12, 8, 16, "ink"); c.f.l(20, 12, 24, 16, "ink")


def beetle(c, t):
    s = t % 2
    for i, y in enumerate((13, 18, 23)):
        o = s if i % 2 else -s
        c.f.l(8, y, 4, y + 3 + o, "ink"); c.f.l(24, y, 28, y + 3 - o, "ink")
    c.e(16, 19, 9.5, 10, "moss")
    c.e(16, 8, 4.5, 3.5, "plum")
    c.poly([(13, 5), (11, 1), (14, 4)], "plum"); c.poly([(19, 5), (21, 1), (18, 4)], "plum")
    c.r(16, 10, 16, 28, "ink")
    c.e(12, 15, 2.5, 3.5, "leaf"); c.e(20, 15, 2.5, 3.5, "leaf")
    c.r(11, 13, 12, 14, "sky"); c.r(19, 13, 20, 14, "sky")
    c.p(14, 7, "cream"); c.p(18, 7, "cream")
    c.f.l(13, 4, 12 - s, 1, "ink"); c.f.l(19, 4, 20 + s, 1, "ink")


def grasshopper(c, t):
    s = t % 2
    c.e(14, 18, 10, 3.2, "leaf")
    c.e(14, 17, 9, 1.6, "lime")
    c.e(25, 16, 3.5, 3.2, "leaf")
    c.p(26, 15, "cream"); c.p(27, 15, "ink")
    c.f.l(27, 13, 30, 7 - s, "ink"); c.f.l(25, 13, 27, 5 + s, "ink")
    c.l(14, 19, 9, 11 - s * 2, "lime"); c.l(9, 11 - s * 2, 4, 26, "lime")
    c.l(15, 19, 11, 12 - s * 2, "leaf"); c.l(11, 12 - s * 2, 7, 26, "leaf")
    c.f.l(20, 20, 20, 26, "ink"); c.f.l(23, 20, 24, 26, "ink")
    c.r(8, 15, 20, 15, "plum")


def slug(c, t):
    s = t % 2
    c.e(15, 22, 12 + s * .8, 4.2 - s * .3, "peach")
    c.e(10, 18, 6, 3.5, "peach")
    c.e(24, 21, 4, 4, "peach")
    c.f.l(24, 18, 23, 11 - s, "ink"); c.f.l(27, 18, 28, 11 - s, "ink")
    c.f.p(23, 10 - s, "ink"); c.f.p(28, 10 - s, "ink")
    for x, y in ((6, 22), (11, 24), (16, 23), (21, 24), (9, 18), (12, 16)):
        c.p(x, y, "coral")
    for x in range(2, 30, 3):
        c.p(x + s, 27, "lav")


def cat(c, t):
    s = t % 2
    c.l(5, 26, 2, 22, "coral"); c.l(2, 22, 3 - s, 16, "coral"); c.l(3 - s, 16, 6 - s, 13, "coral")
    c.e(13, 22, 8.5, 7, "peach")
    c.e(14, 25, 5, 3.5, "cream")
    c.e(21, 13, 6.5, 5.5, "peach")
    c.poly([(16, 10), (16, 4), (20, 8)], "peach"); c.poly([(22, 8), (26, 4), (27, 10)], "peach")
    c.p(17, 7, "rose"); c.p(25, 7, "rose")
    if t % 4 == 3:
        c.r(18, 13, 20, 13, "ink"); c.r(23, 13, 25, 13, "ink")
    else:
        c.r(19, 12, 19, 14, "lime"); c.r(24, 12, 24, 14, "lime")
        c.p(19, 13, "ink"); c.p(24, 13, "ink")
    c.p(22, 15, "rose")
    c.r(14, 14, 15, 15, "cream"); c.r(27, 15, 29, 15, "cream")
    c.l(14, 17, 16, 20, "coral"); c.l(11, 18, 13, 22, "coral")
    c.e(11, 28, 3, 1.4, "cream"); c.e(19, 28, 3, 1.4, "cream")


def fox(c, t):
    s = t % 2
    c.e(5 - s, 22, 5, 7, "coral"); c.e(3 - s, 26, 3, 3, "cream")
    c.e(14, 22, 7.5, 7, "coral")
    c.e(15, 25, 4, 4, "cream")
    c.e(21, 14, 6, 5, "coral")
    c.poly([(15, 12), (16, 4), (21, 9)], "coral"); c.poly([(22, 9), (27, 4), (27, 12)], "coral")
    c.poly([(16, 6), (16, 4), (18, 6)], "ink"); c.poly([(25, 5), (27, 4), (27, 7)], "ink")
    c.poly([(21, 16), (28, 16), (28, 19), (22, 19)], "cream")
    c.p(29, 16, "ink"); c.p(28, 16, "ink")
    c.p(22, 13, "ink"); c.p(24, 13, "ink")
    c.e(11, 28, 3, 1.4, "plum"); c.e(18, 28, 3, 1.4, "plum")


def bat(c, t):
    up = t % 2
    if up:
        left = [(13, 14), (3, 6), (4, 12), (7, 12), (8, 17), (11, 15), (13, 18)]
    else:
        left = [(13, 14), (2, 15), (4, 21), (7, 19), (9, 25), (12, 21), (13, 22)]
    right = [(31 - x + 1, y) for x, y in left]
    c.poly(left, "plum"); c.poly(right, "plum")
    c.e(16, 17, 3.6, 5.5, "bark")
    c.e(16, 11, 3.5, 3.3, "bark")
    c.poly([(13, 10), (13, 5), (16, 8)], "bark"); c.poly([(19, 10), (19, 5), (16, 8)], "bark")
    c.p(14, 11, "coral"); c.p(18, 11, "coral")
    c.p(15, 13, "cream"); c.p(17, 13, "cream")


def hummingbird(c, t):
    up = t % 2
    c.e(14, 12 - (up * 3), 3, 6.5, "lav")
    c.e(10, 18, 7.5, 4, "leaf")
    c.e(21, 15, 4, 4, "leaf")
    c.e(23, 17, 2.2, 2, "coral")
    c.f.l(25, 14, 31, 14, "ink")
    c.p(22, 14, "ink")
    c.e(14, 18, 5, 3.4, "lime")
    c.poly([(3, 18), (1, 23), (6, 22)], "moss")
    c.poly([(5, 19), (4, 25), (8, 22)], "leaf")
    c.p(23, 22, "butter") if up else c.p(26, 23, "rose")


def lizard(c, t):
    ph = t * math.pi / 2
    pts = []
    for i in range(14):
        x = 25 - i * 1.8
        y = 16 + 3.5 * math.sin(i * .5 + ph)
        pts.append((x, y, 4 - i * .22))
    for x, y, r in pts:
        c.e(x, y, max(r, 1), max(r, 1), "leaf")
    hx, hy, _ = pts[0]
    c.e(hx + 3, hy, 3.8, 3, "leaf")
    c.p(hx + 4, hy - 1, "ink"); c.p(hx + 4, hy + 1, "ink")
    for idx in (2, 6):
        x, y, _ = pts[idx]
        c.l(x, y - 2, x - 3 + (t % 2), y - 7, "moss"); c.l(x, y + 2, x - 3 - (t % 2), y + 7, "moss")
    for x, y, r in pts[1:10:3]:
        c.p(x, y, "lime")
    c.p(hx - 2, hy - 1, "lime"); c.p(hx - 2, hy + 1, "lime")


def tortoise(c, t):
    s = t % 2
    c.e(14, 22, 12.5, 7, "tan")
    c.e(14, 20, 11.5, 9.5, "leaf")
    c.r(0, 21, 31, 31, None)
    c.e(14, 22, 12.5, 3, "tan")
    for x0, y0 in ((8, 14), (14, 12), (20, 14), (11, 18), (17, 18)):
        c.ring(x0, y0, 3.2, 2.8, "moss")
    c.e(14, 14, 3, 2.5, "lime")
    c.e(26, 21 + s * 0, 3.5, 3.2, "tan")
    c.p(27, 20, "ink"); c.p(29, 22, "plum")
    c.e(8 + s, 27, 3, 2, "tan"); c.e(19 - s, 27, 3, 2, "tan")
    c.p(1, 22, "tan"); c.p(2, 23, "tan")


def mantis(c, t):
    s = t % 2
    c.e(8, 22 - s, 6.5, 3, "leaf")
    c.l(12, 22, 13, 11, "leaf"); c.l(13, 22, 14, 11, "leaf")
    c.poly([(12, 9), (17, 9), (14, 5)], "lime")
    c.p(13, 8, "cream"); c.p(16, 8, "cream")
    c.p(13, 8, "ink") if s else c.p(16, 8, "ink")
    c.f.l(13, 5, 11, 1, "ink"); c.f.l(15, 5, 18, 1, "ink")
    c.l(15, 12, 21, 14 - s, "leaf"); c.l(21, 14 - s, 18, 19 - s, "lime")
    c.l(16, 12, 22, 15 - s, "leaf")
    c.f.l(14, 23, 11, 28, "moss"); c.f.l(10, 24, 7, 28, "moss")
    c.f.l(16, 23, 19, 28, "moss"); c.f.l(19, 28, 21, 28, "moss")
    c.r(2, 20 - s, 10, 21 - s, "lime")


CRITTERS = [
    ("ladybug", ladybug, 2), ("bee", bee, 2), ("butterfly", butterfly, 4),
    ("snail", snail, 2), ("frog", frog, 4), ("toad", toad, 2),
    ("caterpillar", caterpillar, 4), ("dragonfly", dragonfly, 2),
    ("ant", ant, 2), ("spider", spider, 4), ("worm", worm, 4),
    ("hedgehog", hedgehog, 2), ("mouse", mouse, 2), ("rabbit", rabbit, 2),
    ("squirrel", squirrel, 2), ("mole", mole, 2), ("robin", robin, 2),
    ("owl", owl, 4), ("moth", moth, 4), ("firefly", firefly, 2),
    ("beetle", beetle, 2), ("grasshopper", grasshopper, 2), ("slug", slug, 2),
    ("cat", cat, 4), ("fox", fox, 2), ("bat", bat, 2),
    ("hummingbird", hummingbird, 2), ("lizard", lizard, 4),
    ("tortoise", tortoise, 2), ("mantis", mantis, 2),
]


# --------------------------------------------------------------------------
# rendering
# --------------------------------------------------------------------------

def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def render(fn, t):
    c = Canvas()
    fn(c, t)
    return c.finish()


def to_image(grid):
    """Paletted image: index 0 is transparent, the rest follow KEYS order."""
    im = Image.new("P", (W, H), 0)
    flat = [0, 0, 0]
    for k in KEYS:
        flat += list(hex_rgb(PAL[k]))
    im.putpalette(flat + [0] * (768 - len(flat)))
    im.info["transparency"] = 0
    for y, row in enumerate(grid):
        for x, k in enumerate(row):
            if k:
                im.putpixel((x, y), KEYS.index(k) + 1)
    return im


def to_svg(grid):
    rects = []
    for y, row in enumerate(grid):
        x = 0
        while x < W:
            k = row[x]
            if not k:
                x += 1
                continue
            x2 = x
            while x2 + 1 < W and row[x2 + 1] == k:
                x2 += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{x2 - x + 1}" height="1" fill="{PAL[k]}"/>')
            x = x2 + 1
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
            f'shape-rendering="crispEdges">{"".join(rects)}</svg>\n')


def main():
    for d in ("gif", "gif-4x", "png", "svg"):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    sheet_cells = []
    for name, fn, n in CRITTERS:
        frames = [render(fn, t) for t in range(n)]
        imgs = [to_image(g) for g in frames]
        imgs[0].save(OUT / "gif" / f"{name}.gif", save_all=True, append_images=imgs[1:],
                     duration=260, loop=0, disposal=2, transparency=0)
        big = [im.resize((W * 4, H * 4), Image.NEAREST) for im in imgs]
        for b in big:
            b.info["transparency"] = 0
        big[0].save(OUT / "gif-4x" / f"{name}.gif", save_all=True, append_images=big[1:],
                    duration=260, loop=0, disposal=2, transparency=0)
        rgba = imgs[0].convert("RGBA")
        px = rgba.load()
        for y in range(H):
            for x in range(W):
                if frames[0][y][x] is None:
                    px[x, y] = (0, 0, 0, 0)
        rgba.resize((W * 8, H * 8), Image.NEAREST).save(OUT / "png" / f"{name}.png")
        (OUT / "svg" / f"{name}.svg").write_text(to_svg(frames[0]))
        sheet_cells.append((name, imgs))
    return sheet_cells


def contact_sheet(cells, frame=0, scale=4, cols=10, path=None, bg=(250, 246, 236)):
    pad = 6
    rows = -(-len(cells) // cols)
    s = Image.new("RGB", (cols * (W * scale + pad) + pad, rows * (H * scale + pad) + pad), bg)
    for i, (name, imgs) in enumerate(cells):
        im = imgs[frame % len(imgs)].convert("RGBA").resize((W * scale, H * scale), Image.NEAREST)
        s.paste(im, (pad + (i % cols) * (W * scale + pad), pad + (i // cols) * (H * scale + pad)), im)
    if path:
        s.save(path)
    return s


if __name__ == "__main__":
    cells = main()
    contact_sheet(cells, 0, 4, 10, OUT / "sheet.png")
    print(f"wrote {len(cells)} critters to {OUT}")
