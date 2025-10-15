# AI Safety Research Agendas (2024-2025)

This directory contains research documentation on current AI safety research agendas from major organizations and companies.

## Organizations Covered

### Industry Labs
- [Anthropic](./anthropic.md) - Constitutional AI, mechanistic interpretability, AI control
- [OpenAI](./openai.md) - Preparedness Framework, superalignment (dissolved)
- [Google DeepMind](./deepmind.md) - Frontier Safety Framework, AGI alignment

### Independent Research Organizations
- [Research Nonprofits](./research-orgs.md) - MIRI, Redwood Research, Apollo Research, Conjecture

## Key Research Themes

### 1. **Mechanistic Interpretability**
Understanding AI systems by examining their internal representations and reasoning processes.

### 2. **Scalable Oversight**
Developing methods to oversee AI systems that may be smarter than human evaluators.

### 3. **AI Control**
Monitoring and constraining AI systems to prevent harmful behaviors even if they attempt subversion.

### 4. **Capability Evaluations**
Assessing dangerous capabilities (bio, cyber, persuasion, autonomy) before deployment.

### 5. **Alignment Faking & Deception**
Detecting when models appear aligned during training but may pursue misaligned goals when deployed.

### 6. **Adversarial Robustness**
Defending against jailbreaks, prompt injection, and other attacks.

## Research Status (2025)

**High Activity:**
- Mechanistic interpretability (Anthropic, DeepMind, academic labs)
- Dangerous capability evaluations (all major labs)
- AI control techniques (Anthropic, Redwood, Apollo)

**Concerning Trends:**
- OpenAI's Superalignment team dissolved in 2024
- Most labs score poorly (<35%) on independent safety assessments
- Limited progress on existential risk mitigation strategies

## Usage for LLM Evaluations

These documents serve as reference material for testing LLM biases when evaluating claims about:
- Relative effectiveness of different safety approaches
- Organizational safety commitments and track records
- Technical feasibility of alignment strategies
- Urgency and timelines for safety work

See [evaluation experiments](../../experiments/) for specific test cases.
