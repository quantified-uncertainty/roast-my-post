#!/usr/bin/env python3
"""
Export experiment data from Comet Opik to CSV format
Supports exporting experiments, datasets, and traces with all metrics
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

import opik
from opik import Opik

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

def export_experiments_to_csv(output_file: str, limit: int = 100):
    """Export experiment results to CSV"""
    client = Opik()
    
    print(f"📊 Fetching experiments (limit: {limit})...")
    experiments = client.list_experiments(limit=limit)
    
    if not experiments:
        print("No experiments found.")
        return
    
    # Prepare CSV data
    csv_data = []
    headers = set(['experiment_id', 'experiment_name', 'created_at'])
    
    for exp in experiments:
        print(f"\n🧪 Processing experiment: {exp.name}")
        
        # Get experiment details
        exp_data = {
            'experiment_id': exp.id,
            'experiment_name': exp.name,
            'created_at': getattr(exp, 'created_at', '')
        }
        
        # Try to get experiment metrics/config
        if hasattr(exp, 'metadata') and exp.metadata:
            for key, value in exp.metadata.items():
                headers.add(f'metadata_{key}')
                exp_data[f'metadata_{key}'] = value
        
        # Get experiment results if available
        if hasattr(exp, 'feedback_scores'):
            for score in exp.feedback_scores:
                headers.add(score.name)
                exp_data[score.name] = score.value
        
        csv_data.append(exp_data)
    
    # Write to CSV
    headers = sorted(list(headers))
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(csv_data)
    
    print(f"\n✅ Exported {len(csv_data)} experiments to {output_file}")

def export_traces_to_csv(output_file: str, limit: int = 1000):
    """Export trace data to CSV with all metrics and metadata"""
    client = Opik()
    
    print(f"📈 Fetching traces (limit: {limit})...")
    traces = client.list_traces(limit=limit)
    
    if not traces:
        print("No traces found.")
        return
    
    # Prepare CSV data
    csv_data = []
    headers = set(['trace_id', 'trace_name', 'created_at', 'project_name'])
    
    for trace in traces:
        trace_data = {
            'trace_id': trace.id,
            'trace_name': trace.name,
            'created_at': getattr(trace, 'created_at', ''),
            'project_name': getattr(trace, 'project_name', '')
        }
        
        # Add input data
        if hasattr(trace, 'input') and trace.input:
            if isinstance(trace.input, dict):
                for key, value in trace.input.items():
                    headers.add(f'input_{key}')
                    trace_data[f'input_{key}'] = json.dumps(value) if isinstance(value, (dict, list)) else value
            else:
                headers.add('input')
                trace_data['input'] = str(trace.input)
        
        # Add output data
        if hasattr(trace, 'output') and trace.output:
            if isinstance(trace.output, dict):
                for key, value in trace.output.items():
                    headers.add(f'output_{key}')
                    trace_data[f'output_{key}'] = json.dumps(value) if isinstance(value, (dict, list)) else value
            else:
                headers.add('output')
                trace_data['output'] = str(trace.output)
        
        # Add metadata
        if hasattr(trace, 'metadata') and trace.metadata:
            for key, value in trace.metadata.items():
                headers.add(f'metadata_{key}')
                trace_data[f'metadata_{key}'] = json.dumps(value) if isinstance(value, (dict, list)) else value
        
        # Add feedback scores (metrics)
        if hasattr(trace, 'feedback_scores') and trace.feedback_scores:
            for score in trace.feedback_scores:
                headers.add(score.name)
                trace_data[score.name] = score.value
        
        # Add tags
        if hasattr(trace, 'tags') and trace.tags:
            headers.add('tags')
            trace_data['tags'] = ', '.join(trace.tags)
        
        csv_data.append(trace_data)
    
    # Write to CSV
    headers = sorted(list(headers))
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(csv_data)
    
    print(f"\n✅ Exported {len(csv_data)} traces to {output_file}")

def export_dataset_to_csv(dataset_name: str, output_file: str):
    """Export a specific dataset to CSV"""
    client = Opik()
    
    print(f"📊 Fetching dataset: {dataset_name}")
    
    try:
        # Get dataset by name
        datasets = client.list_datasets(limit=100)
        dataset = None
        for ds in datasets:
            if ds.name == dataset_name:
                dataset = ds
                break
        
        if not dataset:
            print(f"❌ Dataset '{dataset_name}' not found")
            return
        
        # Get dataset items
        items = client.get_dataset_items(dataset_id=dataset.id, limit=1000)
        
        if not items:
            print("No items found in dataset.")
            return
        
        # Prepare CSV data
        csv_data = []
        headers = set(['item_id'])
        
        for item in items:
            item_data = {'item_id': getattr(item, 'id', '')}
            
            # Add all fields from the item
            if isinstance(item, dict):
                for key, value in item.items():
                    headers.add(key)
                    item_data[key] = json.dumps(value) if isinstance(value, (dict, list)) else value
            else:
                # Handle object attributes
                for attr in dir(item):
                    if not attr.startswith('_'):
                        value = getattr(item, attr, None)
                        if value is not None and not callable(value):
                            headers.add(attr)
                            item_data[attr] = json.dumps(value) if isinstance(value, (dict, list)) else value
            
            csv_data.append(item_data)
        
        # Write to CSV
        headers = sorted(list(headers))
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(csv_data)
        
        print(f"\n✅ Exported {len(csv_data)} items from dataset '{dataset_name}' to {output_file}")
        
    except Exception as e:
        print(f"❌ Error exporting dataset: {e}")

def list_available_data():
    """List all available experiments, datasets, and recent traces"""
    client = Opik()
    
    print("🔍 Checking available data in Opik...\n")
    
    # List experiments
    print("🧪 Recent Experiments:")
    try:
        experiments = client.list_experiments(limit=10)
        if experiments:
            for i, exp in enumerate(experiments):
                print(f"  {i+1}. {exp.name} (ID: {exp.id})")
                if hasattr(exp, 'created_at'):
                    print(f"     Created: {exp.created_at}")
                if hasattr(exp, 'feedback_scores') and exp.feedback_scores:
                    scores = ', '.join([f"{s.name}={s.value:.3f}" for s in exp.feedback_scores])
                    print(f"     Scores: {scores}")
        else:
            print("  No experiments found.")
    except Exception as e:
        print(f"  Error: {e}")
    
    print()
    
    # List datasets
    print("📊 Recent Datasets:")
    try:
        datasets = client.list_datasets(limit=10)
        if datasets:
            for i, ds in enumerate(datasets):
                print(f"  {i+1}. {ds.name} (ID: {ds.id})")
                try:
                    items = client.get_dataset_items(dataset_id=ds.id, limit=1)
                    item_count = len(items)
                    print(f"     Sample size: {item_count}+ items")
                except:
                    pass
        else:
            print("  No datasets found.")
    except Exception as e:
        print(f"  Error: {e}")
    
    print()
    print("🔗 Dashboard: https://www.comet.com/opik/oagr/experiments")

def main():
    parser = argparse.ArgumentParser(description="Export Opik experiment data to CSV")
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List available data')
    
    # Export experiments
    exp_parser = subparsers.add_parser('experiments', help='Export experiments to CSV')
    exp_parser.add_argument('-o', '--output', default='experiments.csv', help='Output CSV file')
    exp_parser.add_argument('-l', '--limit', type=int, default=100, help='Number of experiments to export')
    
    # Export traces
    trace_parser = subparsers.add_parser('traces', help='Export traces to CSV')
    trace_parser.add_argument('-o', '--output', default='traces.csv', help='Output CSV file')
    trace_parser.add_argument('-l', '--limit', type=int, default=1000, help='Number of traces to export')
    
    # Export dataset
    dataset_parser = subparsers.add_parser('dataset', help='Export a specific dataset to CSV')
    dataset_parser.add_argument('name', help='Dataset name')
    dataset_parser.add_argument('-o', '--output', default='dataset.csv', help='Output CSV file')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Check API key
    if not os.getenv("OPIK_API_KEY"):
        print("❌ OPIK_API_KEY environment variable not set")
        print("   Please set it in your .env file or export it:")
        print("   export OPIK_API_KEY=your-api-key")
        sys.exit(1)
    
    # Execute command
    if args.command == 'list':
        list_available_data()
    elif args.command == 'experiments':
        export_experiments_to_csv(args.output, args.limit)
    elif args.command == 'traces':
        export_traces_to_csv(args.output, args.limit)
    elif args.command == 'dataset':
        output = args.output if args.output != 'dataset.csv' else f"{args.name}.csv"
        export_dataset_to_csv(args.name, output)

if __name__ == "__main__":
    main()