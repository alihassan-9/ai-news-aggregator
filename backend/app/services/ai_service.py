import os
import json
import logging
import anthropic
from sqlalchemy.orm import Session
from ..models.article import Article

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

POSITIVE_KEYWORDS = [
    "launch", "innovation", "breakthrough", "record", "growth", "success",
    "award", "profit", "investment", "advance", "upgrade", "new", "release",
    "discovery", "improves", "adds", "gains", "rises", "soars", "best",
    "wins", "expands", "partnership", "deal", "revenue", "milestone",
]

NEGATIVE_KEYWORDS = [
    "backlash", "scandal", "lawsuit", "layoff", "recall", "crash", "fraud",
    "controversy", "failure", "decline", "ban", "halts", "drops", "falls",
    "loses", "fired", "misconduct", "exploit", "hack", "breach", "stolen",
    "wrong", "bad", "worst", "delays", "cancels", "cuts", "warning",
    "allegations", "arrested", "fined", "sued", "bankruptcy", "risk",
]


def keyword_sentiment(article: Article) -> str:
    """Fast local keyword-based sentiment classification."""
    text = f"{article.title or ''} {article.description or ''}".lower()
    pos = sum(1 for w in POSITIVE_KEYWORDS if w in text)
    neg = sum(1 for w in NEGATIVE_KEYWORDS if w in text)
    if neg > pos:
        return "negative"
    if pos > neg:
        return "positive"
    return "neutral"


def get_client():
    """Return a configured Anthropic client, or None if key missing."""
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your_anthropic_api_key_here":
        return None
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def process_article_with_ai(article: Article) -> dict:
    """Try Claude first; fall back to keyword sentiment if unavailable."""
    client = get_client()

    if client:
        prompt = f"""You are a news sentiment classifier. Analyze the article below and respond with a JSON object.

SENTIMENT RULES — pick the one that best fits:
- "positive": breakthrough, innovation, record growth, new product launch, award, recovery, success, investment, advancement
- "negative": scandal, backlash, lawsuit, layoffs, recall, crash, fraud, controversy, failure, decline, criticism, ban
- "neutral": routine announcement, factual report, policy update, scheduled event — use this ONLY when the article is genuinely neither good nor bad news

Article Title: {article.title}
Article Description: {article.description or 'N/A'}
Article Content: {(article.content or '')[:2000]}

Respond in valid JSON only, no markdown:
{{"summary": "2-3 sentence summary of the article", "sentiment": "positive|negative|neutral"}}"""

        try:
            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            text = message.content[0].text.strip()

            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            if text.startswith("json"):
                text = text[4:].strip()

            result = json.loads(text)
            sentiment = result.get("sentiment", "neutral").lower()
            if sentiment not in ("positive", "negative", "neutral"):
                sentiment = "neutral"

            logger.info(f"Claude processed: '{article.title[:50]}' → {sentiment}")
            return {
                "summary": result.get("summary", ""),
                "sentiment": sentiment,
            }
        except Exception as e:
            logger.warning(f"Claude unavailable ({e.__class__.__name__}), using keyword fallback")

    # Keyword-based fallback
    sentiment = keyword_sentiment(article)
    summary = (article.description or article.title or "")[:300]
    logger.info(f"Keyword fallback: '{article.title[:50]}' → {sentiment}")
    return {"summary": summary, "sentiment": sentiment}


def process_unprocessed_articles(db: Session) -> int:
    """Find articles without AI summaries and process them."""
    articles = (
        db.query(Article)
        .filter(
            (Article.ai_summary.is_(None)) | (Article.sentiment.is_(None))
        )
        .order_by(Article.created_at.desc())
        .limit(5)
        .all()
    )

    if not articles:
        logger.info("No unprocessed articles found")
        return 0

    processed = 0
    for article in articles:
        result = process_article_with_ai(article)
        if result["sentiment"] is not None:
            article.ai_summary = result["summary"]
            article.sentiment = result["sentiment"]
            processed += 1
        else:
            logger.warning(f"Skipping article: '{article.title[:50]}'")

    db.commit()
    logger.info(f"AI processed {processed} articles")
    return processed
