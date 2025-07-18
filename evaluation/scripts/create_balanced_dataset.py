#!/usr/bin/env python3
"""
Create a balanced dataset of 50 questions with good probability distribution
"""

import json
import random
from pathlib import Path
from datetime import datetime

# Load both datasets
data_dir = Path(__file__).parent.parent / "data"
with open(data_dir / "current_questions.json", 'r') as f:
    current_data = json.load(f)
    
with open(data_dir / "metaforecast_cache.json", 'r') as f:
    meta_data = json.load(f)

# Combine all questions and normalize format
all_questions = []

# Add current questions
for q in current_data.get("questions", []):
    if "market_probability" in q and "question" in q:
        prob = q["market_probability"]
        # Normalize probability to 0-100 range
        if prob > 100:
            prob = prob / 100  # Likely a percentage already multiplied
        elif prob <= 1:
            prob = prob * 100  # Likely a decimal
            
        all_questions.append({
            "question": q["question"],
            "market_probability": prob,
            "platform": q.get("platform", "Unknown"),
            "id": q.get("id", ""),
            "source": "current"
        })

# Add metaforecast questions
for q in meta_data.get("questions", []):
    if "current_probability" in q and "title" in q:
        all_questions.append({
            "question": q["title"],
            "market_probability": q["current_probability"] * 100,
            "platform": q.get("platform", {}).get("label", "Unknown"),
            "id": q.get("id", ""),
            "source": "metaforecast"
        })

print(f"Total questions combined: {len(all_questions)}")

# Filter out F1 position questions
filtered_questions = []
f1_count = 0

for q in all_questions:
    q_lower = q["question"].lower()
    if ("fourth" in q_lower or "fifth" in q_lower) and ("f1" in q_lower or "drivers championship" in q_lower):
        f1_count += 1
        # Keep only first 2 F1 position questions
        if f1_count <= 2:
            filtered_questions.append(q)
    else:
        filtered_questions.append(q)

print(f"Filtered out {f1_count - min(f1_count, 2)} excess F1 position questions")

# Group by probability ranges
prob_buckets = {
    "0-20": [],
    "20-40": [],
    "40-60": [],
    "60-80": [],
    "80-100": []
}

for q in filtered_questions:
    prob = q["market_probability"]
    if prob < 20:
        prob_buckets["0-20"].append(q)
    elif prob < 40:
        prob_buckets["20-40"].append(q)
    elif prob < 60:
        prob_buckets["40-60"].append(q)
    elif prob < 80:
        prob_buckets["60-80"].append(q)
    else:
        prob_buckets["80-100"].append(q)

print("\nAvailable questions by probability:")
for bucket, questions in prob_buckets.items():
    print(f"  {bucket}%: {len(questions)} questions")

# Select balanced set
selected = []
target_per_bucket = 10  # 50 questions / 5 buckets = 10 each ideally

for bucket_name, questions in prob_buckets.items():
    if len(questions) >= target_per_bucket:
        selected.extend(random.sample(questions, target_per_bucket))
    else:
        selected.extend(questions)  # Take all if less than target

# If we don't have 50 yet, fill from buckets with extras
if len(selected) < 50:
    remaining_needed = 50 - len(selected)
    # Get all unselected questions
    all_unselected = []
    for bucket_name, questions in prob_buckets.items():
        for q in questions:
            if q not in selected:
                all_unselected.append(q)
    
    if all_unselected:
        selected.extend(random.sample(all_unselected, min(remaining_needed, len(all_unselected))))

# Shuffle for good mix
random.shuffle(selected)

# Take exactly 50
selected = selected[:50]

print(f"\nSelected {len(selected)} questions")

# Check final distribution
final_dist = {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0}
for q in selected:
    prob = q["market_probability"]
    if prob < 20:
        final_dist["0-20%"] += 1
    elif prob < 40:
        final_dist["20-40%"] += 1
    elif prob < 60:
        final_dist["40-60%"] += 1
    elif prob < 80:
        final_dist["60-80%"] += 1
    else:
        final_dist["80-100%"] += 1

print("\nFinal probability distribution:")
for range_name, count in final_dist.items():
    print(f"  {range_name}: {count} questions")

# Create output
output = {
    "metadata": {
        "source": "Combined - Balanced Probabilities",
        "created": datetime.now().isoformat(),
        "total_available": len(all_questions),
        "curated_count": len(selected),
        "curation_method": "Balanced selection across probability ranges, max 2 F1 position questions"
    },
    "questions": selected
}

# Save to file
output_file = data_dir / "balanced_50_questions.json"
with open(output_file, 'w') as f:
    json.dump(output, f, indent=2)

print(f"\nSaved to: {output_file}")

# Show some example questions
print("\nSample questions:")
for i, q in enumerate(selected[:5]):
    print(f"{i+1}. [{q['market_probability']:.1f}%] {q['question'][:80]}...")