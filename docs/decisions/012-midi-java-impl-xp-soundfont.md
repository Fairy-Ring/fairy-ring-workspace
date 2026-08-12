# Decision 012 — MIDI: Jagex 377 control plane + Florestan bank + Spessa

**Date:** 2026-08-10  
**Status:** accepted (product cut: Spessa only)  
**Supersedes (direction only):** webpage multi-bank as authenticity track; SF2 upload WIP remains parked.

---

## One-sentence intent

Get **as close as feasible to Client-Java 377 music behaviour** inside a **TypeScript browser client**, under the hard constraint that **`javax.sound.midi` does not exist on the web**.

---

## What “Java 377 music” actually is (two layers)

Java does **not** ship a proprietary Jagex DSP “synth engine” in the client. It ships **policy** around the JVM’s MIDI stack:

```text
Client.saveMidi / stopMidi / options volume (clientcode 3)
        │
        ▼
signlink  (midivol 0..128, midifade, audioLoop ±8/50ms fade, play|stop|voladjust)
        │
        ▼
MidiPlayer  (one Sequencer + one Synthesizer, loop flag, volume curve, channel CCs)
        │
        ▼
javax.sound.midi  +  optional SF2 via setSoundfont (API exists; 377 never called it)
```

| Layer | What it is | Authenticity target |
|-------|------------|---------------------|
| **Control plane** (“sliders / knobs”) | `midivol` ladder 128/96/64/32/mute; fade-out then fade-in when swapping songs; jingle once vs song loop; stop | **Port this** — this *is* Jagex’s code shape |
| **Sequencer + softsynth** | One sequence timeline → one instrument bank → one mix | **Same shape** in browser (not multi-stream PCM) |
| **Instrument bank** | Whatever the JVM default was in 2006 (often OS GS-class) | **Pin Florestan** (XP GS proxy) via setSoundfont-equivalent |

So: yes — metaphorically we want the **Jagex knobs** (volume steps, fade, play/stop/loop) to drive a **single** softsynth, as in 377.  
We are **not** claiming Spessa *is* the 2006 JVM SoftSynth, or that Florestan *is* the exact samples every player heard.

---

## Browser constraint

| Java | Browser |
|------|---------|
| `MidiSystem.getSequencer` / `getSynthesizer` | **Unavailable** |
| File mid → `getSequence` → start | SMF bytes + web softsynth |
| OS / Gervill / loaded SF2 bank | Must **fetch and load** an SF2 ourselves |

Therefore the product split is intentional:

| We own (port of Jagex) | Stock third-party (unmodified API) |
|------------------------|-------------------------------------|
| `MidiFacade` — signlink audioLoop, midivol, midifade | **Spessa** — WorkletSynthesizer + Sequencer |
| Client hooks (`saveMidi`, clientcode 3, …) | `spessasynth_processor.min.js` |
| Florestan load at boot | SF2 parse + voices |

**Why not tinymidipcm?** It rendered MIDI → PCM chunks and scheduled **many** `AudioBufferSource`s. That fights Java’s one-sequencer model and caused **overlapping tracks** when policy (fade/loop/swap) was bolted on top.  
**Why not ship FluidSynth too?** Spike A/B preferred Spessa (cleaner swaps, Apache-2.0, no LGPL ship surface). **One product stack only.**

---

## Decision (product)

| Layer | Choice |
|-------|--------|
| **Control plane** | Port Client-Java 377: `saveMidi` / `stopMidi` / midivol clientcodes → signlink-shaped loop → play/stop/gain |
| **Softsynth backend** | **Spessa only** (`spessasynth_lib` + worklet) — stock; thin adapter only |
| **Bank** | **SCC1_Florestan.sf2** loaded at boot (Java’s unused `setSoundfont` hook) |
| **Not shipped** | tinymidipcm, FluidSynth / js-synthesizer, multi-backend `?midi=` switch |

### Paths

| Role | Path |
|------|------|
| Control plane | `vendor/client-ts/src/sound/MidiFacade.ts` |
| Spessa adapter | `vendor/client-ts/src/sound/backends/spessaBackend.ts` |
| Client import | `playMidi` / `stopMidi` / `setMidiVolume` from MidiFacade |
| Deploy | `client.js` + `spessasynth_processor.min.js` + `SCC1_Florestan.sf2` |

### Dependency shape (npm pin, not submodule)

| | tinymidipcm (old LC pattern) | Spessa (product) |
|--|----------------------------|------------------|
| Upstream form | Small wasm + glue often as **git submodule** | Full TS library; **npm** ships prebuilt `dist/` + processor |
| GitHub source | ships runnable wasm in-tree | **source only** — `dist/` is build output (`prepack`), not on `v4.3.13` tree without build |
| Client-TS choice | **Removed** submodule gitlink `3rdparty/tinymidipcm` | **`package.json` pin** `spessasynth_lib@4.3.13` + lockfile; deploy copies processor from `node_modules` |

A Spessa **submodule** would need a client-side build of Spessa (and still pull `spessasynth_core` via npm) — worse than LC’s tinymidi submodule pattern. Pin + lockfile is the upstream-friendly way to freeze Spessa without inventing a second build graph.

---

## What the “sliders” map to

