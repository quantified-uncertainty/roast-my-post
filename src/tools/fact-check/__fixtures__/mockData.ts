/**
 * Mock data fixtures for fact-check tool tests
 */

export const mockClaims = {
  historical: {
    text: 'The Berlin Wall fell in 1989',
    topic: 'Historical events',
    importance: 'high' as const,
    specificity: 'high' as const
  },
  scientific: {
    text: 'Water boils at 100°C at sea level',
    topic: 'Science',
    importance: 'medium' as const,
    specificity: 'high' as const
  },
  economic: {
    text: 'The unemployment rate was 3.7% in December 2023',
    topic: 'Economics',
    importance: 'high' as const,
    specificity: 'high' as const
  }
};

export const mockVerificationResults = {
  highConfidence: {
    verified: true,
    confidence: 'high',
    explanation: 'This fact has been verified as accurate',
    requiresCurrentData: false
  },
  lowConfidence: {
    verified: false,
    confidence: 'low',
    explanation: 'Unable to verify this claim with available data',
    requiresCurrentData: true
  }
};

export const mockOutputStructures = {
  complete: {
    claims: [{
      id: 'claim-1',
      text: 'Test claim',
      topic: 'economics',
      importance: 'high' as const,
      specificity: 'high' as const,
      verified: true,
      explanation: 'This is correct'
    }],
    contradictions: [{
      claim1: 'First claim',
      claim2: 'Second claim',
      explanation: 'These contradict'
    }],
    verificationResults: [{
      claim: {
        id: 'claim-1',
        text: 'Test claim',
        topic: 'economics',
        importance: 'high' as const,
        specificity: 'high' as const
      },
      verified: true,
      explanation: 'Verified as correct'
    }],
    summary: {
      totalClaims: 1,
      verifiedClaims: 1,
      falseClaims: 0,
      contradictions: 1
    },
    recommendations: ['Check sources'],
    llmInteractions: []
  }
};

export const mockInputs = {
  validInput: {
    text: "The unemployment rate was 3.7% in December 2023.",
    context: "Economic data",
    maxClaims: 10,
    verifyHighPriority: true
  },
  minimalInput: {
    text: "Some factual claim here."
  },
  historicalAndScientific: {
    text: "The Berlin Wall fell in 1989. Water boils at 100°C at sea level.",
    maxClaims: 10,
    verifyHighPriority: false
  },
  opinionsOnly: {
    text: "Just opinions, no facts here.",
    maxClaims: 10
  }
};