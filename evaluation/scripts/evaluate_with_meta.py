#!/usr/bin/env python3
"""
Main evaluation script for the forecaster tool
Supports multiple datasets and evaluation modes
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

import requests
from metrics import BrierScoreMetric, LogScoreMetric
import opik
from categorize import categorize_question, analyze_distribution
from cost_utils import calculate_cost, format_cost
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
    
    # Add model parameter if specified
    if config and config.get("model"):
        payload["model"] = config["model"]
    
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

def should_filter_resolved_question(question: str) -> bool:
    """Check if a question should be filtered out because it's already resolved"""
    question_lower = question.lower()
    
    # Current date is July 18, 2025 (from env)
    # Filter out questions about dates before August 1, 2025
    
    # Check for specific date patterns
    july_dates = re.findall(r'july\s+(\d+)', question_lower)
    for date_str in july_dates:
        date = int(date_str)
        if date < 32:  # Valid July date, and July 2025 is current month
            return True
    
    # Check for "by July X" or "before July X" patterns
    if re.search(r'(by|before|until)\s+july', question_lower):
        return True
        
    # Check for specific past months in 2025
    past_months = ['january', 'february', 'march', 'april', 'may', 'june']
    for month in past_months:
        if month in question_lower and '2025' in question:
            return True
    
    # Check for temperature/weather on specific July dates
    if 'temperature' in question_lower and 'july' in question_lower:
        return True
        
    # Check for "this week" or "tomorrow" type questions
    if any(phrase in question_lower for phrase in ['this week', 'tomorrow', 'today']):
        return True
    
    return False

def load_dataset(dataset_name: str, limit: int = None) -> List[Dict[str, Any]]:
    """Load evaluation dataset"""
    data_dir = Path(__file__).parent.parent / "data"
    
    if dataset_name == "current":
        # Load current questions from Metaforecast
        with open(data_dir / "current_questions.json", 'r') as f:
            data = json.load(f)
            all_questions = data["questions"]
            
            # Filter out resolved questions and normalize probabilities
            filtered_questions = []
            filtered_count = 0
            for q in all_questions:
                if should_filter_resolved_question(q.get("question", "")):
                    filtered_count += 1
                else:
                    # Normalize market probability to 0-100 scale
                    q["market_probability"] = normalize_probability(q.get("market_probability", 50))
                    filtered_questions.append(q)
            
            if filtered_count > 0:
                print(f"📅 Filtered out {filtered_count} already-resolved questions")
            
            return filtered_questions[:limit] if limit else filtered_questions
    
    elif dataset_name == "curated":
        # Load manually curated questions (may be outdated)
        with open(data_dir / "curated_questions.json", 'r') as f:
            data = json.load(f)
            questions = data["questions"][:limit] if limit else data["questions"]
            # Normalize probabilities
            for q in questions:
                q["market_probability"] = normalize_probability(q.get("market_probability", 50))
            return questions
    
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
                        "market_probability": normalize_probability(q["current_probability"]),
                        "platform": q.get("platform", {}).get("label", "Unknown"),
                        "id": q.get("id", "")
                    })
            return simple_questions
    
    elif dataset_name == "ai-curated":
        # Load AI-curated questions
        with open(data_dir / "ai_curated_forecasts.json", 'r') as f:
            data = json.load(f)
            return data["questions"][:limit] if limit else data["questions"]
    
    elif dataset_name == "balanced":
        # Load balanced dataset
        with open(data_dir / "balanced_50_questions.json", 'r') as f:
            data = json.load(f)
            questions = data["questions"]
            # Fix any probability issues
            for q in questions:
                prob = q.get("market_probability", 50)
                # Normalize probabilities that are way out of range
                while prob > 100:
                    prob = prob / 100
                q["market_probability"] = min(100, max(0, prob))
            return questions[:limit] if limit else questions
    
    else:
        print(f"❌ Unknown dataset: {dataset_name}")
        sys.exit(1)

