#!/usr/bin/env python3
"""
Fetch current, unresolved questions from Metaforecast
Ensures we get real market probabilities for active predictions
"""

import json
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any
from pathlib import Path

GRAPHQL_URL = "https://metaforecast.org/api/graphql"

def make_graphql_query(query: str, variables: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute a GraphQL query against Metaforecast"""
    response = requests.post(
        GRAPHQL_URL,
        json={"query": query, "variables": variables or {}},
        headers={"Content-Type": "application/json"}
    )
    response.raise_for_status()
    return response.json()

def fetch_current_questions(limit: int = 200) -> List[Dict[str, Any]]:
    """Fetch only current, unresolved questions"""
    query = """
    query GetQuestions($first: Int!) {
      questions(first: $first, orderBy: FIRST_SEEN_DESC) {
        edges {
          node {
            id
            title
            description
            url
            platform {
              id
              label
            }
            timestamp
            firstSeen
            qualityIndicators {
              numForecasts
              numForecasters
              volume
              liquidity
              stars
            }
            options {
              name
              probability
            }
          }
        }
      }
    }
    """
    
    variables = {"first": limit}
    result = make_graphql_query(query, variables)
    
    if "errors" in result:
        print(f"GraphQL errors: {result['errors']}")
        return []
    
    questions = []
    current_date = datetime.now(timezone.utc)
    current_year = current_date.year
    current_month = current_date.month
    
    for edge in result.get("data", {}).get("questions", {}).get("edges", []):
        node = edge.get("node", {})
        if not node:
            continue
            
        title = node.get("title", "").lower()
        
        # Skip questions that are likely resolved
        skip_patterns = [
            "2024",  # Past year
            "2023",  # Past year
            f"by {current_year}" if current_month > 6 else None,  # If we're past mid-year
            "q1 2025" if current_month > 3 else None,
            "q2 2025" if current_month > 6 else None,
            "january 2025" if current_month > 1 else None,
            "february 2025" if current_month > 2 else None,
            # Add more past months as needed
        ]
        
        skip_patterns = [p for p in skip_patterns if p]  # Remove None values
        
        if any(pattern in title for pattern in skip_patterns):
            continue
        
        # Extract binary probability
        options = node.get("options", [])
        if len(options) == 2:
            for opt in options:
                if opt.get("name", "").lower() in ["yes", "true"]:
                    prob = opt.get("probability", 0)
                    node["current_probability"] = prob * 100 if prob <= 1 else prob
                    node["last_updated"] = node.get("timestamp", "")
                    questions.append(node)
                    break
    
    return questions

def categorize_and_select(questions: List[Dict[str, Any]], target_count: int = 50) -> List[Dict[str, Any]]:
    """Select diverse questions across probability ranges and topics"""
    
    # Filter out overly specific questions
    filtered = []
    for q in questions:
        title = q.get("title", "").lower()
        
        # Skip overly specific sports/gaming questions
        skip_patterns = [
            "finish fourth", "finish fifth", "finish sixth",
            "specific player", "beat ", "vs ", 
            "win the match", "score more than"
        ]
        
        if any(pattern in title for pattern in skip_patterns):
            continue
            
        # Prefer broader questions
        prefer_patterns = [
            "2025", "2026", "2027", "2028", "2029", "2030",
            "recession", "election", "technology", "climate",
            "economy", "inflation", "ai", "war", "pandemic"
        ]
        
        q["relevance_score"] = sum(1 for pattern in prefer_patterns if pattern in title)
        filtered.append(q)
    
    # Sort by relevance and quality
    for q in filtered:
        quality = q.get("qualityIndicators", {})
        q["quality_score"] = (
            (quality.get("numForecasts") or 0) / 10 +
            (quality.get("volume") or 0) / 1000 +
            q.get("relevance_score", 0) * 2
        )
    
    filtered.sort(key=lambda x: x.get("quality_score", 0), reverse=True)
    
    # Ensure diversity across probability ranges
    ranges = {
        "very_low": [],     # 0-10%
        "low": [],          # 10-30%
        "medium": [],       # 30-70%
        "high": [],         # 70-90%
        "very_high": []     # 90-100%
    }
    
    for q in filtered:
        prob = q.get("current_probability", 50)
        if prob < 10:
            ranges["very_low"].append(q)
        elif prob < 30:
            ranges["low"].append(q)
        elif prob < 70:
            ranges["medium"].append(q)
        elif prob < 90:
            ranges["high"].append(q)
        else:
            ranges["very_high"].append(q)
    
    # Select balanced sample
    selected = []
    per_range = target_count // 5
    
    for range_name, range_questions in ranges.items():
        selected.extend(range_questions[:per_range])
    
    # Fill remaining slots with highest quality
    remaining_slots = target_count - len(selected)
    if remaining_slots > 0:
        all_remaining = []
        for range_name, range_questions in ranges.items():
            all_remaining.extend(range_questions[per_range:])
        all_remaining.sort(key=lambda x: x.get("quality_score", 0), reverse=True)
        selected.extend(all_remaining[:remaining_slots])
    
    return selected[:target_count]

def save_current_dataset(questions: List[Dict[str, Any]], output_file: str):
    """Save current questions for evaluation"""
    # Format for evaluation
    formatted_questions = []
    for q in questions:
        formatted_questions.append({
            "question": q["title"],
            "market_probability": q.get("current_probability", 50),
            "platform": q.get("platform", {}).get("label", "Unknown"),
            "url": q.get("url", ""),
            "id": q.get("id", ""),
            "last_updated": q.get("last_updated", ""),
            "category": "auto"  # Could be enhanced with better categorization
        })
    
    data = {
        "metadata": {
            "source": "Metaforecast - Current Active Questions",
            "fetched": datetime.now().isoformat(),
            "total_questions": len(formatted_questions),
            "description": "Currently active, unresolved prediction market questions"
        },
        "questions": formatted_questions
    }
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"💾 Saved {len(formatted_questions)} current questions to {output_file}")

def main():
    """Fetch current questions from Metaforecast"""
    print(f"🔍 Fetching current questions from Metaforecast (as of {datetime.now().strftime('%Y-%m-%d')})...")
    
    # Fetch questions
    all_questions = fetch_current_questions(limit=500)
    print(f"✅ Found {len(all_questions)} binary questions")
    
    # Select diverse, high-quality questions
    selected = categorize_and_select(all_questions, target_count=50)
    print(f"✅ Selected {len(selected)} diverse questions")
    
    # Save the dataset
    output_path = Path(__file__).parent.parent / "data" / "current_questions.json"
    save_current_dataset(selected, output_path)
    
    # Show distribution
    print("\n📊 Probability distribution of selected questions:")
    ranges = {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0}
    for q in selected:
        prob = q.get("current_probability", 50)
        if prob < 20:
            ranges["0-20%"] += 1
        elif prob < 40:
            ranges["20-40%"] += 1
        elif prob < 60:
            ranges["40-60%"] += 1
        elif prob < 80:
            ranges["60-80%"] += 1
        else:
            ranges["80-100%"] += 1
    
    for range_name, count in ranges.items():
        if count > 0:
            print(f"   {range_name}: {count} questions")
    
    # Show some examples
    print("\n📋 Example questions:")
    for i, q in enumerate(selected[:5]):
        print(f"\n{i+1}. {q['title']}")
        print(f"   Platform: {q.get('platform', {}).get('label', 'Unknown')}")
        print(f"   Current probability: {q.get('current_probability', 0):.1f}%")

if __name__ == "__main__":
    main()