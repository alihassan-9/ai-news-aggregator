import logging
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..models.article import Article
from .news_sources import fetch_newsapi, fetch_gnews

logger = logging.getLogger(__name__)


async def fetch_all_sources() -> List[Dict[str, Any]]:
    """Fetch articles from all configured news sources."""
    all_articles = []

    newsapi_articles = await fetch_newsapi()
    all_articles.extend(newsapi_articles)

    gnews_articles = await fetch_gnews()
    all_articles.extend(gnews_articles)

    logger.info(f"Total articles fetched from all sources: {len(all_articles)}")
    return all_articles


def deduplicate_and_store(db: Session, articles: List[Dict[str, Any]]) -> int:
    """De-duplicate articles by URL and store new ones in the database."""
    new_count = 0

    for article_data in articles:
        url = article_data.get("url", "")
        if not url:
            continue

        existing = db.query(Article).filter(Article.url == url).first()
        if existing:
            continue

        article = Article(
            title=article_data.get("title", "")[:500],
            description=article_data.get("description"),
            content=article_data.get("content"),
            url=url,
            source_name=article_data.get("source_name"),
            source_api=article_data.get("source_api"),
            image_url=article_data.get("image_url"),
            published_at=article_data.get("published_at"),
        )
        db.add(article)
        new_count += 1

    if new_count > 0:
        db.commit()
        logger.info(f"Stored {new_count} new articles in the database")

    return new_count


async def run_ingestion(db: Session) -> int:
    """Full ingestion pipeline: fetch from all sources and store."""
    articles = await fetch_all_sources()
    new_count = deduplicate_and_store(db, articles)
    return new_count
