'use client'
import { useState } from 'react'
import Link from 'next/link'
import { SKILL_CATEGORIES, type Skill } from '@/lib/skills'

function SkillCard({ s }: { s: Skill }) {
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  return (
    <div className={`skill-card${open ? ' open' : ''}`}>
      <button className="skill-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="skill-emoji">{s.emoji}</span>
        <span className="skill-headtext">
          <b>{s.title}</b>
          <i>{s.intro}</i>
        </span>
        <span className="skill-meta">
          <span className="skill-time">⏱ {s.time}</span>
          <span className={`skill-level ${s.level === 'Dễ' ? 'easy' : 'mid'}`}>{s.level}</span>
        </span>
        <span className="skill-chev" aria-hidden>
          ⌄
        </span>
      </button>

      <div className="skill-body">
        <div className="skill-bodyin">
          {!imgError && (
            <figure className="skill-figure">
              {/* ảnh từ Wikimedia Commons (ổn định); hỏng thì tự ẩn, không vỡ layout */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.img}
                alt={s.imgAlt}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            </figure>
          )}
          <div className="skill-need">
            <h4>Cần chuẩn bị</h4>
            <ul>
              {s.need.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
          <div className="skill-steps">
            <h4>Các bước</h4>
            <ol>
              {s.steps.map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
          </div>
          <p className="skill-tip">💡 {s.tip}</p>
          <a
            className="skill-source"
            href={s.source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Nguồn tham khảo: {s.source.label} ↗
          </a>
        </div>
      </div>
    </div>
  )
}

export default function SkillsView() {
  const [cat, setCat] = useState(SKILL_CATEGORIES[0].key)
  const active = SKILL_CATEGORIES.find((c) => c.key === cat) ?? SKILL_CATEGORIES[0]

  return (
    <div className="skills-page">
      <div className="skills-inner">
        <Link href="/" className="skills-back">
          ← Về cây ước nguyện
        </Link>

        <header className="skills-hero">
          <h1>Kỹ năng sống 🌿</h1>
          <p>
            Vài kỹ năng <b>nấu nướng</b> và <b>trồng trọt</b> cơ bản để tự lo cho mình — làm
            được hết, từ từ thôi.
          </p>
        </header>

        <div className="skills-tabs">
          {SKILL_CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`skills-tab${c.key === cat ? ' on' : ''}`}
              onClick={() => setCat(c.key)}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>

        <p className="skills-blurb">{active.blurb}</p>

        <div className="skills-list">
          {active.skills.map((s) => (
            <SkillCard key={s.id} s={s} />
          ))}
        </div>

        <footer className="skills-foot">
          Học một kỹ năng mới mỗi tuần, một ngày nào đó bạn sẽ tự nấu được cả mâm cơm 🍚
        </footer>
      </div>
    </div>
  )
}
