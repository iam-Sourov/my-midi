"use client"

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react"
import * as Tone from "tone"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Download,
  Mic,
  Square,
  Volume2,
  VolumeX,
  Cable,
  Piano,
  Settings2,
  Guitar as GuitarIcon,
  Disc3,
  HelpCircle,
  X,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Music2,
  Layers,
  Radio
} from "lucide-react"

// Complete Computer Keyboard to Semitone Mapping for Melodic Instruments
// Offset from base MIDI note (e.g. C3 = 48)
const KEYBOARD_NOTE_MAP = {
  // Lower Octave
  z: { offset: 0, label: "Z" },   // C
  s: { offset: 1, label: "S" },   // C#
  x: { offset: 2, label: "X" },   // D
  d: { offset: 3, label: "D" },   // D#
  c: { offset: 4, label: "C" },   // E
  v: { offset: 5, label: "V" },   // F
  g: { offset: 6, label: "G" },   // F#
  b: { offset: 7, label: "B" },   // G
  h: { offset: 8, label: "H" },   // G#
  n: { offset: 9, label: "N" },   // A
  j: { offset: 10, label: "J" },  // A#
  m: { offset: 11, label: "M" },  // B
  ",": { offset: 12, label: "," }, // C+1
  l: { offset: 13, label: "L" },  // C#+1
  ".": { offset: 14, label: "." }, // D+1
  ";": { offset: 15, label: ";" }, // D#+1
  "/": { offset: 16, label: "/" }, // E+1

  // Upper Octave
  q: { offset: 12, label: "Q" },  // C+1
  "2": { offset: 13, label: "2" }, // C#+1
  w: { offset: 14, label: "W" },  // D+1
  "3": { offset: 15, label: "3" }, // D#+1
  e: { offset: 16, label: "E" },  // E+1
  r: { offset: 17, label: "R" },  // F+1
  "5": { offset: 18, label: "5" }, // F#+1
  t: { offset: 19, label: "T" },  // G+1
  "6": { offset: 20, label: "6" }, // G#+1
  y: { offset: 21, label: "Y" },  // A+1
  "7": { offset: 22, label: "7" }, // A#+1
  u: { offset: 23, label: "U" },  // B+1
  i: { offset: 24, label: "I" },  // C+2
  "9": { offset: 25, label: "9" }, // C#+2
  o: { offset: 26, label: "O" },  // D+2
  "0": { offset: 27, label: "0" }, // D#+2
  p: { offset: 28, label: "P" },  // E+2
  "[": { offset: 29, label: "[" }, // F+2
  "=": { offset: 30, label: "=" }, // F#+2
  "]": { offset: 31, label: "]" }  // G+2
}

// Computer Keyboard mapping for MPC Drum Kit
const DRUM_KEY_MAP = {
  "1": "kick", a: "kick",
  "2": "snare", s: "snare",
  "3": "hihat", d: "hihat",
  "4": "hihatOpen", f: "hihatOpen",
  "5": "tomLow", q: "tomLow",
  "6": "tomHigh", w: "tomHigh",
  "7": "crash", e: "crash",
  "8": "ride", r: "ride"
}

// Available Essential Instruments
const INSTRUMENTS = [
  { id: "Piano", name: "Grand Piano", category: "Keys", icon: Piano, color: "from-blue-500 to-cyan-500", desc: "Acoustic Concert Grand" },
  { id: "Synth", name: "Analog Synth", category: "Synth", icon: Settings2, color: "from-indigo-500 to-purple-500", desc: "Punchy Lead & Sub" },
  { id: "Rhodes", name: "Rhodes E-Piano", category: "Keys", icon: Music2, color: "from-amber-500 to-yellow-500", desc: "Warm Vintage Bell Keys" },
  { id: "Guitar", name: "Acoustic Guitar", category: "Plucked", icon: GuitarIcon, color: "from-orange-500 to-amber-600", desc: "Natural Nylon Strings" },
  { id: "Bass", name: "Electric Bass", category: "Bass", icon: Radio, color: "from-emerald-500 to-teal-600", desc: "Deep Punchy 4-String" },
  { id: "Strings", name: "Strings Ensemble", category: "Pad", icon: Layers, color: "from-rose-500 to-pink-600", desc: "Cinematic Sustained Pad" },
  { id: "Organ", name: "Drawbar Organ", category: "Keys", icon: Sparkles, color: "from-violet-500 to-fuchsia-600", desc: "Classic Tonewheel Organ" },
  { id: "Drums", name: "MPC Drum Kit", category: "Percussion", icon: Disc3, color: "from-red-500 to-orange-500", desc: "Studio 8-Pad Drum Machine" }
]

