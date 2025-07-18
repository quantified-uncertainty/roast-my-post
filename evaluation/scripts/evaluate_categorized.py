#!/usr/bin/env python3
"""
Enhanced evaluation with categorization and metadata for analysis
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
import requests

import opik
from opik import track
from opik.evaluation import evaluate

# Add parent directory to path for imports
sys.path.append(os.path.dirname(__file__))
from metrics import BrierScoreMetric, LogScoreMetric
from categorize import categorize_question, analyze_distribution

def load_dataset(dataset_name: str = "current", limit: Optional[int] = None) -> List[Dict]:
    """Load questions from dataset file"""
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", f"{dataset_name}_questions.json")
    
    if not os.path.exists(data_path):
        print(f"❌ Dataset not found: {data_path}")
        print("Available datasets:")
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        for file in os.listdir(data_dir):
            if file.endswith("_questions.json"):
                print(f"  - {file.replace('_questions.json', '')}")
        sys.exit(1)
    
    with open(data_path, 'r') as f:
        data = json.load(f)
    
    # Handle both dict and list formats
    if isinstance(data, dict):
        questions = data.get('questions', [])
    else:
        questions = data
    
    if limit:
        questions = questions[:limit]
    
    # Add categorization metadata to each question
    categorized_questions = []
    for q in questions:
        categorized = categorize_question(q)
        categorized_questions.append(categorized)
    
    return categorized_questions

@track
def call_forecaster(question: str, config: Optional[Dict] = None) -> Dict[str, Any]:
    """Call the forecaster API"""
    url = "http://localhost:3000/api/tools/forecaster"
    
    payload = {"question": question}
    if config:
        payload.update(config.get("parameters", {}))
    
    # Get API key from environment or use default
    api_key = os.getenv("ROAST_MY_POST_API_KEY", "rmp_15a040c5450c50b7cb430ca28fbebeb18151820c6a9d71a9b9f4bce7651ccb67")
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Error calling forecaster: {e}")
        return {"error": str(e)}

def run_evaluation(
    dataset_name: str = "current",
    limit: Optional[int] = None,
    config: Optional[Dict] = None,
    experiment_name: Optional[str] = None,
    show_analysis: bool = True
):
    """Run evaluation on specified dataset with categorization"""
    print(f"🚀 Running Categorized Forecast Evaluation")
    print(f"   Dataset: {dataset_name}")
    if limit:
        print(f"   Limit: {limit} questions")
    print()
    
    # Load and categorize questions
    questions = load_dataset(dataset_name, limit)
    print(f"📊 Loaded {len(questions)} questions with metadata")
    
    # Analyze distribution
    if show_analysis:
        distributions = analyze_distribution(questions)
        
        print("\n📊 Question Distribution Analysis:")
        for category, counts in distributions.items():
            if counts:  # Only show non-empty categories
                print(f"\n   {category.replace('_', ' ').title()}:")
                sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
                for value, count in sorted_counts:
                    print(f"     {value}: {count} questions")
    
    # Create Opik dataset with metadata
    client = opik.Opik()
    dataset_id = experiment_name or f"{dataset_name}-categorized-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    dataset = client.get_or_create_dataset(name=dataset_id)
    
    # Convert questions to Opik format with metadata
    opik_items = []
    for q in questions:
        # Create item with all fields including metadata
        item = {k: v for k, v in q.items() if k != 'id'}
        
        # Flatten metadata for better Opik visualization
        metadata = item.pop('metadata', {})
        for key, value in metadata.items():
            item[f"meta_{key}"] = value
        
        opik_items.append(item)
    
    dataset.insert(opik_items)
    
    # Evaluation task
    def eval_task(item: Dict[str, Any]) -> Dict[str, Any]:
        # Extract metadata fields
        metadata = {}
        for key in list(item.keys()):
            if key.startswith("meta_"):
                metadata[key[5:]] = item[key]
        
        print(f"\n🔮 {item['question'][:60]}...")
        print(f"   Market: {item['market_probability']:.1f}% | Topic: {metadata.get('topic', 'unknown')}")
        
        output = call_forecaster(item['question'], config)
        
        if 'error' not in output:
            print(f"   → Forecast: {output.get('probability', 0):.1f}%")
        else:
            print(f"   → Error: {output.get('error', 'Unknown')}")
        
        # Include metadata in output for analysis
        return {
            "output": output,
            "item": item,
            "metadata": metadata
        }
    
    # Run evaluation
    print("\n🧪 Starting categorized evaluation...")
    start_time = datetime.now()
    
    result = evaluate(
        experiment_name=dataset_id,
        dataset=dataset,
        task=eval_task,
        scoring_metrics=[
            BrierScoreMetric(),
            LogScoreMetric()
        ],
        task_threads=16  # Maximum parallelization
    )
    
    duration = (datetime.now() - start_time).total_seconds()
    print(f"\n✅ Evaluation complete in {duration:.1f} seconds!")
    print(f"\n🔗 View results at: https://www.comet.com/opik/oagr/experiments")
    print(f"   Experiment: {dataset_id}")
    print(f"\n💡 In Opik, you can:")
    print(f"   - Group by meta_topic, meta_probability_range, etc.")
    print(f"   - Filter by any metadata field")
    print(f"   - Compare performance across categories")

def main():
    parser = argparse.ArgumentParser(description="Evaluate forecaster with categorization")
    parser.add_argument("--dataset", "-d", default="current", help="Dataset name")
    parser.add_argument("--limit", "-l", type=int, help="Limit number of questions")
    parser.add_argument("--experiment", "-e", help="Experiment name")
    parser.add_argument("--config", "-c", help="Config file name")
    parser.add_argument("--no-analysis", action="store_true", help="Skip distribution analysis")
    
    args = parser.parse_args()
    
    # Load config if provided
    config = None
    if args.config:
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", args.config)
        if not config_path.endswith('.json'):
            config_path += '.json'
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
                print(f"📋 Using config: {args.config}")
        else:
            print(f"⚠️  Config file not found: {config_path}")
    
    run_evaluation(
        dataset_name=args.dataset,
        limit=args.limit,
        config=config,
        experiment_name=args.experiment,
        show_analysis=not args.no_analysis
    )

if __name__ == "__main__":
    main()