def run_evaluation(
    dataset_name: str, 
    experiment_name: str = None,
    limit: int = None,
    config: Dict[str, Any] = None,
    description: str = None
):
    """Run evaluation on specified dataset"""
    print(f"🚀 Running Forecast Evaluation")
    print(f"   Dataset: {dataset_name}")
    if limit:
        print(f"   Limit: {limit} questions")
    if description:
        print(f"   Description: {description}")
    elif config and config.get("description"):
        print(f"   Description: {config['description']}")
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
    
    # Create Opik dataset and experiment with separate names
    client = opik.Opik()
    experiment_id = experiment_name or f"{dataset_name}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    # Create descriptive dataset name based on tool and content
    if dataset_name == "current":
        dataset_id = f"forecaster-current-{datetime.now().strftime('%Y%m%d')}"  # e.g., "forecaster-current-20250718"
    else:
        dataset_id = f"forecaster-{dataset_name}-{datetime.now().strftime('%Y%m%d')}"  # e.g., "forecaster-curated-20250718"
    
    dataset = client.get_or_create_dataset(name=dataset_id)
    
    # Convert questions to Opik format with metadata
    opik_items = []
    for q in questions:
        # Categorize the question
        categorized = categorize_question(q)
        
        # Create item without id and source fields
        item = {k: v for k, v in q.items() if k not in ['id', 'source']}
        
        # Add metadata fields
        for key, value in categorized['metadata'].items():
            item[f'meta_{key}'] = value
        
        # Note: cost_usd will be populated during evaluation
        
        opik_items.append(item)
    
    # Show category distribution
    print("\n📊 Category Distribution:")
    distributions = analyze_distribution([categorize_question(q) for q in questions])
    for category, counts in distributions.items():
        if counts and len(counts) > 0:
            print(f"\n{category.replace('_', ' ').title()}:")
            sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
            for value, count in sorted_counts[:5]:  # Top 5
                print(f"  • {value}: {count}")
    
    dataset.insert(opik_items)
    
    # Evaluation task
    def eval_task(item: Dict[str, Any]) -> Dict[str, Any]:
        print(f"\n🔮 {item['question'][:70]}...")
        print(f"   Market: {item['market_probability']:.1f}%", end="")
        
        output = call_forecaster(item['question'], config)
        
        # Get cost from API response
        total_cost = 0.0
        if 'cost' in output and output['cost']:
            total_cost = output['cost'].get('totalUSD', 0.0)
            print(f" [DEBUG] Cost data found: ${total_cost}")
        else:
            print(f" [DEBUG] No cost data found. Output keys: {list(output.keys())}")
        
        if 'error' not in output:
            cost_str = f" (Cost: ${total_cost:.4f})" if total_cost > 0 else ""
            print(f" → Forecast: {output.get('probability', 0):.1f}%{cost_str}")
        else:
            print(f" → Error: {output.get('error', 'Unknown')}")
        
        # Store cost in item for Opik
        item['cost_usd'] = total_cost
        
        result = {
            "output": output,
            "item": item,
            "cost_usd": total_cost,
            # Try multiple approaches for cost reporting
            "metadata": {
                "cost_usd": total_cost,
                "cost_formatted": f"${total_cost:.4f}",
                "input_tokens": output.get('cost', {}).get('totalInputTokens', 0) if 'cost' in output else 0,
                "output_tokens": output.get('cost', {}).get('totalOutputTokens', 0) if 'cost' in output else 0
            },
            # Also try as feedback scores (common pattern in Opik)
            "feedback_scores": [
                {"name": "cost_usd", "value": total_cost, "reason": "API cost for forecast generation"},
                {"name": "input_tokens", "value": output.get('cost', {}).get('totalInputTokens', 0) if 'cost' in output else 0},
                {"name": "output_tokens", "value": output.get('cost', {}).get('totalOutputTokens', 0) if 'cost' in output else 0}
            ]
        }
        
        print(f" [DEBUG] Returning cost_usd: {result['cost_usd']}")
        print(f" [DEBUG] Metadata: {result['metadata']}")
        print(f" [DEBUG] Feedback scores: {result['feedback_scores']}")
        return result
    
    # Prepare experiment configuration for Opik
    experiment_config = {
        "dataset": dataset_name,
        "model": config.get("model", "claude-opus-4-20250514") if config else "claude-opus-4-20250514",
        "timestamp": datetime.now().isoformat(),
        "forecaster_version": "v2-improved-categorized",
        "parallelization": 16,
        "metadata_enabled": True,
        "categories": list(distributions.keys())
    }
    
    # Add description from command line if provided (takes precedence)
    if description:
        experiment_config["description"] = description
        experiment_config["experiment_purpose"] = description
    
    # Add config details if using custom configuration
    if config:
        experiment_config["custom_config"] = config
        experiment_config["num_forecasts"] = config.get("num_forecasts", 1)
        
        # Add description if provided
        if "description" in config:
            experiment_config["description"] = config["description"]
            experiment_config["experiment_purpose"] = config["description"]
        
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
        experiment_name=experiment_id,
        dataset=dataset,
        task=eval_task,
        scoring_metrics=[
            BrierScoreMetric(),
            LogScoreMetric()
        ],
        experiment_config=experiment_config,
        task_threads=16  # High parallelization for speed (rate limits increased in dev)
    )
    
    print(f"\n✅ Evaluation complete!")
    print(f"\n🔗 View results at: https://www.comet.com/opik/oagr/experiments")
    print(f"   Experiment: {experiment_id}")
    print(f"   Dataset: {dataset_id}")

def main():
    parser = argparse.ArgumentParser(description="Evaluate forecaster tool")
    parser.add_argument(
        "--dataset", 
        choices=["current", "curated", "metaforecast", "ai-curated", "balanced"],
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
    parser.add_argument(
        "--description",
        help="Description of what this experiment is testing"
    )
    
    args = parser.parse_args()
    
    # Load experimental config if provided
    config = None
    if args.config:
        # Handle config path - check if it's just a filename
        config_path = args.config
        if not config_path.endswith('.json'):
            config_path += '.json'
        
        # Check in config directory first
        config_dir = Path(__file__).parent.parent / "config"
        if (config_dir / config_path).exists():
            config_path = str(config_dir / config_path)
        elif not Path(config_path).exists():
            # Try just the filename in config dir
            base_name = Path(config_path).name
            if (config_dir / base_name).exists():
                config_path = str(config_dir / base_name)
        
        print(f"📋 Loading config from: {config_path}")
        with open(config_path, 'r') as f:
            config = json.load(f)
    
    run_evaluation(
        dataset_name=args.dataset,
        experiment_name=args.experiment,
        limit=args.limit,
        config=config,
        description=args.description
    )

if __name__ == "__main__":
    main()