// Drum Pads definition
const DRUM_PADS = [
  { key: "kick", label: "Kick Drum", note: "C3", hotkeys: ["1", "A"], color: "from-red-600/30 to-red-900/50 border-red-500/40 text-red-300" },
  { key: "snare", label: "Snare Drum", note: "D3", hotkeys: ["2", "S"], color: "from-slate-300/20 to-slate-600/40 border-slate-400/40 text-slate-200" },
  { key: "hihat", label: "Closed Hat", note: "F3", hotkeys: ["3", "D"], color: "from-yellow-600/30 to-amber-800/50 border-yellow-500/40 text-yellow-300" },
  { key: "hihatOpen", label: "Open Hat", note: "F#3", hotkeys: ["4", "F"], color: "from-amber-500/30 to-orange-800/50 border-amber-500/40 text-amber-300" },
  { key: "tomLow", label: "Low Tom", note: "E3", hotkeys: ["5", "Q"], color: "from-indigo-600/30 to-purple-900/50 border-indigo-500/40 text-indigo-300" },
  { key: "tomHigh", label: "High Tom", note: "G3", hotkeys: ["6", "W"], color: "from-cyan-600/30 to-blue-900/50 border-cyan-500/40 text-cyan-300" },
  { key: "crash", label: "Crash Cymbal", note: "A3", hotkeys: ["7", "E"], color: "from-emerald-600/30 to-teal-900/50 border-emerald-500/40 text-emerald-300" },
  { key: "ride", label: "Ride Cymbal", note: "B3", hotkeys: ["8", "R"], color: "from-purple-600/30 to-fuchsia-900/50 border-purple-500/40 text-purple-300" }
]

const FRETS_COUNT = 12
const STRINGS_COUNT = 6

