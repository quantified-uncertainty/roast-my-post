#!/usr/bin/env python3
"""
Improved evaluation script for forecast calibration with fixed datasets
"""

import json
import os
import sys
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional
import opik
from opik import track
from opik.evaluation import evaluate
from opik.evaluation.metrics import base_metric
import argparse

# Dataset definitions - these are our fixed datasets
DATASETS = {
    "metaculus-easy": {
        "description": "Questions with clear resolution and high confidence (80%+ or <20%)",
        "filter": lambda q: q.get("market_probability", 50) >= 80 or q.get("market_probability", 50) <= 20
    },
    "metaculus-medium": {
        "description": "Questions with moderate confidence (30-70%)",
        "filter": lambda q: 30 <= q.get("market_probability", 50) <= 70
    },
    "metaculus-balanced": {
        "description": "Balanced mix of all probability ranges",
        "filter": lambda q: True
    }
}

def load_questions(dataset_name: str, source_file: str = "current_questions.json", limit: Optional[int] = None) -> List[Dict]:
    """Load questions and apply dataset filter"""
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", source_file)
    
    if not os.path.exists(data_path):
        print(f"❌ Data file not found: {data_path}")
        sys.exit(1)
    
    with open(data_path, 'r') as f:
        all_questions = json.load(f)
    
    # Apply dataset filter
    dataset_config = DATASETS.get(dataset_name)
    if not dataset_config:
        print(f"❌ Unknown dataset: {dataset_name}")
        print(f"   Available: {', '.join(DATASETS.keys())}")
        sys.exit(1)
    
    filtered = [q for q in all_questions if dataset_config["filter"](q)]
    
    if limit:
        filtered = filtered[:limit]
    
    return filtered

def get_or_create_fixed_dataset(client: opik.Opik, dataset_name: str, questions: List[Dict]) -> Any:
    """Get or create a fixed dataset in Opik"""
    # Use a fixed name for each dataset type
    fixed_dataset_name = f"forecaster-{dataset_name}"
    
    try:
        # Try to get existing dataset
        dataset = client.get_dataset(name=fixed_dataset_name)
        print(f"📂 Using existing dataset: {fixed_dataset_name}")
        return dataset
    except:
        # Create new dataset if it doesn't exist
        print(f"📂 Creating new dataset: {fixed_dataset_name}")
        dataset = client.create_dataset(
            name=fixed_dataset_name,
            description=DATASETS[dataset_name]["description"]
        )
        
        # Convert questions to Opik format
        opik_items = []
        for q in questions:
            item = {k: v for k, v in q.items() if k != 'id'}
            opik_items.append(item)
        
        dataset.insert(opik_items)
        return dataset

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

# Import metrics from existing metrics.py
sys.path.append(os.path.dirname(__file__))
from metrics import BrierScoreMetric, LogScoreMetric

def run_evaluation(
    dataset_name: str = "metaculus-balanced",
    experiment_suffix: Optional[str] = None,
    limit: Optional[int] = None,
    config: Optional[Dict] = None,
    task_threads: int = 16  # Increased for better parallelization
):
    """Run evaluation on specified dataset"""
    print(f"🚀 Running Forecast Evaluation v2")
    print(f"   Dataset: {dataset_name} - {DATASETS[dataset_name]['description']}")
    if limit:
        print(f"   Limit: {limit} questions")
    print(f"   Parallelization: {task_threads} threads")
    print()
    
    # Load questions
    questions = load_questions(dataset_name, limit=limit)
    print(f"📊 Loaded {len(questions)} questions")
    
    # Show probability distribution
    ranges = {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0}
    for q in questions:
        prob = q.get("market_probability", 50)
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
    
    print("\n📊 Probability distribution:")
    for range_name, count in ranges.items():
        if count > 0:
            print(f"   {range_name}: {count} questions")
    
    # Get or create fixed dataset
    client = opik.Opik()
    dataset = get_or_create_fixed_dataset(client, dataset_name, questions)
    
    # Generate experiment name with better format
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    if experiment_suffix:
        experiment_name = f"forecast-{dataset_name}-{experiment_suffix}-{timestamp}"
    else:
        experiment_name = f"forecast-{dataset_name}-{timestamp}"
    
    print(f"\n🧪 Experiment: {experiment_name}")
    
    # Evaluation task
    def eval_task(item: Dict[str, Any]) -> Dict[str, Any]:
        question_preview = item['question'][:70] + "..." if len(item['question']) > 70 else item['question']
        output = call_forecaster(item['question'], config)
        
        if "error" not in output:
            prob = output.get("probability", 50)
            print(f"✓ {question_preview}")
            print(f"  Market: {item['market_probability']:.0f}%, Forecast: {prob:.0f}%")
        else:
            print(f"✗ {question_preview}")
            print(f"  Error: {output['error']}")
        
        return output
    
    # Run evaluation with increased parallelization
    print(f"\n⚡ Starting evaluation with {task_threads} parallel threads...")
    start_time = datetime.now()
    
    results = evaluate(
        dataset=dataset,
        task=eval_task,
        scoring_metrics=[BrierScoreMetric(), LogScoreMetric()],
        experiment_name=experiment_name,
        task_threads=task_threads
    )
    
    duration = (datetime.now() - start_time).total_seconds()
    print(f"\n✨ Evaluation completed in {duration:.1f} seconds")
    print(f"   Questions per second: {len(questions) / duration:.1f}")
    
    return results

def main():
    parser = argparse.ArgumentParser(description='Run forecast evaluation')
    parser.add_argument('--dataset', '-d', 
                       choices=list(DATASETS.keys()),
                       default='metaculus-balanced',
                       help='Dataset to use for evaluation')
    parser.add_argument('--limit', '-l', type=int, help='Limit number of questions')
    parser.add_argument('--suffix', '-s', help='Suffix for experiment name')
    parser.add_argument('--threads', '-t', type=int, default=16, 
                       help='Number of parallel threads (default: 16)')
    parser.add_argument('--config', '-c', help='Path to config JSON file')
    
    args = parser.parse_args()
    
    # Load config if provided
    config = None
    if args.config:
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", args.config)
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
            print(f"📋 Using config: {args.config}")
    
    # Run evaluation
    run_evaluation(
        dataset_name=args.dataset,
        experiment_suffix=args.suffix,
        limit=args.limit,
        config=config,
        task_threads=args.threads
    )

if __name__ == "__main__":
    main()