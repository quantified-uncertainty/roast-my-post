# Tool Evaluation with Opik

This directory contains a lightweight evaluation framework using Opik's patterns for tracking tool quality over time.

## Quick Start (2-3 hours)

1. **Run the demo evaluation**:
```bash
npm run quick-eval
```

This will:
- Test the forecaster tool with predefined cases
- Generate quality scores
- Save results to `quick-eval-results.json`

2. **Review the results**:
```bash
cat quick-eval-results.json
```

3. **Let Claude Code improve the tool**:
- Claude can read the results file
- Identify failing test cases
- Modify the tool implementation
- Re-run evaluations to measure improvement

## What This Gives You

1. **Organized test data**: Input/output pairs with expected results
2. **Quality scoring**: 0-1 scores for each test case
3. **Improvement tracking**: See how tool quality changes over time
4. **Automation-ready**: Claude Code can iterate on tools automatically

## Next Steps (When Ready for Full Opik)

1. **Install Opik**:
```bash
pip install opik
# or
npm install opik
```

2. **Set up Opik** (local or cloud):
```bash
# Local setup
git clone https://github.com/comet-ml/opik.git
cd opik && ./opik.sh

# Or use Comet cloud
# Sign up at https://www.comet.com
```

3. **Replace mock with real Opik**:
- Update `opik-setup.ts` to use real Opik client
- Get automatic dashboards and monitoring
- Access advanced metrics (hallucination, factuality, etc.)

## Why This Approach?

- **Simple**: Just input/output pairs + quality scores
- **Fast**: Get results in minutes, not days
- **Iterative**: Claude Code can improve tools automatically
- **Scalable**: Easy to add full Opik features later

## Example Workflow

1. **Human**: Defines test cases with expected outputs
2. **System**: Runs evaluation, generates scores
3. **Claude Code**: Analyzes failures, improves tool
4. **System**: Re-evaluates to verify improvements
5. **Repeat**: Until quality targets are met

This gives you the evaluation infrastructure without the complexity, perfect for understanding if Opik fits your needs.