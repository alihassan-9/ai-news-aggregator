from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from typing import Optional, List
from ..core.config import get_db
from ..models.article import Article, ArticleResponse, StatsResponse, IngestResponse
from ..services.ingestion import run_ingestion
from ..services.ai_service import process_unprocessed_articles

router = APIRouter(prefix="/api")


@router.get("/articles", response_model=List[ArticleResponse])
def list_articles(
    sentiment: Optional[str] = Query(None, description="Filter by sentiment"),
    source: Optional[str] = Query(None, description="Filter by source API"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List articles with optional filters."""
    query = db.query(Article)

    if sentiment:
        query = query.filter(Article.sentiment == sentiment.lower())

    if source:
        query = query.filter(Article.source_api == source.lower())

    if search:
        words = [w.strip() for w in search.split() if w.strip()]
        word_filters = []
        for word in words:
            term = f"%{word}%"
            word_filters.append(or_(
                Article.title.ilike(term),
                Article.description.ilike(term),
                Article.content.ilike(term),
                Article.ai_summary.ilike(term),
                Article.source_name.ilike(term),
            ))
        query = query.filter(and_(*word_filters))

    articles = (
        query.order_by(desc(Article.published_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [ArticleResponse(**a.to_dict()) for a in articles]


@router.get("/articles/{article_id}", response_model=ArticleResponse)
def get_article(article_id: int, db: Session = Depends(get_db)):
    """Get a single article by ID."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleResponse(**article.to_dict())


@router.post("/ingest", response_model=IngestResponse)
async def trigger_ingestion(db: Session = Depends(get_db)):
    """Manually trigger news ingestion and AI processing."""
    new_articles = await run_ingestion(db)
    ai_processed = process_unprocessed_articles(db)
    return IngestResponse(
        message="Ingestion complete",
        new_articles=new_articles,
        ai_processed=ai_processed,
    )


@router.post("/reprocess-sentiment")
def reprocess_sentiment(db: Session = Depends(get_db)):
    """Reset all neutral/null sentiments and re-run AI processing."""
    updated = (
        db.query(Article)
        .filter(
            (Article.sentiment == "neutral") | (Article.sentiment.is_(None))
        )
        .update({"ai_summary": None, "sentiment": None}, synchronize_session=False)
    )
    db.commit()
    ai_processed = process_unprocessed_articles(db)
    return {"reset": updated, "reprocessed": ai_processed}


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """Get statistics about articles in the database."""
    total = db.query(func.count(Article.id)).scalar() or 0

    sentiment_counts = (
        db.query(Article.sentiment, func.count(Article.id))
        .group_by(Article.sentiment)
        .all()
    )
    by_sentiment = {s or "unprocessed": c for s, c in sentiment_counts}

    source_counts = (
        db.query(Article.source_api, func.count(Article.id))
        .group_by(Article.source_api)
        .all()
    )
    by_source = {s or "unknown": c for s, c in source_counts}

    latest = (
        db.query(Article.created_at)
        .order_by(desc(Article.created_at))
        .first()
    )
    latest_str = latest[0].isoformat() if latest and latest[0] else None

    return StatsResponse(
        total_articles=total,
        by_sentiment=by_sentiment,
        by_source=by_source,
        latest_ingestion=latest_str,
    )
