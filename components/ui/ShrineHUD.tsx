"use client";
import { useEffect, useRef, useState } from "react";
import { useScene } from "@/store/useScene";
import {
  BLESSINGS,
  BOWS_NEEDED,
  BUFF_MINUTES,
  drawBlessing,
  loadBlessing,
  saveBlessing,
  vnDayKey,
  type BlessingRecord,
} from "@/lib/blessings";
import Icon from "./Icon";

// Tiếng chuông chùa ngắn (WebAudio, vài hoạ âm tắt dần) — không cần file âm thanh.
function bell() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const now = ac.currentTime;
    for (const [f, v, d] of [
      [392, 0.22, 2.6],
      [588, 0.1, 1.8],
      [1083, 0.05, 1.1],
    ] as const) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(v, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + d);
      o.connect(g);
      g.connect(ac.destination);
      o.start(now);
      o.stop(now + d + 0.05);
    }
    setTimeout(() => ac.close(), 3000);
  } catch {
    /* trình duyệt chặn audio: bỏ qua */
  }
}

const BOW_MS = 1100;

// Bảng bàn thờ (phòng Rừng Trúc): vái đủ 3 lần -> 1 lời chúc/ngày + buff chúc phúc 60 phút (hiệu ứng).
export default function ShrineHUD() {
  const roomOpen = useScene((s) => s.roomOpen);
  const shrineOpen = useScene((s) => s.shrineOpen);
  const setShrineOpen = useScene((s) => s.setShrineOpen);
  const bow = useScene((s) => s.bow);
  const blessedUntil = useScene((s) => s.blessedUntil);
  const setBlessedUntil = useScene((s) => s.setBlessedUntil);
  const showToast = useScene((s) => s.showToast);
  const nearShrine = useScene((s) => s.nearShrine);

  const [rec, setRec] = useState<BlessingRecord | null>(null);
  const [bows, setBows] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState(false); // vừa rút xong -> hiệu ứng mở thẻ
  const [now, setNow] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // nạp lời chúc đã nhận (localStorage) 1 lần; còn hạn thì bật lại buff
  useEffect(() => {
    const r = loadBlessing();
    if (!r) return;
    queueMicrotask(() => setRec(r));
    if (r.until > Date.now()) setBlessedUntil(r.until);
  }, [setBlessedUntil]);

  // lần đầu vào phòng: chỉ cách đi lại
  useEffect(() => {
    if (!roomOpen) return;
    try {
      if (localStorage.getItem("wish-tree:walk-hint")) return;
      localStorage.setItem("wish-tree:walk-hint", "1");
    } catch {
      return;
    }
    const id = setTimeout(
      () =>
        showToast(
          "Chạm xuống đất để đi dạo (máy tính: phím WASD). Bấm vào tượng đá để vái.",
        ),
      1500,
    );
    return () => clearTimeout(id);
  }, [roomOpen, showToast]);

  // đồng hồ phút còn lại (chỉ chạy khi bảng mở)
  useEffect(() => {
    if (!shrineOpen) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [shrineOpen]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!roomOpen) return null;

  const today = rec && now > 0 && rec.day === vnDayKey(now) ? rec : null;
  const blessing = today ? BLESSINGS[today.idx] : null;
  const minsLeft =
    blessedUntil > now ? Math.ceil((blessedUntil - now) / 60_000) : 0;

  function onBow() {
    if (busy || today) return;
    bow();
    bell();
    const n = bows + 1;
    setBows(n);
    setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      if (n >= BOWS_NEEDED) {
        const r = drawBlessing();
        saveBlessing(r);
        setRec(r);
        setFresh(true);
        setBows(0);
        setNow(Date.now());
        setBlessedUntil(r.until);
        showToast(`Bạn được chúc phúc trong ${BUFF_MINUTES} phút.`);
      }
    }, BOW_MS);
  }

  return (
    <>
      {nearShrine && !shrineOpen && (
        <button className="sh-near" onClick={() => setShrineOpen(true)}>
          <Icon name="lantern" size={18} />
          Vái tượng
        </button>
      )}
      <section
        className={`shrine-hud${shrineOpen ? " show" : ""}${fresh ? " fresh" : ""}`}
        aria-label="Bàn thờ đá"
        aria-hidden={!shrineOpen}
      >
        <div className="sh-top">
          <h2>Bàn thờ trong rừng trúc</h2>
          <button
            className="fh-icon"
            onClick={() => setShrineOpen(false)}
            aria-label="Rời bàn thờ"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {blessing ? (
          <>
            <div className="sh-card" role="status">
              <span className="sh-card-day">Lời chúc hôm nay</span>
              <b>{blessing.title}</b>
              <p>{blessing.text}</p>
            </div>
            <p className="sh-note">
              {minsLeft > 0
                ? `Bạn đang được chúc phúc, còn ${minsLeft} phút. Hạt sáng vàng quanh avatar của bạn là dấu hiệu.`
                : "Mỗi ngày nhận một lời chúc. Mai quay lại vái tiếp nhé."}
            </p>
            <button
              className="pomo-go sh-wide"
              onClick={() => setShrineOpen(false)}
            >
              Về chỗ ngồi ôn bài
            </button>
          </>
        ) : (
          <>
            <p className="sh-note">
              Chắp tay, vái đủ 3 lần để nhận một lời chúc cho hôm nay.
            </p>
            <ol
              className="sh-steps"
              aria-label={`Đã vái ${bows} trên ${BOWS_NEEDED} lần`}
            >
              {Array.from({ length: BOWS_NEEDED }, (_, i) => (
                <li key={i} className={i < bows ? "done" : ""}>
                  <i aria-hidden="true" />
                  Lần {i + 1}
                </li>
              ))}
            </ol>
            <button
              className="pomo-go sh-wide sh-bow"
              onClick={onBow}
              disabled={busy}
            >
              {busy ? "Đang vái…" : bows === 0 ? "Vái" : `Vái lần ${bows + 1}`}
            </button>
          </>
        )}
      </section>
    </>
  );
}
