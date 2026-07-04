# Devlog

Running log of decisions, findings, and things learned while building this project. Newest entries at the
top. This is a working log, not a polished changelog — see git history for the authoritative record of what
changed in each commit.

---

## 2026-07-04 — Reference control scheme, softer shadows, Hoogeveen-Toldijk naming

- Three user requests: (1) adopt the reference project's control scheme, (2) soften the shadows (there was
  "black around the edges of things on the ground"), (3) rename to the Hoogeveen-Toldijk substation.
- **Controls** — rewrote `FirstPersonController` to match `Voorbeelden/substation_v17_3_fix_prot.html`
  exactly: custom manual pointer-lock + yaw/pitch look (YXZ euler), walk 4.5 m/s / sprint 9, mouse
  sensitivity 0.0018, eye height 1.75, pitch clamp ±1.2, arrow keys as WASD aliases, interaction reach 5.5 m.
  Key bindings: **E** operate / close-and-relock, **B** open IED relay, **F** toggle SLD, **Z** toggle
  labels, **Esc** close/unlock, click to lock. This replaced drei's `PointerLockControls` (which owned
  rotation) with manual input; all keyboard input now lives in the controller, so the App-level E/Esc
  handler and the `interactSignal`/`paused` prop plumbing were removed. Added store: `showSld`, `showLabels`,
  `toggleSld`, `toggleLabels`, `closeAllPanels`; `BoxPrimitive` now hides its label when `showLabels` is off
  and carries an optional `iedId` so B can jump straight to the relay.
- **Real bug the control rewrite surfaced** (would hit real users too, not just tests): some browsers emit a
  large synthetic `mousemove` the instant pointer lock engages, which snapped the camera to face the floor.
  Clamped single-frame mouse deltas >120 px (a real mouse never jumps that far in one event) — camera stays
  level on lock now.
- **Shadows** — the "black edges on the ground" were the SSAO + ContactShadows contact darkening being too
  strong. Cut SSAO intensity 22→6 and radius 0.12→0.06 (with a fade), and ContactShadows opacity 0.3→0.14.
  The real sun shadow maps stay; the heavy halos around equipment bases are gone.
- **Naming** — substation → "Onderstation Hoogeveen-Toldijk"; feeders use real Hoogeveen districts/areas
  (Buitenvaart, Wolfsbos) and a neighbouring-town line (Beilen). IDs (`bay-f1`, `ied-f2`, …) kept stable so
  scenarios/tests are unaffected; only display names changed. Tutorial + scenario + controls-bar text
  translated to Dutch to match. Noted in `demoSubstation.ts` that the feeder names are illustrative, not
  verified against the operator's real bay schedule.
- Verified end-to-end (Playwright): renaming shows in the top bar + SLD, F toggles the SLD, E opens & closes
  a panel, hover hints show the new `[E]/[B]` format, the PAC scenario still works with the renamed buttons,
  8 unit tests pass, no console errors. Softer shadows confirmed in the yard screenshot.

---

## 2026-07-04 — Real lighting: sun shadows + post-processing

- User asked (again) whether I could "enable Claude Designer" to fix the graphics. There is no such tool —
  the visual quality comes from the geometry/materials/lighting written in code. Clarified that and instead
  did the highest-impact *free* lighting upgrades that were still on the table:
  - **Real sun shadow maps**: `<Canvas shadows="soft">` + the directional sun now `castShadow`s with a
    2048² map and a shadow camera sized to the whole yard→control-room extent (bias/normalBias tuned to
    avoid acne on the thin lattice/insulator geometry). Equipment now throws shadows on the ground and each
    other — the single biggest realism gain over flat-lit boxes, and it costs nothing but a shadow pass.
  - **Post-processing** via `@react-three/postprocessing` (v3, compatible with fiber 9 / React 19):
    `scene3d/PostFx.tsx` runs a restrained SSAO (contact darkening in crevices / where surfaces meet) +
    a high-threshold Bloom (only LEDs and the bright sky glow, not an arcade wash) + SMAA + a faint
    Vignette. Kept modest (SSAO 16 samples, small radius) to stay laptop-friendly per the perf requirement.
- Verified: no console errors with the effect stack, the PAC scenario + panels still work end-to-end, the
  8 engine unit tests pass, and the production build succeeds (bundle grew ~1.17→1.43 MB / 437 KB gzip from
  the postprocessing lib — acceptable for a graphics-heavy app; the >500 KB chunk warning is expected for
  Three.js + effects, not an error).
