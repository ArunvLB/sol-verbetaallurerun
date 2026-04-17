import React, { useEffect, useState, useCallback, useRef } from 'react'
import SlideCard from './components/SlideCard'
import Sidebar from './components/Sidebar'
import NavBar from './components/NavBar'
import { DesignedSlide, SlideNarration } from './types'
import './App.css'

interface AudioEntry { index: number; audioUrl: string | null }
interface AudioManifest { slides: AudioEntry[] }

export default function App() {
  const [slides, setSlides] = useState<DesignedSlide[]>([])
  const [narrations, setNarrations] = useState<SlideNarration[]>([])
  const [audioManifest, setAudioManifest] = useState<AudioManifest | null>(null)
  const [current, setCurrent] = useState(0)
  const [showNarration, setShowNarration] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)
  const appRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/slides').then(r => r.json()),
      fetch('/api/narration').then(r => r.json()),
      fetch('/api/audio').then(r => r.json()).catch(() => null),
    ])
      .then(([s, n, a]) => {
        if (Array.isArray(s) && s.length) {
          setSlides(s)
          setNarrations(Array.isArray(n) ? n : [])
          if (a && a.slides) setAudioManifest(a)
        } else {
          setError('No slides found. Run the automation framework first:\nnpm run run-all -- --url="https://your-website.com"')
        }
      })
      .catch(() => setError('Failed to connect to API server.\nMake sure `npm run present-ui` is running.'))
      .finally(() => setLoading(false))
  }, [])

  const goTo = useCallback((index: number) => {
    if (animating || index === current) return
    setAnimating(true)
    setTimeout(() => {
      setCurrent(index)
      setAnimating(false)
    }, 200)
  }, [animating, current])

  const goNext = useCallback(() => {
    if (current < slides.length - 1) goTo(current + 1)
  }, [current, slides.length, goTo])

  const goPrev = useCallback(() => {
    if (current > 0) goTo(current - 1)
  }, [current, goTo])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      if (e.key === 'n' || e.key === 'N') setShowNarration(v => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      appRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  const currentSlide = slides[current]
  const currentNarration = narrations.find(n => n.index === current)
  const currentAudio = audioManifest?.slides?.find(a => a.index === current)?.audioUrl ?? null

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Loading presentation data...</p>
    </div>
  )

  if (error) return (
    <div className="error-screen">
      <span className="error-icon">⚠️</span>
      <h2>Presentation not ready</h2>
      <pre>{error}</pre>
    </div>
  )

  return (
    <div className="app" ref={appRef}>
      <NavBar
        current={current}
        total={slides.length}
        showNarration={showNarration}
        isFullscreen={isFullscreen}
        onPrev={goPrev}
        onNext={goNext}
        onToggleNarration={() => setShowNarration(v => !v)}
        onToggleFullscreen={toggleFullscreen}
      />
      <div className="main-layout">
        <Sidebar slides={slides} current={current} onJump={goTo} />
        <main className="slide-area">
          <div className={`slide-wrapper ${animating ? 'fade-out' : 'fade-in'}`}>
            {currentSlide && (
              <SlideCard
                slide={currentSlide}
                narration={currentNarration}
                total={slides.length}
                showNarration={showNarration}
                audioUrl={currentAudio}
              />
            )}
          </div>
          {/* Bottom nav buttons */}
          <div className="bottom-nav">
            <button className="nav-arrow" onClick={goPrev} disabled={current === 0}>‹</button>
            <div className="dot-indicators">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`dot ${i === current ? 'active' : ''}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <button className="nav-arrow" onClick={goNext} disabled={current === slides.length - 1}>›</button>
          </div>
        </main>
      </div>
    </div>
  )
}
