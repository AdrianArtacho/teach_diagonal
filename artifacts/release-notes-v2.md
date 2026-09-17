# Diamond 2.0.0 — 17 September 2026

## Changes

Full-width Diamond and Piano views share the same melody state and MIDI lighting. View switching preserves the lesson position, retries and partially collected chords, while safely ending active voices. Simple mode leaves only the keyboard, compact song/cue and Controls button. `view=piano|diamond`, `simple=1|0`, and `clear=1` support shareable practice links; M toggles simple mode, V switches view, Escape restores controls.

The mapping editor adds white-then-black guided calibration, one-key learning, editable input and independent LED addresses/channels, explicit timed LED tests, staged/cancellable changes, range/duplicate validation, and JSON import/export. Old maps retain their v1 LED defaults. Learning does not change hardware mode.

## Verification

- 71 Node tests passed (`node --test tests/*.test.mjs`).
- 70 Chromium fixture-backed checks passed (`python3 tests/browser_smoke.py`).
- Screenshots inspected for desktop and phone views and the mapping editor.
- See `browser-verification-v2.json` for individual browser checks and limitations.

Physical Launchpad ports, actual LED palette, iPad/Safari hardware and audible latency have not been tested. Browser checks use a fixture/module harness because live navigation is disabled in the local environment; GitHub Pages deployment is checked separately after committing.

The Max project, submodule and version-1 artifact files remain unchanged. Source and screenshots in a downloadable v2 bundle are stored under its `artifacts/` directory; the repository contains this release note and machine-readable verification report.