export default function MidiKeyboard() {
  // Application State
  const [isAudioStarted, setIsAudioStarted] = useState(false)
  const [instrument, setInstrument] = useState("Piano")
  const [baseOctave, setBaseOctave] = useState(3)
  const [volume, setVolume] = useState(85)
  const [isMuted, setIsMuted] = useState(false)
  const [activeNotes, setActiveNotes] = useState(new Set())
  const [activeDrumKeys, setActiveDrumKeys] = useState(new Set())

  // Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [recordTime, setRecordTime] = useState(0)

  // Metronome State
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const [bpm, setBpm] = useState(120)

  // System & UI State
  const [midiConnected, setMidiConnected] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  // Refs
  const synthRef = useRef(null)
  const drumSynthsRef = useRef(null)
  const recorderRef = useRef(null)
  const activeKeyMap = useRef(new Map())
  const recordTimerRef = useRef(null)
  const metronomeLoopRef = useRef(null)
  const metronomeClickRef = useRef(null)

  // Generate Piano Keys
  const { whiteKeys, blackKeys } = useMemo(() => {
    const white = []
    const black = []
    let whiteIndex = 0

    const startMidi = baseOctave * 12 + 12
    const endMidi = startMidi + 36

    for (let m = startMidi; m <= endMidi; m++) {
      const freq = Tone.Frequency(m, "midi")
      const note = freq.toNote()
      const isBlackNote = note.includes("#")

      const semitoneOffset = m - startMidi
      const keyBinding = Object.entries(KEYBOARD_NOTE_MAP).find(
        ([_, val]) => val.offset === semitoneOffset
      )
      const hotkeyLabel = keyBinding ? keyBinding[1].label : null

      if (!isBlackNote) {
        white.push({ note, midi: m, index: whiteIndex, hotkey: hotkeyLabel })
        whiteIndex++
      } else {
        black.push({ note, midi: m, positionIndex: whiteIndex, hotkey: hotkeyLabel })
      }
    }
    return { whiteKeys: white, blackKeys: black }
  }, [baseOctave])

  // Initialize Master Audio Output & Volume Control
  const ensureAudioStarted = useCallback(async () => {
    if (Tone.context.state !== "running") {
      await Tone.start()
    }
    if (!isAudioStarted) {
      setIsAudioStarted(true)
    }
  }, [isAudioStarted])

  // Initialize Metronome click synth
  useEffect(() => {
    metronomeClickRef.current = new Tone.MembraneSynth({
      pitchDecay: 0.005,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      volume: -10
    }).toDestination()

    return () => {
      metronomeClickRef.current?.dispose()
    }
  }, [])

  // Metronome Loop Effect
  useEffect(() => {
    if (!isAudioStarted || !isMetronomePlaying) {
      if (metronomeLoopRef.current) {
        metronomeLoopRef.current.stop()
        metronomeLoopRef.current.dispose()
        metronomeLoopRef.current = null
      }
      Tone.getTransport().stop()
      return
    }

    Tone.getTransport().bpm.value = bpm

    metronomeLoopRef.current = new Tone.Loop((time) => {
      metronomeClickRef.current?.triggerAttackRelease("C5", "16n", time)
    }, "4n").start(0)

    Tone.getTransport().start()

    return () => {
      if (metronomeLoopRef.current) {
        metronomeLoopRef.current.stop()
        metronomeLoopRef.current.dispose()
        metronomeLoopRef.current = null
      }
    }
  }, [isMetronomePlaying, bpm, isAudioStarted])

  // Master Volume update
  useEffect(() => {
    const db = isMuted ? -Infinity : (volume === 0 ? -Infinity : Tone.gainToDb(volume / 100))
    Tone.getDestination().volume.rampTo(db, 0.05)
  }, [volume, isMuted])

  // Initialize Drum Synthesizer Rack
  const initDrumRack = useCallback(() => {
    if (drumSynthsRef.current) {
      Object.values(drumSynthsRef.current).forEach((item) => item.synth.dispose())
    }

    const output = Tone.getDestination()

    drumSynthsRef.current = {
      kick: {
        synth: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 }, volume: 4 }).connect(output),
        play: (t) => drumSynthsRef.current.kick.synth.triggerAttackRelease("C1", "8n", t)
      },
      snare: {
        synth: new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.25, sustain: 0 }, volume: 1 }).connect(output),
        play: (t) => drumSynthsRef.current.snare.synth.triggerAttackRelease("16n", t)
      },
      hihat: {
        synth: new Tone.MetalSynth({ frequency: 250, envelope: { attack: 0.001, decay: 0.08, release: 0.05 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -4 }).connect(output),
        play: (t) => drumSynthsRef.current.hihat.synth.triggerAttackRelease("16n", t)
      },
      hihatOpen: {
        synth: new Tone.MetalSynth({ frequency: 220, envelope: { attack: 0.001, decay: 0.4, release: 0.2 }, harmonicity: 5.1, modulationIndex: 32, resonance: 3500, octaves: 1.5, volume: -4 }).connect(output),
        play: (t) => drumSynthsRef.current.hihatOpen.synth.triggerAttackRelease("8n", t)
      },
      tomLow: {
        synth: new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 3, envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 }, volume: 2 }).connect(output),
        play: (t) => drumSynthsRef.current.tomLow.synth.triggerAttackRelease("G2", "8n", t)
      },
      tomHigh: {
        synth: new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 3, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }, volume: 2 }).connect(output),
        play: (t) => drumSynthsRef.current.tomHigh.synth.triggerAttackRelease("D3", "8n", t)
      },
      crash: {
        synth: new Tone.MetalSynth({ frequency: 300, envelope: { attack: 0.001, decay: 1.2, release: 0.5 }, harmonicity: 4, modulationIndex: 40, resonance: 2000, octaves: 2, volume: -2 }).connect(output),
        play: (t) => drumSynthsRef.current.crash.synth.triggerAttackRelease("4n", t)
      },
      ride: {
        synth: new Tone.MetalSynth({ frequency: 450, envelope: { attack: 0.001, decay: 0.8, release: 0.3 }, harmonicity: 6, modulationIndex: 25, resonance: 5000, octaves: 1, volume: -4 }).connect(output),
        play: (t) => drumSynthsRef.current.ride.synth.triggerAttackRelease("4n", t)
      }
    }

    if (recorderRef.current) {
      Object.values(drumSynthsRef.current).forEach((item) => item.synth.connect(recorderRef.current))
    }
  }, [])

  // Create Instrument Synthesizer Voice
  const createPolySynth = useCallback((type) => {
    let newSynth

    switch (type) {
      case "Piano":
        newSynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "triangle12" },
          envelope: { attack: 0.005, decay: 1.2, sustain: 0.3, release: 1.4 },
          volume: 2
        })
        break

      case "Rhodes":
        newSynth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3,
          modulationIndex: 2.5,
          oscillator: { type: "sine" },
          envelope: { attack: 0.005, decay: 1.8, sustain: 0.15, release: 1.5 },
          modulation: { type: "triangle" },
          modulationEnvelope: { attack: 0.01, decay: 0.6, sustain: 0.1, release: 1 },
          volume: 3
        })
        break

      case "Guitar":
        newSynth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 2.5,
          modulationIndex: 4,
          oscillator: { type: "triangle" },
          envelope: { attack: 0.002, decay: 1.6, sustain: 0.08, release: 1.2 },
          modulation: { type: "square" },
          modulationEnvelope: { attack: 0.005, decay: 0.4, sustain: 0, release: 0.4 },
          volume: 3
        })
        break

      case "Bass":
        newSynth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 1,
          modulationIndex: 6,
          oscillator: { type: "sawtooth" },
          envelope: { attack: 0.008, decay: 0.5, sustain: 0.5, release: 0.8 },
          modulation: { type: "triangle" },
          modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 },
          volume: 6
        })
        break

      case "Strings":
        newSynth = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 2,
          oscillator: { type: "sawtooth" },
          envelope: { attack: 0.4, decay: 2, sustain: 0.8, release: 2.5 },
          modulation: { type: "sine" },
          modulationEnvelope: { attack: 0.3, decay: 1.5, sustain: 0.7, release: 2 },
          volume: 0
        })
        break

      case "Organ":
        newSynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "fatcustom", partials: [1, 0.5, 0.8, 0.3, 0.6], count: 3, spread: 20 },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.95, release: 0.2 },
          volume: 1
        })
        break

      case "Synth":
      default:
        newSynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "sawtooth" },
          envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.8 },
          volume: 0
        })
        break
    }

    const output = Tone.getDestination()
    newSynth.connect(output)

    if (recorderRef.current) {
      newSynth.connect(recorderRef.current)
    }

    return newSynth
  }, [])

  // Switch Instrument & re-initialize nodes
  useEffect(() => {
    if (!isAudioStarted) return

    if (synthRef.current) {
      synthRef.current.releaseAll()
      synthRef.current.dispose()
      synthRef.current = null
    }

    setActiveNotes(new Set())
    activeKeyMap.current.clear()

    if (instrument === "Drums") {
      initDrumRack()
    } else {
      synthRef.current = createPolySynth(instrument)
    }
  }, [instrument, isAudioStarted, createPolySynth, initDrumRack])

  // Setup Recording Buffer
  useEffect(() => {
    recorderRef.current = new Tone.Recorder()
  }, [])

  // Web MIDI Setup
  const setupWebMIDI = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then((access) => {
        setMidiConnected(access.inputs.size > 0)

        const handleMidiMessage = (msg) => {
          ensureAudioStarted()
          const [cmd, note, vel] = msg.data
          const noteName = Tone.Frequency(note, "midi").toNote()

          if (cmd === 144 && vel > 0) {
            playNote(noteName)
          } else if (cmd === 128 || (cmd === 144 && vel === 0)) {
            stopNote(noteName)
          }
        }

        access.inputs.forEach((input) => {
          input.onmidimessage = handleMidiMessage
        })

        access.onstatechange = () => {
          setMidiConnected(access.inputs.size > 0)
        }
      }).catch((e) => console.log("MIDI Access unsupported/denied", e))
    }
  }, [ensureAudioStarted])

  useEffect(() => {
    setupWebMIDI()
  }, [setupWebMIDI])

  // Core Audio Playback Logic
  const playNote = (note) => {
    ensureAudioStarted()

    setActiveNotes((prev) => {
      if (prev.has(note)) return prev
      const next = new Set(prev)
      next.add(note)
      return next
    })

    if (instrument === "Drums") {
      const padKey = DRUM_PADS.find((p) => p.note === note)?.key || "kick"
      triggerDrum(padKey)
    } else if (synthRef.current) {
      if (instrument === "Guitar" || instrument === "Bass") {
        synthRef.current.triggerAttackRelease(note, "2n")
      } else {
        synthRef.current.triggerAttack(note)
      }
    }
  }

  const stopNote = (note) => {
    setActiveNotes((prev) => {
      const next = new Set(prev)
      next.delete(note)
      return next
    })

    if (instrument !== "Drums" && instrument !== "Guitar" && instrument !== "Bass" && synthRef.current) {
      synthRef.current.triggerRelease(note)
    }
  }

  const triggerDrum = (drumKey) => {
    ensureAudioStarted()
    if (drumSynthsRef.current && drumSynthsRef.current[drumKey]) {
      drumSynthsRef.current[drumKey].play(Tone.now())
    }

    setActiveDrumKeys((prev) => {
      const next = new Set(prev)
      next.add(drumKey)
      return next
    })

    setTimeout(() => {
      setActiveDrumKeys((prev) => {
        const next = new Set(prev)
        next.delete(drumKey)
        return next
      })
    }, 150)
  }

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.repeat) return

      const key = e.key.toLowerCase()

      ensureAudioStarted()

      if (e.key === "ArrowLeft" || key === "<") {
        setBaseOctave((p) => Math.max(1, p - 1))
        return
      }
      if (e.key === "ArrowRight" || key === ">") {
        setBaseOctave((p) => Math.min(6, p + 1))
        return
      }

      if (key === "?") {
        setShowHelpModal((p) => !p)
        return
      }

      if (instrument === "Drums") {
        const drumKey = DRUM_KEY_MAP[key]
        if (drumKey) {
          triggerDrum(drumKey)
        }
        return
      }

      if (activeKeyMap.current.has(key)) return

      const binding = KEYBOARD_NOTE_MAP[key]
      if (binding !== undefined) {
        const startMidi = baseOctave * 12 + 12
        const targetMidi = startMidi + binding.offset
        const note = Tone.Frequency(targetMidi, "midi").toNote()

        playNote(note)
        activeKeyMap.current.set(key, note)
      }
    }

    const handleKeyUp = (e) => {
      if (!e.key) return
      const key = e.key.toLowerCase()

      if (instrument === "Drums") return

      const note = activeKeyMap.current.get(key)
      if (note) {
        stopNote(note)
        activeKeyMap.current.delete(key)
      }
    }

    const handleWindowBlur = () => {
      if (synthRef.current) synthRef.current.releaseAll()
      setActiveNotes(new Set())
      activeKeyMap.current.clear()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", handleWindowBlur)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [baseOctave, instrument, ensureAudioStarted])

  // Recording Controls
  const toggleRecording = async () => {
    ensureAudioStarted()
    if (!recorderRef.current) return

    if (isRecording) {
      clearInterval(recordTimerRef.current)
      const blob = await recorderRef.current.stop()
      setRecordedUrl(URL.createObjectURL(blob))
      setIsRecording(false)
    } else {
      setRecordedUrl(null)
      setRecordTime(0)
      recorderRef.current.start()
      setIsRecording(true)

      recordTimerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1)
      }, 1000)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Guitar Note Mapping helper
  const getGuitarNote = (stringIdx, fretIdx) => {
    const guitarTuning = [64, 59, 55, 50, 45, 40]
    const bassTuning = [43, 38, 33, 28]

    const baseMidi = instrument === "Bass"
      ? (bassTuning[stringIdx] || 28)
      : guitarTuning[stringIdx]

    return Tone.Frequency(baseMidi + fretIdx, "midi").toNote()
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 md:p-8 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black select-none"
      onClick={ensureAudioStarted}
    >
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-500/5 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-purple-500/5 blur-[140px] pointer-events-none rounded-full" />

      {/* TOP STUDIO NAVIGATION & CONTROL BAR */}
      <header className="relative z-20 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 shadow-2xl">
        {/* Brand & Audio State */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
            <Piano className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">MINIMALIST MIDI STUDIO</h1>
              {midiConnected ? (
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 font-medium">
                  <Cable className="w-3 h-3 mr-1 inline" /> MIDI CONNECTED
                </Badge>
              ) : (
                <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] px-2 py-0.5">
                  KEYBOARD READY
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Press computer keys to play • Octave <span className="text-indigo-400 font-bold">C{baseOctave}</span>
            </p>
          </div>
        </div>

        {/* Essential Instrument Tabs Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800 overflow-x-auto max-w-full">
          {INSTRUMENTS.map((inst) => {
            const Icon = inst.icon
            const isSelected = instrument === inst.id
            return (
              <button
                key={inst.id}
                onClick={() => setInstrument(inst.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  isSelected
                    ? "bg-gradient-to-r text-white shadow-md shadow-indigo-500/10 " + inst.color
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{inst.name}</span>
              </button>
            )
          })}
        </div>

        {/* Master Controls & Metronome */}
        <div className="flex items-center gap-3">
          {/* Metronome */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs">
            <button
              onClick={() => setIsMetronomePlaying((p) => !p)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                isMetronomePlaying ? "bg-indigo-600 text-white animate-pulse" : "text-zinc-400 hover:text-white"
              )}
              title="Toggle Metronome"
            >
              <Music2 className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="40"
              max="240"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-12 bg-transparent text-center text-xs font-mono font-bold text-indigo-300 outline-none"
            />
            <span className="text-[10px] text-zinc-500 font-mono">BPM</span>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <button
              onClick={() => setIsMuted((p) => !p)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setIsMuted(false)
                setVolume(Number(e.target.value))
              }}
              className="w-16 sm:w-20 accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Recorder Button */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={toggleRecording}
              className={cn(
                "h-8 px-3 text-xs font-bold transition-all rounded-lg",
                isRecording
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 animate-pulse"
                  : "bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700"
              )}
            >
              {isRecording ? (
                <>
                  <Square className="w-3 h-3 mr-1.5 fill-current text-red-500" />
                  <span>{formatTime(recordTime)}</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3 mr-1.5 text-red-400" />
                  <span>Record</span>
                </>
              )}
            </Button>

            {recordedUrl && (
              <Button size="sm" asChild className="h-8 px-3 text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 rounded-lg">
                <a href={recordedUrl} download={`studio-take-${Date.now()}.webm`}>
                  <Download className="w-3 h-3 mr-1" /> Export
                </a>
              </Button>
            )}
          </div>

          {/* Help Modal Toggle */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Keyboard Shortcuts Cheat Sheet"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN PLAYABLE INSTRUMENT DISPLAY CANVAS */}
      <main className="relative z-10 w-full max-w-7xl mx-auto my-auto py-6">
        {/* AUDIO ACTIVATION OVERLAY */}
        {!isAudioStarted && (
          <div
            onClick={ensureAudioStarted}
            className="absolute inset-0 z-50 rounded-2xl bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 border border-zinc-800 shadow-2xl cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 group-hover:scale-110 transition-transform mb-4">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide mb-1">Click or Press Any Key to Start Studio</h2>
            <p className="text-xs text-zinc-400 font-mono">Unlocks Web Audio API sound engine & computer keyboard mapping</p>
          </div>
        )}

        {/* OCTAVE SELECTOR BAR */}
        {instrument !== "Drums" && (
          <div className="flex items-center justify-between mb-4 px-4 py-2 bg-zinc-900/40 rounded-xl border border-zinc-800/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">Base Octave:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((oct) => (
                  <button
                    key={oct}
                    onClick={() => setBaseOctave(oct)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all",
                      baseOctave === oct
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105"
                        : "bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    )}
                  >
                    C{oct}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-zinc-400">
              <span>Shift Octave: <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300">←</kbd> <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300">→</kbd></span>
              <span>Help: <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300">?</kbd></span>
            </div>
          </div>
        )}

        {/* VIEW 1: PIANO / SYNTH / RHODES / STRINGS / ORGAN */}
        {["Piano", "Synth", "Rhodes", "Strings", "Organ"].includes(instrument) && (
          <div className="relative w-full h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden bg-zinc-950 border-4 border-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] select-none">
            {/* White Keys */}
            <div className="flex w-full h-full">
              {whiteKeys.map((k) => {
                const isActive = activeNotes.has(k.note)
                return (
                  <div
                    key={k.note}
                    onMouseDown={(e) => { e.preventDefault(); playNote(k.note) }}
                    onMouseUp={() => stopNote(k.note)}
                    onMouseLeave={() => stopNote(k.note)}
                    onMouseEnter={(e) => { if (e.buttons === 1) playNote(k.note) }}
                    onTouchStart={(e) => { e.preventDefault(); playNote(k.note) }}
                    onTouchEnd={() => stopNote(k.note)}
                    className={cn(
                      "flex-1 relative cursor-pointer group transition-all duration-75 flex flex-col justify-end items-center pb-3 border-r border-zinc-300/40 rounded-b-md select-none",
                      "bg-gradient-to-b from-zinc-100 via-white to-zinc-200 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1)]",
                      isActive
                        ? "bg-gradient-to-b from-indigo-100 via-indigo-200 to-indigo-400 shadow-[inset_0_-4px_15px_rgba(79,70,229,0.5)] -translate-y-1"
                        : "hover:bg-gradient-to-b hover:from-white hover:to-zinc-100"
                    )}
                  >
                    {/* Visual Keyboard Shortcut Badge */}
                    {k.hotkey && (
                      <span className={cn(
                        "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm transition-transform mb-1 select-none pointer-events-none",
                        isActive
                          ? "bg-indigo-600 text-white scale-110"
                          : "bg-zinc-800/80 text-zinc-200 border border-zinc-700"
                      )}>
                        {k.hotkey}
                      </span>
                    )}

                    {/* Note Label */}
                    <span className="text-[10px] font-mono font-bold text-zinc-400 select-none pointer-events-none">
                      {k.note}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Black Keys */}
            <div className="absolute inset-0 pointer-events-none">
              {blackKeys.map((k) => {
                const isActive = activeNotes.has(k.note)
                const widthPercent = 100 / whiteKeys.length

                return (
                  <div
                    key={k.note}
                    className="absolute top-0 h-[62%] pointer-events-auto z-30"
                    style={{
                      left: `${k.positionIndex * widthPercent}%`,
                      width: `${widthPercent * 0.65}%`,
                      transform: "translateX(-50%)"
                    }}
                  >
                    <div
                      onMouseDown={(e) => { e.preventDefault(); playNote(k.note) }}
                      onMouseUp={() => stopNote(k.note)}
                      onMouseLeave={() => stopNote(k.note)}
                      onMouseEnter={(e) => { if (e.buttons === 1) playNote(k.note) }}
                      onTouchStart={(e) => { e.preventDefault(); playNote(k.note) }}
                      onTouchEnd={() => stopNote(k.note)}
                      className={cn(
                        "w-full h-full rounded-b-lg cursor-pointer transition-all duration-75 flex flex-col justify-end items-center pb-2 border-x border-b border-black select-none",
                        "bg-gradient-to-b from-zinc-800 via-zinc-900 to-black shadow-[0_8px_15px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1)]",
                        isActive
                          ? "bg-gradient-to-b from-indigo-700 via-indigo-900 to-indigo-950 shadow-[0_0_20px_rgba(99,102,241,0.8)] -translate-y-1"
                          : "hover:bg-gradient-to-b hover:from-zinc-700 hover:to-zinc-900"
                      )}
                    >
                      {/* Visual Hotkey Badge */}
                      {k.hotkey && (
                        <span className={cn(
                          "text-[9px] font-mono font-bold px-1 py-0.5 rounded shadow-sm select-none pointer-events-none",
                          isActive
                            ? "bg-indigo-500 text-white"
                            : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                        )}>
                          {k.hotkey}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: ACOUSTIC GUITAR & ELECTRIC BASS */}
        {(instrument === "Guitar" || instrument === "Bass") && (
          <div className="relative w-full overflow-hidden rounded-2xl border-4 border-amber-950 bg-[#1a0c04] shadow-[0_20px_50px_rgba(0,0,0,0.9)] select-none">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-950 via-[#3a1d06] to-amber-950 opacity-95" />

            <div className="relative w-full h-64 sm:h-72 md:h-80 flex flex-col justify-around py-3 z-10">
              {Array.from({ length: instrument === "Bass" ? 4 : 6 }).map((_, stringIdx) => (
                <div key={stringIdx} className="relative flex-1 flex items-center group">
                  <div className="absolute left-0 w-full h-1 z-20 pointer-events-none transform -translate-y-1/2 flex items-center shadow-lg">
                    <div className={cn(
                      "w-full h-full shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                      stringIdx < 2 && instrument === "Guitar"
                        ? "bg-gradient-to-b from-slate-200 to-slate-400 h-0.5"
                        : "bg-gradient-to-b from-amber-300 via-amber-600 to-amber-400 h-1.5"
                    )} />
                  </div>

                  <div className="flex w-full h-full z-30">
                    {Array.from({ length: FRETS_COUNT }).map((_, fretIdx) => {
                      const note = getGuitarNote(stringIdx, fretIdx)
                      const isPlaying = activeNotes.has(note)
                      const isNut = fretIdx === 0

                      return (
                        <div
                          key={fretIdx}
                          onMouseDown={(e) => { e.preventDefault(); playNote(note) }}
                          onMouseEnter={(e) => { if (e.buttons === 1) playNote(note) }}
                          onTouchStart={(e) => { e.preventDefault(); playNote(note) }}
                          className={cn(
                            "relative flex-1 cursor-pointer border-r-2 border-amber-200/20 transition-all flex items-center justify-center",
                            isNut ? "border-l-8 border-l-stone-200 bg-amber-950/40" : "",
                            isPlaying
                              ? "bg-indigo-500/40 backdrop-brightness-150 shadow-[inset_0_0_20px_rgba(99,102,241,0.6)]"
                              : "hover:bg-white/5"
                          )}
                        >
                          <span className={cn(
                            "text-[9px] font-mono font-bold select-none pointer-events-none z-40 px-1 rounded",
                            isPlaying ? "bg-indigo-600 text-white scale-110" : "text-amber-200/50"
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

        {/* VIEW 3: MPC DRUM KIT */}
        {instrument === "Drums" && (
          <div className="w-full bg-zinc-950/90 p-6 sm:p-8 rounded-2xl border-2 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                MPC-88 DRUM MATRIX
              </div>
              <div className="text-xs font-mono text-zinc-500">
                PLAYABLE VIA KEYBOARD [<kbd className="px-1 bg-zinc-800 rounded text-zinc-300">1-8</kbd> or <kbd className="px-1 bg-zinc-800 rounded text-zinc-300">A,S,D,F,Q,W,E,R</kbd>]
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {DRUM_PADS.map((pad) => {
                const isActive = activeDrumKeys.has(pad.key)
                return (
                  <div
                    key={pad.key}
                    onMouseDown={(e) => { e.preventDefault(); triggerDrum(pad.key) }}
                    onTouchStart={(e) => { e.preventDefault(); triggerDrum(pad.key) }}
                    className={cn(
                      "relative cursor-pointer min-h-[110px] sm:min-h-[130px] rounded-2xl border-2 p-4 flex flex-col justify-between transition-all duration-75 select-none shadow-xl",
                      "bg-gradient-to-br backdrop-blur-md",
                      pad.color,
                      isActive
                        ? "scale-[0.96] brightness-150 shadow-[0_0_30px_rgba(255,255,255,0.4)] border-white"
                        : "hover:scale-[1.02] hover:brightness-125"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex gap-1">
                        {pad.hotkeys.map((hk) => (
                          <span
                            key={hk}
                            className={cn(
                              "text-[11px] font-mono font-black px-2 py-0.5 rounded shadow-md border",
                              isActive
                                ? "bg-white text-zinc-950 border-white"
                                : "bg-zinc-950/80 text-zinc-200 border-zinc-700"
                            )}
                          >
                            {hk}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 font-bold">{pad.note}</span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">{pad.label}</h3>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-zinc-800/60 text-xs text-zinc-500 font-mono">
        <div>
          <span>100% RUNNABLE • HIGH PERFORMANCE WEB AUDIO STUDIO</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Keyboard: <strong className="text-zinc-300">A-Z, 0-9, [, ]</strong></span>
          <span>MIDI: <strong className="text-zinc-300">Web MIDI API</strong></span>
        </div>
      </footer>

      {/* KEYBOARD SHORTCUTS INSTRUCTION MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Computer Keyboard Controls</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <h4 className="font-bold text-indigo-400 uppercase mb-1">Piano & Synthesizers (2 Octaves):</h4>
                <p className="text-zinc-400 mb-2">Lower octave white keys: <kbd className="px-1 bg-zinc-800 rounded text-zinc-200">Z X C V B N M , . /</kbd></p>
                <p className="text-zinc-400 mb-2">Lower octave black keys: <kbd className="px-1 bg-zinc-800 rounded text-zinc-200">S D G H J L ;</kbd></p>
                <p className="text-zinc-400 mb-2">Upper octave white keys: <kbd className="px-1 bg-zinc-800 rounded text-zinc-200">Q W E R T Y U I O P [ ]</kbd></p>
                <p className="text-zinc-400">Upper octave black keys: <kbd className="px-1 bg-zinc-800 rounded text-zinc-200">2 3 5 6 7 9 0 =</kbd></p>
              </div>

              <div>
                <h4 className="font-bold text-red-400 uppercase mb-1">MPC Drum Kit:</h4>
                <p className="text-zinc-400">Press keys <kbd className="px-1 bg-zinc-800 rounded text-zinc-200">1 to 8</kbd> or <kbd className="px-1 bg-zinc-800 rounded text-zinc-200">A, S, D, F, Q, W, E, R</kbd> to trigger Kick, Snare, Hi-Hats, Toms, Crash & Ride.</p>
              </div>

              <div>
                <h4 className="font-bold text-emerald-400 uppercase mb-1">Octave Controls & Shortcuts:</h4>
                <p className="text-zinc-400">Shift Base Octave up/down with <kbd className="px-1 bg-zinc-800 rounded text-zinc-200">Left Arrow</kbd> and <kbd className="px-1 bg-zinc-800 rounded text-zinc-200">Right Arrow</kbd>.</p>
              </div>
            </div>

            <Button
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
            >
              Got it, let's play!
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}