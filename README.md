# [Diamond](https://adrianartacho.github.io/teach_diagonal/)

**A different way to play.** Turn an 8 × 8 Launchpad into a diamond-shaped piano: white keys cross the centre, black keys sit on the next diagonal above. Load a melody, follow the illuminated note, and play at your own pace.

Browser iteration of **teach_diagonal**, developed by **Adrián Artacho**. The original Max project under `diagonal/` and the `download-sheet` submodule are retained; the browser app does not depend on either.

## Start playing

Open **[Diamond](https://adrianartacho.github.io/teach_diagonal/)** and choose a library song, or use **Open MIDI file** for a `.mid` / `.midi` file on your device. Press **Enable sound**, then tap the highlighted diamond pad or its matching piano key. A correct note advances the melody; a wrong note leaves the current step in place. Repeated notes require release and a fresh press.

Both keyboards support mouse and multitouch. Computer keys `A S D F G H J K` play the white keys, with `W E T Y U` for black keys. Tab followed by Enter/Space also plays a focused key. **Escape** silences notes and stops reference playback.

The repository library contains new, simple MIDI arrangements of **Ode to Joy** and **Frère Jacques**, plus **Chromatic Walk** and **Diamond Chords** exercises. **Listen** plays the selected line using the MIDI file's tempo map; its speed is adjustable. Practice itself is untimed: this is pitch guidance, not rhythm or articulation assessment.

## Launchpad Mini MK3 setup

The default hardware profile targets **Novation Launchpad Mini MK3**. Other models are not assumed to share its SysEx messages.

1. Connect the Launchpad by USB and open the HTTPS site in a browser with Web MIDI support, such as desktop Chrome or Edge. Close other software that might take over the Launchpad or create a MIDI feedback loop.
2. Press **Connect MIDI** and allow access. Under **Controller & sound settings**, select the **LPMiniMK3 MIDI** input and output, **not the DAW port**. Connecting alone does not send lighting commands.
3. Choose **Launchpad Mini MK3** and press **Programmer mode + lights**. This asks for the additional SysEx permission and sends the Mini-specific Programmer-mode command. Alternatively, enter Programmer mode on the device yourself, then use **Enable lighting only**, which does not require SysEx permission. On Mini MK3, hold Session for approximately half a second to enter setup, then select Programmer mode with the bottom Scene Launch button.
4. Rotate the controller 45° counter-clockwise, so the top-left-to-bottom-right physical diagonal reads left to right. The starting C is at its left corner. Change **Physical orientation** in settings when the device is turned another quarter-turn relative to this orientation.
5. Play the lit pad. The app converts the pad's hardware address into the musical pitch. **Lights off / return to Live** clears the LEDs and returns to Live mode when this app enabled Programmer mode. Page exit also attempts cleanup, but browser termination or cable removal cannot guarantee it; manual return to Live remains available on the controller.

Controller LED output and optional synthesizer output are deliberately separate. Do not route the synth back into this app. MIDI note-offs are sent for notes the app starts; pointer cancellation, focus loss, hidden tabs, Escape, and **All notes off** stop active voices.

### Geometry and mapping

The default octave is **C4–C5 (MIDI 60–72)**. Coordinates below refer to the unrotated square viewed with the controller's top controls at the top, with rows and columns starting at 0. Mini MK3 Programmer addresses run from 81–88 at the top to 11–18 at the bottom.

| Piano notes | Grid positions `(row,column)` | Mini MK3 pad addresses |
| --- | --- | --- |
| C D E F G A B C | (0,0), (1,1), (2,2), (3,3), (4,4), (5,5), (6,6), (7,7) | 81, 72, 63, 54, 45, 36, 27, 18 |
| C♯ D♯ F♯ G♯ A♯ | (0,1), (1,2), (3,4), (4,5), (5,6) | 82, 73, 55, 46, 37 |

There is no black key between E/F or B/C. Only these **13 pads** are musical keys; the remaining 51 stay inactive. Changing register changes the musical pitches, not the physical pad addresses. Note labels use **middle C = C4**; Novation's manual uses a different octave-name convention for its MIDI-address diagrams, which does not change the numeric mapping.

The screen shows a turquoise target, green held/accepted notes, and red mistakes. Mini MK3 uses its onboard velocity colour palette; colours on a real unit may look different from the screen. Baseline white keys are dim white and black keys dim blue/purple. This is palette MIDI, not per-pixel RGB SysEx.

The **11–88 grid / manual mode** profile offers the same address geometry without sending Mini-specific mode commands. **Learn the 13 playable pads** records incoming note and channel for each highlighted musical key and saves the mapping in this browser. This supports alternative input layouts, but is **not** a universal LED driver: learned lighting still uses Mini-style channel-1 note/palette feedback and must match the other controller's documented protocol. Learning does not modify the hardware's stored configuration.

## MIDI files, tracks and range

Use **Part** to select a melody track. The initial choice is the track with the highest average pitch (preferring tracks with at least four pitched notes); this is a heuristic, not melody recognition. **Read as: Highest note at each onset** takes the highest note at each exact onset within the selected part(s). Accompaniment notes at other onsets remain, so selecting the right track matters. **All notes at each onset** highlights a chord: collect its pitches in any order to advance, without requiring simultaneous playing.

One 8-pad white-key diagonal spans only one octave. The app never silently skips unplayable steps:

- **Follow the octave:** automatically move the C-to-C register to fit the next note or chord. An octave/register change is visible in both keyboards and the range label. Chords that cannot fit remain blocked.
- **Fold into one octave:** preserve pitch classes in the selected register; octave identity and octave doublings are deliberately lost. The original pitches are displayed. The exact upper C is retained when it is already the visible C.
- **Keep the selected octave:** preserve the original pitches and block steps outside the visible range. Change octave manually, choose another part, or use folding.

**Transpose** shifts the selected material by −24 to +24 semitones. **Free play** leaves lesson progress unchanged. The optional **Piano MIDI notes** input mode accepts normal musical note numbers instead of Launchpad pad addresses.

Supported MIDI: Standard MIDI File **format 0 and 1**, PPQ timing, track names, tempo changes, note-on/off, running status, and note-on velocity zero. Drum channel 10 is excluded. Format 2 and SMPTE-timed files produce explanatory errors. The parser imposes an 8 MB file limit, 1,024 tracks and 500,000 events. It does not interpret sustain, program changes, pitch bend, notation, fingering, lyrics or expressive playback controllers. Reference sound uses note durations, not a full MIDI sequencer's instrument/channel rendering. Malformed files are rejected without destroying a previously loaded melody.

## Sound, iPad and privacy

**No synthesizer is required.** Sound comes from a small built-in Web Audio instrument: a soft piano-like additive tone, sine tone, or bell. It is **not a sampled acoustic piano or a General MIDI soundfont**. Web MIDI does not itself guarantee a system/default synthesizer, so browser audio is the portable fallback. The separate **Musical MIDI output** selector can route actual pitches to a connected synth or an OS virtual MIDI destination supplied by your setup.

Tap **Enable sound** after opening the page; browsers require a user gesture to start/resume audio. The first on-screen pad or computer-key gesture also attempts to unlock sound. Hardware MIDI alone may not unlock browser audio.

**iPad practice uses touch plus Web Audio.** Safari on iPad does not currently provide Web MIDI; the virtual instrument remains usable without hardware MIDI. Hardware MIDI availability is detected at runtime, and unavailable/denied access produces an explanation instead of breaking touch practice. The layout has been tested at tablet/mobile viewport sizes, but this version has not been physically tested on an iPad or Launchpad. Fullscreen is browser-dependent; Add to Home Screen can provide a larger view. There is no service worker/offline-install cache in this version: initially loading the site/library needs network access.

Local MIDI files are read in memory on your device, **not uploaded**. No analytics, cloud accounts, third-party fonts, sample downloads or runtime packages are used. Settings, the last library selection, and learned pad mappings use localStorage where allowed; local songs themselves are not retained after reload. The site fetches only its own app and library assets. GitHub still serves/logs requests for those public assets as the host.

## Add songs to the repository library

Copy a MIDI file into `library/` and add an entry to `library/index.json`:

```json
{"id":"my-song","title":"My song","file":"my-song.mid","description":"A short description"}
```

Use a unique `id`, a relative path, and material you have permission to publish. Share a library selection with `?song=my-song`, for example [Chromatic Walk](https://adrianartacho.github.io/teach_diagonal/?song=chromatic-walk). Local file import remains independent of the public library.

`python3 tools/generate_demos.py` regenerates the four bundled MIDI files and their index. It intentionally writes those demo files: do not run it to maintain a separately edited library index without reviewing the diff.

## Hosting and development

Everything the app needs is in `index.html`, `styles.css`, `icon.svg`, `src/` and `library/`. No bundler, package install or server backend is needed at runtime. Relative paths support the GitHub Pages project URL.

**Deployment:** `.github/workflows/pages.yml` runs the Node tests, stages only the browser app into `_site/`, and publishes that artifact with GitHub's Pages actions. In [Settings → Pages](https://github.com/AdrianArtacho/teach_diagonal/settings/pages), use **Source: GitHub Actions**. Run **Test and deploy Diamond** from the Actions tab after changing the source. The workflow avoids recursive submodule checkout on purpose: the older default Pages build failed because `download-sheet` could not be fetched. No old Max files or submodule configuration are removed to fix deployment.

For local development:

```sh
python3 -m http.server 8000
# Open http://localhost:8000/ in the browser.
node --test tests/core.test.mjs
```

Serve the folder rather than opening `index.html` as `file://`; module imports and library fetches need HTTP. Web MIDI requires a secure context (HTTPS or a trustworthy localhost context).

Source organisation: `music.js` contains geometry, MIDI-file parsing and the practice engine; `midi.js` handles ports, Mini MK3 commands and LED feedback; `audio.js` handles synthesis; `app.js` connects the interface and interaction lifecycle. Runtime dependencies: **none**.

### Tests and artifacts

**40 Node tests and 32 browser smoke checks passed** for this version. The browser harness uses real Chromium rendering and the shipped code, with fixture-backed fetch and simulated Web MIDI. It concatenates ES modules in memory (removing imports/exports) for environments where browser navigation is restricted; it does not independently verify live-network deployment or a physical device. It checks both visual keyboards, lesson progress, repeated notes, chord collection, range policies, local import, exact Mini-mode bytes, LED versus musical routing, cancellation, and responsive overflow. Node tests exercise parser edge cases, geometry and pure-state logic.

To reproduce browser checks, install Python's `playwright` package and provide Chromium at `/usr/bin/chromium`, or set `CHROMIUM` to its executable path, then run `python3 tests/browser_smoke.py`. Generated screenshots go to `artifacts/`. The versioned verification report and pad map are also in `artifacts/`; preserve earlier versions when adding later reports.

**Still requiring hands-on verification:** Mini MK3 USB port names/permissions, physical LED palette/rotation, OS MIDI routing, audible latency, and real iPad multitouch/audio behaviour. No physical-device verification is implied by the automated results.

## Technical references

- [Novation Launchpad Mini MK3 Programmer Reference](https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/downloads/Launchpad%20Mini%20-%20Programmers%20Reference%20Manual.pdf): Programmer mode, MIDI port selection, note maps and LED palette.
- [MDN Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API): permissions, secure contexts and browser compatibility.
- [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices): audio start/resume and user gestures.
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages): static artifact deployment.

---

[📋 To-Do](https://trello.com/c/qEL4LenE/289-diamond)
