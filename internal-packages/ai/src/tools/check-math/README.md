# Check Mathematical Accuracy

Analyze text for mathematical errors including calculations, logic, units, and notation using Claude

## How It Works

The tool sends mathematical statements directly to Claude for analysis. Claude evaluates the statement and returns a structured response indicating whether it's true, false, or cannot be verified, along with detailed reasoning and error categorization when applicable.

## Capabilities & Limitations

**Strengths:** Can handle conceptual mathematics (derivatives, integrals, proofs), word problems, and complex reasoning. Provides detailed explanations and categorizes errors by type (calculation, logic, unit, notation, conceptual) and severity.

**Limitations:** May make arithmetic errors on complex calculations since it doesn't use a calculator. Non-deterministic - the same input might produce slightly different explanations. Uses claude-sonnet-4-5 model.

## Technical Details

- Uses claude-sonnet-4-5 model for analysis
- Response format: status (verified_true/verified_false/cannot_verify), explanation, reasoning, error details
- Error categorization: calculation, logic, unit, notation, conceptual with severity levels
- Uses deterministic cache seeds for more consistent responses
- Location: Implementation in `/internal-packages/ai/src/tools/check-math/`
