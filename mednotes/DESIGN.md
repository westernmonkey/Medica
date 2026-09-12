# MedNotes — two-panel light design

Use the real public/Medica-logo.png (copied unchanged into ui/assets for standalone Electron), Medica emerald, and a light paper-like canvas. The interface is one centered column: header, composer rectangle, notes rectangle, then the existing backup disclosure. No workspace sidebar, media category views, statistics, welcome banner, or marketing slogans. Color and SVG ornament provide visual character without adding features.

## Tokens
Colors: canvas #F3F7F2, panel #FFFFFF, raised #EEF7F2, border #D6E5DA, hover border #95B9A2, ink #193C2D, muted #5E7466, emerald #078859, accent text #FFFFFF, recording/error #C0392B; lilac #EEEAF8, lilac ink #665285, butter #F7E9B8, mint #D9EEE2. Backdrop #173C2D66, focus ring #07885922. SVG ornaments use these tokens, never external fonts or image requests.
Type: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; title 24px/600, panel heading 16px/600, body 14px/400, caption 12px/500; line-height 1.5.
Spacing: 4, 8, 12, 16, 24, 32px. Radii 6, 10, 14, 24px and 999px. Borders 1px; focus outline 2px with 2px offset; focus ring 3px. Icons 16px, controls 32px minimum. Content width 920px; logo 120px wide with natural aspect; modal 640px maximum and 80vh high; composer 112px minimum; editor 240px; media maximum height 420px. Decorative panel SVG 112×48px; empty illustration 80px; panel heading icon 32px. Notes remain a single column at all sizes.

## Style and motion
Two large rounded rectangles use mint and lilac heading accents, clean white writing areas, thin borders, and small static SVG illustrations. The page has no full-area gradients, heavy shadows or blur. Note cards use subtle alternating pastel surfaces with a narrow colored edge; colors convey no classification. Hover changes only borders. Buttons have crisp icons and may translate 1px when pressed.
Only transform and opacity animate: 160ms cubic-bezier(0.2,0,0,1); modal entry displacement 4px. Recording dot alone pulses opacity from 1 to .4 over 1000ms. Reduced motion disables animation. No idle decorative movement. At 600px outer padding is 16px, header wraps, keyboard hints hide, and dates stack. All component styles consume the CSS tokens at the top of ui/styles.css.

Editing/tagging retains the working in-app dialog and draft-preserving failure states. Media capture, search, storage, embedding and backup behavior are unchanged.
