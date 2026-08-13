import MidiKeyboard from "@/components/keyboard/MidiKeyboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500/30">
      <MidiKeyboard />
    </main>
  );
}

