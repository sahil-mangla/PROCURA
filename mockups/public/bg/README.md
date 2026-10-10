# Background imagery (optional)

Each direction lays `public/bg/<name>.jpg` over its procedural mesh if the file exists:

- `trace.jpg`    dark and atmospheric (blend: soft-light)
- `ledger.jpg`   pale and airy (blend: soft-light)
- `docket.jpg`   a desk surface seen from above (blend: soft-light)
- `launcher.jpg` soft and pastel

Suggested size: 2400x1500, under 400 KB (JPEG quality ~70). Prompts to paste into Imageory or any image model:

- trace:    "abstract aurora ribbons in deep indigo and violet with warm amber glow at the lower edge, soft focus, cinematic, no text, no people, dark background"
- ledger:   "macro photograph of pale green ledger paper with soft morning window light, faint ruled lines, subtle paper fibres, shallow depth of field, no text"
- docket:   "top-down photograph of a cool grey matte desk surface with diagonal window light shafts and soft shadows, minimal, no objects, no text"
- launcher: "soft pastel gradient sky in blush pink, periwinkle and cream, film grain, airy, no text"

If you generate images elsewhere, check the licence allows use in your project.

## Trace
`trace.webp` is the rainy lantern village (cross-stitch pixel art). Trace lays a dark shade over it and blends a WebGL soft aurora on top.

Alternative for a calmer, emptier sky (more room for UI): generate this and save it as `trace.webp` or `trace.jpg`, replacing the village.

    A powerful pixel-art coastal landscape rendered as a hand-stitched textile tapestry. A solitary enormous
    lighthouse stands on a jagged black-rock cliff near the far left, its warm beam cutting horizontally through a
    massive stormy turquoise sky. Huge stylized waves crash against the rocks below, distant seabirds as tiny pixel
    marks. Heavy clouds form enormous abstract shapes across the upper half. Deep navy, cobalt, turquoise, seafoam,
    cream and small amber highlights. Dense cross-stitch texture, visible fabric weave, imperfect handmade stitching,
    nostalgic 16-bit aesthetic. 16:9 hero image, lighthouse strongly isolated against open sky, no mountains, no
    sunset, no buildings except the lighthouse, no frame, no text.
