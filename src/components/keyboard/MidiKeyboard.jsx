"use client"

import React, { useEffect, useState, useRef, useMemo } from "react"
import * as Tone from "tone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Download, Mic, Square, Volume2, Cable, ArrowLeftRight, Settings2, Guitar, Guitar as GuitarIcon, Drumstroke, Disc3 } from "lucide-react"

const FULL_KEYBOARD_MAP = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
  ",": 12, ".": 14, "/": 16,
  q: 12, "2": 13, w: 14, "3": 15, e: 16, r: 17, "5": 18, t: 19, "6": 20, y: 21,
  "7": 22, u: 23, i: 24, "9": 25, o: 26, "0": 27, p: 28, "[": 29, "=": 30, "]": 31
}

const INSTRUMENT_OPTIONS = [
  { value: "Synth", label: "Classic Synth" },
  { value: "Guitar", label: "Plucked Guitar" },
  { value: "Bass", label: "Electric Bass" },
  { value: "Drums", label: "Drum Kit" }
];

const STRINGS_COUNT = 6;
const FRETS_COUNT = 15;

export default function MidiKeyboard() {
  const [isReady, setIsReady] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [activeNotes, setActiveNotes] = useState(new Set())
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [baseOctave, setBaseOctave] = useState(3)
  const [midiAccess, setMidiAccess] = useState(false)
  const [instrument, setInstrument] = useState("Synth")

  const synth = useRef(null)
  const drumSynths = useRef(null)
  const recorder = useRef(null)
  const activeKeyMap = useRef(new Map())

  const { whiteKeys, blackKeys } = useMemo(() => {
    const white = []
    const black = []
    let whiteIndex = 0

    for (let m = 36; m <= 96; m++) {
      const freq = Tone.Frequency(m, "midi")
      const note = freq.toNote()
      const isBlack = note.includes("#")

      if (!isBlack) {
        white.push({ note, midi: m, index: whiteIndex })
        whiteIndex++
      } else {
        black.push({ note, midi: m, positionIndex: whiteIndex })
      }
    }
    return { whiteKeys: white, blackKeys: black }
  }, []);

  const initDrumKit = () => {
    if (drumSynths.current) {
      Object.values(drumSynths.current).forEach(d => d.synth.dispose())
    }

    drumSynths.current = {
      kick: { synth: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0 } }).toDestination(), play: (time) => drumSynths.current.kick.synth.triggerAttack("C1", time) },
      snare: { synth: new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0 } }).toDestination(), play: (time) => drumSynths.current.snare.synth.triggerAttack(time) },
      hihat: { synth: new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(), play: (time) => drumSynths.current.hihat.synth.triggerAttack(time) },
      hihatOpen: { synth: new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(), play: (time) => drumSynths.current.hihatOpen.synth.triggerAttack(time) },
      tomLow: { synth: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0 } }).toDestination(), play: (time) => drumSynths.current.tomLow.synth.triggerAttack("G2", time) },
      tomHigh: { synth: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0 } }).toDestination(), play: (time) => drumSynths.current.tomHigh.synth.triggerAttack("C3", time) },
      cymbal: { synth: new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 0 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(), play: (time) => drumSynths.current.cymbal.synth.triggerAttack(time) }
    };

    if (recorder.current) {
      Object.values(drumSynths.current).forEach(d => d.synth.connect(recorder.current))
    }
  }

  const getSynthOptions = (type) => {
    switch (type) {
      case "Guitar":
        return {
          harmonicity: 2.5, modulationIndex: 3,
          oscillator: { type: "triangle" },
          envelope: { attack: 0.01, decay: 1.5, sustain: 0.1, release: 1.2 },
          modulation: { type: "square" },
          modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.5 },
          volume: 2
        };
      case "Bass":
        return {
          harmonicity: 1, modulationIndex: 5,
          oscillator: { type: "triangle" },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 1.2 },
          modulation: { type: "triangle" },
          modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.5, release: 1.2 },
          volume: 5,
        };
      case "Synth":
      default:
        return {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
          volume: -4,
        };
    }
  }

  const stopAllNotes = () => {
    if (synth.current) {
      synth.current.releaseAll()
    }
    setActiveNotes(new Set())
    activeKeyMap.current.clear()
  }

  useEffect(() => {
    if (!isReady) return;

    stopAllNotes();

    if (synth.current) {
      synth.current.releaseAll();
      synth.current.dispose();
      synth.current = null;
    }

    if (instrument === "Drums") {
      initDrumKit();
    } else {
      let synthClass = Tone.Synth;
      if (instrument === "Guitar" || instrument === "Bass") synthClass = Tone.FMSynth;

      const newSynth = new Tone.PolySynth(synthClass, getSynthOptions(instrument)).toDestination();

      if (recorder.current) {
        newSynth.connect(recorder.current);
      }
      synth.current = newSynth;
    }
  }, [instrument, isReady]);

  const mapDrumNote = (note) => {
    const noteClass = note.replace(/\d+/, '');
    switch (noteClass) {
      case "C": return "kick";
      case "D": return "snare";
      case "E": return "tomLow";
      case "F": return "hihat";
      case "F#": return "hihatOpen";
      case "G": return "tomHigh";
      case "A": return "cymbal";
      case "B": return "cymbal";
      default: return "kick";
    }
  }

  const getGuitarNote = (stringIdx, fretIdx) => {
    // E Standard Tuning configuration: E2, A2, D3, G3, B3, E4
    const baseMidiNotes = [64, 59, 55, 50, 45, 40];
    const isBass = instrument === "Bass";

    // Bass tuning: E1, A1, D2, G2
    const bassMidiNotes = [43, 38, 33, 28];

    const tuning = isBass && stringIdx >= 2 ? bassMidiNotes[stringIdx - 2] : baseMidiNotes[stringIdx];

    // Handle bass trying to request string 1 or 2 (which we hide anyway but safely guard)
    if (!tuning) return "E1";

    const targetMidi = tuning + fretIdx;
    return Tone.Frequency(targetMidi, "midi").toNote();
  }

  const playNote = (note) => {
    if (instrument !== "Drums" && !synth.current) return;
    if (instrument === "Drums" && !drumSynths.current) return;

    setActiveNotes((prev) => {
      if (prev.has(note)) return prev

      if (instrument === "Drums") {
        const drumKey = mapDrumNote(note);
        if (drumSynths.current[drumKey]) {
          drumSynths.current[drumKey].play(Tone.now());
        }
      } else {
        if (instrument === "Guitar" || instrument === "Bass") {
          synth.current?.triggerAttackRelease(note, "4n")
        } else {
          synth.current?.triggerAttack(note)
        }
      }

      const newSet = new Set(prev)
      newSet.add(note)
      return newSet
    })
  }

  const stopNote = (note) => {
    setActiveNotes((prev) => {
      const newSet = new Set(prev)
      newSet.delete(note)
      return newSet
    })

    if (instrument !== "Drums" && instrument !== "Guitar" && instrument !== "Bass" && synth.current) {
      synth.current?.triggerRelease(note)
    }
  }

  const initAudio = async () => {
    if (isReady) return
    await Tone.start()

    const newRecorder = new Tone.Recorder()
    recorder.current = newRecorder

    if (instrument === "Drums") {
      initDrumKit();
    } else {
      let synthClass = Tone.Synth;
      if (instrument === "Guitar" || instrument === "Bass") synthClass = Tone.FMSynth;

      const newSynth = new Tone.PolySynth(synthClass, getSynthOptions(instrument)).toDestination();
      newSynth.connect(newRecorder);
      synth.current = newSynth;
    }

    setIsReady(true)
    setupWebMIDI()
  }

  const setupWebMIDI = () => {
    if (typeof navigator !== "undefined" && navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then((access) => {
        setMidiAccess(true)
        const inputs = access.inputs.values()
        for (const input of inputs) {
          input.onmidimessage = (msg) => {
            const [cmd, note, vel] = msg.data
            const noteName = Tone.Frequency(note, "midi").toNote()
            if (cmd === 144 && vel > 0) playNote(noteName)
            if ((cmd === 128) || (cmd === 144 && vel === 0)) stopNote(noteName)
          }
        }
      }).catch(e => console.log("MIDI Access Failed", e))
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || !e.key) return
      if (e.key === "ArrowLeft") { setBaseOctave(p => Math.max(1, p - 1)); return }
      if (e.key === "ArrowRight") { setBaseOctave(p => Math.min(6, p + 1)); return }

      const keyChar = e.key.toLowerCase()
      if (activeKeyMap.current.has(keyChar)) return;

      const semitoneOffset = FULL_KEYBOARD_MAP[keyChar]

      if (semitoneOffset !== undefined) {
        const baseMidi = (baseOctave + 1) * 12
        const targetMidi = baseMidi + semitoneOffset
        const note = Tone.Frequency(targetMidi, "midi").toNote()
        playNote(note)
        activeKeyMap.current.set(keyChar, note)
      }
    }

    const handleKeyUp = (e) => {
      if (!e.key) return
      const keyChar = e.key.toLowerCase()
      const note = activeKeyMap.current.get(keyChar)
      if (note) {
        stopNote(note)
        activeKeyMap.current.delete(keyChar)
      }
    }

    const handleWindowMouseUp = () => stopAllNotes();
    const handleWindowBlur = () => stopAllNotes();

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("mouseup", handleWindowMouseUp)
    window.addEventListener("blur", handleWindowBlur)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("mouseup", handleWindowMouseUp)
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [isReady, baseOctave, instrument])

  const toggleRecording = async () => {
    if (!recorder.current) return
    if (isRecording) {
      const blob = await recorder.current.stop()
      setRecordedUrl(URL.createObjectURL(blob))
      setIsRecording(false)
    } else {
      setRecordedUrl(null)
      recorder.current.start()
      setIsRecording(true)
    }
  }

  const handleKeyInteraction = (e, note, action) => {
    if (e.type === "pointerdown" || e.type === "mousedown") {
      e.preventDefault()
    }
    if (e.type === "pointerenter" && e.buttons !== 1) return;
    if (action === "down") playNote(note)
    if (action === "up") stopNote(note)
  }

  // Visual Drum Pad configurations
  const DRUM_PADS = [
    { label: "Crash", icon: "cymbal", note: "A3", colSpan: 2, bg: "from-amber-600/20 to-yellow-600/40", hover: "hover:from-amber-500/40 hover:to-yellow-500/60", border: "border-amber-600/50" },
    { label: "Ride", icon: "cymbal", note: "B3", colSpan: 2, bg: "from-orange-600/20 to-amber-600/40", hover: "hover:from-orange-500/40 hover:to-amber-500/60", border: "border-orange-600/50" },
    { label: "High Tom", icon: "drum", note: "G3", colSpan: 1, rounded: "rounded-full", bg: "from-zinc-700/80 to-zinc-900", hover: "hover:from-zinc-600 hover:to-zinc-800", border: "border-zinc-500" },
    { label: "Open Hat", icon: "hihat", note: "F#3", colSpan: 1, bg: "from-yellow-600/10 to-amber-700/30", hover: "hover:from-yellow-500/30 hover:to-amber-600/50", border: "border-yellow-600/40" },
    { label: "Low Tom", icon: "drum", note: "E3", colSpan: 1, rounded: "rounded-full", bg: "from-zinc-700/80 to-zinc-900", hover: "hover:from-zinc-600 hover:to-zinc-800", border: "border-zinc-500" },
    { label: "Closed Hat", icon: "hihat", note: "F3", colSpan: 1, bg: "from-yellow-600/10 to-amber-700/30", hover: "hover:from-yellow-500/30 hover:to-amber-600/50", border: "border-yellow-600/40" },
    { label: "Snare", icon: "snare", note: "D3", colSpan: 2, bg: "from-slate-200/90 to-slate-400", text: "text-zinc-900", hover: "hover:from-white hover:to-slate-300", border: "border-slate-500" },
    { label: "Kick", icon: "kick", note: "C3", colSpan: 2, bg: "from-zinc-800 to-black", hover: "hover:from-zinc-700 hover:to-zinc-950", border: "border-zinc-600 border-b-4", rowSpan: 2 },
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

      <Card className="w-full max-w-[1400px] backdrop-blur-md bg-zinc-900/80 border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden relative z-10 transition-all duration-500">
        <div className={cn(
          "absolute top-0 left-0 w-full h-1 bg-gradient-to-r",
          instrument === "Synth" ? "from-indigo-500 via-purple-500 to-pink-500" :
            instrument === "Guitar" || instrument === "Bass" ? "from-amber-700 via-orange-500 to-yellow-600" :
              "from-red-600 via-zinc-500 to-stone-400"
        )}></div>

        <CardHeader className="pb-4 border-b border-zinc-800/50 bg-zinc-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-colors",
                instrument === "Synth" ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20" :
                  instrument === "Guitar" || instrument === "Bass" ? "bg-gradient-to-br from-amber-700 to-orange-800 shadow-orange-900/40" :
                    "bg-gradient-to-br from-zinc-700 to-zinc-950 shadow-black/50 border border-zinc-600"
              )}>
                {instrument === "Synth" && <Settings2 className="w-6 h-6 text-white" />}
                {(instrument === "Guitar" || instrument === "Bass") && <GuitarIcon className="w-6 h-6 text-amber-100" />}
                {instrument === "Drums" && <Disc3 className="w-6 h-6 text-zinc-300" />}
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2 tracking-tight">
                  Studio 88
                  {midiAccess && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      <Cable className="w-3 h-3 mr-1 inline" /> MIDI
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-zinc-400 font-medium tracking-wide">
                  {instrument === "Synth" ? "Professional Digital Synthesizer" :
                    instrument === "Guitar" ? "Acoustic Pluck Modeling" :
                      instrument === "Bass" ? "Electric 4-String Bass" :
                        "Dynamic Drum Rack"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger className={cn(
                  "w-[200px] bg-zinc-950/50 transition-colors shadow-inner font-semibold border-2",
                  instrument === "Synth" ? "border-indigo-900 text-indigo-300 hover:border-indigo-700" :
                    instrument === "Guitar" || instrument === "Bass" ? "border-amber-900 text-amber-300 hover:border-amber-700" :
                      "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                )}>
                  <SelectValue placeholder="Select Instrument" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900/95 backdrop-blur-xl border-zinc-700 text-zinc-200">
                  {INSTRUMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white cursor-pointer py-3 rounded-md mx-1 my-1">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {instrument === "Synth" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-300 font-mono shadow-inner">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-semibold text-indigo-400">Octave</span>
                  <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-100">C{baseOctave}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6 relative overflow-visible">
          {!isReady && (
            <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center rounded-b-2xl">
              <Button
                onClick={initAudio}
                size="lg"
                className="bg-zinc-100 text-zinc-950 hover:bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all scale-100 hover:scale-105 rounded-xl font-bold text-lg px-10 h-16"
              >
                <Volume2 className="w-6 h-6 mr-3" /> Connect Studio Pipeline
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center bg-zinc-950/50 rounded-xl px-5 py-3 border border-zinc-800 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <div className={cn("w-2.5 h-2.5 rounded-full z-10", isRecording ? "bg-red-500" : "bg-emerald-500")} />
                {isRecording && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-75" />}
              </div>
              <span className={cn("text-xs font-bold tracking-wider", isRecording ? "text-red-400" : "text-emerald-400")}>
                {isRecording ? "RECORDING..." : "SYSTEM READY"}
              </span>
            </div>

            <div className="flex gap-3">
              <Button
                size="sm"
                onClick={toggleRecording}
                variant={isRecording ? "destructive" : "secondary"}
                className={cn(
                  "h-9 px-4 font-semibold transition-all rounded-lg",
                  isRecording ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 hover:text-white"
                )}
              >
                {isRecording ? <><Square className="w-4 h-4 mr-2" fill="currentColor" /> Stop</> : <><Mic className="w-4 h-4 mr-2" /> Record</>}
              </Button>

              {recordedUrl && (
                <Button size="sm" variant="outline" asChild className="h-9 px-4 bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700 rounded-lg transition-colors">
                  <a href={recordedUrl} download={`studio-session-${Date.now()}.webm`}>
                    <Download className="w-4 h-4 mr-2" /> Export
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* SYNTH MODE */}
          {instrument === "Synth" && (
            <div className="relative w-full h-48 sm:h-72 rounded-xl overflow-hidden bg-zinc-950 border-4 border-zinc-900 shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)] select-none z-10">
              {/* White Keys */}
              <div className="flex w-full h-full">
                {whiteKeys.map(k => (
                  <div
                    key={k.note}
                    onPointerDown={e => handleKeyInteraction(e, k.note, "down")}
                    onPointerUp={e => handleKeyInteraction(e, k.note, "up")}
                    onPointerLeave={e => handleKeyInteraction(e, k.note, "up")}
                    onPointerEnter={e => handleKeyInteraction(e, k.note, "down")}
                    className={cn(
                      "flex-1 relative cursor-pointer group transition-colors duration-75",
                      "bg-gradient-to-b from-white to-zinc-100 border-r border-zinc-300/80 rounded-b-md shadow-[inset_0_-8px_16px_rgba(0,0,0,0.1),_inset_0_2px_4px_rgba(255,255,255,1)]",
                      activeNotes.has(k.note)
                        ? "bg-gradient-to-b from-indigo-50 to-indigo-100 shadow-[inset_0_-4px_10px_rgba(79,70,229,0.3),_inset_0_0_20px_rgba(79,70,229,0.1)] -translate-y-[2px]"
                        : "hover:bg-gradient-to-b hover:from-white hover:to-zinc-50"
                    )}
                  >
                    <div className="absolute bottom-4 left-0 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-3 h-3 rounded-full bg-zinc-300/50 mix-blend-multiply"></div>
                    </div>
                    {k.note.startsWith("C") && (
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] items-center font-bold text-zinc-400 select-none pointer-events-none">
                        {k.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Black Keys */}
              <div className="absolute inset-0 pointer-events-none">
                {blackKeys.map(k => {
                  const w = 100 / 61
                  return (
                    <div
                      key={k.note}
                      className="absolute top-0 h-[65%] pointer-events-auto"
                      style={{
                        left: `${k.positionIndex * w}%`,
                        width: `${w * 0.65}%`,
                        transform: "translateX(-50%)"
                      }}
                    >
                      <div
                        onPointerDown={e => handleKeyInteraction(e, k.note, "down")}
                        onPointerUp={e => handleKeyInteraction(e, k.note, "up")}
                        onPointerLeave={e => handleKeyInteraction(e, k.note, "up")}
                        onPointerEnter={e => handleKeyInteraction(e, k.note, "down")}
                        className={cn(
                          "w-full h-full rounded-b-lg cursor-pointer transition-all duration-75",
                          "bg-gradient-to-b from-zinc-800 to-zinc-950 border-x border-b border-black",
                          "shadow-[inset_0_-6px_10px_rgba(255,255,255,0.1),_inset_0_2px_4px_rgba(0,0,0,0.5),_2px_4px_6px_rgba(0,0,0,0.6)]",
                          activeNotes.has(k.note)
                            ? "bg-gradient-to-b from-indigo-900 to-indigo-950 shadow-[inset_0_-2px_10px_rgba(79,70,229,0.4),_0_0_20px_rgba(79,70,229,0.5)] -translate-y-[2px]"
                            : "hover:bg-gradient-to-b hover:from-zinc-700 hover:to-zinc-900"
                        )}
                      >
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-full flex justify-center px-1">
                          <div className="w-full h-1 bg-gradient-to-b from-zinc-700/50 to-transparent rounded-full mix-blend-lighten"></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-zinc-900 to-transparent opacity-80 pointer-events-none z-20"></div>
            </div>
          )}

          {/* GUITAR / BASS MODE (FRETBOARD INTERFACE) */}
          {(instrument === "Guitar" || instrument === "Bass") && (
            <div className="relative w-full overflow-hidden rounded-xl border-4 border-amber-950 bg-[#1e0a00] shadow-[inset_0_10px_30px_rgba(0,0,0,0.9),0_10px_20px_rgba(0,0,0,0.5)] select-none">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
              {/* Fretboard wood texture overlay using gradients */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-950 via-[#3e1e04] to-amber-950 opacity-90"></div>

              <div className="relative w-full h-64 sm:h-80 flex flex-col py-2 z-10">
                {/* Strings (Render 4 for Bass, 6 for Guitar) */}
                {Array.from({ length: instrument === "Bass" ? 4 : 6 }).map((_, stringIdx) => (
                  <div key={`string-${stringIdx}`} className="flex-1 relative flex items-center group/string">

                    {/* The physical String Line */}
                    <div className="absolute left-0 w-full h-1.5 sm:h-2 pointer-events-none z-20 transform -translate-y-1/2 flex items-center shadow-lg">
                      <div className={cn(
                        "w-full h-full shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
                        stringIdx < 2 && instrument === "Guitar"
                          ? "bg-gradient-to-b from-slate-200 to-slate-400 h-1" // High unwound strings
                          : "bg-gradient-to-b from-[#e2c792] via-[#a38c52] to-[#e2c792] h-2 bg-[length:4px_100%] bg-repeat-x", // Bronze wound strings
                        "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9InRyYW5zcGFyZW50Ii8+PGxpbmUgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjQiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjMpIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=')]"
                      )} />
                    </div>

                    {/* Frets */}
                    <div className="flex w-full h-full z-30">
                      {Array.from({ length: FRETS_COUNT }).map((_, fretIdx) => {
                        const note = getGuitarNote(instrument === "Bass" ? stringIdx + 2 : stringIdx, fretIdx);
                        const isPlaying = activeNotes.has(note);

                        // Fret markers (dots) logic
                        const hasMarker = (instrument === "Bass" && stringIdx === 1) || (instrument === "Guitar" && stringIdx === 2);
                        const isDotFret = [3, 5, 7, 9].includes(fretIdx);
                        const isDoubleDotFret = fretIdx === 12;

                        return (
                          <div
                            key={`fret-${stringIdx}-${fretIdx}`}
                            onPointerDown={e => handleKeyInteraction(e, note, "down")}
                            onPointerEnter={e => handleKeyInteraction(e, note, "down")}
                            // We don't trigger "up" for guitar to let `triggerAttackRelease` ring
                            onPointerUp={() => { }}
                            onPointerLeave={() => { }}
                            className={cn(
                              "relative flex-1 cursor-crosshair border-r-2 border-slate-400/30 transition-all duration-[50ms]",
                              fretIdx === 0 ? "border-l-8 border-l-stone-100 shadow-[inset_4px_0_10px_rgba(0,0,0,0.5)]" : "", // Nut
                              isPlaying ? "bg-amber-500/30 backdrop-brightness-150 backdrop-blur-sm shadow-[inset_0_0_20px_rgba(245,158,11,0.4)]" : "hover:bg-white/5",
                            )}
                          >
                            {/* String Vibration Effect */}
                            {isPlaying && (
                              <div className="absolute top-1/2 left-0 w-full h-4 -translate-y-1/2 bg-white/20 blur-sm animate-pulse pointer-events-none"></div>
                            )}

                            {/* Inlay Dots */}
                            {hasMarker && isDotFret && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200/40 shadow-inner z-0 pointer-events-none border border-slate-300/20"></div>
                            )}
                            {hasMarker && isDoubleDotFret && stringIdx === (instrument === "Bass" ? 1 : 2) && (
                              <>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[150%] w-4 h-4 rounded-full bg-slate-200/40 shadow-inner z-0 pointer-events-none border border-slate-300/20"></div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 translate-y-[50%] w-4 h-4 rounded-full bg-slate-200/40 shadow-inner z-0 pointer-events-none border border-slate-300/20"></div>
                              </>
                            )}

                            {/* Note Label */}
                            <span className={cn(
                              "absolute bottom-0 right-1 text-[9px] font-bold select-none pointer-events-none",
                              isPlaying ? "text-amber-200" : "text-amber-900/50"
                            )}>
                              {note}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DRUM MACHINE MODE (MPC STYLE PADS) */}
          {instrument === "Drums" && (
            <div className="w-full bg-zinc-950/80 p-6 sm:p-10 rounded-2xl border-2 border-zinc-800 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
              <div className="mb-6 flex items-center justify-between bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 shadow-inner">
                <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                  MPC-88 Drum Rack
                </div>
                <div className="text-zinc-500 font-mono text-xs">BANK A // 8 PADS</div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
                {DRUM_PADS.map((pad, idx) => {
                  const isPlaying = activeNotes.has(pad.note);
                  return (
                    <div
                      key={idx}
                      onPointerDown={e => handleKeyInteraction(e, pad.note, "down")}
                      onPointerUp={e => handleKeyInteraction(e, pad.note, "up")}
                      onPointerLeave={e => handleKeyInteraction(e, pad.note, "up")}
                      className={cn(
                        "relative cursor-pointer transition-all duration-75 select-none user-select-none",
                        "flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]",
                        "border-2 shadow-[0_4px_15px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(255,255,255,0.1)]",
                        pad.rounded || "rounded-xl",
                        `col-span-${pad.colSpan || 1}`,
                        pad.rowSpan ? `row-span-${pad.rowSpan}` : "",
                        isPlaying
                          ? `scale-[0.97] shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)] bg-gradient-to-br ${pad.bg} brightness-150 border-white/40`
                          : `bg-gradient-to-br ${pad.bg} ${pad.border} ${pad.hover}`
                      )}
                    >
                      {/* Active Ring Glow */}
                      {isPlaying && <div className="absolute inset-0 bg-white/10 blur-md rounded-[inherit]"></div>}

                      {/* Hardware screw details */}
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-black/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-black/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>
                      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-black/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>
                      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-black/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>

                      <div className={cn("relative z-10 font-black tracking-wider text-sm sm:text-base",
                        pad.text || "text-white/90",
                        isPlaying && "scale-105"
                      )}>
                        {pad.label}
                      </div>
                      <div className={cn("mt-1 opacity-50 font-mono text-[10px]", pad.text || "text-white")}>
                        NOTE: {pad.note}
                      </div>

                      {/* Physical pad geometry illusion */}
                      <div className="absolute inset-2 border border-white/5 rounded-[inherit] pointer-events-none"></div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* KEYBOARD SHORTCUTS HINTS */}
          {instrument === "Synth" && (
            <div className="grid grid-cols-2 gap-4 text-xs text-zinc-400 font-mono bg-zinc-950/40 rounded-xl p-4 border border-zinc-800/50 shadow-inner">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-zinc-800/80 border border-zinc-700 rounded text-zinc-300 font-bold shadow-sm">Z</kbd>
                <span className="opacity-50">-</span>
                <kbd className="px-2 py-1 bg-zinc-800/80 border border-zinc-700 rounded text-zinc-300 font-bold shadow-sm">M</kbd>
                <span className="ml-2 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md">Lower Octave</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="mr-2 px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-md">Upper Octave</span>
                <kbd className="px-2 py-1 bg-zinc-800/80 border border-zinc-700 rounded text-zinc-300 font-bold shadow-sm">Q</kbd>
                <span className="opacity-50">-</span>
                <kbd className="px-2 py-1 bg-zinc-800/80 border border-zinc-700 rounded text-zinc-300 font-bold shadow-sm">P</kbd>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Background radial gradients for depth */}
      <div className={cn("fixed top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none z-0 transition-all duration-1000",
        instrument === "Synth" ? "bg-indigo-500/10" :
          instrument === "Guitar" || instrument === "Bass" ? "bg-amber-500/10" :
            "bg-red-500/10"
      )}></div>
      <div className={cn("fixed bottom-1/4 right-1/4 w-[30rem] h-[30rem] rounded-full blur-[150px] pointer-events-none z-0 transition-all duration-1000",
        instrument === "Synth" ? "bg-purple-500/10" :
          instrument === "Guitar" || instrument === "Bass" ? "bg-orange-600/10" :
            "bg-zinc-500/10"
      )}></div>
    </div>
  )
}