#!/usr/bin/env python3
"""
Demo script to show categorization in action
"""

import json
import os
import sys
from datetime import datetime
from pprint import pprint

# Add parent directory to path
sys.path.append(os.path.dirname(__file__))
from categorize import categorize_question, analyze_distribution

def demo_categorization():
    """Demonstrate categorization on current questions"""
    
    # Load a sample of questions
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "current_questions.json")
    with open(data_path, 'r') as f:
        data = json.load(f)
    questions = data['questions'][:10]  # Just first 10 for demo
    
    print("🎯 Question Categorization Demo")
    print("=" * 80)
    
    # Categorize each question
    categorized = []
    for q in questions:
        cat_q = categorize_question(q)
        categorized.append(cat_q)
        
        print(f"\n📌 {q['question']}")
        print(f"   Market Probability: {q['market_probability']}%")
        print(f"   Metadata:")
        for key, value in cat_q['metadata'].items():
            print(f"     • {key}: {value}")
    
    # Show distribution analysis
    print("\n" + "=" * 80)
    print("📊 Distribution Analysis")
    distributions = analyze_distribution(categorized)
    
    for category, counts in distributions.items():
        if counts:
            print(f"\n{category.replace('_', ' ').title()}:")
            for value, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):
                print(f"  {value}: {count}")

if __name__ == "__main__":
    demo_categorization()