- Honest ceiling note for future me / the user: with **procedural box-and-lathe geometry** (the user's
  chosen approach) this is roughly the realism ceiling — shadows + AO + PBR materials are doing the heavy
  lifting. The next real step-change would be swapping key equipment for authored/sourced **GLTF models**,
  which the user has so far chosen not to do. Worth re-offering if they remain unsatisfied.

---

## 2026-07-04 — PAC comms-fault scenario + partial control building

- User picked (via AskUserQuestion): focus on **gameplay scenarios**, build the **PAC comms-fault** scenario
  first, enclose the **control/PAC room as a building** (rest stays outdoors), keep geometry **procedural**.
- **PAC comms-fault scenario (docs/scenarios.md Scenario 4), fully implemented:**
  - Model: added `Ied.prpPorts` (LAN A/B) and `ReportControlBlock.configOk`.
  - New `engine/commsSimulator.ts` (the file was named in the tech design but never built) with two failure
    modes that present the *same* symptom but need opposite responses: `'prp-link'` (one PRP LAN down →
    redundancy tolerates it, `commsStatus` stays OK → diagnose "degraded, no outage", schedule a repair) vs
    `'config'` (report-control-block reference mismatch → station bus LOST → correct the configuration).
    Three new commands wired through `applyCommand`: `InjectPacFault`, `FixIedConfig`, `RestorePrpPort`.
  - New `ui/NetworkCommsPanel.tsx`: per-IED grid of Station bus / Process bus / PRP LAN A / PRP LAN B / RCB
    config, with a contextual diagnosis + the correct action button for the affected IED. Opened by walking
    to the SCADA gateway in the building and pressing E (or a scenario-panel button).
  - Three new unit tests covering both branches and the "fixing config on a PRP-only fault is a no-op"
    teaching case. All 8 engine tests pass.
- **Partial control building** (`ControlRoom.tsx` → new `ControlBuilding` sub-component): light concrete
  walls + roof + floor + a front door gap the player walks through + an interior ceiling `pointLight`. IED
  cubicles, SCADA gateway and test-set line the back wall facing the entering player. `collision.ts` updated
  with the wall segments (door gap left open) so you can't walk through walls but can through the door;
  walkable `BOUNDS.maxZ` bumped to give an approach run to the door.
- **Real bug found during verification (again, by testing, not the user):** the crosshair interaction
  raycast reached *through walls* — standing inside the building, the hint showed a distant MV feeder because
  `.find(interactable)` ignored the wall in front of it. Fixed by capping `raycaster.far` to a 3.2 m
  interaction reach *and* rejecting the target when a non-interactable mesh is >0.25 m closer (an occluder),
  while the 0.25 m tolerance still lets a cabinet's own thin decals sit in front of it. This also fixes
  interacting with equipment across the yard through the crosshair.
- Note (not a bug, standard pointer-lock behaviour): while the pointer is locked for walking, the
  always-visible side panels (SLD, alarms, scenario) can't be clicked — the canvas has pointer capture. Press
  Esc to release the cursor, then click. The main in-world interaction is E-key, so this is fine; documented
  in the controls bar / tutorial.

---

## 2026-07-04 — Geometry overhaul: real equipment shapes, not boxes

- Feedback after the material pass: graphics still looked "bagger" (crap). Correct diagnosis on the user's
  part — the earlier pass improved *materials* but the *geometry* was still all flat boxes, which no amount
  of PBR tuning fixes. Did focused research (WebSearch on ABB UniGear panel proportions, MV switchgear room
  photos, AIS yard equipment) and rebuilt the actual shapes.
- Key new reusable primitive: `scene3d/primitives/Insulator.tsx` — a ribbed porcelain post insulator built
  as ONE mesh via `LatheGeometry` (a sawtooth core→shed→core radial profile revolved around Y). This is the
  single most recognisable HV-yard shape and it appears everywhere (breaker supports, disconnector posts,
  CT columns, transformer bushings), so making it a good one-mesh primitive was the highest-leverage change.
  Stacking dozens of separate disc meshes would have looked the same but cost far more draw calls.
- **MV switchgear** (`MvSwitchgearRoom.tsx`): rebuilt from a flat box into a realistic metal-clad panel —
  light-grey RAL-7035-style body, tall/narrow/deep proportions (1.0 × 2.4 × 1.5 m) in a butted lineup, with
  the three real compartments on the front face: LV instrument compartment on top (mimic-diagram silkscreen
  decal + relay faceplate + indicator lamps), breaker compartment in the middle (ventilation louver decals +
  racking port), cable compartment at the bottom, dark plinth and vertical seam lines. New textures for the
  louvers and the mimic panel; new `useSwitchgearGrey`/`useLouver`/`usePanelMimic` materials.
