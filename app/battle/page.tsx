import Link from 'next/link'
import PhaserGame from '@/components/PhaserGame'

export default function BattlePage() {
  return (
    <main className="min-h-screen bg-[#0B0D10] text-white flex flex-col items-center justify-center px-4 py-10 gap-6">
      <div className="text-center space-y-1">
        <p className="text-xs tracking-[0.3em] text-white/40 font-mono uppercase">Sprite Duel</p>
        <h1 className="text-2xl font-semibold">Battle — Phaser</h1>
        <p className="text-white/40 text-sm">Tahap 9–10: UI lengkap, character select, polish VFX &amp; audio.</p>
      </div>

      <PhaserGame className="rounded-xl overflow-hidden border border-white/10 shadow-2xl" />

      <Link
        href="/"
        className="text-xs text-white/30 hover:text-white/60 transition-colors font-mono"
      >
        ← Kembali ke prototype React
      </Link>
    </main>
  )
}
