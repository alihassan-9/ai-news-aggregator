import { Article, Stats, IngestResponse } from '@/types';

// Empty string → relative URLs (nginx proxies /api → backend in Docker)
// In dev: set NEXT_PUBLIC_API_URL=http://localhost:8000 in .env.local
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function fetchArticles(params: {
  sentiment?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Article[]> {
  const query = new URLSearchParams();
  if (params.sentiment) query.set('sentiment', params.sentiment);
  if (params.source) query.set('source', params.source);
  if (params.search) query.set('search', params.search);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));

  const res = await fetch(`${API_BASE}/api/articles?${query}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function triggerIngest(): Promise<IngestResponse> {
  const res = await fetch(`${API_BASE}/api/ingest`, { method: 'POST' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
