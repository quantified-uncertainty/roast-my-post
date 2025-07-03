# RoastMyPost Landing Page Specification

**Date**: 2025-01-03  
**Author**: Claude  
**Issue**: [#33 - Make a Landing Page](https://github.com/quantified-uncertainty/roast-my-post/issues/33)

## Executive Summary

This specification outlines a landing page design that prioritizes getting users to import their first document quickly while clearly communicating RoastMyPost's value proposition. The design balances simplicity with effectiveness, avoiding over-elaboration while ensuring visitors understand the product's unique multi-agent AI feedback system.

## Research Findings

### Product Analysis
RoastMyPost is an AI-powered document review platform that provides:
- Multi-perspective analysis from 4 specialized AI agents
- Inline, contextual feedback with highlights
- Support for academic and long-form content
- Integration with LessWrong, EA Forum, and general web articles

### Target Audience
- Writers and bloggers seeking AI feedback
- Researchers needing peer review
- Content teams for quality control
- EA/Rationalist community members

### Current State
The existing landing page is minimal with just a title, tagline, and two CTAs. It lacks:
- Clear value proposition
- Trust indicators
- Process explanation
- Visual demonstration

## Landing Page Goals

1. **Primary**: Get visitors to import their first document within 60 seconds
2. **Secondary**: Clearly explain what RoastMyPost does in under 10 seconds
3. **Tertiary**: Build trust and credibility for AI-powered feedback

## Page Structure

### 1. Hero Section
**Headline**: "Get AI-Powered Feedback on Your Writing in Minutes"

**Subheadline**: "Four specialized AI agents analyze your articles, papers, and posts—providing detailed critiques, suggestions, and insights from multiple perspectives"

**CTA Buttons**:
- Primary: "Import Your First Document" → `/docs/import`
- Secondary: "See Example Evaluation" → `/docs/[sample-doc-id]`

**Hero Visual**: Split-screen mockup showing original document vs. document with AI comments

### 2. Quick Value Props (3 columns)
- **🎯 Multiple Perspectives**: "Get feedback from 4 specialized AI agents, each with unique expertise"
- **💬 Inline Comments**: "See exactly where to improve with contextual highlights and suggestions"
- **⚡ Fast Results**: "Import any article and get comprehensive feedback in under 5 minutes"

### 3. How It Works (3 steps)
1. **Import Your Document**
   - Paste a URL or upload your text
   - Works with LessWrong, EA Forum, Medium, and any web article

2. **Choose Your Evaluators**
   - Select from our AI agents: Assessor, Advisor, Enricher, or Explainer
   - Or use all four for comprehensive feedback

3. **Get Actionable Insights**
   - Review inline comments and suggestions
   - See grades and importance ratings
   - Export feedback for your revision process

### 4. Agent Showcase
Brief cards for each agent type:

**🔍 The Assessor**
- Critical analysis and quality assessment
- Grades: Structure, clarity, argumentation
- Example: "This claim needs supporting evidence..."

**💡 The Advisor**
- Constructive suggestions and improvements
- Actionable recommendations
- Example: "Consider restructuring this section for better flow..."

**📚 The Enricher**
- Additional context and information
- Related concepts and connections
- Example: "This relates to recent research by..."

**🎓 The Explainer**
- Clarifies complex concepts
- Makes content accessible
- Example: "In simpler terms, this means..."

### 5. Trust Indicators
- "Join 500+ writers improving their content with AI feedback"
- "Analyzing 10,000+ documents monthly"
- "Powered by Claude and GPT-4"
- Small logos: LessWrong, EA Forum integration partners

### 6. Final CTA Section
**Headline**: "Start Getting Better Feedback Today"
**Subtext**: "No credit card required. Import your first document free."
**Button**: "Import Document Now" → `/docs/import`

## Design Recommendations

### Visual Style
- Clean, academic-inspired design with modern touches
- Color palette: Professional blues/grays with accent colors for agent types
- Typography: Clear, readable fonts (Inter or similar)
- Lots of whitespace for easy scanning

### Interactive Elements
- Hover states on agent cards reveal sample comments
- Animated transition on hero mockup cycling through different comment types
- Progress indicator showing the 3-step process

### Responsive Considerations
- Mobile-first design with stackable sections
- Simplified hero on mobile (single document view)
- Touch-friendly CTA buttons

## Copy Guidelines

### Tone
- Professional but approachable
- Focus on benefits, not features
- Use "you" language
- Keep sentences short and scannable

### Key Messages
1. "Multiple AI perspectives make your writing stronger"
2. "See exactly where and how to improve"
3. "Works with content you've already written"
4. "Start improving in minutes, not hours"

## Implementation Notes

### Technical Considerations
- Pre-load a sample document for the "See Example" CTA
- Implement smooth scroll to sections
- Add analytics tracking for CTA clicks
- Consider A/B testing the main headline

### Performance
- Lazy load images below the fold
- Optimize hero image/mockup
- Keep initial bundle small for fast load

### SEO
- Meta description: "Get AI-powered feedback on your writing. Four specialized agents analyze your articles with inline comments, grades, and actionable suggestions."
- Keywords: AI writing feedback, document review, article critique, writing improvement

## Success Metrics
- **Primary**: Conversion rate to first document import
- **Secondary**: Time to first import (target: <3 minutes)
- **Engagement**: Scroll depth and interaction with agent cards
- **Retention**: Users who import a second document

## Next Steps
1. Create HTML/CSS mockup for stakeholder review
2. Gather feedback on copy and visual direction
3. Build responsive version in Next.js
4. Set up analytics tracking
5. Launch with A/B test on main CTA