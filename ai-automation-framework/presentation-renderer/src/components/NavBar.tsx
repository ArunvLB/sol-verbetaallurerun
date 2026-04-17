import React from 'react'

interface NavBarProps {
  current: number
  total: number
  showNarration: boolean
  isFullscreen: boolean
  onPrev: () => void
  onNext: () => void
  onToggleNarration: () => void
  onToggleFullscreen: () => void
}

export default function NavBar({
  current, total, showNarration, isFullscreen,
  onPrev, onNext, onToggleNarration, onToggleFullscreen
}: NavBarProps) {
  return (
    <nav className="nav-bar">
      <div className="nav-left">
        <span className="nav-brand">🤖 AI Automation Framework</span>
      </div>
      <div className="nav-center">
        <button
          className="nav-btn"
          onClick={onPrev}
          disabled={current === 0}
          title="Previous (←)"
        >
          ← Prev
        </button>
        <span className="nav-slide-count">{current + 1} / {total}</span>
        <button
          className="nav-btn"
          onClick={onNext}
          disabled={current === total - 1}
          title="Next (→)"
        >
          Next →
        </button>
      </div>
      <div className="nav-right">
        <button
          className={`nav-btn small ${showNarration ? 'active' : ''}`}
          onClick={onToggleNarration}
          title="Toggle narration"
        >
          🎙️ Narration
        </button>
        <button
          className="nav-btn small"
          onClick={onToggleFullscreen}
          title="Toggle fullscreen"
        >
          {isFullscreen ? '⛶ Exit' : '⛶ Full'}
        </button>
      </div>
    </nav>
  )
}
