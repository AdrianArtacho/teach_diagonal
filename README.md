# [Diamond](https://adrianartacho.github.io/teach_diagonal/)

**A different way to play.** Learn a MIDI melody by playing the next illuminated key, using a diamond-shaped Launchpad or an on-screen piano. Developed by **Adrián Artacho**.

Version **2.1.0** adds melody looping, a simple-mode restart button and the built-in **Novation Launchpad** mapping exported by Adrián. Full-width alternate views, simple mode and the mapping editor remain available. The original Max project in `diagonal/`, the `download-sheet` submodule and version-1 artifacts are retained. The browser app does not depend on the Max project or submodule.

## Start playing

Open [Diamond](https://adrianartacho.github.io/teach_diagonal/), choose a library song or **Open MIDI file**, and press **Enable sound**. Tap the highlighted pad/key. A correct note advances the melody; a wrong note does not. Repeated notes require a release and a fresh press.

The library contains new, simple arrangements of **Ode to Joy** and **Frère Jacques**, plus **Chromatic Walk** and **Diamond Chords**. **Listen** plays a reference using the file's tempo map; its speed is adjustable. Practice is untimed pitch guidance, not rhythm or articulation assessment.

Both views support mouse, multitouch and keyboard. Computer keys `A S D F G H J K` play white keys; `W E T Y U` play black keys. Tab then Enter/Space plays a focused key. Escape silences notes and stops playback.

## Loop mode, quick restart and the bundled preset

Enable **Loop melody** below the instrument, or use **↻** beside **☰ Controls** in simple mode. After the last correct note/chord, the first target lights up again. Repeated or held notes still require a release and a fresh press; looping does not create automatic key presses. The regular controls show completed practice rounds. Retries accumulate until an explicit restart or a new song/part resets the session. **Listen** also repeats while Loop is enabled, resetting its playback time origin at each pass. Switching Loop off lets Listen finish its current pass.

Use `loop=1` to enable repetition in a link and `loop=0` to explicitly disable it. The URL overrides the remembered preference. Without an override, the previous choice is restored. **Copy practice link** includes the loop setting, even when it is off.

[Ode to Joy · simple piano · looping](https://adrianartacho.github.io/teach_diagonal/?song=ode-to-joy&view=piano&simple=1&loop=1) · [Simple diamond · looping](https://adrianartacho.github.io/teach_diagonal/?view=diamond&simple=1&loop=1)

The **↺** button is always available in simple mode. It stops sounding notes/reference playback, returns to the first step, and clears practice statistics without changing the song, view, loop setting or controller mapping. It resets the sequence; it does not automatically start reference playback.

Under **Controller & sound settings → Controller profile**, select **Novation Launchpad · saved preset**. The exact supplied export is stored in [`mappings/novation-launchpad.json`](mappings/novation-launchpad.json). This preset reproduces Adrián's setup, not a universal factory mapping: use the same physical orientation and hardware mode as during the export. It is the default only in a browser without a saved profile. Existing profiles and Custom mappings are preserved. Selecting a preset never sends a hardware-mode command; use **Light up (keep current hardware mode)** to enable its feedback.

The eight white-key input/LED addresses are **64, 61, 58, 55, 80, 77, 74, 71**; the five black-key addresses are **65, 62, 84, 81, 78**. All use channel **1** (zero-based `0` in the JSON). You can inspect the preset in Map controller, edit a copy into Custom, or return to the built-in preset without importing a file. The preset never replaces your separate saved Custom calibration.

`mappings/novation-launchpad.json` is the source of truth. `node tools/generate_preset.mjs` generates its browser module, `src/presets.js`; `--check` verifies the two match. The deployment workflow runs that check. No network request or manual import is needed to load the built-in preset.

## Two views, one lesson

**Diamond** and **Piano** are alternate, full-width playing surfaces. Switch with the buttons above the instrument or press **V**. The lesson step, retry count and partially collected chord are retained. Active voices/reference playback are stopped safely during a switch. MIDI input and controller LEDs remain functional in either view.

The piano is a complete practice interface, not a miniature secondary display. Lesson controls sit **below** the instrument rather than taking width alongside it.

The diamond's centre diagonal is **C D E F G A B C**, with **C♯ D♯ F♯ G♯ A♯** on the adjacent diagonal above. There is no black key between E/F or B/C. The other 51 pads are inactive. Default register: **C4–C5, MIDI 60–72**.

## Simple mode and links

Press **Simple mode** or **M** to hide setup, lesson controls, navigation and footer. Only the keyboard, compact song/next-note indicator, **↺ Restart**, **↻ Loop** and **☰ Controls** remain. Click Controls, press M again, or Escape to restore everything without reloading.

- [Simple piano](https://adrianartacho.github.io/teach_diagonal/?view=piano&simple=1)
- [Simple diamond](https://adrianartacho.github.io/teach_diagonal/?view=diamond&simple=1)
- [Ode to Joy on the simple piano](https://adrianartacho.github.io/teach_diagonal/?song=ode-to-joy&view=piano&simple=1)

URL parameters: `view=diamond|piano`, `simple=1|0`, `loop=1|0`, and alias `clear=1`. A bare `simple` or `simple=true` also works. Explicit URL values override remembered view settings; `simple=0` overrides saved simple mode. View changes update the URL without removing the song or unrelated parameters.

**Copy practice link** creates a simple-mode link for the current view, loop setting and repository song. Local MIDI files and personal controller maps are **not embedded in links**; open/import them separately on the other device. A selectable-text fallback is provided when clipboard access is unavailable.

Simple mode fills the **browser viewport** without requesting native fullscreen. The existing ⛶ button separately requests native fullscreen where supported; this requires a user gesture and cannot be granted by a URL. On wide, shallow displays, the diamond's **inactive top/bottom corners are cropped**, rather than shrinking the playable diagonal. All 13 musical pads remain visible at the tested desktop, tablet and phone sizes. In portrait, the complete diamond is centred and spans the available width without stretching square pads.

## Learn your Launchpad mapping

The Mini MK3 profile is a preset, **not an assumption about your exact device**. Keep the Launchpad in the mode you intend to use, then:

1. Click **Map controller**. Connect MIDI and select the controller input inside the editor. Its monitor shows the incoming note number, channel and velocity.
2. Click **Learn all 13 pads**. Follow the highlighted calibration diamond: the eight white keys from left to right, then the five black keys. Press and release each physical pad once. Its incoming note number is a pad address, not necessarily the piano pitch.
3. Click **Apply mapping**. This activates the Custom profile, selects pad-controller input mode and saves the map locally. Enable feedback with **Light up** in settings, without changing hardware mode.

To repair only one key, click it on the calibration diamond or use **Learn** on its table row. You can also type **Input note / channel** and **LED note / channel** explicitly. LED and input addresses are independent; the outgoing LED channel is no longer fixed to channel 1. Note numbers are 0–127. The editor shows channels **1–16**; JSON stores **0–15**. New learned pads initially use their input note as LED address and the LED channel chosen above the editor, defaulting to 1.

Each row has a short **LED test**, with an adjustable test velocity/colour value and a timed off message. It uses the selected controller LED output, never the musical synth output. Teaching colours still use the Mini-style velocity palette; learning input notes cannot automatically discover another device's colour scheme or a SysEx-only LED protocol.

Edits are staged: **Cancel / close** preserves the previous saved map. Apply requires all 13 assignments and validates numeric ranges and duplicate input/output destinations. Repeated held note-ons cannot fill successive learning slots. **Export mapping** creates `diamond-pad-map.json`; **Import mapping** stages that file for review and application elsewhere. Existing v1 maps retain their original channel-1 LED defaults. After physically rotating a learned setup, relearn it; the rotation preset is disabled for Custom maps because their physical positions are already explicit.

Calibration does **not** switch hardware mode. While its dialog is open, MIDI does not play sound or advance the lesson. Closing restores the earlier lighting state; applying a new map leaves lighting off until explicitly enabled. Personal mapping files remain local unless you choose to publish them.

### Mini MK3 preset setup

Use a Web MIDI-capable browser, such as desktop Chrome or Edge, on the HTTPS site. Select the **MIDI** input and LED output, **not DAW**. Connect alone does not send lighting commands. **Set Mini MK3 to Programmer + light up** requests SysEx access and sends the Mini-specific mode command. Alternatively, enter Programmer Mode manually and use **Light up** without SysEx permission. On Mini MK3, hold Session to enter setup, then select Programmer using the bottom Scene Launch button.

Default physical orientation: rotate the square 45° counter-clockwise, making its top-left-to-bottom-right diagonal horizontal. Use the rotation selector for other quarter-turns, or learn the actual setup. Coordinates below are the original square, rows/columns starting at zero:

| Keys | Grid positions | Mini MK3 addresses |
| --- | --- | --- |
| C D E F G A B C | (0,0), (1,1), (2,2), (3,3), (4,4), (5,5), (6,6), (7,7) | 81, 72, 63, 54, 45, 36, 27, 18 |
| C♯ D♯ F♯ G♯ A♯ | (0,1), (1,2), (3,4), (4,5), (5,6) | 82, 73, 55, 46, 37 |

Changing musical register does not change pad addresses. This app labels middle C as C4; numeric MIDI values matter when comparing other octave naming conventions. The generic **11–88 grid** profile uses the same geometry without Mini-specific SysEx.

Controller LEDs and musical MIDI output are separate. Do not route the synth output back into the app. Escape, focus loss, hidden tabs, cancelled touches and the panic button end active voices. **Lights off & return to Live Mode** restores Live Mode when this app originally enabled Programmer Mode. Page exit attempts cleanup, but browser termination/cable removal cannot guarantee it.

## MIDI songs and pitch range

Choose a melody **Part**. Initial track selection uses highest average pitch, preferring tracks with at least four pitched notes; it is a heuristic, not melody recognition. **Highest note at each onset** takes the highest note at each exact onset in the selected part(s). Accompaniment at other onsets remains, so track selection matters. **All notes at each onset** collects every highlighted chord pitch in any order without requiring simultaneous playing.

The eight white-key diagonal spans one octave. **Follow the octave** moves the visible C-to-C register when needed; chords too wide to fit remain blocked. **Fold into one octave** deliberately discards octave identity/doublings while showing original pitches. **Fixed octave** preserves pitches and reports out-of-range steps instead of skipping them. Transposition is −24 to +24 semitones. Free play does not advance the lesson. The **Piano / normal MIDI notes** input mode accepts musical note numbers instead of Launchpad addresses.

Supported files: Standard MIDI format **0 and 1**, PPQ timing, track names, tempo changes, note-on/off and running status, including velocity-zero note-off. Drum channel 10 is excluded. Format 2 and SMPTE files produce explanatory errors. Limits: 8 MB, 1,024 tracks, 500,000 events. Sustain, program changes, pitch bend, notation and expressive controllers are not interpreted. This is not a complete MIDI workstation. Invalid imports preserve the previously loaded song.

Add public songs by placing a MIDI in `library/` and adding an entry to `library/index.json`:

```json
{"id":"my-song","title":"My song","file":"my-song.mid","description":"A short description"}
```

Use a unique ID, relative file path and material you may publish. Link with `?song=my-song`. `python3 tools/generate_demos.py` regenerates the four bundled demos **and overwrites their library index**; review the diff before using it with a customised library.

## Sound, iPad and privacy

No external synth is needed. Built-in Web Audio provides a piano-like additive tone, sine or bell: **not a sampled acoustic piano or General MIDI soundfont**. An optional, separate musical MIDI output can route actual pitches to your synth or virtual MIDI destination. Web MIDI itself does not guarantee a default system synthesizer.

Press Enable sound after opening the page; an on-screen key gesture also attempts audio startup. Hardware MIDI alone may not unlock audio. iPad practice uses touch and Web Audio independently of hardware Web MIDI availability. Unsupported/denied MIDI access does not disable the virtual instrument. Fullscreen support varies. There is no offline service-worker cache; initially loading the site/library needs network access.

Local MIDI files are read in memory and **not uploaded**. They are not retained after reload. Settings, library selection and mappings use localStorage when allowed. There are no analytics, cloud accounts, third-party fonts, samples or runtime packages. The app fetches its own site/library assets; GitHub still serves/logs those public requests as host.

## Development, deployment and artifacts

Runtime files: `index.html`, `styles.css`, `experience.css`, `icon.svg`, `src/`, `library/`, `mappings/`. No bundler, package install or backend is needed. Relative paths work under the Pages project URL.

In [Settings → Pages](https://github.com/AdrianArtacho/teach_diagonal/settings/pages), choose **Source: GitHub Actions**. `.github/workflows/pages.yml` runs core tests, stages only the app, and deploys it. Recursive submodule checkout is intentionally disabled: the old default Pages build failed fetching `download-sheet`. Nothing from the legacy project was deleted to solve that.

```sh
python3 -m http.server 8000
# Open http://localhost:8000/ (not file://).
node --test tests/*.test.mjs
python3 tests/browser_smoke.py
```

Browser checks require Python `playwright` and Chromium at `/usr/bin/chromium`, or set `CHROMIUM`. `browser_smoke.py` runs the v2 regression suite and the new `browser_v3.py` checks. Re-run outputs for the v2 suite are kept in `artifacts/v2-regression-v3/`, not over the original v2 reports. Generated screenshots and reports go to `artifacts/`; older artifact versions are preserved.

**Verified v2 (historical): 71 Node tests and 70 Chromium browser checks passed.** See `artifacts/browser-verification-v2.json` and `artifacts/release-notes-v2.md`. Coverage includes parser/geometry regressions, URL priority, learning and single-key repair, cancellation, mapping migration/import/export, separate input/LED channels, shared progress/chords, and layouts at 1360×1000, 820×1180, 390×844 and 844×390.

**Verified v2.1: 86 Node tests, all 70 existing browser regression checks, and 34 new browser checks passed.** See `artifacts/release-notes-v3.md`, `artifacts/verification-v3.json` and `artifacts/browser-verification-v3.json`. New coverage includes loop boundaries, held notes, restart, URL priority/persistence, the preset and its independent Custom mapping, and simple-mode controls down to 320 pixels wide. The supplied JSON was compared byte-for-byte with the committed copy.

Browser navigation is disabled in the test environment. `tests/harness_v2.py` therefore supplies fixture-backed URL, localStorage, fetch and Web MIDI, evaluating shipped code in isolated module scopes with import/export and URL-source substitutions. It exercises real Chromium DOM/CSS/events but does not test live network navigation, native UI-module loading, or physical hardware. Native imports and pure logic are separately tested with Node. Physical Launchpad ports/LED palettes, real iPad/Safari behaviour and audible latency still require hands-on verification.

Modules: `music.js` (geometry, MIDI parser, lesson engine), `midi.js` (ports/LEDs), `audio.js` (synthesis), `app.js` (shared input/lesson lifecycle), `experience.js` (views/URL), `mapping.js` (validation/JSON), `mapping-ui.js` (staged calibration), `repeat.js` (repeat state/controls), `presets.js` (generated built-in mapping).

## References

- [Novation Mini MK3 Programmer Reference](https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/downloads/Launchpad%20Mini%20-%20Programmers%20Reference%20Manual.pdf)
- [MDN Web MIDI](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [MDN requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)
- [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

---

[📋 To-Do](https://trello.com/c/qEL4LenE/289-diamond)
