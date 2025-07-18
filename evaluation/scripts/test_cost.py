#!/usr/bin/env python3
"""Quick test to verify cost data is being returned"""

import requests
import json
import os

# API configuration
API_URL = "http://localhost:3000/api/tools/forecaster"
API_KEY = os.getenv("ROAST_MY_POST_API_KEY", "rmp_15a040c5450c50b7cb430ca28fbebeb18151820c6a9d71a9b9f4bce7651ccb67")

# Test request
payload = {
    "question": "Will AI surpass human intelligence by 2030?",
    "numForecasts": 3
}

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

print("Making request to forecaster API...")
response = requests.post(API_URL, json=payload, headers=headers, timeout=30)

if response.status_code == 200:
    data = response.json()
    print("\n✅ Success!")
    print(f"Status: {data.get('success')}")
    
    result = data.get('result', {})
    print(f"\nProbability: {result.get('probability')}%")
    
    # Check for cost data
    cost = result.get('cost')
    if cost:
        print(f"\n💰 Cost Data Found:")
        print(f"  Total USD: ${cost.get('totalUSD', 0):.4f}")
        print(f"  Input Tokens: {cost.get('totalInputTokens', 0)}")
        print(f"  Output Tokens: {cost.get('totalOutputTokens', 0)}")
        print(f"  Model: {cost.get('model', 'unknown')}")
    else:
        print("\n❌ No cost data in response")
        
    print(f"\nFull result keys: {list(result.keys())}")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)