- **120 kV yard** (`Yard120kV.tsx`): replaced box-breakers with proper **live-tank breakers** (steel
  support frame → two vertical porcelain insulator columns → horizontal interrupter chamber on top →
  operating-mechanism cabinet at the base, which is the interactable element), **centre-break
  disconnectors** (two post insulators + a horizontal aluminium blade), and **CT columns** (tall ribbed
  insulator + box head). Overhead jumpers now drape busbar → CT → disconnector → breaker.
- **Transformer** (`TransformerBay.tsx`): tank + corrugated **radiator banks** on both sides, a cylindrical
  **conservator** on top, and ribbed **HV/LV bushings** angled up off the lid (the iconic transformer
  silhouette) — plus a marshalling cabinet and the loading-status lamp.
- **IED cubicles** (`ControlRoom.tsx`): floor-standing relay cubicles with the faceplate recessed into the
  upper front (glazed LCD behind a bezel, an LED status column, a keypad plate) instead of a plain box.
- `collision.ts` footprints updated to match every new footprint (panels deeper, breakers moved, etc.).
- The status-lamp-not-whole-body convention (from the earlier pass) carried through: every device keeps a
  fixed real-world colour and shows open/closed/tripped via a small separate lamp, so nothing flips colour
  like a toy.
- Verified by walking the scene (Playwright, four vantage screenshots): the MV lineup, live-tank breakers
  with insulator columns, transformer with bushings/radiators, and IED cubicles all read as real equipment.
  Gameplay unaffected — panel centering/pause/escape-close, no-accidental-click, and the 5 engine unit tests
  all still pass, zero console errors.

---

## 2026-07-04 — Panel UX fixes, material library, and a real accidental-click bug

- User reported: with a panel open, walking (WASD) still worked but looking around didn't — an
  inconsistent "half-paused" state. Fixed by adding a `paused` prop threaded from `App.tsx` through
  `SubstationScene` into `FirstPersonController`: while a panel is open, the movement/collision/hover-raycast
  block in `useFrame` is skipped entirely and any active hover highlight/hint is cleared. Mouse-look was
  already effectively paused (pointer lock is released so the cursor is visible for clicking), so this makes
  the pause consistent across both axes instead of just one.
- User asked for panels centered on screen + closable by keyboard. `IedFrontPanel` was already centered
  (wrapped in `.modal-backdrop`); `BayControlPanel` was still positioned bottom-center from an earlier
  iteration — moved it into the same `.modal-backdrop` pattern. Escape-to-close already existed in `App.tsx`
  but wasn't advertised on the panel itself; added a visible "Press Esc to close" line to both panels.
- **Real bug found while verifying the above, not by the user**: clicking into the canvas to (re-)engage
  pointer lock also fired React Three Fiber's own click handling on whatever interactive mesh happened to be
  at screen centre (the crosshair position) — because the primitives still had a mouse `onClick` left over
  from before first-person mode existed, kept as an "alternate input path." Result: looking directly at a
  breaker/cabinet/IED and clicking the 3D view just to start moving would silently trigger that object's
  action. Fixed by removing `onClick` from `BoxPrimitive` and every caller entirely — E-key interaction
  (via `userData.interactable` + the crosshair raycast) is now the *only* 3D interaction path, with the
  HMI/IEDs list panels as the deliberate non-3D fallback (see the entry above about drei `<Text>` not being
  a DOM node). Worth remembering: once an object has two independent input paths (mouse click and a custom
  raycast-driven interaction), any click that isn't meant for gameplay — including a plain "focus the canvas"
  click — can still trigger the gameplay path if it lands on the same mesh.
