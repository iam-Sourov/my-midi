import MidiKeyboard from "@/components/keyboard/MidiKeyboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-8 sm:py-16">
      <section className="w-full max-w-6xl space-y-10">
        <header className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-zinc-100">
            Web Audio Synthesizer
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            A modern browser-based piano built with real-time audio, MIDI support,
            and professional-grade interaction.
          </p>
        </header>
        <div className="w-full">
          <MidiKeyboard />
        </div>
        <footer className="text-center space-y-2 pt-6 border-t border-zinc-800">
          <p className="text-xs sm:text-sm text-zinc-500">
            Built with{" "}
            <span className="text-zinc-300 font-medium">Next.js</span>,{" "}
            <span className="text-zinc-300 font-medium">Tone.js</span> &{" "}
            <span className="text-zinc-300 font-medium">shadcn/ui</span>
          </p>
          <p className="text-[11px] text-zinc-600">
            Use your keyboard, mouse, or MIDI controller
          </p>
        </footer>
      </section>
    </main>
  );
}
