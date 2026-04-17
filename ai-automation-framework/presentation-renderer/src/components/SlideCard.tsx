import React, { useEffect, useRef, useState } from 'react'
import { DesignedSlide, SlideNarration, badgeColor } from '../types'

interface SlideCardProps {
  slide: DesignedSlide
  narration?: SlideNarration
  total: number
  showNarration: boolean
  audioUrl?: string | null
}

export default function SlideCard({ slide, narration, total, showNarration, audioUrl }: SlideCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  // Auto-play narration whenever the slide or audio changes (if narration is shown)
  useEffect(() => {
    if (!audioRef.current) {
      setPlaying(false)
      return
    }

    audioRef.current.pause()
    audioRef.current.currentTime = 0
    setPlaying(false)

    if (showNarration && audioUrl) {
      const promise = audioRef.current.play()
      if (promise && typeof promise.then === 'function') {
        promise
          .then(() => setPlaying(true))
          .catch(() => setPlaying(false)) // autoplay might be blocked by browser policy
      } else {
        setPlaying(true)
      }
    }
  }, [audioUrl, slide.index, showNarration])

  const hasMedia = slide.media && slide.media.length > 0
  const hasBullets = slide.bullets && slide.bullets.filter(Boolean).length > 0

  return (
    <div className="slide-card">
      {/* Badge */}
      {slide.badge && (
        <span className="slide-badge" style={{ background: badgeColor(slide.badge) }}>
          {slide.badge}
        </span>
      )}

      {/* Progress */}
      <div className="slide-progress-label">Slide {slide.index + 1} of {total}</div>

      {/* Title */}
      <h1 className="slide-title">{slide.title}</h1>
      <div className="slide-divider" />

      {/* Content Area */}
      <div className={`slide-body ${hasMedia ? 'has-media' : ''}`}>
        {/* Bullets */}
        {hasBullets && (
          <ul className="slide-bullets">
            {slide.bullets.filter(Boolean).map((b, i) => (
              <li key={i} className="slide-bullet">
                <span className="bullet-dot" />
                {b}
              </li>
            ))}
          </ul>
        )}

        {/* Media panel */}
        {hasMedia && (
          <div className="slide-media-panel">
            {slide.media.slice(0, 2).map((m, i) => {
              const filename = m.replace(/\\/g, '/').split('/').pop() || ''
              return (
                <div key={i} className="slide-image-wrap">
                  <img
                    src={`/screenshots/${filename}`}
                    alt={`Screenshot ${i + 1}`}
                    className="slide-image"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Narration + Audio */}
      {showNarration && narration && (
        <div className="slide-narration">
          <div className="narration-header">
            <span className="narration-icon">🎙️</span>
            {audioUrl && (
              <button
                className="audio-play-btn"
                onClick={toggleAudio}
                title={playing ? 'Pause narration' : 'Play narration'}
              >
                {playing ? '⏸ Pause' : '▶ Resume'}
              </button>
            )}
          </div>
          <p className="narration-text">"{narration.narration}"</p>
          {narration.transition && (
            <p className="narration-transition">⏭ {narration.transition}</p>
          )}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              style={{ display: 'none' }}
            />
          )}
        </div>
      )}
    </div>
  )
}
