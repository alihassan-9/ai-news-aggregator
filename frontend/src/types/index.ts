export interface Article {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  source_name: string | null;
  source_api: string;
  image_url: string | null;
  published_at: string | null;
  ai_summary: string | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  category: string | null;
  created_at: string;
}

export interface Stats {
  total_articles: number;
  by_sentiment: {
    positive?: number;
    negative?: number;
    neutral?: number;
    unprocessed?: number;
  };
  by_source: {
    newsapi?: number;
    gnews?: number;
    [key: string]: number | undefined;
  };
  latest_ingestion: string | null;
}

export interface IngestResponse {
  message: string;
  new_articles: number;
  ai_processed: number;
}
