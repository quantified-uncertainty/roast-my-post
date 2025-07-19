#!/usr/bin/env python3
"""
Question categorization system for evaluation analysis
"""

import re
from typing import Dict, Any, List

# Topic keywords for classification
TOPIC_KEYWORDS = {
    "sports": [
        "nba", "nfl", "mlb", "nhl", "soccer", "football", "basketball", "baseball",
        "hockey", "tennis", "golf", "olympics", "championship", "tournament", "mvp",
        "rookie", "season", "game", "match", "team", "player", "coach", "league",
        "world cup", "super bowl", "finals", "playoff", "win the", "score",
        "motogp", "formula", "racing", "athletic", "athlete", "sport"
    ],
    "politics": [
        "election", "vote", "president", "senator", "congress", "parliament",
        "governor", "mayor", "party", "democrat", "republican", "campaign",
        "candidate", "primary", "caucus", "poll", "debate", "government",
        "minister", "cabinet", "policy", "legislation", "bill", "law",
        "political", "politician", "borough", "mayoral", "gubernatorial",
        "house of councillors", "seats", "ldp", "komeito", "jcp", "jip", "dpp",
        "councillors", "council", "assembly", "senate", "representatives"
    ],
    "economics": [
        "gdp", "inflation", "unemployment", "recession", "economy", "economic",
        "market", "stock", "bond", "interest rate", "federal reserve", "fed",
        "price", "dollar", "euro", "currency", "trade", "tariff", "budget",
        "debt", "deficit", "growth", "earnings", "revenue", "profit"
    ],
    "technology": [
        "ai", "artificial intelligence", "machine learning", "robot", "software",
        "hardware", "computer", "internet", "tech", "startup", "ipo", "release",
        "launch", "update", "version", "app", "platform", "digital", "cyber",
        "quantum", "blockchain", "cryptocurrency", "bitcoin", "ethereum"
    ],
    "science": [
        "research", "study", "scientist", "discovery", "experiment", "theory",
        "physics", "chemistry", "biology", "medicine", "space", "nasa", "climate",
        "temperature", "weather", "earthquake", "volcano", "pandemic", "virus",
        "vaccine", "treatment", "diagnosis", "breakthrough", "innovation"
    ],
    "entertainment": [
        "movie", "film", "box office", "oscar", "grammy", "emmy", "award",
        "music", "album", "song", "artist", "actor", "actress", "director",
        "show", "series", "netflix", "streaming", "release", "premiere",
        "concert", "tour", "festival", "performance"
    ],
    "geopolitics": [
        "war", "peace", "treaty", "alliance", "nato", "un", "united nations",
        "sanctions", "diplomatic", "ambassador", "embassy", "international",
        "border", "conflict", "military", "defense", "security", "foreign",
        "relations", "agreement", "negotiation", "summit"
    ]
}

def get_probability_range(probability: float) -> str:
    """Categorize probability into ranges"""
    if probability < 10:
        return "0-10%"
    elif probability < 20:
        return "10-20%"
    elif probability < 30:
        return "20-30%"
    elif probability < 40:
        return "30-40%"
    elif probability < 50:
        return "40-50%"
    elif probability < 60:
        return "50-60%"
    elif probability < 70:
        return "60-70%"
    elif probability < 80:
        return "70-80%"
    elif probability < 90:
        return "80-90%"
    else:
        return "90-100%"

def get_confidence_level(probability: float) -> str:
    """Categorize by confidence level"""
    if probability <= 20 or probability >= 80:
        return "high_confidence"
    elif probability <= 35 or probability >= 65:
        return "medium_confidence"
    else:
        return "low_confidence"

def classify_topic(question: str) -> str:
    """Classify question into topic category"""
    question_lower = question.lower()
    
    # Count keyword matches for each topic
    topic_scores = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            # Use word boundaries for more accurate matching
            if f" {keyword} " in f" {question_lower} " or question_lower.startswith(f"{keyword} ") or question_lower.endswith(f" {keyword}"):
                score += 1
        if score > 0:
            topic_scores[topic] = score
    
    # Return topic with highest score, or "other" if no matches
    if topic_scores:
        return max(topic_scores.items(), key=lambda x: x[1])[0]
    return "other"

def get_time_horizon(question: str) -> str:
    """Determine time horizon of the question - returns specific year if found"""
    question_lower = question.lower()
    
    # Check for specific year mentions
    years = re.findall(r'20\d{2}', question)
    if years:
        # Return the latest year mentioned
        max_year = max(int(year) for year in years)
        return str(max_year)
    
    # Check for relative time keywords
    current_year = 2025  # Based on the env date
    
    if any(word in question_lower for word in ["this year", "this season"]):
        return str(current_year)
    elif any(word in question_lower for word in ["next year", "next season"]):
        return str(current_year + 1)
    elif any(word in question_lower for word in ["this month", "next month", "july", "august", "september"]):
        return str(current_year)
    
    return "no_year"

def get_question_type(question: str) -> str:
    """Determine the type of question"""
    question_lower = question.lower()
    
    if question_lower.startswith("will") and "win" in question_lower:
        return "competition_outcome"
    elif question_lower.startswith("will") and any(word in question_lower for word in ["be", "reach", "exceed", "above", "below"]):
        return "threshold_question"
    elif question_lower.startswith("will") and any(word in question_lower for word in ["happen", "occur", "take place"]):
        return "event_occurrence"
    elif "how many" in question_lower or "how much" in question_lower:
        return "numerical_prediction"
    elif question_lower.startswith("who will"):
        return "selection_question"
    
    return "general_prediction"

def categorize_question(question_data: Dict[str, Any]) -> Dict[str, Any]:
    """Add metadata categories to a question"""
    question = question_data.get("question", "")
    probability = question_data.get("market_probability", 50)
    
    # Add only the useful categorizations
    metadata = {
        "topic": classify_topic(question),
        "time_horizon": get_time_horizon(question),
        "question_type": get_question_type(question),
        "probability_bucket": f"{int(probability // 10) * 10}-{int(probability // 10) * 10 + 10}%"
    }
    
    # Keep all original data and add metadata
    categorized = question_data.copy()
    categorized["metadata"] = metadata
    
    return categorized

def analyze_distribution(questions: List[Dict[str, Any]]) -> Dict[str, Dict[str, int]]:
    """Analyze distribution of questions across categories"""
    distributions = {
        "topic": {},
        "time_horizon": {},
        "question_type": {},
        "probability_bucket": {}
    }
    
    for q in questions:
        metadata = q.get("metadata", {})
        for category, value in metadata.items():
            if category in distributions:
                distributions[category][value] = distributions[category].get(value, 0) + 1
    
    return distributions

if __name__ == "__main__":
    # Test categorization
    test_questions = [
        {"question": "Will the Lakers win the NBA championship?", "market_probability": 15},
        {"question": "Will inflation exceed 3% in 2025?", "market_probability": 65},
        {"question": "Will there be a peace agreement between Azerbaijan and Armenia?", "market_probability": 30}
    ]
    
    for q in test_questions:
        categorized = categorize_question(q)
        print(f"\nQuestion: {q['question']}")
        print(f"Metadata: {categorized['metadata']}")