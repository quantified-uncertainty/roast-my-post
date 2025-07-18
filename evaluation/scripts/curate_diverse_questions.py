#!/usr/bin/env python3
"""
Curate a diverse set of 50 questions from metaforecast cache
Avoiding repetitive F1/position questions
"""

import json
import random
from pathlib import Path
from datetime import datetime

# Load metaforecast cache
cache_file = Path(__file__).parent.parent / "data" / "metaforecast_cache.json"
with open(cache_file, 'r') as f:
    data = json.load(f)

all_questions = data.get("questions", [])
print(f"Total questions available: {len(all_questions)}")

# Filter and categorize questions
f1_position_questions = []
other_sports_questions = []
politics_questions = []
economics_questions = []
science_questions = []
crypto_questions = []
general_questions = []

for q in all_questions:
    title = q.get("title", "").lower()
    
    # Skip if no valid probability
    if "current_probability" not in q:
        continue
        
    # Categorize
    if ("fourth" in title or "fifth" in title) and ("f1" in title or "drivers championship" in title):
        f1_position_questions.append(q)
    elif any(sport in title for sport in ["nba", "nfl", "mlb", "soccer", "football", "tennis", "golf", "olympic"]):
        other_sports_questions.append(q)
    elif any(pol in title for pol in ["president", "election", "vote", "congress", "senate", "parliament"]):
        politics_questions.append(q)
    elif any(econ in title for econ in ["gdp", "inflation", "recession", "economy", "unemployment", "stock", "market"]):
        economics_questions.append(q)
    elif any(sci in title for sci in ["ai", "climate", "temperature", "science", "research", "technology"]):
        science_questions.append(q)
    elif any(crypto in title for crypto in ["bitcoin", "ethereum", "crypto", "blockchain", "btc", "eth", "solana"]):
        crypto_questions.append(q)
    else:
        general_questions.append(q)

print(f"\nQuestion distribution:")
print(f"F1 position questions: {len(f1_position_questions)}")
print(f"Other sports: {len(other_sports_questions)}")
print(f"Politics: {len(politics_questions)}")
print(f"Economics: {len(economics_questions)}")
print(f"Science/Tech: {len(science_questions)}")
print(f"Crypto: {len(crypto_questions)}")
print(f"General: {len(general_questions)}")

# Select diverse questions
selected = []

# Take at most 2 F1 position questions
selected.extend(random.sample(f1_position_questions, min(2, len(f1_position_questions))))

# Try to get balanced representation from other categories
target_per_category = 8
selected.extend(random.sample(other_sports_questions, min(target_per_category, len(other_sports_questions))))
selected.extend(random.sample(politics_questions, min(target_per_category, len(politics_questions))))
selected.extend(random.sample(economics_questions, min(target_per_category, len(economics_questions))))
selected.extend(random.sample(science_questions, min(target_per_category, len(science_questions))))
selected.extend(random.sample(crypto_questions, min(target_per_category, len(crypto_questions))))

# Fill remaining with general questions
remaining_needed = 50 - len(selected)
if remaining_needed > 0 and len(general_questions) > 0:
    selected.extend(random.sample(general_questions, min(remaining_needed, len(general_questions))))

# If still need more, sample from all non-F1-position questions
if len(selected) < 50:
    all_non_f1 = other_sports_questions + politics_questions + economics_questions + science_questions + crypto_questions + general_questions
    # Remove already selected
    all_non_f1 = [q for q in all_non_f1 if q not in selected]
    remaining_needed = 50 - len(selected)
    selected.extend(random.sample(all_non_f1, min(remaining_needed, len(all_non_f1))))

# Shuffle for good mix
random.shuffle(selected)

print(f"\nSelected {len(selected)} questions")

# Convert to simple format
output_questions = []
for q in selected[:50]:  # Ensure exactly 50
    output_questions.append({
        "question": q["title"],
        "market_probability": q["current_probability"] * 100,  # Convert to percentage
        "platform": q.get("platform", {}).get("label", "Unknown"),
        "id": q.get("id", ""),
        "url": q.get("url", "")
    })

# Create output
output = {
    "metadata": {
        "source": "Metaforecast - Diverse Curated",
        "created": datetime.now().isoformat(),
        "total_fetched": len(all_questions),
        "curated_count": len(output_questions),
        "curation_method": "Balanced selection across categories, minimal F1 position questions"
    },
    "questions": output_questions
}

# Save to file
output_file = Path(__file__).parent.parent / "data" / "diverse_curated_forecasts.json"
with open(output_file, 'w') as f:
    json.dump(output, f, indent=2)

print(f"\nSaved to: {output_file}")

# Show distribution of selected questions
prob_ranges = {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0}
for q in output_questions:
    prob = q["market_probability"]
    if prob < 20:
        prob_ranges["0-20%"] += 1
    elif prob < 40:
        prob_ranges["20-40%"] += 1
    elif prob < 60:
        prob_ranges["40-60%"] += 1
    elif prob < 80:
        prob_ranges["60-80%"] += 1
    else:
        prob_ranges["80-100%"] += 1

print("\nProbability distribution of selected questions:")
for range_name, count in prob_ranges.items():
    print(f"  {range_name}: {count} questions")