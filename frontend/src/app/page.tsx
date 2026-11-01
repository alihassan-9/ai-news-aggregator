'use client';

import { useState, useEffect, useCallback } from 'react';
import { Article, Stats } from '@/types';
import { fetchArticles, fetchStats, triggerIngest } from '@/lib/api';

// ─── Sentiment Ring — large, text inside, upright SVG ────────────────────────
function SentimentRing({ posP, negP, neuP, total }: {
  posP: number; negP: number; neuP: number; total: number;
}) {
  const sz = 180, cx = 90, cy = 90, R = 72, sw = 8;
  const C = 2 * Math.PI * R;
  const GAP = 4; // degrees gap between segments
  const segs = [
    { pct: posP, color: '#10B981' },
    { pct: negP, color: '#F59E0B' },
    { pct: neuP, color: '#6366F1' },
  ];
  let cumDeg = 0;

  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={R} fill="none"
        stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
      {segs.map(({ pct, color }, i) => {
        const segDeg  = (pct / 100) * 360;
        const dashLen = Math.max(0, ((segDeg - GAP) / 360) * C);
        const rot     = cumDeg;
        cumDeg += segDeg;
        if (dashLen <= 0) return null;
        return (
          <circle key={i} cx={cx} cy={cy} r={R}
            fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={`${dashLen} ${C}`}
            strokeDashoffset={C / 4}
            transform={`rotate(${rot}, ${cx}, ${cy})`}
            className="ring-seg" />
        );
      })}
      {/* Center: total number */}
      <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="middle"
        fill="#EFEFEF" fontSize="40" fontWeight="200"
        style={{ letterSpacing: '-2px', fontFamily: 'var(--font-geist-sans)' }}>
        {total.toLocaleString()}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle"
        fill="#4A4A52" fontSize="9" fontWeight="700"
        style={{ letterSpacing: '3px', fontFamily: 'var(--font-geist-sans)', textTransform: 'uppercase' }}>
        ARTICLES
      </text>
    </svg>
  );
}

