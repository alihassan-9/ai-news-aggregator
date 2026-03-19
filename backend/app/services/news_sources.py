import os
import httpx
import logging
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
GNEWS_KEY = os.getenv("GNEWS_KEY", "")


async def fetch_newsapi(category: str = "technology", country: str = "us") -> List[Dict[str, Any]]:
    """Fetch top headlines from NewsAPI.org."""
    if not NEWSAPI_KEY or NEWSAPI_KEY == "your_newsapi_key_here":
        logger.warning("NewsAPI key not configured, skipping NewsAPI fetch")
        return []

    url = "https://newsapi.org/v2/top-headlines"
    params = {
        "apiKey": NEWSAPI_KEY,
        "category": category,
        "country": country,
        "pageSize": 30,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        articles = []
        for item in data.get("articles", []):
            if item.get("title") == "[Removed]":
                continue

            published = None
            if item.get("publishedAt"):
                try:
                    published = datetime.fromisoformat(
                        item["publishedAt"].replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    pass

            articles.append({
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "content": item.get("content", ""),
                "url": item.get("url", ""),
                "source_name": item.get("source", {}).get("name", "Unknown"),
                "source_api": "newsapi",
                "image_url": item.get("urlToImage"),
                "published_at": published,
            })

        logger.info(f"Fetched {len(articles)} articles from NewsAPI")
        return articles

    except Exception as e:
        logger.error(f"Error fetching from NewsAPI: {e}")
        return []


async def fetch_gnews(category: str = "technology", lang: str = "en") -> List[Dict[str, Any]]:
    """Fetch top headlines from GNews.io."""
    if not GNEWS_KEY or GNEWS_KEY == "your_gnews_key_here":
        logger.warning("GNews key not configured, skipping GNews fetch")
        return []

    url = "https://gnews.io/api/v4/top-headlines"
    params = {
        "token": GNEWS_KEY,
        "category": category,
        "lang": lang,
        "max": 30,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        articles = []
        for item in data.get("articles", []):
            published = None
            if item.get("publishedAt"):
                try:
                    published = datetime.fromisoformat(
                        item["publishedAt"].replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    pass

            articles.append({
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "content": item.get("content", ""),
                "url": item.get("url", ""),
                "source_name": item.get("source", {}).get("name", "Unknown"),
                "source_api": "gnews",
                "image_url": item.get("image"),
                "published_at": published,
            })

        logger.info(f"Fetched {len(articles)} articles from GNews")
        return articles

    except Exception as e:
        logger.error(f"Error fetching from GNews: {e}")
        return []
