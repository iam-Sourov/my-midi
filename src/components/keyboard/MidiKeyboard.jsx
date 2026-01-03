"use client"

import React, { useEffect, useState, useRef, useMemo } from "react"
import * as Tone from "tone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Download, Mic, Square, Volume2, Cable, ArrowLeftRight } from "lucide-react"

const FULL_KEYBOARD_MAP = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
  ",": 12, ".": 14, "/": 16,
  q: 12, "2": 13, w: 14, "3": 15, e: 16, r: 17, "5": 18, t: 19, "6": 20, y: 21,
  "7": 22, u: 23, i: 24, "9": 25, o: 26, "0": 27, p: 28, "[": 29, "=": 30, "]": 31
}

export default function MidiKeyboard() {
  const [isReady, setIsReady] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [activeNotes, setActiveNotes] = useState(new Set())
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [baseOctave, setBaseOctave] = useState(3)
  const [midiAccess, setMidiAccess] = useState(false)
  const synth = useRef(null)
  const recorder = useRef(null)
  const activeKeyMap = useRef(new Map())
  const { whiteKeys, blackKeys } = useMemo(() => {
    const white = []
    const black = []
    let whiteIndex = 0

    for (let m = 21; m <= 108; m++) {
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
  const playNote = (note) => {
    if (!synth.current) return

    setActiveNotes((prev) => {
      if (prev.has(note)) return prev

      synth.current?.triggerAttack(note)
      const newSet = new Set(prev)
      newSet.add(note)
      return newSet
    })
  }

  const stopNote = (note) => {
    if (!synth.current) return

    synth.current?.triggerRelease(note)
    setActiveNotes((prev) => {
      const newSet = new Set(prev)
      newSet.delete(note)
      return newSet
    })
  }

  const stopAllNotes = () => {
    if (synth.current) {
      synth.current.releaseAll()
    }
    setActiveNotes(new Set())
    activeKeyMap.current.clear()
  }

  const initAudio = async () => {
    if (isReady) return
    await Tone.start()

    const newSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
      volume: -8,
      maxPolyphony: 32
    }).toDestination()

    const newRecorder = new Tone.Recorder()
    newSynth.connect(newRecorder)

    synth.current = newSynth
    recorder.current = newRecorder
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
      if (e.repeat) return
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
      const keyChar = e.key.toLowerCase()
      const note = activeKeyMap.current.get(keyChar)
      if (note) {
        stopNote(note)
        activeKeyMap.current.delete(keyChar)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", stopAllNotes)
    window.addEventListener("mouseup", stopAllNotes)
    window.addEventListener("mousedown", handleKeyDown)

    return () => {
      window.removeEventListener("blur", stopAllNotes)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("mouseup", stopAllNotes)
    }
  }, [isReady, baseOctave])

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
    if (e.type === "pointerdown") {
      e.preventDefault()
    }

    if (action === "down") playNote(note)
    if (action === "up") stopNote(note)
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl bg-zinc-900 border border-zinc-800 shadow-2xl rounded-xl">
        <CardHeader className="pb-3 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl font-semibold text-zinc-100 flex items-center gap-2">
              🎹 Studio 88
              {midiAccess && (
                <Badge className="bg-zinc-800 text-emerald-400 border border-zinc-700 text-xs">
                  <Cable className="w-3 h-3 mr-1" /> MIDI
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center gap-3">
              {!isReady && (
                <Button
                  onClick={initAudio}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Volume2 className="w-4 h-4 mr-2" /> Start Audio
                </Button>
              )}

              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-800 text-xs text-zinc-400 font-mono">
                <ArrowLeftRight className="w-3 h-3" />
                Octave: C{baseOctave}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex justify-between items-center bg-zinc-800 rounded-md px-4 py-2 border border-zinc-700">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isRecording ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                )}
              />
              <span className="text-xs font-semibold tracking-wide text-zinc-300">
                {isRecording ? "RECORDING" : "READY"}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                size="icon"
                onClick={toggleRecording}
                variant={isRecording ? "destructive" : "secondary"}
                className="h-8 w-8"
              >
                {isRecording ? <Square size={14} /> : <Mic size={14} />}
              </Button>

              {recordedUrl && (
                <Button size="icon" variant="outline" asChild className="h-8 w-8">
                  <a href={recordedUrl} download="session.webm">
                    <Download size={14} />
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="relative w-full h-36 sm:h-52 rounded-md overflow-hidden bg-zinc-700 border border-zinc-600 select-none">
            <div className="flex w-full h-full">
              {whiteKeys.map(k => (
                <div
                  key={k.note}
                  onPointerDown={e => handleKeyInteraction(e, k.note, "down")}
                  onPointerUp={e => handleKeyInteraction(e, k.note, "up")}
                  onPointerLeave={e => handleKeyInteraction(e, k.note, "up")}
                  className={cn(
                    "flex-1 relative cursor-pointer",
                    "bg-zinc-100 border-r border-zinc-300 first:border-l",
                    "shadow-[inset_0_-4px_6px_rgba(0,0,0,0.25)]",
                    "active:translate-y-px",
                    activeNotes.has(k.note) &&
                    "bg-indigo-300 shadow-[inset_0_0_10px_rgba(79,70,229,0.7)]"
                  )}
                >
                  {k.note.startsWith("C") && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-mono text-zinc-500">
                      {k.note}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="absolute inset-0 pointer-events-none">
              {blackKeys.map(k => {
                const w = 100 / 52
                return (
                  <div
                    key={k.note}
                    className="absolute top-0 h-[60%] pointer-events-auto"
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
                      className={cn(
                        "w-full h-full rounded-b-md cursor-pointer",
                        "bg-zinc-900 border border-black",
                        "shadow-[inset_0_-4px_6px_rgba(0,0,0,0.6)]",
                        activeNotes.has(k.note) &&
                        "bg-cyan-700 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                      )}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 text-xs text-zinc-400 font-mono bg-zinc-800 rounded-md p-2 border border-zinc-700">
            <div><b>Row Z-M</b> → C{baseOctave}</div>
            <div className="text-right"><b>Row Q-P</b> → C{baseOctave + 1}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

}