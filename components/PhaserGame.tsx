'use client'

import { useEffect, useRef } from 'react'
import type Phaser from 'phaser'

type PhaserGameProps = {
  className?: string
}

export default function PhaserGame({ className }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || gameRef.current) return

    let cancelled = false

    import('@/game/main').then(({ createGame }) => {
      if (cancelled || !containerRef.current) return
      gameRef.current = createGame(containerRef.current)
    })

    return () => {
      cancelled = true
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', maxWidth: 960, aspectRatio: '16 / 9' }}
    />
  )
}
