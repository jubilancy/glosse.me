# Garden critters

30 animated 32×32 pixel critters on one shared 14-colour palette, as GIF, PNG and SVG.

| | | | | | |
|---|---|---|---|---|---|
| <img src="../assets/critters/gif-4x/ladybug.gif" width="96" alt="ladybug"><br>ladybug | <img src="../assets/critters/gif-4x/bee.gif" width="96" alt="bee"><br>bee | <img src="../assets/critters/gif-4x/butterfly.gif" width="96" alt="butterfly"><br>butterfly | <img src="../assets/critters/gif-4x/snail.gif" width="96" alt="snail"><br>snail | <img src="../assets/critters/gif-4x/frog.gif" width="96" alt="frog"><br>frog | <img src="../assets/critters/gif-4x/toad.gif" width="96" alt="toad"><br>toad |
| <img src="../assets/critters/gif-4x/caterpillar.gif" width="96" alt="caterpillar"><br>caterpillar | <img src="../assets/critters/gif-4x/dragonfly.gif" width="96" alt="dragonfly"><br>dragonfly | <img src="../assets/critters/gif-4x/ant.gif" width="96" alt="ant"><br>ant | <img src="../assets/critters/gif-4x/spider.gif" width="96" alt="spider"><br>spider | <img src="../assets/critters/gif-4x/worm.gif" width="96" alt="worm"><br>worm | <img src="../assets/critters/gif-4x/hedgehog.gif" width="96" alt="hedgehog"><br>hedgehog |
| <img src="../assets/critters/gif-4x/mouse.gif" width="96" alt="mouse"><br>mouse | <img src="../assets/critters/gif-4x/rabbit.gif" width="96" alt="rabbit"><br>rabbit | <img src="../assets/critters/gif-4x/squirrel.gif" width="96" alt="squirrel"><br>squirrel | <img src="../assets/critters/gif-4x/mole.gif" width="96" alt="mole"><br>mole | <img src="../assets/critters/gif-4x/robin.gif" width="96" alt="robin"><br>robin | <img src="../assets/critters/gif-4x/owl.gif" width="96" alt="owl"><br>owl |
| <img src="../assets/critters/gif-4x/moth.gif" width="96" alt="moth"><br>moth | <img src="../assets/critters/gif-4x/firefly.gif" width="96" alt="firefly"><br>firefly | <img src="../assets/critters/gif-4x/beetle.gif" width="96" alt="beetle"><br>beetle | <img src="../assets/critters/gif-4x/grasshopper.gif" width="96" alt="grasshopper"><br>grasshopper | <img src="../assets/critters/gif-4x/slug.gif" width="96" alt="slug"><br>slug | <img src="../assets/critters/gif-4x/cat.gif" width="96" alt="cat"><br>cat |
| <img src="../assets/critters/gif-4x/fox.gif" width="96" alt="fox"><br>fox | <img src="../assets/critters/gif-4x/bat.gif" width="96" alt="bat"><br>bat | <img src="../assets/critters/gif-4x/hummingbird.gif" width="96" alt="hummingbird"><br>hummingbird | <img src="../assets/critters/gif-4x/lizard.gif" width="96" alt="lizard"><br>lizard | <img src="../assets/critters/gif-4x/tortoise.gif" width="96" alt="tortoise"><br>tortoise | <img src="../assets/critters/gif-4x/mantis.gif" width="96" alt="mantis"><br>mantis |

## Files

All output is in [`assets/critters/`](../assets/critters):

- `gif/` – the animated 32×32 GIFs (2 or 4 frames, transparent background).
- `gif-4x/` – the same GIFs scaled 4× with sharp pixels (128×128), handy for previews.
- `png/` – first frame at 256×256, transparent.
- `svg/` – first frame as crisp SVG, one rectangle run per row.
- `sheet.png` – contact sheet of every critter.

Use `image-rendering: pixelated;` in CSS when showing the 32×32 files bigger than their native size.

## Regenerate

```sh
uv run --with pillow python _pixel/critters.py
```

Each critter is a small function in [`critters.py`](critters.py) that draws shapes for a given frame. Add one to `CRITTERS` to make another. `test/` holds the earlier 16×16 frog test.

## Palette

| name | hex |
|---|---|
| ink | `#2d2438` |
| plum | `#5b4a6b` |
| moss | `#3e6b52` |
| leaf | `#6aa86a` |
| lime | `#b8d77a` |
| cream | `#f7f0dc` |
| butter | `#f4d66b` |
| peach | `#f2a97e` |
| coral | `#e0685f` |
| rose | `#eb9fb5` |
| sky | `#8ec5dc` |
| lav | `#a99bd8` |
| bark | `#8b5b45` |
| tan | `#c9966a` |
