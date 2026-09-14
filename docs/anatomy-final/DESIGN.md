<!-- MIT design notes; anatomy asset licenses remain CC-BY-SA / CC-BY. -->
# Anatomy atlas design

Dark full-page clinical study workspace, system-colored controls, persistent source attribution. Typography and spacing use the atlas CSS tokens. The implementation brief and current scope are in REBUILD.md and README.md; the former nine-system radial explode layout and strict 2 MB cap are superseded.

Assembled view preserves common coordinates. Skin is an explicit exterior mode; muscle fascia is an optional covering layer. System-only framing fits the enabled anatomy. Study view uses orthographic tiles, normalized scale, 10 CSS pixel silhouette padding per side, labels and stable system/name ordering. Scrolling is virtualized; selecting opens rotatable source-resolution regional detail and returns to the same board position.

No continuous background animation. WebGL renders only on interaction/load; reduced motion disables orbit damping. Source materials are represented by tissue colors and restrained roughness; decorative muscle shading is not anatomical fibre data. Source skin segmentation remains visible and requires future asset review.

## Medica brand alignment

Match the existing `/anatomy` page and site header: Poppins via `--font-sans`; emerald #078859 (hover #067A50), white #FFFFFF, mint #F7FDFA, heading #171717, body #253D34, muted #52675E, border #D6E8DF. Static white-to-mint-to-white gradient on navigation surfaces. Use the site's existing /Medica-logo.png at 115px wide. Heading 30px/700, section 14px/500, body/control 14px/400–500, supporting labels 12px, persistent credits 10px. Retain the dark #0B1016 anatomy canvas with high-contrast light text and mint accents, so tissue colors remain legible. No animated gradients or changes to model materials.

Continuous study transition: the slider accepts 0–100 in 1% increments. A 180ms reversible GPU vertex morph interpolates from the current assembled-camera projection to each normalized orthographic tile. Original geometry positions stay immutable; bounds culling is suspended only during the screen-space transition. Intermediate views stop rendering when settled. At 100%, the virtualized board and inspection controls take over; reduced motion skips timed interpolation.
