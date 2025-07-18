"""
Evaluation metrics for forecast scoring
"""

import math
from opik.evaluation.metrics import base_metric, score_result

class BrierScoreMetric(base_metric.BaseMetric):
    """
    Brier score for probabilistic forecasts
    Lower is better (0 = perfect, 2 = worst)
    Normalized for Opik (inverted so higher is better)
    """
    
    def __init__(self, name: str = "brier_score"):
        self.name = name
    
    def score(self, **kwargs) -> score_result.ScoreResult:
        output = kwargs.get('output', {})
        item = kwargs.get('item', {})
        
        if not output or 'error' in output:
            return score_result.ScoreResult(
                name=self.name, 
                value=0.0, 
                reason="Error in forecast"
            )
        
        # Get predicted and market probabilities as decimals
        predicted = output.get('probability', 50) / 100.0
        market = item.get('market_probability', 50) / 100.0
        
        # Calculate Brier score: (predicted - actual)^2
        brier = (predicted - market) ** 2
        
        # Invert for Opik (so higher is better)
        normalized = 1 - brier
        
        return score_result.ScoreResult(
            name=self.name,
            value=normalized,
            reason=f"Market: {market*100:.1f}%, Predicted: {predicted*100:.1f}%, Brier: {brier:.3f}"
        )

class LogScoreMetric(base_metric.BaseMetric):
    """
    Log score (logarithmic scoring rule) for probabilistic forecasts
    Proper scoring rule that rewards both calibration and appropriate confidence
    """
    
    def __init__(self, name: str = "log_score"):
        self.name = name
    
    def score(self, **kwargs) -> score_result.ScoreResult:
        output = kwargs.get('output', {})
        item = kwargs.get('item', {})
        
        if not output or 'error' in output:
            return score_result.ScoreResult(
                name=self.name, 
                value=0.0, 
                reason="Error in forecast"
            )
        
        # Get probabilities
        predicted = output.get('probability', 50) / 100.0
        market = item.get('market_probability', 50) / 100.0
        
        # Clamp to avoid log(0)
        predicted = max(0.001, min(0.999, predicted))
        market = max(0.001, min(0.999, market))
        
        # Calculate log score
        # If market says P(yes) = market, we score based on that
        log_score = market * math.log(predicted) + (1 - market) * math.log(1 - predicted)
        
        # Normalize to 0-1 range for Opik
        # exp transforms from (-inf, 0] to (0, 1]
        normalized = math.exp(log_score)
        
        return score_result.ScoreResult(
            name=self.name,
            value=normalized,
            reason=f"Market: {market*100:.1f}%, Predicted: {predicted*100:.1f}%, Raw log: {log_score:.3f}"
        )

class CalibrationMetric(base_metric.BaseMetric):
    """
    Measures calibration by comparing predicted vs market probabilities
    Perfect calibration = predictions match market on average
    """
    
    def __init__(self, name: str = "calibration"):
        self.name = name
    
    def score(self, **kwargs) -> score_result.ScoreResult:
        output = kwargs.get('output', {})
        item = kwargs.get('item', {})
        
        if not output or 'error' in output:
            return score_result.ScoreResult(
                name=self.name, 
                value=0.0, 
                reason="Error in forecast"
            )
        
        predicted = output.get('probability', 50)
        market = item.get('market_probability', 50)
        
        # Calculate absolute error
        error = abs(predicted - market)
        
        # Convert to 0-1 score (0 = 100% error, 1 = 0% error)
        score = 1 - (error / 100)
        
        return score_result.ScoreResult(
            name=self.name,
            value=score,
            reason=f"Market: {market:.1f}%, Predicted: {predicted:.1f}%, Error: {error:.1f}%"
        )