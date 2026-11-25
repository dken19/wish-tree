"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { THEMES, THEME_KEYS, isThemeKey, type ThemeKey } from "@/lib/themes";
import { formatNo, formatWishTime } from "@/lib/wishMeta";
import AuthBridge from "@/components/AuthBridge";
import WishThread, { ReportButton } from "@/components/ui/WishThread";
import PageShell from "@/components/ui/PageShell";
import Icon from "@/components/ui/Icon";

type Item = {
  id: string;
  no: number | null;
  text: string;
  theme: string;
  author: string | null;
  createdAt: number;
  commentCount: number;
};

/** "25/11/2026 16:14" -> ["25/11/2026", "16:14"] (giờ Việt Nam). */
function splitTime(ms: number): [string, string] {
  const t = formatWishTime(ms);
  if (!t) return ["", ""];
  const parts = t.split(/,?\s+/);
  // vi-VN có thể trả "16:14 25/11/2026" hoặc "25/11/2026, 16:14"
  const time = parts.find((x) => x.includes(":")) ?? "";
  const day = parts.find((x) => x.includes("/")) ?? "";
  return [day, time];
}

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
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  // mốc "hôm nay" cho dấu mộc: lấy 1 lần lúc mount (không đổi giữa các lần render)
  const [now] = useState(() => Date.now());

  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cập nhật URL (?theme=&q=&date=&sort=&page=) -> điều khiển dữ liệu + chia sẻ link + nút back.
  const go = useCallback(
    (f: Filters) => {
      const u = new URLSearchParams();
      if (f.theme) u.set("theme", f.theme);
      if (f.q.trim()) u.set("q", f.q.trim());
      if (f.date) u.set("date", f.date);
      if (f.sort === "old") u.set("sort", "old");
      if (f.page > 1) u.set("page", String(f.page));
      const qs = u.toString();
      router.push(qs ? `/dieu-uoc?${qs}` : "/dieu-uoc");
    },
    [router],
  );
  // đổi bộ lọc -> về trang 1
  const setFilter = (patch: Partial<Filters>) =>
    go({ ...cur, page: 1, ...patch });
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

  // Số điều ước đang treo + đang chờ duyệt (người gửi ẩn danh biết ước của mình đang được duyệt)
  const [stats, setStats] = useState<{
    approved: number;
    pending: number;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/wishes/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (
          alive &&
          j &&
          typeof j.approved === "number" &&
          typeof j.pending === "number"
        )
          setStats({ approved: j.approved, pending: j.pending });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const totalPages = data?.totalPages ?? 1;

  return (
    <PageShell
      title="Tất cả điều ước"
      lead="Những điều ước đã treo lên cây. Tìm theo số hoặc từ khoá, lọc theo chủ đề và ngày gửi."
      stats={
        stats && (
          <dl className="pg-stats">
            <div>
              <dt>đang treo trên cây</dt>
              <dd>{stats.approved.toLocaleString("vi-VN")}</dd>
            </div>
            <div>
              <dt>đang chờ duyệt</dt>
              <dd>{stats.pending.toLocaleString("vi-VN")}</dd>
            </div>
          </dl>
        )
      }
    >
      <AuthBridge />

      <form
        className="pg-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter({ q: qInput });
        }}
      >
        <Icon name="search" />
        <input
          type="search"
          inputMode="search"
          placeholder="Số #888, hoặc từ khoá như thi, mẹ, Hà Nội"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          aria-label="Tìm điều ước"
        />
        <button type="submit" className="pg-btn primary">
          Tìm
        </button>
      </form>

      <div className="pg-tools">
        <label>
          Ngày
          <input
            type="date"
            value={date}
            onChange={(e) => setFilter({ date: e.target.value })}
          />
        </label>
        <label>
          <select
            aria-label="Thứ tự"
            value={sort}
            onChange={(e) =>
              setFilter({ sort: e.target.value === "old" ? "old" : "new" })
            }
          >
            <option value="new">Mới nhất</option>
            <option value="old">Cũ nhất</option>
          </select>
        </label>
        {hasFilter && (
          <button
            className="pg-btn ghost"
            onClick={() => {
              setQInput("");
              go({ theme: null, q: "", date: "", sort: "new", page: 1 });
            }}
          >
            <Icon name="x" size={16} />
            Bỏ lọc
          </button>
        )}
      </div>

      <div className="pg-chips" role="group" aria-label="Lọc theo chủ đề">
        <button
          className="pg-chip"
          aria-pressed={!theme}
          onClick={() => setFilter({ theme: null })}
        >
          Tất cả chủ đề
        </button>
        {THEME_KEYS.map((k) => (
          <button
            key={k}
            className="pg-chip"
            aria-pressed={k === theme}
            onClick={() => setFilter({ theme: k })}
          >
            <i className="pg-dot" style={{ background: THEMES[k].color }} />
            {THEMES[k].label}
          </button>
        ))}
      </div>

      {loading && <p className="pg-status">Đang tải điều ước…</p>}
      {error && <p className="pg-status err">{error}</p>}
      {!loading && !error && data && data.items.length === 0 && (
        <p className="pg-status">
          {hasFilter
            ? "Không có điều ước nào khớp. Thử bỏ bớt bộ lọc hoặc đổi từ khoá."
            : "Chưa có điều ước nào. Ra cây và treo điều ước đầu tiên nhé."}
        </p>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <p className="pg-count">
            {data.total.toLocaleString("vi-VN")} điều ước
            {totalPages > 1 ? `, trang ${page} trên ${totalPages}` : ""}
          </p>
          <ol className="wl">
            {data.items.map((w) => {
              const tk = isThemeKey(w.theme) ? w.theme : null;
              const open = openThread === w.id;
              const n = counts[w.id] ?? w.commentCount;
              const isSeed = w.id.startsWith("seed-");
              const fresh =
                w.createdAt > 0 && now - w.createdAt < 24 * 3600_000;
              const [day, time] = splitTime(w.createdAt);
              return (
                <li
                  key={w.id}
                  className="tk"
                  style={
                    {
                      "--tk-c": tk ? THEMES[tk].color : undefined,
                    } as React.CSSProperties
                  }
                >
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
                    {fresh && <span className="tk-stamp">Hôm nay</span>}
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
                      {w.author && <span>{w.author}</span>}
                    </div>
                    {!isSeed && (
                      <div className="tk-actions">
                        <button
                          className="pg-act"
                          onClick={() => setOpenThread(open ? null : w.id)}
                          aria-expanded={open}
                        >
                          <Icon name="comment" size={16} />
                          {n > 0 ? `${n} bình luận` : "Bình luận"}
                        </button>
                        <ReportButton wishId={w.id} />
                      </div>
                    )}
                    {open && (
                      <WishThread
                        wishId={w.id}
                        onCount={(c) => setCounts((m) => ({ ...m, [w.id]: c }))}
                      />
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
