'use client'

import { useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'

type PhaserGameProps = {
  className?: string
}

export default function PhaserGame({ className }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || gameRef.current) return

    let cancelled = false

    import('@/game/main').then(({ createGame }) => {
      if (cancelled || !containerRef.current) return
      gameRef.current = createGame(containerRef.current)
      setIsReady(true)
    })

    return () => {
      cancelled = true
      gameRef.current?.destroy(true)
      gameRef.current = null
      setIsReady(false)
    }
  }, [])

  return (
    <div className={`relative w-full max-w-5xl aspect-video overflow-hidden rounded-[24px] bg-[#06070d] ${className ?? ''}`}>
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.2),transparent_55%),linear-gradient(135deg,#06070d,#10172a)] text-sm text-white/70 font-mono">
          Memuat arena battle...
        </div>
      )}
    </div>
  )
}
