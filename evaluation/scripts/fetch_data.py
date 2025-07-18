#!/usr/bin/env python3
"""
Fetch forecast questions from Metaforecast for evaluation
"""

import argparse
import json
import os
import requests
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

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

def fetch_questions(limit: int = 500) -> List[Dict[str, Any]]:
    """Fetch questions from Metaforecast"""
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
    for edge in result.get("data", {}).get("questions", {}).get("edges", []):
        node = edge.get("node", {})
        if node:
            # Extract binary probability
            options = node.get("options", [])
            if len(options) == 2:
                for opt in options:
                    if opt.get("name", "").lower() in ["yes", "true"]:
                        prob = opt.get("probability", 0)
                        node["current_probability"] = prob * 100 if prob <= 1 else prob
                        questions.append(node)
                        break
    
    return questions

def filter_quality_questions(questions: List[Dict[str, Any]], use_ai: bool = False) -> List[Dict[str, Any]]:
    """Filter for high-quality, diverse questions"""
    
    # Basic quality filtering
    filtered = []
    for q in questions:
        title = q.get("title", "").lower()
        
        # Skip overly specific questions
        skip_patterns = [
            "finish fourth", "finish fifth", "finish sixth",
            "specific player", "single game", "one day after"
        ]
        
        if any(pattern in title for pattern in skip_patterns):
            continue
        
        filtered.append(q)
    
    # Sort by quality indicators
    for q in filtered:
        quality = q.get("qualityIndicators", {})
        score = 0
        
        # Prefer questions with more activity
        if (quality.get("numForecasts") or 0) > 50:
            score += 2
        if (quality.get("volume") or 0) > 1000:
            score += 1
        
        q["quality_score"] = score
    
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
    
    # Take balanced sample from each range
    diverse_questions = []
    per_range = 10  # Adjust based on desired total
    
    for range_name, range_questions in ranges.items():
        diverse_questions.extend(range_questions[:per_range])
    
    return diverse_questions

def save_questions(questions: List[Dict[str, Any]], output_file: str):
    """Save questions to file"""
    data = {
        "metadata": {
            "source": "Metaforecast",
            "fetched": datetime.now().isoformat(),
            "total_questions": len(questions)
        },
        "questions": questions
    }
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"💾 Saved {len(questions)} questions to {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Fetch forecast data from Metaforecast")
    parser.add_argument(
        "--count",
        type=int,
        default=500,
        help="Number of questions to fetch"
    )
    parser.add_argument(
        "--output",
        default="evaluation/data/metaforecast_cache.json",
        help="Output file path"
    )
    parser.add_argument(
        "--ai-curate",
        type=int,
        help="Use AI to curate N best questions"
    )
    
    args = parser.parse_args()
    
    print(f"🔍 Fetching {args.count} questions from Metaforecast...")
    
    # Fetch questions
    all_questions = fetch_questions(args.count)
    binary_questions = [q for q in all_questions if "current_probability" in q]
    
    print(f"✅ Found {len(binary_questions)} binary questions")
    
    # Filter for quality
    filtered_questions = filter_quality_questions(binary_questions)
    print(f"✅ Filtered to {len(filtered_questions)} quality questions")
    
    # Ensure output directory exists
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save questions
    save_questions(filtered_questions, args.output)
    
    # Show distribution
    print("\n📊 Probability distribution:")
    ranges = {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0}
    for q in filtered_questions:
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

if __name__ == "__main__":
    main()