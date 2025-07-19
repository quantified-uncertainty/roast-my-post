#!/usr/bin/env python3
"""
Cost calculation utilities for LLM usage
"""

# Pricing per 1M tokens (as of July 2025)
# Source: https://www.anthropic.com/pricing
MODEL_PRICING = {
    "claude-opus-4-20250514": {
        "input": 15.00,   # $15 per 1M input tokens
        "output": 75.00   # $75 per 1M output tokens
    },
    "claude-3-5-sonnet-20241022": {
        "input": 3.00,    # $3 per 1M input tokens
        "output": 15.00   # $15 per 1M output tokens
    },
    "claude-3-haiku-20240307": {
        "input": 0.25,    # $0.25 per 1M input tokens
        "output": 1.25    # $1.25 per 1M output tokens
    }
}

def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD for given token usage"""
    if model not in MODEL_PRICING:
        # Default to Opus 4 pricing if model not found
        pricing = MODEL_PRICING["claude-opus-4-20250514"]
    else:
        pricing = MODEL_PRICING[model]
    
    # Calculate cost (pricing is per 1M tokens)
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    
    return round(input_cost + output_cost, 6)  # Round to 6 decimal places

def estimate_forecast_cost(num_forecasts: int = 1, use_perplexity: bool = False) -> float:
    """Estimate cost for a forecast evaluation"""
    # Average tokens per forecast (based on observations)
    avg_input_tokens = 2000  # Prompt with instructions
    avg_output_tokens = 500  # Forecast response
    
    # Perplexity adds extra context
    if use_perplexity:
        avg_input_tokens += 1000
    
    # Multiple forecasts for aggregation
    total_input = avg_input_tokens * num_forecasts
    total_output = avg_output_tokens * num_forecasts
    
    return calculate_cost("claude-opus-4-20250514", total_input, total_output)

def format_cost(cost: float) -> str:
    """Format cost for display"""
    if cost < 0.01:
        return f"${cost:.4f}"
    elif cost < 1.0:
        return f"${cost:.3f}"
    else:
        return f"${cost:.2f}"