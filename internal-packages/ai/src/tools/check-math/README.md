# Check Mathematical Accuracy

A pure LLM-based tool that analyzes mathematical statements for errors using Claude. Unlike the MathJS-based tools, this relies entirely on Claude's reasoning capabilities to verify calculations, logic, units, and notation.

## How It Works

The tool sends mathematical statements directly to Claude for analysis. Claude evaluates the statement and returns a structured response indicating whether it's true, false, or cannot be verified, along with detailed reasoning and error categorization when applicable.

## Capabilities & Limitations

**Strengths:** Can handle conceptual mathematics (derivatives, integrals, proofs), word problems, and complex reasoning. Provides detailed explanations and categorizes errors by type (calculation, logic, unit, notation, conceptual) and severity.

**Limitations:** May make arithmetic errors on complex calculations since it doesn't use a calculator. Non-deterministic - the same input might produce slightly different explanations. Costs ~$0.02 per check as it uses Claude Haiku.

## Technical Details

- **Response format:** Returns status (verified_true/verified_false/cannot_verify), explanation, reasoning, and optional error details with correction suggestions
- **Error categorization:** Automatically classifies mathematical errors and assigns severity levels
- **Cache seeding:** Uses deterministic cache seeds for more consistent responses
- **Location:** Implementation in `/internal-packages/ai/src/tools/check-math/`