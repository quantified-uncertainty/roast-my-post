#!/usr/bin/env python3
"""
Main evaluation script for the forecaster tool
Supports multiple datasets and evaluation modes
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

import requests
from metrics import BrierScoreMetric, LogScoreMetric
import opik
from opik import track, Dataset
from opik.evaluation import evaluate

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / '.env'
    load_dotenv(env_path)
except ImportError:
    pass

# Configure Opik
opik.configure(
    api_key=os.getenv("OPIK_API_KEY"),
    workspace="oagr"
)

@track
def call_forecaster(question: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Call the forecaster API with optional configuration"""
    url = "http://localhost:3000/api/tools/forecaster"
    
    payload = {
        "question": question,
        "numForecasts": config.get("num_forecasts", 1) if config else 1  # Single forecast for efficiency
    }
    
    # Add any experimental parameters
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
        
        result = response.json()
        if result.get('success'):
            return result.get('result', {})
        else:
            return {"error": result.get('error', 'Unknown error')}
            
    except Exception as e:
        return {"error": str(e)}

def normalize_probability(prob: float) -> float:
    """Normalize probability to 0-100 scale"""
    if prob <= 1.0:
        return prob * 100
    return prob

def load_dataset(dataset_name: str, limit: int = None) -> List[Dict[str, Any]]:
    """Load evaluation dataset"""
    data_dir = Path(__file__).parent.parent / "data"
    
    if dataset_name == "current":
        # Load current questions from Metaforecast
        with open(data_dir / "current_questions.json", 'r') as f:
            data = json.load(f)
            questions = data["questions"][:limit] if limit else data["questions"]
            # Normalize probabilities
            for q in questions:
                q["market_probability"] = normalize_probability(q.get("market_probability", 50))
            return questions
    
    elif dataset_name == "curated":
        # Load manually curated questions (may be outdated)
        with open(data_dir / "curated_questions.json", 'r') as f:
            data = json.load(f)
            return data["questions"][:limit] if limit else data["questions"]
    
    elif dataset_name == "metaforecast":
        # Load from metaforecast cache
        cache_file = data_dir / "metaforecast_cache.json"
        if not cache_file.exists():
            print("❌ Metaforecast cache not found. Run fetch_data.py first.")
            sys.exit(1)
        
        with open(cache_file, 'r') as f:
            data = json.load(f)
            questions = data.get("questions", [])
            # Convert to simple format
            simple_questions = []
            for q in questions[:limit] if limit else questions:
                if "current_probability" in q:
                    simple_questions.append({
                        "question": q["title"],
                        "market_probability": q["current_probability"],
                        "platform": q.get("platform", {}).get("label", "Unknown"),
                        "id": q.get("id", "")
                    })
            return simple_questions
    
    elif dataset_name == "ai-curated":
        # Load AI-curated questions
        with open(data_dir.parent.parent / "ai_curated_forecasts.json", 'r') as f:
            data = json.load(f)
            return data["questions"][:limit] if limit else data["questions"]
    
    else:
        print(f"❌ Unknown dataset: {dataset_name}")
        sys.exit(1)

def run_evaluation(
    dataset_name: str, 
    experiment_name: str = None,
    limit: int = None,
    config: Dict[str, Any] = None
):
    """Run evaluation on specified dataset"""
    print(f"🚀 Running Forecast Evaluation")
    print(f"   Dataset: {dataset_name}")
    if limit:
        print(f"   Limit: {limit} questions")
    print()
    
    # Load questions
    questions = load_dataset(dataset_name, limit)
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
    
    # Create Opik dataset
    client = opik.Opik()
    dataset_id = experiment_name or f"{dataset_name}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    dataset = client.get_or_create_dataset(name=dataset_id)
    
    # Convert questions to Opik format (without id field to let Opik generate UUIDs)
    opik_items = []
    for q in questions:
        item = {k: v for k, v in q.items() if k != 'id'}  # Remove id field
        opik_items.append(item)
    
    dataset.insert(opik_items)
    
    # Evaluation task
    def eval_task(item: Dict[str, Any]) -> Dict[str, Any]:
        print(f"\n🔮 {item['question'][:70]}...")
        print(f"   Market: {item['market_probability']:.1f}%", end="")
        
        output = call_forecaster(item['question'], config)
        
        if 'error' not in output:
            print(f" → Forecast: {output.get('probability', 0):.1f}%")
        else:
            print(f" → Error: {output.get('error', 'Unknown')}")
        
        return {
            "output": output,
            "item": item
        }
    
    # Prepare experiment configuration for Opik
    experiment_config = {
        "dataset": dataset_name,
        "model": "claude-opus-4-20250514",
        "timestamp": datetime.now().isoformat(),
        "forecaster_version": "v2-improved",
        "parallelization": 16
    }
    
    # Add config details if using custom configuration
    if config:
        experiment_config["custom_config"] = config
        experiment_config["num_forecasts"] = config.get("num_forecasts", 1)
        if "prompt_improvements" in config:
            experiment_config.update({
                f"prompt_{k}": v for k, v in config["prompt_improvements"].items()
            })
        if "temperature_strategy" in config:
            experiment_config["temperature_strategy"] = config["temperature_strategy"]
            experiment_config["temperatures"] = config.get("temperatures", [0.7])
    
    # Run evaluation
    print("\n🧪 Starting evaluation...")
    result = evaluate(
        experiment_name=dataset_id,
        dataset=dataset,
        task=eval_task,
        scoring_metrics=[
            BrierScoreMetric(),
            LogScoreMetric()
        ],
        experiment_config=experiment_config,
        task_threads=16  # Increased parallelization for speed
    )
    
    print(f"\n✅ Evaluation complete!")
    print(f"\n🔗 View results at: https://www.comet.com/opik/oagr/experiments")
    print(f"   Experiment: {dataset_id}")

def main():
    parser = argparse.ArgumentParser(description="Evaluate forecaster tool")
    parser.add_argument(
        "--dataset", 
        choices=["current", "curated", "metaforecast", "ai-curated"],
        default="current",
        help="Dataset to use for evaluation"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of questions to evaluate"
    )
    parser.add_argument(
        "--experiment",
        help="Name for this experiment (for A/B testing)"
    )
    parser.add_argument(
        "--config",
        help="Path to configuration JSON for experiments"
    )
    
    args = parser.parse_args()
    
    # Load experimental config if provided
    config = None
    if args.config:
        with open(args.config, 'r') as f:
            config = json.load(f)
    
    run_evaluation(
        dataset_name=args.dataset,
        experiment_name=args.experiment,
        limit=args.limit,
        config=config
    )

if __name__ == "__main__":
    main()