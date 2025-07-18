#!/usr/bin/env python3
"""Check what data is actually in Opik using Python SDK"""

import os
import opik
from datetime import datetime, timedelta
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / '.env'
    load_dotenv(env_path)
except ImportError:
    pass

# Configure Opik the same way as the evaluation script
opik.configure(
    api_key=os.getenv("OPIK_API_KEY"),
    workspace="oagr"
)

print("🔍 Checking Opik data...")
print(f"API Key: {os.getenv('OPIK_API_KEY', 'NOT_SET')[:10]}...")
print(f"Workspace: oagr")
print()

try:
    client = opik.Opik()
    
    # Get recent datasets
    print("📊 Recent Datasets:")
    try:
        datasets = client.list_datasets(limit=10)
        print(f"Found {len(datasets)} datasets:")
        for i, dataset in enumerate(datasets):
            print(f"  {i+1}. {dataset.name} (ID: {dataset.id})")
            # Try to get items from this dataset
            try:
                items = client.get_dataset_items(dataset_id=dataset.id, limit=5)
                print(f"     Items: {len(items)}")
                if items:
                    for j, item in enumerate(items[:2]):  # Show first 2 items
                        print(f"       Item {j+1} keys: {list(item.keys())}")
                        if 'cost_usd' in item:
                            print(f"       Cost: ${item['cost_usd']}")
            except Exception as e:
                print(f"     Error getting items: {e}")
    except Exception as e:
        print(f"Error listing datasets: {e}")
    
    print()
    
    # Get recent experiments  
    print("🧪 Recent Experiments:")
    try:
        experiments = client.list_experiments(limit=10)
        print(f"Found {len(experiments)} experiments:")
        for i, exp in enumerate(experiments):
            print(f"  {i+1}. {exp.name} (ID: {exp.id})")
    except Exception as e:
        print(f"Error listing experiments: {e}")
    
    print()
    
    # Get recent traces
    print("📈 Recent Traces:")
    try:
        traces = client.list_traces(limit=5)
        print(f"Found {len(traces)} traces:")
        for i, trace in enumerate(traces):
            print(f"  {i+1}. {trace.name} (ID: {trace.id})")
            # Check feedback scores
            if hasattr(trace, 'feedback_scores') and trace.feedback_scores:
                for score in trace.feedback_scores:
                    print(f"     Score: {score.name} = {score.value}")
    except Exception as e:
        print(f"Error listing traces: {e}")
    
    print()
    print("🔗 Dashboard: https://www.comet.com/opik/oagr/experiments")
    
except Exception as e:
    print(f"❌ Error connecting to Opik: {e}")