// ─── Smooth Sparkline (SVG) ───────────────────────────────────────────────────
function Sparkline({ data, color = '#00E5FF', w = 140, h = 36 }: {
  data: number[]; color?: string; w?: number; h?: number;
}) {
  if (data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data);
  const range = (mx - mn) || 1;
  const pad = 4;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + (1 - (v - mn) / range) * (h - pad * 2),
  }));

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cpx} ${pts[i - 1].y} ${cpx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  const fill = `${d} L ${pts[pts.length-1].x} ${h} L ${pts[0].x} ${h} Z`;
  const uid = `sg${color.replace('#','')}`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" className="spark-line" />
    </svg>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────
function ArticleCard({ article, idx }: { article: Article; idx: number }) {
  const [imgErr, setImgErr] = useState(false);

  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      })
    : null;

  const sentimentDot: Record<string, string> = {
    positive: '#10B981',
    negative: '#F59E0B',
    neutral:  '#6366F1',
  };
  const dotColor = sentimentDot[article.sentiment ?? ''] ?? 'rgba(255,255,255,0.15)';

  return (
    <article
      className={`anim-up d-${idx % 12} glass card-lift rounded-2xl overflow-hidden flex flex-col group`}
      style={{ cursor: 'pointer' }}
      onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
    >
      {/* Image */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ height: '200px' }}>
        {article.image_url && !imgErr ? (
          <img
            src={article.image_url}
            alt={article.title}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover img-zoom"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #16161A 0%, #1C1C22 100%)' }}>
            <span style={{ fontSize: 36, opacity: 0.06 }}>◻</span>
          </div>
        )}
        {/* Scrim */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(12,12,14,0.75) 0%, transparent 60%)' }} />
        {/* Sentiment dot */}
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full dot-live"
          style={{ background: dotColor, boxShadow: `0 0 6px 2px ${dotColor}66` }} />
        {/* Source */}
        <span className="absolute bottom-2.5 left-3 eyebrow" style={{ fontSize: 9, opacity: 0.7 }}>
          {article.source_api === 'newsapi' ? 'NewsAPI' : 'GNews'}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 flex-1 p-6">
        <h2 className="font-semibold leading-snug line-clamp-2"
          style={{ color: '#EFEFEF', letterSpacing: '-0.01em', fontSize: 16 }}>
          {article.title}
        </h2>

        {article.ai_summary ? (
          <p className="leading-relaxed line-clamp-3 flex-1"
            style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 10,
              letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 6 }}>
              AI
            </span>
            {article.ai_summary}
          </p>
        ) : article.description ? (
          <p className="line-clamp-3 flex-1"
            style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.65' }}>
            {article.description}
          </p>
        ) : <div className="flex-1" />}

        {/* Footer */}
        <div className="mt-auto pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{date}</span>
        </div>
      </div>
    </article>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ idx }: { idx: number }) {
  return (
    <div className={`anim-up d-${idx} glass rounded-2xl overflow-hidden`}>
      <div className="skel" style={{ height: 176 }} />
      <div className="p-5 space-y-3">
        <div className="skel h-3 rounded-lg" style={{ width: '80%' }} />
        <div className="skel h-3 rounded-lg" style={{ width: '60%' }} />
        <div className="skel h-2.5 rounded-lg mt-3" style={{ width: '90%' }} />
        <div className="skel h-2.5 rounded-lg" style={{ width: '70%' }} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const LIMIT = 12;

export default function Home() {
  const [articles, setArticles]       = useState<Article[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [sentiment, setSentiment]     = useState('all');
  const [source, setSource]           = useState('all');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset]           = useState(0);
  const [hasMore, setHasMore]         = useState(true);
  const [ingesting, setIngesting]     = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  const buildParams = useCallback((off: number) => ({
    sentiment: sentiment !== 'all' ? sentiment : undefined,
    source:    source    !== 'all' ? source    : undefined,
    search:    search || undefined,
    limit:     LIMIT,
    offset:    off,
  }), [sentiment, source, search]);

  const loadArticles = useCallback(async (reset: boolean, off: number) => {
    const data = await fetchArticles(buildParams(off));
    if (reset) setArticles(data); else setArticles(p => [...p, ...data]);
    setHasMore(data.length === LIMIT);
  }, [buildParams]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setOffset(0);
    Promise.all([loadArticles(true, 0), fetchStats().then(setStats).catch(() => {})])
      .catch(() => setError('Backend unreachable on port 8000'))
      .finally(() => setLoading(false));
  }, [loadArticles]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const next = offset + LIMIT;
    setOffset(next);
    await loadArticles(false, next).catch(() => {});
    setLoadingMore(false);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); };

  const handleRefresh = async () => {
    setIngesting(true);
    try {
      const r = await triggerIngest();
      setToast({ msg: `+${r.new_articles} articles · ${r.ai_processed} AI-processed`, ok: true });
      setLoading(true);
      await Promise.all([loadArticles(true, 0), fetchStats().then(setStats).catch(() => {})]);
      setLoading(false);
    } catch {
      setToast({ msg: 'Ingestion failed', ok: false });
    } finally {
      setIngesting(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const total = stats?.total_articles ?? 0;
  const pos   = stats?.by_sentiment?.positive   ?? 0;
  const neg   = stats?.by_sentiment?.negative   ?? 0;
  const neu   = stats?.by_sentiment?.neutral    ?? 0;
  const posP  = total > 0 ? Math.round((pos / total) * 100) : 0;
  const negP  = total > 0 ? Math.round((neg / total) * 100) : 0;
  const neuP  = total > 0 ? Math.round((neu / total) * 100) : 0;

  // Derive sparkline data from sentiment shape
  const sparkData = total > 0
    ? [neuP * 0.7, posP * 1.1, posP * 0.9, (posP + neuP) * 0.55, neuP * 0.8, negP * 1.15, negP * 0.9]
    : [20, 35, 28, 45, 38, 52, 44];

  const ingestionDate = stats?.latest_ingestion
    ? new Date(stats.latest_ingestion).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-obsidian">

      {/* ── Floating Header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 px-4 sm:px-8 pt-4 pb-2">
        <header className="nav-glass max-w-[1600px] mx-auto rounded-2xl anim-fade">
          <div className="flex items-center justify-between px-7 gap-6" style={{ height: 72 }}>

            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="anim-breathe flex-shrink-0 rounded-xl flex items-center justify-center"
                style={{ width: 40, height: 40, fontSize: 18,
                  background: 'linear-gradient(135deg, #00E5FF22 0%, #6366F122 100%)',
                  border: '1px solid rgba(0,229,255,0.25)' }}>
                ◈
              </div>
              <div>
                <span className="font-black" style={{ color: 'var(--text-primary)', fontSize: 18, letterSpacing: '-0.03em' }}>
                  Obsidian News
                </span>
                <span className="hidden sm:inline eyebrow ml-4" style={{ fontSize: 11 }}>
                  AI-Powered · {total} articles
                </span>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              {toast && (
                <span className="hidden sm:inline anim-fade font-semibold px-4 py-2 rounded-xl"
                  style={{
                    background: toast.ok ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                    border:     `1px solid ${toast.ok ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                    color:      toast.ok ? '#10B981' : '#F59E0B',
                    fontSize:   13,
                  }}>
                  {toast.ok ? '✓' : '✗'} {toast.msg}
                </span>
              )}
              <button onClick={handleRefresh} disabled={ingesting || loading} className="btn-primary"
                style={{ fontSize: 13, padding: '10px 24px', borderRadius: 12 }}>
                <span className={ingesting ? 'anim-spin inline-block mr-2' : 'mr-2'}>↻</span>
                {ingesting ? 'Syncing…' : 'Sync'}
              </button>
            </div>
          </div>
        </header>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 space-y-6">

        {/* ── Bento Stats ──────────────────────────────────────────────────── */}
        {stats && (
          <section className="bento anim-fade" style={{ animationDelay: '0.1s' }}>

            {/* ── HERO: Ring centred, source split below ── */}
            <div className="bento-hero glass rounded-2xl flex flex-col" style={{ minHeight: 320 }}>
              {/* Top label */}
              <div className="px-8 pt-7 pb-2">
                <p className="eyebrow">Sentiment Overview</p>
              </div>

              {/* Ring — centred, fills vertical space */}
              <div className="flex-1 flex items-center justify-center py-4">
                <SentimentRing posP={posP} negP={negP} neuP={neuP} total={total} />
              </div>

              {/* Bottom: source split + sync */}
              <div className="px-8 pb-7"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 18, marginTop: 4 }}>
                <div className="flex items-end justify-between">
                  <div className="flex gap-8">
                    {[
                      { label: 'NewsAPI', val: stats.by_source?.newsapi ?? 0 },
                      { label: 'GNews',   val: stats.by_source?.gnews   ?? 0 },
                    ].map(s => (
                      <div key={s.label}>
                        <p style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
                          {s.label}
                        </p>
                        <p style={{ fontSize: 30, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {s.val}
                        </p>
                      </div>
                    ))}
                  </div>
                  {ingestionDate && (
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'right', lineHeight: 1.6 }}>
                      Last sync<br />
                      <span style={{ color: 'var(--text-secondary)' }}>{ingestionDate}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Positive ── */}
            <div className="bento-2 glass card-lift rounded-2xl p-8 flex flex-col">
              <p className="eyebrow" style={{ color: '#10B981' }}>Positive</p>
              <div className="flex-1 flex flex-col justify-center my-3">
                <p style={{ fontSize: 64, fontWeight: 200, letterSpacing: '-0.04em', color: '#10B981', lineHeight: 1 }}>{posP}%</p>
                <p className="label-sm mt-2">{pos} articles</p>
              </div>
              <div style={{ width: '100%' }}>
                <Sparkline data={sparkData} color="#10B981" w={220} h={36} />
              </div>
            </div>

            {/* ── Negative ── */}
            <div className="bento-3 glass card-lift rounded-2xl p-8 flex flex-col">
              <p className="eyebrow" style={{ color: '#F59E0B' }}>Negative</p>
              <div className="flex-1 flex flex-col justify-center my-3">
                <p style={{ fontSize: 64, fontWeight: 200, letterSpacing: '-0.04em', color: '#F59E0B', lineHeight: 1 }}>{negP}%</p>
                <p className="label-sm mt-2">{neg} articles</p>
              </div>
              <div style={{ width: '100%' }}>
                <Sparkline
                  data={total > 0
                    ? [negP * 1.2, negP * 0.8, negP * 1.05, negP * 0.9, negP * 1.1, negP * 0.95, negP]
                    : [15, 8, 18, 10, 14, 9, 12]}
                  color="#F59E0B" w={160} h={36} />
              </div>
            </div>

            {/* ── Neutral ── */}
            <div className="bento-4 glass card-lift rounded-2xl p-8 flex flex-col">
              <p className="eyebrow" style={{ color: '#6366F1' }}>Neutral</p>
              <div className="flex-1 flex flex-col justify-center my-3">
                <p style={{ fontSize: 64, fontWeight: 200, letterSpacing: '-0.04em', color: '#6366F1', lineHeight: 1 }}>{neuP}%</p>
                <p className="label-sm mt-2">{neu} articles</p>
              </div>
              <div style={{ width: '100%' }}>
                <Sparkline
                  data={total > 0
                    ? [neuP * 0.85, neuP * 1.05, neuP * 0.9, neuP * 1.1, neuP * 0.95, neuP * 1.02, neuP]
                    : [40, 55, 48, 60, 52, 58, 51]}
                  color="#6366F1" w={220} h={36} />
              </div>
            </div>

            {/* ── Distribution ── */}
            <div className="bento-5 glass card-lift rounded-2xl p-8 flex flex-col justify-between">
              <p className="eyebrow mb-5">Breakdown</p>
              <div className="flex flex-col gap-5 flex-1 justify-center">
                {[
                  { label: 'Positive', pct: posP, count: pos, color: '#10B981' },
                  { label: 'Negative', pct: negP, count: neg, color: '#F59E0B' },
                  { label: 'Neutral',  pct: neuP, count: neu, color: '#6366F1' },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                        textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                        {r.label}
                      </span>
                      <span style={{ fontSize: 12, color: r.color, fontWeight: 600 }}>
                        {r.pct}%
                      </span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${r.pct}%`, background: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </section>
        )}

        {/* ── Command Search ────────────────────────────────────────────────── */}
        <section className="anim-up d-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>⌕</span>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search articles, topics, keywords…"
                className="cmd-input w-full rounded-2xl"
                style={{ paddingLeft: 48, paddingRight: 140, paddingTop: 18, paddingBottom: 18, fontSize: 15, letterSpacing: '-0.01em' }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {search && (
                  <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }}
                    className="chip" style={{ padding: '5px 12px', fontSize: 11 }}>
                    Clear
                  </button>
                )}
                <button type="submit" className="chip"
                  style={{ padding: '6px 16px', fontSize: 12, borderColor: 'rgba(0,229,255,0.25)', color: 'var(--accent)' }}>
                  Search
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* ── Filter Tabs ───────────────────────────────────────────────────── */}
        <section className="anim-up d-4 flex items-center gap-8 flex-wrap"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16 }}>

          <div className="flex items-center gap-6">
            <span className="eyebrow" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Sentiment</span>
            {[
              { val: 'all',      label: 'All' },
              { val: 'positive', label: 'Positive' },
              { val: 'neutral',  label: 'Neutral' },
              { val: 'negative', label: 'Negative' },
            ].map(o => (
              <button key={o.val} onClick={() => setSentiment(o.val)}
                className={`tab ${sentiment === o.val ? 'active' : ''}`}
                style={{ fontSize: 14 }}>
                {o.label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

          <div className="flex items-center gap-6">
            <span className="eyebrow" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Source</span>
            {[
              { val: 'all',     label: 'All Sources' },
              { val: 'newsapi', label: 'NewsAPI' },
              { val: 'gnews',   label: 'GNews' },
            ].map(o => (
              <button key={o.val} onClick={() => setSource(o.val)}
                className={`tab ${source === o.val ? 'active' : ''}`}
                style={{ fontSize: 14 }}>
                {o.label}
              </button>
            ))}
          </div>

          {!loading && (
            <span className="ml-auto" style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {articles.length} result{articles.length !== 1 ? 's' : ''}
            </span>
          )}
        </section>

        {/* ── Grid ──────────────────────────────────────────────────────────── */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 anim-fade">
            <p style={{ fontSize: 36, opacity: 0.15 }}>⚠</p>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button onClick={() => window.location.reload()} className="chip mt-2"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} idx={i} />)}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 anim-fade">
            <p style={{ fontSize: 36, opacity: 0.1 }}>◻</p>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>No articles found</p>
            <p className="label-sm" style={{ fontSize: 11 }}>Adjust your filters or sync new content</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a, i) => <ArticleCard key={a.id} article={a} idx={i} />)}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-6">
                <button onClick={handleLoadMore} disabled={loadingMore}
                  className="glass card-lift rounded-xl text-xs font-semibold px-8 py-3 transition-all"
                  style={{ color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.04em' }}>
                  {loadingMore
                    ? <span className="flex items-center gap-2"><span className="anim-spin inline-block">↻</span>Loading</span>
                    : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-10 mt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-[1600px] mx-auto px-8 flex items-center justify-between">
          <span className="eyebrow" style={{ fontSize: 9 }}>Obsidian News</span>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            Next.js · FastAPI · PostgreSQL · Gemini
          </span>
        </div>
      </footer>
    </div>
  );
}
