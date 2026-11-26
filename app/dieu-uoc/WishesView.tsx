"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { THEMES, THEME_KEYS, isThemeKey, type ThemeKey } from "@/lib/themes";
import { formatNo, splitWishTime } from "@/lib/wishMeta";
import AuthBridge from "@/components/AuthBridge";
import { ReportButton } from "@/components/ui/WishThread";
import PageShell from "@/components/ui/PageShell";
import Icon from "@/components/ui/Icon";
import Sparkles from "@/components/ui/Sparkles";
import SeDuyenCard from "@/components/ui/SeDuyenCard";
import Reactions, { useMyReactions } from "@/components/ui/Reactions";
import type { ReactionCounts } from "@/lib/reactions";

type Item = {
  id: string;
  no: number | null;
  text: string;
  theme: string;
  author: string | null;
  createdAt: number;
  commentCount: number;
  verified?: boolean;
  achieved?: boolean;
  reactions?: ReactionCounts;
};

type Filters = {
  theme: ThemeKey | null;
  q: string;
  date: string;
  sort: "new" | "old";
  page: number;
};

type Resp = {
  items: Item[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// Dãy số trang rút gọn: 1 … p-1 p p+1 … N (dùng số âm làm dấu "…").
function pageList(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: number[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) out.push(-1);
  for (let p = from; p <= to; p++) out.push(p);
  if (to < total - 1) out.push(-2);
  out.push(total);
  return out;
}

export default function WishesView() {
  const router = useRouter();
  const params = useSearchParams();

  const themeParam = params.get("theme");
  const theme: ThemeKey | null = isThemeKey(themeParam) ? themeParam : null;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const q = params.get("q") ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "")
    ? params.get("date")!
    : "";
  const sort: "new" | "old" = params.get("sort") === "old" ? "old" : "new";
  const cur: Filters = { theme, q, date, sort, page };

  const [qInput, setQInput] = useState(q);
  // mốc "hôm nay" cho dấu mộc: lấy 1 lần lúc mount (không đổi giữa các lần render)
  const [now] = useState(() => Date.now());

  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cập nhật URL (?theme=&q=&date=&sort=&page=) -> điều khiển dữ liệu + chia sẻ link + nút back.
  const go = useCallback(
    (f: Filters, replace = false) => {
      const u = new URLSearchParams();
      if (f.theme) u.set("theme", f.theme);
      if (f.q.trim()) u.set("q", f.q.trim());
      if (f.date) u.set("date", f.date);
      if (f.sort === "old") u.set("sort", "old");
      if (f.page > 1) u.set("page", String(f.page));
      const qs = u.toString();
      const url = qs ? `/dieu-uoc?${qs}` : "/dieu-uoc";
      // gõ tìm kiếm -> replace (không nhồi lịch sử, nút back vẫn về trang trước)
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router],
  );
  // đổi bộ lọc -> về trang 1
  const setFilter = (patch: Partial<Filters>, replace = false) =>
    go({ ...cur, page: 1, ...patch }, replace);
  const goPage = (p: number) => go({ ...cur, page: p });
  const hasFilter = Boolean(theme || q || date || sort === "old");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const u = new URLSearchParams({ page: String(page) });
    if (theme) u.set("theme", theme);
    if (q) u.set("q", q);
    if (date) u.set("date", date);
    if (sort === "old") u.set("sort", "old");
    fetch(`/api/wishes/list?${u.toString()}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!alive) return;
        if (ok && Array.isArray(body.items)) setData(body as Resp);
        else setError(body?.error ?? "Không tải được danh sách, thử lại nhé");
      })
      .catch(() => {
        if (alive) setError("Không tải được danh sách, thử lại nhé");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [theme, page, q, date, sort]);


  // Tìm ngay khi gõ (chờ 450ms ngừng gõ); URL đổi từ ngoài (back/bấm #số) -> đồng bộ lại ô nhập.
  useEffect(() => {
    if (qInput.trim() === q) return;
    const t = setTimeout(() => go({ theme, date, sort, page: 1, q: qInput }, true), 450);
    return () => clearTimeout(t);
  }, [qInput, q, theme, date, sort, go]);
  useEffect(() => {
    setQInput((v) => (v.trim() === q ? v : q));
  }, [q]);

  const dateRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  // chip chủ đề đang chọn luôn nằm trong tầm nhìn của dải cuộn ngang
  useEffect(() => {
    chipsRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [theme]);
  const clearAll = (
    <button
      type="button"
      className="wf-reset"
      onClick={() => {
        setQInput("");
        go({ theme: null, q: "", date: "", sort: "new", page: 1 });
      }}
    >
      <Icon name="x" size={14} />
      Bỏ lọc
    </button>
  );
  // Dải chủ đề: con lăn dọc -> cuộn ngang (chuột desktop), mũi tên ‹ › chỉ hiện khi còn chip bị khuất.
  const [edge, setEdge] = useState({ l: false, r: false });
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const upd = () =>
      setEdge({
        l: el.scrollLeft > 4,
        r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    upd();
    el.addEventListener("scroll", upd, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", upd);
    return () => {
      el.removeEventListener("scroll", upd);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", upd);
    };
  }, []);
  const nudge = (dir: 1 | -1) =>
    chipsRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });

  const dateLabel = date ? date.split("-").reverse().join("/") : "Ngày";

  const totalPages = data?.totalPages ?? 1;
  const [myRx, setMyRx] = useMyReactions(data?.items.map((w) => w.id) ?? []);

  return (
    <PageShell
      title="Tất cả điều ước"
      clock={false}
      skyTheme={theme}
    >
      <AuthBridge />

      {/* Bộ lọc gọn: 1 khung = ô tìm (tự tìm khi gõ) + Ngày + Mới/Cũ, dưới là dải chủ đề cuộn ngang. */}
      <div className="wf">
        <form
          className="wf-row"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter({ q: qInput });
          }}
        >
          <label className="wf-search">
            <Icon name="search" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Tìm #số hoặc từ khoá"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              aria-label="Tìm điều ước theo số hoặc từ khoá"
            />
            {qInput && (
              <button
                type="button"
                className="wf-clear"
                aria-label="Xoá từ khoá"
                onClick={() => {
                  setQInput("");
                  setFilter({ q: "" }, true);
                }}
              >
                <Icon name="x" size={15} />
              </button>
            )}
          </label>

          <span className={`wf-btn wf-date${date ? " on" : ""}`}>
            <button
              type="button"
              title="Lọc theo ngày gửi"
              onClick={() => {
                const el = dateRef.current;
                if (!el) return;
                try {
                  el.showPicker();
                } catch {
                  el.focus();
                }
              }}
            >
              <Icon name="calendar" size={16} />
              <span className="wf-lbl">{dateLabel}</span>
            </button>
            {date && (
              <button
                type="button"
                className="wf-x"
                aria-label="Bỏ lọc ngày"
                onClick={() => setFilter({ date: "" })}
              >
                <Icon name="x" size={13} />
              </button>
            )}
            <input
              ref={dateRef}
              type="date"
              tabIndex={-1}
              aria-hidden="true"
              value={date}
              onChange={(e) => setFilter({ date: e.target.value })}
            />
          </span>

          <button
            type="button"
            className={`wf-btn${sort === "old" ? " on" : ""}`}
            title="Đổi thứ tự"
            aria-label={`Thứ tự: ${sort === "old" ? "cũ nhất trước" : "mới nhất trước"}. Bấm để đổi`}
            onClick={() => setFilter({ sort: sort === "old" ? "new" : "old" })}
          >
            <Icon name="sort" size={16} />
            <span className="wf-lbl">{sort === "old" ? "Cũ nhất" : "Mới nhất"}</span>
          </button>
        </form>

        <div className={`wf-strip${edge.l ? " l" : ""}${edge.r ? " r" : ""}`}>
        {edge.l && (
          <button type="button" className="wf-arrow l" aria-label="Chủ đề trước" onClick={() => nudge(-1)}>
            <Icon name="back" size={16} />
          </button>
        )}
        <div className="wf-chips" ref={chipsRef} role="group" aria-label="Lọc theo chủ đề">
          <button
            className="wf-chip"
            aria-pressed={!theme}
            onClick={() => setFilter({ theme: null })}
          >
            Tất cả
          </button>
          {THEME_KEYS.map((k) => (
            <button
              key={k}
              className="wf-chip"
              aria-pressed={k === theme}
              style={{ "--c": THEMES[k].color } as React.CSSProperties}
              onClick={() => setFilter({ theme: k === theme ? null : k })}
            >
              <i />
              {THEMES[k].label}
            </button>
          ))}
        </div>
        {edge.r && (
          <button type="button" className="wf-arrow r" aria-label="Chủ đề tiếp" onClick={() => nudge(1)}>
            <Icon name="back" size={16} />
          </button>
        )}
        </div>
      </div>

      {theme === "yeu" && <SeDuyenCard />}

      {loading && <p className="pg-status">Đang tải điều ước…</p>}
      {error && <p className="pg-status err">{error}</p>}
      {!loading && !error && data && data.items.length === 0 && (
        <div className="pg-status">
          <p>
            {hasFilter
              ? "Không có điều ước nào khớp. Thử bỏ bớt bộ lọc hoặc đổi từ khoá."
              : "Chưa có điều ước nào. Ra cây và treo điều ước đầu tiên nhé."}
          </p>
          {hasFilter && clearAll}
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="wf-meta">
            <p className="pg-count">
              {data.total.toLocaleString("vi-VN")} điều ước
              {totalPages > 1 ? ` · trang ${page}/${totalPages}` : ""}
            </p>
            {hasFilter && clearAll}
          </div>
          <ol className="wl">
            {data.items.map((w) => {
              const tk = isThemeKey(w.theme) ? w.theme : null;
              const isSeed = w.id.startsWith("seed-");
              const fresh =
                w.createdAt > 0 && now - w.createdAt < 24 * 3600_000;
              const [day, time] = splitWishTime(w.createdAt);
              return (
                <li
                  key={w.id}
                  className={`tk${w.verified ? " tk-verified" : ""}`}
                  style={
                    {
                      "--tk-c": tk ? THEMES[tk].color : undefined,
                    } as React.CSSProperties
                  }
                >
                  {w.verified && <Sparkles glow={false} />}
                  <div className="tk-stub">
                    {w.no ? (
                      <button
                        className="tk-no"
                        title={`Chỉ xem điều ước ${formatNo(w.no)}`}
                        onClick={() => {
                          setQInput(`#${w.no}`);
                          setFilter({ q: `#${w.no}`, theme: null, date: "" });
                        }}
                      >
                        {formatNo(w.no)}
                      </button>
                    ) : null}
                    {day && (
                      <time
                        className="tk-date"
                        dateTime={new Date(w.createdAt).toISOString()}
                      >
                        {day}
                        <br />
                        {time}
                      </time>
                    )}
                    {w.achieved ? (
                      <span className="tk-stamp tk-done">Đã đạt</span>
                    ) : (
                      fresh && <span className="tk-stamp">Hôm nay</span>
                    )}
                  </div>
                  <div className="tk-body">
                    <p className="tk-text">{w.text}</p>
                    <div className="tk-meta">
                      <span className="tk-theme">
                        <i
                          className="pg-dot"
                          style={{
                            background: tk ? THEMES[tk].color : undefined,
                          }}
                        />
                        {tk ? THEMES[tk].label : w.theme}
                      </span>
                      <span
                        className={
                          w.verified && w.author ? "spk-name" : undefined
                        }
                      >
                        {w.author || "Ẩn danh"}
                      </span>
                    </div>
                    <div className="tk-rx">
                      <Reactions
                        compact
                        wishId={w.id}
                        counts={w.reactions}
                        mine={myRx[w.id]}
                        onMine={(m) => setMyRx((x) => ({ ...x, [w.id]: m }))}
                      />
                    </div>
                    {!isSeed && (
                      <div className="tk-actions">
                        {w.no ? (
                          <Link className="pg-act" href={`/dieu-uoc/${w.no}`}>
                            <Icon name="link" size={16} />
                            Mở trang · chia sẻ
                          </Link>
                        ) : null}
                        <ReportButton wishId={w.id} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {totalPages > 1 && (
            <nav className="pg-pager" aria-label="Phân trang">
              <button
                className="pg-btn"
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
                aria-label="Trang trước"
              >
                Trước
              </button>
              {pageList(page, totalPages).map((p, i) =>
                p < 0 ? (
                  <span key={`gap${i}`} className="pg-gap">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className="pg-btn num"
                    aria-current={p === page ? "page" : undefined}
                    onClick={() => goPage(p)}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                className="pg-btn"
                disabled={page >= totalPages}
                onClick={() => goPage(page + 1)}
                aria-label="Trang sau"
              >
                Sau
              </button>
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}
