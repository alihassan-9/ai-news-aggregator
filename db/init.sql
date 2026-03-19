-- Initialize the news_aggregator database

CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content TEXT,
    url VARCHAR(1000) UNIQUE NOT NULL,
    source_name VARCHAR(200),
    source_api VARCHAR(50),
    image_url VARCHAR(1000),
    published_at TIMESTAMP,
    ai_summary TEXT,
    sentiment VARCHAR(20),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_sentiment ON articles(sentiment);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_api);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);
