# Diamond 2.1.0 — 17 September 2026

## Added

Loop melody with `loop=1` / `loop=0`, saved preferences and loop-aware practice links. Practice wraps after the final correct step without releasing held notes artificially. Reference Listen playback repeats with a fresh time origin each round. Loop can be switched off while playing. Simple mode now has compact Restart and Loop buttons beside Controls; Restart silences active voices and resets the sequence/statistics without changing the view, song, mapping or loop flag.

A built-in **Novation Launchpad** profile uses the exact user-exported mapping in `mappings/novation-launchpad.json`. It is the default for new browser profiles only. Existing settings and the independent Custom map remain intact. Input and LED values are preserved, with no hardware-mode changes on preset selection. The source JSON is compiled into a static module and checked for drift in CI.

## Verification

Actual local results: **86 Node tests, 70 existing Chromium browser regressions, and 34 new Chromium browser checks passed**. `artifacts/verification-v3.json` records the source mapping SHA256 and byte-for-byte check. The fixture-backed browser harness exercises DOM, CSS and input/output logic; normal browser navigation is blocked in the environment. No physical Launchpad or real iPad was tested. Screenshots were inspected for desktop and phone simple mode.

Previous artifacts, Max files and the legacy submodule are preserved. New browser reports and preview screenshots use v3 filenames; re-run v2 results are isolated under `artifacts/v2-regression-v3/`.
