# Pixel critters from text grids -> SVG, PNG, animated GIF
from PIL import Image
PAL = {'.': None, 'k': '#2b2b2b', 'g': '#9fd08a', 'w': '#ffffff', 'p': '#f4a6b8'}
FRAMES = {
 'frog': [[
  "................",
  "................",
  "...kk......kk...",
  "..kwwk....kwwk..",
  "..kwkk....kkwk..",
  ".kggggkkkkggggk.",
  ".kgggggggggggggk",
  ".kgggggggggggggk",
  ".kggkgggggggkggk",
  ".kgggkkkkkkgggk.",
  ".kpgggggggggggpk",
  "..kgggggggggggk.",
  "..kkgkk..kkgkk..",
  "...kk......kk...",
  "................",
  "................"],
 [
  "................",
  "................",
  "................",
  "...kk......kk...",
  "..kwwk....kwwk..",
  "..kwkk....kkwk..",
  ".kggggkkkkggggk.",
  ".kgggggggggggggk",
  ".kggkgggggggkggk",
  ".kgggkkkkkkgggk.",
  ".kpgggggggggggpk",
  "..kgggggggggggk.",
  ".kkgkk......kkgk",
  "..kk..........kk",
  "................",
  "................"]],
}
def rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def svg(grid, s=1):
    rects = ''.join(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{PAL[c]}"/>'
                    for y, r in enumerate(grid) for x, c in enumerate(r) if PAL[c])
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">{rects}</svg>'
def png(grid, scale):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, r in enumerate(grid):
        for x, c in enumerate(r):
            if PAL[c]: im.putpixel((x, y), rgb(PAL[c]) + (255,))
    return im.resize((16*scale, 16*scale), Image.NEAREST)
for name, frames in FRAMES.items():
    open(f'{name}.svg', 'w').write(svg(frames[0]))
    png(frames[0], 8).save(f'{name}.png')
    imgs = [png(f, 8) for f in frames]
    imgs[0].save(f'{name}.gif', save_all=True, append_images=imgs[1:], duration=400, loop=0, disposal=2, transparency=0)
