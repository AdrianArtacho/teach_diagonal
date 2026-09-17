# Starter pack: sources and changes

These are short monophonic teaching adaptations, not complete works or facsimile editions. Every generated note fits C4–C5 (MIDI 60–72). Rhythm, transposition and register changes are disclosed below. Local user files are not affected. No source PDF, third-party MIDI recording, modern fingering or accompaniment is bundled.

## Mendelssohn · Italian Symphony

**Source:** [Mendelssohn, Symphony No. 4, Op. 90: historical Breitkopf & Härtel orchestral score, first page, Violin I (NAfME scan).](https://nafme.org/wp-content/uploads/2021/03/Mendelssohn-Symphony-Score.pdf)

**Changes:** Brief opening violin gesture only, starting at the arco upbeat; accompaniment and opening orchestral rests omitted. Transposed into C major and lowered to C4–G4. The tied upper note is one sustained event. A short closing breath is added. This is a motif, not the whole first theme. No modern fingering or bowing annotations are reproduced.

**Credit:** New monophonic teaching reduction for Diamond; underlying composition/traditional melody in the public domain. Source engraving and accompaniment are not redistributed.

**Encoding licence:** [New event encoding: CC0; source editions retain their own rights](https://creativecommons.org/publicdomain/zero/1.0/).

**File:** `mendelssohn-italian.mid` · 11 notes · MIDI 60–67 · 105 quarter notes/minute.

## O du lieber Augustin

**Source:** [Wiener Volksliedwerk, “Oh, du lieber Augustin”, single-line melody in G major, first page.](https://www.wienervolksliedwerk.at/VMAW/Noten/Augustin.pdf)

**Changes:** Traditional tune, transposed from the displayed G-major version to C major. The low dominant G3 resulting from transposition is explicitly raised to G4 wherever it occurs; pitch classes and the other melodic notes are retained. This register change makes the familiar refrain and following phrase fit the one-octave controller. Lyrics and chords are not included.

**Credit:** New monophonic teaching reduction for Diamond; underlying composition/traditional melody in the public domain. Source engraving and accompaniment are not redistributed.

**Encoding licence:** [New event encoding: CC0; source editions retain their own rights](https://creativecommons.org/publicdomain/zero/1.0/).

**File:** `augustin.mid` · 47 notes · MIDI 60–69 · 108 quarter notes/minute.

## Beethoven · Moonlight Sonata

**Source:** [Beethoven, Sonata Op. 27 No. 2, movement I, bars 1–4; Mutopia edition by Stewart Holmes, based on Berners (1908), edited A. Winterberger; Mutopia-2007/02/11-276.](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=276)

**Changes:** Only the right-hand triplet arpeggios of the opening four bars, without bass or later melody. Transposed from C-sharp minor to G minor (+6 semitones); the resulting figure fits C4–C5 without octave folding. Triplets are retained as exact 160-tick thirds of a 480-tick quarter note. This is an accompaniment-pattern study, not a full sonata or melody transcription.

**Credit:** Stewart Holmes / Mutopia Project; new monophonic teaching adaptation for Diamond.

**Encoding licence:** [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/).

**File:** `moonlight.mid` · 48 notes · MIDI 60–72 · 60 quarter notes/minute.

## Tchaikovsky · 1812 Overture

**Source:** [Tchaikovsky, 1812 Overture, Op. 49; L.-P. Laurendeau band reduction, Carl Fischer (1904), conductor score, printed pp. 14–15, final Allegro vivace. The short motif was also checked against the flute transcription at flutetunes.com.](https://bandmusicpdf.org/1812overture/)

**Changes:** Short festive finale gesture only: repeated dominant pickup, ascending tonic–supertonic–mediant figure and return to tonic. Single-line, transposed into F major, with simplified rhythm and a slower practice tempo. The pickup is retained, while orchestral layers, extended development, bells and cannon are omitted. This is a motif exercise, not a complete overture.

**Credit:** New monophonic teaching reduction for Diamond; underlying composition/traditional melody in the public domain. Source engraving and accompaniment are not redistributed.

**Encoding licence:** [New event encoding: CC0; source editions retain their own rights](https://creativecommons.org/publicdomain/zero/1.0/).

**File:** `tchaikovsky-1812.mid` · 22 notes · MIDI 60–69 · 100 quarter notes/minute.

Melodic cross-check: [score excerpt](https://www.flutetunes.com/tunes/tchaikovsky-1812-overture.pdf); linked only, not bundled.

## Tchaikovsky · Romeo and Juliet

**Source:** [Tchaikovsky, Romeo and Juliet Overture-Fantasy, TH 42, love-theme opening. The melodic contour was checked against the flute part on page 1 of the flutetunes.com Love Theme transcription (chromatic lead-in omitted). Historical editions are catalogued at IMSLP.](https://imslp.org/wiki/Romeo_and_Juliet_(overture-fantasia),_TH_42_(Tchaikovsky,_Pyotr))

**Changes:** Six-note opening gesture of the love theme only, excluding the chromatic lead-in and the later continuation. Lowered and transposed into F major, C4–C5. The initial tie is a single sustained event; a closing breath is added. This is a short motif, not the whole theme. No modern accompaniment or engraving is redistributed.

**Credit:** New monophonic teaching reduction for Diamond; underlying composition/traditional melody in the public domain. Source engraving and accompaniment are not redistributed.

**Encoding licence:** [New event encoding: CC0; source editions retain their own rights](https://creativecommons.org/publicdomain/zero/1.0/).

**File:** `tchaikovsky-romeo.mid` · 6 notes · MIDI 60–72 · 76 quarter notes/minute.

Melodic cross-check: [score excerpt](https://www.flutetunes.com/tunes/tchaikovsky-romeo-and-juliet-love-theme.pdf); linked only, not bundled.

## Yakety Sax / Benny Hill

“Yakety Sax”, by Boots Randolph and James Q. “Spider” Rich, is not included as a MIDI. No licence for publishing a new arrangement was established. The library entry explains how to open a local MIDI you may use; it does not substitute a different melody or silently load a dummy file. [Work identification](https://en.wikipedia.org/wiki/Yakety_Sax).

## Rebuilding

`python3 tools/generate_starter.py` regenerates these files and updates only their index entries; unrelated library songs are retained. `--check` detects drift. The editable pitches, rhythms and source notes are in `tools/starter-pack.json`.