In-game music options (clientcode 3) set **signlink.midivol**:

| Option feel | midivol |
|-------------|---------|
| High | 128 |
| Medium (default) | 96 |
| Low | 64 |
| Quieter | 32 |
| Off | mute (`midiActive=false` + `stopMidi`) |

Java **does not restart on mute**. Mute only `stopMidi`. **Unmute** (`midiActive` false→true) re-requests `nextMidiSong` from the start. Volume steps while already on are `voladjust` only. Client-TS matches `Client.java` clientcode 3.

MidiFacade maps midivol → master gain (Java-style curve family) and applies:

- **voladjust** when the user moves the option while music is already on  
- **fade ±8 every 50ms** when swapping songs with midifade (Java audioLoop)  
- **loop** when midifade marks a zone song; **once** for jingles  

That is the “Jagex synth play with the sliders” metaphor: **same knobs, same timing policy**, stock sequencer underneath.

### Volume (Spessa) — CC injection (Java MidiPlayer path)

Java does **not** use a single outer fader. `MidiPlayer` sits between Sequencer and Synthesizer and:

1. On play / voladjust / fade: writes **CC7 + CC39** on all 16 channels from `getVolume` (channel base 12800 × midivol, sqrt).
2. On sequence **CC7/CC39**: intercepts, updates per-channel base, re-emits scaled by midivol (so song automation still respects options).
3. On reset-all (CC121): resets channel base to 12800.

**Product (SpessaBackend)** — intentional platform adaptation (not “optional authenticity” of song CCs):

| Layer | Who owns it |
|-------|-------------|
| **Song MIDI** (notes, program, pan, **CC7 automation in the SMF**) | Spessa plays the file as-is |
| **midivol** (options 128/96/64/32 + fade) | **Not in the SMF** — outer **GainNode** with Java getVolume *relative* curve |

Java MidiPlayer applied midivol by injecting/rescaling CC7/39 *inside* the synth. We do **not** ship that path here: live intercept thrashed FPS; `lockController` muted Spessa. **Best compromise under browser + Spessa constraints:** master gain for midivol; Spessa owns the sequence.

**Must keep:** `eventsEnabled: true` (else `songChange` never reaches main thread → load/play timeout → mute).

### Browser autoplay / unfocused window

Chromium keeps `AudioContext` **`suspended`** until a user gesture (or harness flags).  
`ctx.resume()` can **hang until focus** — if Spessa `ensure()` / `play()` await it unbounded, SF2 init and song load look like the **client is stuck** until you click the window; music then starts.

| Mitigation | Where |
|------------|--------|
| Bounded `tryResume` (short timeout) + gesture/`visibilitychange` unlock | `spessaBackend.ts` |
| Shorter `loadNewSongList` timeout when suspended | `spessaBackend.ts` |
| **Track swap (2026-08-12):** `stop()` is pause + `stopAll` only — **do not** seek to `duration` (Spessa `pausedTime` becomes the old length → new song starts minutes in) | `spessaBackend.ts` |
| After `loadNewSongList`: `currentTime = 0` then `play()` | `spessaBackend.ts` |
| `play()` does **not** apply master gain — facade owns fade ±8 / midivol | `spessaBackend.ts` + `MidiFacade.ts` |
| Playwright `--autoplay-policy=no-user-gesture-required` | `tools/harness/lib/harness.mjs` `launchBrowser` |

This is **platform**, not Java authenticity. Manual browser: first click still unlocks audio (normal web).

---

## Why this change (summary for cold readers)

1. **Closer to 377-Java behaviour under TS/browser constraints** — port the control plane; use one sequencer + one bank, not a custom multi-stream PCM player.  
2. **Spessa won A/B** vs FluidSynth on track-swap thrash (same bank); ship **one** stack.  
3. **Remove dead code** (tinymidipcm, FluidSynth adapters/deps) so the tree only describes the product path.  
4. **Florestan** remains the intentional XP-era bank pin (not Gervill, not Jagex 2007 bank).

---

## Non-goals

- Shipping Jagex ~2007 official bank  
- Claiming bit-identical timbre to every 2006 JVM  
- In-game bank picker (parked webpage SF2 work)  
- Changing SFX (`JagFX`) path  

## Parked

| Item | Location |
|------|----------|
| Webpage SF2 upload | `feature/webpage-midi-sf2-upload` + engine stash |
| Multi-bank research | `docs/research/midi-soundfont-options-webpage-377.md` |

## Acceptance

1. Volume steps + mute match Java ladder behaviour.  
2. Song cross-fade: out then in with midifade; hard cut only where Java cuts (jingles).  
3. Boot loads Florestan; title/zone music audible.  
4. Track swap does not stack overlapping copies of the same song (one sequencer).  

## Related

- [`docs/research/midi-soundfont-377.md`](../research/midi-soundfont-377.md)  
- [`docs/research/midi-browser-stack-options-377.md`](../research/midi-browser-stack-options-377.md) (spike history → Spessa winner)  
- [`docs/research/midi-stack-licensing-377.md`](../research/midi-stack-licensing-377.md)  
- [`docs/plans/2026-08-10-midi-backend-spike.md`](../plans/2026-08-10-midi-backend-spike.md)  
