# Diamond 2.2.0 — fullscreen and starter melodies

The compact fullscreen control is available beside Restart and Loop in simple mode and in the regular header. `fullscreen=1` presents an explicit one-tap entry invitation; it never claims to bypass the browser's user-activation requirement. Native exit, rejected requests, unavailable APIs and prefixed implementations update the interface appropriately.

Five short monophonic teaching adaptations are added: Mendelssohn's Italian Symphony opening motif, O du lieber Augustin, Moonlight's opening triplet figure, an 1812 finale motif, and the six-note opening of the Romeo and Juliet love theme. Every note is within C4–C5. See `library/SOURCES.md` and `tools/starter-pack.json` for exact material, changes, credits and licences. Yakety Sax is an explicitly local-only entry; no arrangement is republished.

The original four demo files, exported Launchpad mapping, legacy Max project, submodule and earlier artifact versions are preserved. Both melody generators preserve unrelated catalogue entries. CI checks generated starters and the controller preset.

## Actual validation

110 Node tests; 70 existing v2 browser checks; 34 existing v3 checks; 52 new fullscreen/starter checks. All passed. The source-module harness uses fixture fetch/URL/storage/MIDI and real Chromium DOM/CSS. Fullscreen permission/prefix variants are simulated; a separate unmocked headless Chromium fullscreen entry/exit check also passed. Live browser navigation is blocked by environment policy, and physical Launchpad LEDs, iPad/Safari devices and audible latency were not tested.

Three new screenshot deliverables are included in the conversation ZIP under `artifacts/`. The repository retains these versioned release notes and machine-readable reports; deployment is verified separately after committing.