- **Graphics pass**, per an explicit visual-fidelity request (PBR materials, believable industrial look,
  subtle interaction feedback instead of arcade glow):
  - New `scene3d/materials.ts` — a small reusable-material library (`usePaintedMetal`, `useBrushedMetal`,
    `useConcreteFloor`, `useRubberInsulation`, `useGlassPanel`, `useCopperBusbar`, `useWarningSticker`), each
    a hook returning a `{color, roughness, metalness, map?}` bundle to spread onto `BoxPrimitive`. Extending
    it means adding one hook, reusing or adding a procedural texture in `textures.ts` — no call site changes.
  - Applied across the MV cabinets (recessed door panel, plinth, top trim, hazard-sticker decal), the yard
    (portal steelwork, CT/disconnector stands, copper busbar/jumpers, concrete pedestal), and the IED panels
    (glazed display behind a brushed-metal bezel).
  - Procedural `<Environment>` built from `<Lightformer>` primitives (not a fetched HDRI) for soft PBR
    reflections, `<Sky>` for the backdrop, and `<ContactShadows frames={1}>` (baked once, not recomputed
    every frame — this is a static scene) for grounding, all without adding any external asset files.
  - Deliberately **not** done, and worth flagging rather than silently skipping: no GLTF/GLB model imports
    (no source assets available, and authoring them by hand isn't a good use of time at this scope), no
    SSAO/postprocessing pass (kept the dependency footprint and frame cost down — the procedural textures'
    own dark creases plus ContactShadows do most of that job cheaply), no LODs (scene is small enough that
    they wouldn't do anything yet).
  - Subtle hover highlight: a faint emissive tint set directly on the hit mesh's material in
    `FirstPersonController`'s raycast loop (not a glowing outline), replacing "no visual feedback at all
    beyond the text hint."
- Reconfirmed the Vite-first-request quirk from earlier today (blank canvas until a reload) — now treating
  it as expected and always doing a throwaway navigation before judging a screenshot, instead of re-bisecting
  it as if it were a new bug each time.

---

## 2026-07-04 — Real switchyard, daytime lighting, working cable runs, two first-person bugs fixed

- User supplied a prior vanilla-Three.js prototype (`Voorbeelden/substation_v17_3_fix_prot.html`) as a
  reference for cabling and asked for: real first-person walking (already built earlier today), a realistic
  open-air switchyard layout, and a daytime world instead of the very dark one shipped earlier.
- **Cabling, ported from the reference's approach** rather than invented from scratch:
  - `scene3d/primitives/OverheadJumper.tsx` — segmented parabolic-sag 3-phase conductors (ported from the
    reference's `makeOverheadLine`/`cleanJumper` functions), used in the rebuilt `Yard120kV.tsx` for
    busbar→disconnector→breaker jumpers.
  - `scene3d/primitives/GroundCableRoute.tsx` + `scene3d/CableRuns.tsx` — colour-coded ground-level cable
    stripes (ported from the reference's `undergroundCable`), connecting transformer → MV incomer (orange,
    LV power), each protected bay's merging unit → its IED (cyan, process bus / Sampled Values), and each
    IED → a new station-bus patch panel object (violet, GOOSE/MMS) — see `research.md` §7 for why those are
    modeled as separate buses.
- **Yard120kV.tsx rebuilt** as an actual open-air AIS switchyard: two lattice portal towers holding a busbar
  at height, with a CT stand, disconnector, and breaker in line per bay — the "classical" AIS layout
  (research done via WebSearch: busbar disconnectors in line, busbar strung above, branch lines down to the
  breaker). `collision.ts`'s obstacle list had to be updated to match the new footprint.
- **Daytime lighting**: sky-blue background + fog, hemisphere + brighter directional "sun", lighter gravel
  ground — replacing the very dark default that prompted the complaint.
- **Two real bugs found and fixed** during this pass (not requested directly, found by testing):
  1. **Crosshair invisibility**: switched to `mix-blend-mode: difference` so it reads against *any*
     background (dark or the new bright sky) instead of a fixed semi-transparent white that could wash out.
  2. **Couldn't click anything once a panel was open**: drei's `PointerLockControls` attaches its
     click-to-relock listener to `document` by default, so clicking a panel button re-locked the pointer
     lock in the same event and made the click land on the canvas instead. Fixed with the `selector`
     prop scoped to `.canvas-container` only — this is exactly what the reference file does with its own
     `anyOpen()`-guarded click listener (`substation_v17_3_fix_prot.html:2834`), just implemented as a
     drei prop instead of a manual guard.
  3. A related **race condition** surfaced under heavier scene load (more meshes from the yard/cable work):
     if the pointer-lock request from clicking the canvas hadn't actually engaged yet at the moment a panel
     opened (e.g. via "E"), `exitPointerLock()` was a no-op and the lock then engaged *after*, leaving the
     cursor stuck. Fixed with a `pointerlockchange` listener in `App.tsx` that keeps re-releasing the lock
     for as long as a panel is open, closing the timing window instead of relying on a single call.
- **Debugging note for future me**: `gl.readPixels()` against the Three.js canvas from a separate
  `page.evaluate()` call is *not* reliable for checking "did anything render" — WebGL's drawing buffer is
  not preserved after compositing by default (`preserveDrawingBuffer: false`), so it can read back all
  zeros even when the actual displayed frame (as seen via `page.screenshot()`) is correct. Lost real time
  bisecting a phantom "blank scene" bug this way before switching to real screenshots, which showed the
  scene had been rendering correctly all along — the actual bug was the pointer-lock click issue above.
- Not done yet (flagged rather than attempted): the reference file's drag-and-drop cable layout editor and
  perimeter fencing/signage are not ported — the cable *routes* are hand-placed constants, not
  player-editable. Worth asking the user whether that editor is wanted before building it, given its size.

---

## 2026-07-04 — First working prototype

- Scaffolded with `create-vite react-ts` into a temp subfolder and moved the files up, rather than running
  it directly in the repo root — `create-vite` refuses/aborts in a non-empty directory (this repo already
  had `docs/` and `.git/`), and a temp-then-move avoids fighting its interactive prompts non-interactively.
- `@react-three/fiber`/`@react-three/drei` v9/v10 require **React 19** as a peer dependency — matched that
  against the scaffolded React 19 template rather than pinning fiber v8 (which targets React 18). Worth
  remembering next time: check peer deps before pinning versions, don't assume the "stable-sounding" major
  is compatible.
- Used `structuredClone(state)` for immutable updates in the engine instead of hand-writing spread-copies
  through every nested level. The whole `SubstationState` is plain data (no functions/class instances), so
  this is safe and kept `substationEngine.ts`/`protectionEngine.ts` far shorter — a deliberate simplicity
  trade-off for a prototype, revisit if profiling ever shows it's a bottleneck (unlikely at this scale).
- Chose `OrbitControls` over the originally-planned `PointerLockControls` for the prototype camera:
  pointer-lock requires a user gesture to capture the pointer and is awkward to drive/verify (including via
  automated browser testing), while orbit controls give the same "look around the station" experience with
  no capture step. Documented as a deviation in `technical-design.md`/README rather than silently diverging.
- **Verification caught a real usability gap**: the only planned way to open an IED's front panel was
  clicking its 3D panel mesh — but that mesh's *label* is drei `<Text>` (a Troika/WebGL-rendered mesh, not a
  DOM node), so there was no reliable non-3D way to reach it, and it's also fragile to hit precisely once
  the orbit camera has moved. Fixed by adding an "IEDs" list to the SLD/HMI overlay (plain DOM, click to
  open) — this is also just a better real-world HMI pattern (open a device from a list, not only by
  physically clicking it), not just a testability workaround.
- Full browser verification (Playwright, headless Chromium) confirmed end-to-end: blocked out-of-order
  switching with the correct interlock reason, the full safe de-energization sequence, fault injection →
  breaker trip → IED TRIP LED → event/alarm → acknowledgment → LED update, with zero console errors.
- `npx tsc -b` and `npm run build` are both clean (zero TypeScript errors); `npm run test` (Vitest) covers
  interlocking and the protection-trip flow independently of any 3D rendering, per the plan.

---

## 2026-07-04 — Project kickoff, research, and design docs

- Repo started empty; planned the whole project (research → design docs → scaffold → prototype) before
  writing any code, per the brief.
- Chose React Three Fiber + drei over Babylon.js/vanilla Three.js specifically because so much of this
  game's surface is 2D UI (HMI/SLD, IED panels, event logs) layered over the 3D scene — R3F lets both share
  one component tree and one Zustand store. Recorded in `technical-design.md` §1.
- User feedback incorporated into the plan before building:
  - Merging units must be modeled explicitly, with CT/VT feeding into them (not directly into IEDs), and
    everything fiber/PRP-redundant with a station bus *and* a process bus — not just a single flat network.
    See `technical-design.md` §3.2/§3.4 and §7.
  - The three vendor-style equipment brands ("Voltrix"/"Halvex"/"Greyhart") needed to be actual designed
    fictional identities (name + wordmark style + color scheme) inspired by ABB/Eaton/GE's industrial look,
    not just a generic "-style" label with no visual identity. See `game-design.md` §4.
  - Keep this devlog going continuously, not just as an end-of-project summary.
  - Data model should track IEC 61850 **Edition 2.1** specifically. Researched this (see `research.md` §8)
    — Edition 2.1 is a consolidation of Edition 2 + Amendment 1 (corrections folded into the core parts),
    not a new logical-node vocabulary, so the well-documented Edition-2-era LN/CDC model is what's actually
    implemented, with that caveat stated explicitly rather than glossed over.
- Research note: several IEC standard texts are paywalled at the IEC webstore. Where a claim in
  `research.md` rests on a secondary source (vendor whitepaper, technical blog) rather than the primary
  standard, that's flagged inline rather than presented as if verified against the standard itself.
