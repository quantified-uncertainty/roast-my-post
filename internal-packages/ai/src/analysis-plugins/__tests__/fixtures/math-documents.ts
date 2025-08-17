export const mathDocuments = {
  withErrors: `# Quarterly Financial Report

## Revenue Analysis

Our Q3 revenue was $2.5 million, which represents a 15% increase from Q2's revenue of $2.0 million. 
However, when we calculate the actual percentage: (2.5 - 2.0) / 2.0 = 0.20, which is actually 20%, not 15%.

## Cost Breakdown

Our total costs for the quarter were:
- Salaries: $800,000
- Operations: $400,000  
- Marketing: $300,000
- R&D: $200,000

Total costs: $800,000 + $400,000 + $300,000 + $200,000 = $1,600,000
(Note: The actual sum is $1,700,000, not $1,600,000)

## Profit Margin

With revenue of $2.5M and costs of $1.7M, our profit is $800,000.
Profit margin = $800,000 / $2,500,000 = 35%
(Note: 800,000 / 2,500,000 = 0.32, which is 32%, not 35%)

## Growth Projections

If we maintain 20% quarterly growth, our revenue projection for next quarter would be:
$2.5M × 1.2 = $3.5M
(This calculation is incorrect: $2.5M × 1.2 = $3.0M, not $3.5M)

## Statistical Analysis

Our customer satisfaction scores: 85, 90, 88, 92, 95
Average score: (85 + 90 + 88 + 92 + 95) / 5 = 88
(The actual average is 90, not 88)`,

  correct: `# Annual Performance Metrics

## Revenue Growth

Q1 Revenue: $1.5 million
Q2 Revenue: $1.8 million
Q3 Revenue: $2.16 million
Q4 Revenue: $2.592 million

Each quarter represents exactly 20% growth from the previous quarter:
- Q1 to Q2: $1.8M / $1.5M = 1.2 (20% increase)
- Q2 to Q3: $2.16M / $1.8M = 1.2 (20% increase)
- Q3 to Q4: $2.592M / $2.16M = 1.2 (20% increase)

## Cost Analysis

Fixed costs per quarter: $500,000
Variable costs (40% of revenue):
- Q1: $1.5M × 0.4 = $600,000
- Q2: $1.8M × 0.4 = $720,000
- Q3: $2.16M × 0.4 = $864,000
- Q4: $2.592M × 0.4 = $1,036,800

## Profit Calculations

Q1 Profit: $1.5M - $0.5M - $0.6M = $400,000
Q2 Profit: $1.8M - $0.5M - $0.72M = $580,000
Q3 Profit: $2.16M - $0.5M - $0.864M = $796,000
Q4 Profit: $2.592M - $0.5M - $1.0368M = $1,055,200

## Statistical Measures

Customer ratings: 4.2, 4.5, 4.3, 4.6, 4.4
Mean: (4.2 + 4.5 + 4.3 + 4.6 + 4.4) / 5 = 22 / 5 = 4.4
Median: 4.4 (middle value when sorted: 4.2, 4.3, 4.4, 4.5, 4.6)`,

  unitConversions: `# Engineering Specifications

## Distance Measurements

The new component is 254mm long, which equals 10 inches (254mm ÷ 25.4mm/inch = 10 inches).

However, the housing is listed as 12 inches, which they claim is 250mm.
(Error: 12 inches × 25.4mm/inch = 304.8mm, not 250mm)

## Weight Conversions

The device weighs 2.2 pounds, which is exactly 1 kilogram (2.2 lbs ÷ 2.2 lbs/kg = 1 kg).

The shipping weight is listed as 3kg, which equals 6 pounds.
(Error: 3kg × 2.2 lbs/kg = 6.6 lbs, not 6 lbs)

## Temperature Ranges

Operating temperature: -40°F to 185°F
In Celsius: -40°C to 85°C
(Note: -40°F = -40°C is correct, but 185°F = (185-32) × 5/9 = 85°C is also correct)

Storage temperature: 0°C to 60°C
In Fahrenheit: 32°F to 150°F
(Error: 60°C × 9/5 + 32 = 140°F, not 150°F)`
};