# Menu World Art Notes

## Delivered production layers

All final layers are 1080×1920 sRGB PNG files:

| File | Alpha | Purpose |
|---|---:|---|
| `assets/menu_world/menu_bg_deep.png` | no | deepest premium tunnel base |
| `assets/menu_world/menu_wall_frame.png` | yes | soft-3D foreground walls |
| `assets/menu_world/menu_track_overlay.png` | yes | lanes and start platform |
| `assets/menu_world/menu_atmosphere.png` | yes | bubbles, cells, sparkles, motes |

## Prompt set used

The built-in image-generation workflow produced:

1. an opaque dark maroon tunnel with a calm center and no embedded objects or UI;
2. isolated coral foreground walls on a flat chroma background;
3. isolated teal/coral/desaturated perspective lanes and start platform;
4. isolated sparse atmospheric particles and bubbles.

Chroma sources were processed locally into alpha PNGs, resized to the 1080×1920 UI
reference canvas, and assigned sRGB profiles.

## Composition

`reference/04-production-world-layers-composite.png` demonstrates the actual supplied
layers assembled with the accepted goal, WBC, virus, and Spermy rig. It contains no
new substitute mascot or goal artwork.

Use `data/menu-world-layers.json` as the authoritative layer and animation contract.

