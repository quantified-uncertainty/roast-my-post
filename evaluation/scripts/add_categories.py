#!/usr/bin/env python3
"""
Add categories to the existing evaluation process
"""

import sys
import os

# Import the existing evaluate module
sys.path.append(os.path.dirname(__file__))
from evaluate import *
from categorize import categorize_question, analyze_distribution

# Override the load_dataset function to add categories
original_load_dataset = load_dataset

def load_dataset_with_categories(dataset_name: str, limit: int = None) -> List[Dict[str, Any]]:
    """Load dataset and add categories"""
    questions = original_load_dataset(dataset_name, limit)
    
    # Add categorization metadata
    categorized = []
    for q in questions:
        cat_q = categorize_question(q)
        # Flatten metadata into main object for Opik
        for key, value in cat_q['metadata'].items():
            q[f'meta_{key}'] = value
        categorized.append(q)
    
    # Show distribution analysis
    print("\n📊 Question Category Distribution:")
    distributions = analyze_distribution([categorize_question(q) for q in questions])
    
    for category, counts in distributions.items():
        if counts:
            print(f"\n{category.replace('_', ' ').title()}:")
            sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
            for value, count in sorted_counts[:5]:  # Top 5 per category
                print(f"  • {value}: {count}")
    print()
    
    return categorized

# Replace the function
load_dataset = load_dataset_with_categories

# Run the main evaluation
if __name__ == "__main__":
    main()