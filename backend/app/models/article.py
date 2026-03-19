from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..core.config import Base


# ── ORM Model ─────────────────────────────────────────────────────────────────

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    url = Column(String(1000), unique=True, nullable=False)
    source_name = Column(String(200), nullable=True)
    source_api = Column(String(50), nullable=True)
    image_url = Column(String(1000), nullable=True)
    published_at = Column(DateTime, nullable=True)
    ai_summary = Column(Text, nullable=True)
    sentiment = Column(String(20), nullable=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "content": self.content,
            "url": self.url,
            "source_name": self.source_name,
            "source_api": self.source_api,
            "image_url": self.image_url,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "ai_summary": self.ai_summary,
            "sentiment": self.sentiment,
            "category": self.category,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ── Pydantic Schemas ───────────────────────────────────────────────────────────

class ArticleResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    url: str
    source_name: Optional[str] = None
    source_api: Optional[str] = None
    image_url: Optional[str] = None
    published_at: Optional[str] = None
    ai_summary: Optional[str] = None
    sentiment: Optional[str] = None
    category: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    total_articles: int
    by_sentiment: dict
    by_source: dict
    latest_ingestion: Optional[str] = None


class IngestResponse(BaseModel):
    message: str
    new_articles: int
    ai_processed: int
