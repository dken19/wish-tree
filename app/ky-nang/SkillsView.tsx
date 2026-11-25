"use client";
import { useState } from "react";
import { SKILL_CATEGORIES, type Skill } from "@/lib/skills";
import PageShell from "@/components/ui/PageShell";
import Icon from "@/components/ui/Icon";

// Mỗi kỹ năng là một "vé": cuống = thời gian + độ khó, thân = tên + mô tả; mở ra xem chi tiết.
function SkillTicket({ s, color }: { s: Skill; color: string }) {
  const [imgError, setImgError] = useState(false);
  return (
    <details className="sk">
      <summary
        className="tk"
        style={{ "--tk-c": color } as React.CSSProperties}
      >
        <div className="tk-stub">
          <span className="sk-time">{s.time}</span>
          <span className="tk-date">{s.level}</span>
        </div>
        <div className="tk-body">
          <div className="sk-title">
            {s.title}
            <Icon name="chev" />
          </div>
          <p className="sk-intro">{s.intro}</p>
        </div>
      </summary>
      <div className="sk-more">
        {!imgError && (
          <figure>
            {/* ảnh Wikimedia Commons; hỏng thì ẩn, không vỡ layout */}
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
        <h3>Cần chuẩn bị</h3>
        <ul>
          {s.need.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
        <h3>Các bước</h3>
        <ol>
          {s.steps.map((st, i) => (
            <li key={i}>{st}</li>
          ))}
        </ol>
        <p className="sk-tip">
          <Icon name="bulb" />
          <span>{s.tip}</span>
        </p>
        <a
          className="pg-btn ghost sk-src"
          href={s.source.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="ext" size={16} />
          Đọc thêm: {s.source.label}
        </a>
      </div>
    </details>
  );
}

const CAT_COLOR: Record<string, string> = {
  nau: "#d6243a",
  trong: "#3f9d6b",
  chup: "#2f6fd6",
  da: "#c98a1b",
};

export default function SkillsView() {
  const [cat, setCat] = useState(SKILL_CATEGORIES[0].key);
  const active =
    SKILL_CATEGORIES.find((c) => c.key === cat) ?? SKILL_CATEGORIES[0];

  return (
    <PageShell
      title="Kỹ năng sống"
      lead="Nấu ăn, trồng rau, chụp ảnh, chăm sóc da: những việc nhỏ để tự lo cho mình."
    >
      <div className="pg-chips" role="group" aria-label="Chọn nhóm kỹ năng">
        {SKILL_CATEGORIES.map((c) => (
          <button
            key={c.key}
            className="pg-chip"
            aria-pressed={c.key === cat}
            onClick={() => setCat(c.key)}
          >
            <i className="pg-dot" style={{ background: CAT_COLOR[c.key] }} />
            {c.label}
          </button>
        ))}
      </div>

      <p className="sk-blurb">{active.blurb}</p>

      <div className="wl">
        {active.skills.map((s) => (
          <SkillTicket key={s.id} s={s} color={CAT_COLOR[active.key]} />
        ))}
      </div>

      <p className="sk-foot">Mỗi tuần thử một kỹ năng, làm chậm cũng được.</p>
    </PageShell>
  );
}
