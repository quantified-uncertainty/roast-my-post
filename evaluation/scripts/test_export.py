#!/usr/bin/env python3
"""
Quick test of the Opik export functionality
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from export_opik_data import list_available_data

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / '.env'
    load_dotenv(env_path)
except ImportError:
    pass

def main():
    print("🧪 Testing Opik Export Functionality\n")
    
    # Check API key
    api_key = os.getenv("OPIK_API_KEY")
    if not api_key:
        print("❌ OPIK_API_KEY not found in environment")
        print("   Please set it in your .env file")
        return
    
    print(f"✅ API Key found: {api_key[:10]}...")
    print(f"📍 Workspace: oagr\n")
    
    # Test listing data
    try:
        list_available_data()
        print("\n✅ Export functionality is working!")
        print("\n📝 Next steps:")
        print("1. Use 'python evaluation/scripts/export_opik_data.py experiments' to export experiments")
        print("2. Use 'python evaluation/scripts/export_opik_data.py traces' to export detailed traces")
        print("3. See evaluation/docs/export-opik-data.md for full documentation")
    except Exception as e:
        print(f"\n❌ Error testing export: {e}")
        print("   Check your API key and network connection")

if __name__ == "__main__":
    main()