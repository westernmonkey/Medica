<!-- MIT cleanup report; anatomy sources retain their license notices. -->
# Navigation and cleanup

Added Anatomy beside 1v1 in the shared header, linking to /anatomy-final with the requested text-sm font-medium classes. The header wraps at narrow widths; long signed-in email addresses truncate. The credits page no longer needs its own workaround for site navigation.

## Removal inventory

| Removed | Reason |
|---|---|
| @google/model-viewer | No runtime, script or component imports; active viewers use Three.js / React Three Fiber. |
| tw-animate-css | No stylesheet import or configuration reference. |
| @tailwindcss/postcss and postcss.config.mjs | Duplicate Tailwind 4 pipeline; the site uses Tailwind 3 through postcss.config.js and autoprefixer. |
| Direct @eslint/eslintrc declaration | No project import or config reference; ESLint retains any required transitive dependency. Existing ESLint tooling is otherwise unchanged. |
| Radial explode/interpolation helpers and old math tests | Replaced by continuous study-transition code. Triangle-range selection remains, with a focused regression test. |
| Copied rest-position buffer | Only consumed by removed radial deformation; current GPU transition leaves positions immutable. |
| Unused setVisible method, boardZoom state and callback argument | Current UI uses setSystems and precomputed study tile layout. |
| Unused body icon branch and stale CSS selectors | Replaced logo, old empty-state icon and removed attribution markup. |
| 66 superseded CSS declarations | Later cascade rules already supplied these values; computed-style comparison confirms no appearance change. |
| Historical editing comments in header/quiz session | Describe obsolete edits instead of current behavior. |

No retained package versions changed. Root lockfile remains synchronized. GSAP, React Three Fiber/Drei, Three.js, ws, Firebase, KaTeX, Radix, class utilities and anatomy tooling remain because existing routes or build scripts use them. Legacy asset mappings, model files, original source notices, framework configuration and other public routes remain intact. MedNotes Electron has no changes.

The quiz-directory type is restored as nested exam/subject/type records of chapter arrays. The quiz-session searchParams prop now correctly uses a Promise and is directly awaited, matching installed Next.js. Quiz behavior is unchanged.

## Validation

- npm ls --depth=0 and npm ci --dry-run: pass.
- Full TypeScript check and six anatomy unit tests: pass.
- Full Next.js production build using Webpack: pass, all routes generated.
- npm run build (Turbopack): this execution environment rejects helper-port creation with EPERM, including the escalated retry. No bundler configuration changed.
- Anatomy browser regression: pass (loading/retry, isolation/detail, board return, narrow layout, credits, range response and disposal).
- Computed atlas styles before/after: identical at 1280, 960 and 395px for the inspected live controls.
- Site route smoke checks: homepage, sign-in, sign-up, quiz setup, 1v1, original anatomy, credits and dashboard redirect pass without browser exceptions.
- Signed-out and signed-in header layout fixtures pass at 395px. A live authenticated account was not used; dashboard 3D and live multiplayer sessions were not exercised end-to-end. Their modules compile and dependencies are retained.
- Transition idle assertion now waits for all overview loading to finish, avoiding false failures from legitimate download-completion renders.
- Continuous transition browser checks pass at intermediate percentages, on reversal, at mobile width, at idle and with reduced motion.
