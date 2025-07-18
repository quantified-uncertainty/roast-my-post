#!/usr/bin/env python3
"""Debug script to check what the forecaster API is actually returning"""

import requests
import json
import os

# API configuration
API_URL = "http://localhost:3000/api/tools/forecaster"
API_KEY = os.getenv("ROAST_MY_POST_API_KEY", "rmp_15a040c5450c50b7cb430ca28fbebeb18151820c6a9d71a9b9f4bce7651ccb67")

# Test request
payload = {
    "question": "Will AI surpass human intelligence by 2030?",
    "numForecasts": 1
}

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

print("🔍 Debug: Testing forecaster API response...")
print(f"Request: {json.dumps(payload, indent=2)}")
print()

try:
    response = requests.post(API_URL, json=payload, headers=headers, timeout=30)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print()
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Raw Response Structure:")
        print(json.dumps(data, indent=2))
        print()
        
        # Check for cost in different locations
        result = data.get('result', {})
        print("🔍 Cost Analysis:")
        print(f"  result has 'cost' key: {'cost' in result}")
        
        if 'cost' in result:
            cost = result['cost']
            print(f"  cost value: {cost}")
            print(f"  cost type: {type(cost)}")
            if isinstance(cost, dict):
                print(f"  cost.totalUSD: {cost.get('totalUSD', 'NOT_FOUND')}")
                print(f"  cost keys: {list(cost.keys())}")
        else:
            print("  ❌ No 'cost' field found in result")
            print(f"  Available keys: {list(result.keys())}")
            
        # Check for cost in llmInteractions
        llm_interactions = result.get('llmInteractions', [])
        print(f"\n📊 LLM Interactions ({len(llm_interactions)} found):")
        for i, interaction in enumerate(llm_interactions):
            tokens = interaction.get('tokensUsed', {})
            print(f"  Interaction {i+1}:")
            print(f"    prompt tokens: {tokens.get('prompt', 'N/A')}")
            print(f"    completion tokens: {tokens.get('completion', 'N/A')}")
            print(f"    total tokens: {tokens.get('total', 'N/A')}")
        
    else:
        print(f"❌ Error Response: {response.text}")
        
except Exception as e:
    print(f"❌ Request failed: {str(e)}")