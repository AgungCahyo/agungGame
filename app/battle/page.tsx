import Link from 'next/link'
import PhaserGame from '@/components/PhaserGame'

export default function BattlePage() {
  return (
    <main className="min-h-screen text-white flex flex-col items-center justify-center px-4 py-6 sm:py-10 bg-grid-cyber select-none relative scanline gap-6 z-20">
      
      {/* Visual Header */}
      <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-xl px-6 py-4 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-rose-900/10 pointer-events-none" />
        <p className="text-[10px] tracking-[0.45em] text-cyan-400 font-mono uppercase font-black">PHASER ENGINE ARENA</p>
        <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400">
          SPRITE DUEL — ACTION FIGHT
        </h1>
        <p className="text-slate-400 text-xs mt-1.5">
          Kontrol karakter secara langsung di arena fisik 2D dengan kecerdasan buatan musuh.
        </p>
      </div>

      {/* Phaser Canvas Container */}
      <div className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-slate-950/50 p-2 sm:p-3 shadow-2xl backdrop-blur-xl relative">
        <div className="absolute -top-3 left-6 px-3 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono text-[9px] font-black tracking-widest uppercase">
          LIVE CABINET FEED
        </div>
        <PhaserGame className="rounded-[22px] overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Keyboard Interactive Controls panel */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch font-mono text-xs text-slate-400">
        
        {/* Movement Column */}
        <div className="md:col-span-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4 backdrop-blur-md">
          <h3 className="text-[10px] text-white font-bold tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            MOVEMENT HINTS
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>MOVE LEFT / RIGHT</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">A</kbd>
                <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">D</kbd>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>JUMP</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">W</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>RUN MODIFIER</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">SHIFT</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>DASH ACTION</span>
              <kbd className="px-2.5 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">SPACE</kbd>
            </div>
          </div>
        </div>

        {/* Combat Attacks Column */}
        <div className="md:col-span-5 rounded-2xl border border-white/5 bg-slate-950/40 p-4 backdrop-blur-md">
          <h3 className="text-[10px] text-white font-bold tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            ATTACKS & ABILITIES
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>LIGHT SLASH (ATTACK 1)</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">J</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>MEDIUM STRIKE (ATTACK 2)</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">K</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>HEAVY THRUST (ATTACK 3)</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">L</kbd>
            </div>
            <div className="flex justify-between items-center text-purple-300 font-bold">
              <span>SPECIAL ULTIMATE SKILL</span>
              <kbd className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-bold">F</kbd>
            </div>
          </div>
        </div>

        {/* Defensive & HUD Column */}
        <div className="md:col-span-3 rounded-2xl border border-white/5 bg-slate-950/40 p-4 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] text-white font-bold tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              SHIELD BLOCK
            </h3>
            <div className="flex justify-between items-center mb-4">
              <span>GUARD SHIELD</span>
              <kbd className="px-2 py-0.5 bg-slate-800 text-white rounded text-[10px] font-bold">S</kbd>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 leading-relaxed border-t border-white/5 pt-2">
            <span className="text-rose-400 font-bold">TIPS:</span> Menahan <kbd className="px-1 py-0.2 bg-slate-950 text-slate-400 rounded text-[9px]">S</kbd> memblokir serangan, namun menguras Guard Stamina. Jika habis, guard break stagger terpicu!
          </div>
        </div>
      </div>

      {/* Return button */}
      <Link
        href="/"
        className="px-4 py-2 rounded-xl border border-white/10 bg-slate-950/20 text-xs text-slate-400 hover:text-cyan-400 hover:bg-slate-950/60 hover:border-cyan-400/30 transition-all font-semibold font-mono"
      >
        ← KEMBALI KE REACT PROTOTYPE MODE
      </Link>
    </main>
  )
}
