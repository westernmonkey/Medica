<!-- MIT implementation report; anatomy asset licenses remain CC-BY-SA / CC-BY. -->
# Medica male gross-anatomy atlas

This rebuild supersedes the former nine-system, 2 MB-per-system implementation. `/anatomy-final` now uses eleven system categories and 2,846 named canonical structures, with shared memberships, 11 overview GLBs and 63 unsimplified regional-detail GLBs. The 53.717 MB total is deferred by system/region, not a startup download. Do not describe this as a complete or anatomically reviewed atlas.

## What changed

- Z-Anatomy's shared male coordinates replace first-system-wins BodyParts3D assembly. Mandible and teeth remain skeletal, also referenced by digestive anatomy. Joints remain within the skeletal system.
- System-only controls and expandable regional/structure lists expose the nerves, solid lung lobes, airways and individual structures. Covering fascia is optional in the assembled muscular view; fascia remains selectable and appears on the study board.
- Skin is an explicit exterior-only rendering mode, preventing internal meshes from showing through the surface. The source skin has regional segmentation seams; this is not a continuous photorealistic skin replacement or proof of absence of internal intersections.
- At 100%, a virtualized, orthographic study board packs named structures by enabled system. Each square reserves 10 CSS px on each side, plus a small fitting margin. Tiles are normalized and labelled not to anatomical scale. Native scrolling/drag pans; buttons or Ctrl/Cmd-wheel resize tiles. At 0%, original coordinates are restored without modifying vertices. Inspection preserves board scroll position. The slider continuously interpolates projected part positions and scale; reduced motion applies the selected percentage immediately.
- Source-resolution regional detail loads on selection. A shared prioritized loader deduplicates requests, supports retries and cancels on disposal. Two regional detail meshes are cached; overview systems idle-load. On-demand rendering stops while idle.
- Original source material boundaries and available UVs survive conversion. The procedural shaders are replaced with tissue colors/roughness and subtle decorative muscle shading. No unverified raster textures are imported.

## Provenance and limits

See [z-source.json](z-source.json), [source-provenance.json](source-provenance.json), [registration.json](registration.json), and [COVERAGE.md](COVERAGE.md). Pinned source revision: `b9c9f98066e1e786814603b047c5bd3638c2a864`. The inherited license explicitly identifies NC kidney and inner-ear inputs; entire affected source regions plus unverified brain/white-matter inputs were excluded. Original notices remain visible and downloadable. Z source image assets and Wikipedia definitions are excluded. Clear provenance of the inherited cranial-nerve contribution relies on the pinned project's attribution; an independent commercial legal review is still required before release.

Direct CC-BY BodyParts3D brain/kidney replacements use one uniform landmark registration: 8.05 mm RMS, 14.61 mm maximum residual across nine bone-center landmarks. This is provisional geometric alignment, not organ-specific anatomical validation. No local warping or invented anatomy is used. All anatomy review statuses remain pending.

Known gaps: inner-ear anatomy, uncleared detailed white-matter tracts, continuous spinal-cord exterior verification, and finer anatomy identified by the name-based coverage screening. Female anatomy is outside scope. Prostate interiors and physiology lessons remain deferred. No clinically validated or commercially ready claim is made.

Credits and adapted overview/detail downloads: `/anatomy-final/downloads.html`. Viewer code MIT; adapted Z geometry CC-BY-SA 4.0 with inherited BP2.1/Dundee notices; direct BP replacements retain CC-BY4. No source app code imported. Blender GPL is offline tooling, not a bundled runtime.

## Reproduce

Existing `anatomy:fetch` downloads verified BodyParts3D inputs used by the first generation. Keep the legacy manifest as the fallback concept mapping; it is not served by the new route.

```sh
npm ci
npm run anatomy:fetch
node scripts/anatomy/fetch-z.mjs
/Applications/Blender.app/Contents/MacOS/Blender --factory-startup --disable-autoexec -b /tmp/medica-z-anatomy/Z-Anatomy/Startup.blend -P scripts/anatomy/export-z.py
python3 scripts/anatomy/register-bp.py
npm run anatomy:build
python3 scripts/anatomy/report-atlas.py
npm run anatomy:audit
npm run anatomy:check
npm run dev -- --hostname 127.0.0.1 --port 3100
npm run anatomy:test
```

Blender 5.1.1, Python with numpy, Node 24 were used. Other platforms must supply their Blender executable path. Exporter excludes embedded scripts and annotations. High-quality master remains the pinned source; no destructive edits to it.

See [ASSET-AUDIT.md](ASSET-AUDIT.md) for independently inspected quantization, file sizes, hashes and fidelity policy. Source detail has no mesh simplification, but is still quantized. Overview relative simplification error is capped at 0.0005 (skin 0.0001); this is not a millimetre or clinical accuracy guarantee.

## Measured verification

- Dedicated TypeScript and study-layout checks pass; browser regressions cover keyboard selection, detail loading, scroll restoration, layout reversal, retries, disposal, idle rendering, 395px/960px layouts and persistent credits.
- Independently decoded 74 GLBs; SHA-256, named node references, position/normal quantization pass. Source comparison of 2,790 Z structures shows a maximum 1.335 mm bounding-box deviation after one common translation. This does not test tissue intersections or establish clinical accuracy.
- Skeleton: 1 draw call. All internal systems with covering fascia hidden: 28 calls / 4.56 million triangles. Exterior mode: 1 call. Study board: 28 visible tiles/calls at desktop, 4 at 395px in the recorded view; offscreen tiles do not render.
- Apple M4 / ANGLE Metal, development server: sustained rotation median 16.7 ms, p95 16.7 ms desktop / 16.8 ms narrow viewport. These are browser frame intervals, not isolated GPU timings. Heap roughly 322 MB with all overview systems resident; 342 MB after detail inspection. GPU bytes not measured. Physical mobile testing and memory optimization remain release work.
- Local first interactive skeleton about 0.9–1.1 seconds (excludes navigation/bootstrap). Conservative model/index/decoder transfer at 10 Mbps: 4.34 seconds, plus initialization and production JS/CSS/fonts. Production end-to-end startup is unmeasured. See startup-estimate.json.
- Anatomical source review, continuous skin quality, detailed nerve coverage and registration sign-off remain unresolved. The original strict one-call / 2 MB rules are superseded; actual fidelity and limitations are reported instead.

Production route compilation succeeds. Full-project TypeScript remains blocked by the pre-existing empty `src/app/question-bank/types.ts` module and its dependent implicit-any error. The dedicated anatomy TypeScript check passes; question-bank files were not changed.

Continuous study transition: the slider accepts 0–100 in 1% increments. A 180ms reversible GPU vertex morph interpolates from the current assembled-camera projection to each normalized orthographic tile. Original geometry positions stay immutable; bounds culling is suspended only during the screen-space transition. Intermediate views stop rendering when settled. At 100%, the virtualized board and inspection controls take over; reduced motion skips timed interpolation.
