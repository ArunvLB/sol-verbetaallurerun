import React from 'react'
import { DesignedSlide, badgeColor } from '../types'

interface SidebarProps {
  slides: DesignedSlide[]
  current: number
  onJump: (index: number) => void
}

export default function Sidebar({ slides, current, onJump }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">📊</span>
        <span className="sidebar-title">AI Report</span>
      </div>
      <div className="sidebar-progress-bar">
        <div
          className="sidebar-progress-fill"
          style={{ width: `${((current + 1) / slides.length) * 100}%` }}
        />
      </div>
      <p className="sidebar-progress-label">{current + 1} / {slides.length} slides</p>
      <div className="sidebar-slides">
        {slides.map((slide) => (
          <button
            key={slide.index}
            className={`sidebar-thumb ${slide.index === current ? 'active' : ''}`}
            onClick={() => onJump(slide.index)}
          >
            <span
              className="thumb-badge"
              style={{ background: badgeColor(slide.badge) }}
            />
            <div className="thumb-meta">
              <span className="thumb-number">#{slide.index + 1}</span>
              <span className="thumb-name">{slide.title}</span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
