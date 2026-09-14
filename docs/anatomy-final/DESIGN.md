<!-- MIT design notes; anatomy asset licenses remain CC-BY-SA / CC-BY. -->
# Anatomy atlas design

Dark full-page clinical study workspace, system-colored controls, persistent source attribution. Typography and spacing use the atlas CSS tokens. The implementation brief and current scope are in REBUILD.md and README.md; the former nine-system radial explode layout and strict 2 MB cap are superseded.

Assembled view preserves common coordinates. Skin is an explicit exterior mode; muscle fascia is an optional covering layer. System-only framing fits the enabled anatomy. Study view uses orthographic tiles, normalized scale, 10 CSS pixel silhouette padding per side, labels and stable system/name ordering. Scrolling is virtualized; selecting opens rotatable source-resolution regional detail and returns to the same board position.

No continuous background animation. WebGL renders only on interaction/load; reduced motion disables orbit damping. Source materials are represented by tissue colors and restrained roughness; decorative muscle shading is not anatomical fibre data. Source skin segmentation remains visible and requires future asset review.
