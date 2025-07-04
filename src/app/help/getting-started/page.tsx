"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

const gettingStartedContent = `# Getting Started with Roast My Post

Welcome! This guide will help you get up and running with Roast My Post in just a few minutes.

## Quick Start (3 Steps)

### 1. Sign Up / Sign In
- Click "Sign In" in the top navigation
- Use your Google account or email
- No credit card required for free tier

### 2. Upload Your First Document
- Click "Documents" → "New Document"
- Either:
  - **Paste content** directly
  - **Import from URL** (supports LessWrong, EA Forum, and more)
  - **Upload a file** (PDF, Word, Markdown, Plain Text)

### 3. Get Your First Evaluation
- Select your document
- Choose an agent from the list (try "General Writing Assessor" for starters)
- Click "Evaluate"
- Wait 30-60 seconds for results

## Understanding Evaluations

### What You'll See

After evaluation completes, you'll get:

1. **Split View**
   - Left: Your original document
   - Right: Agent's evaluation

2. **Summary Section**
   - Quick 2-3 paragraph overview
   - Key strengths and weaknesses
   - Overall assessment

3. **Highlighted Comments**
   - Click any highlight to see specific feedback
   - Yellow highlights in your document
   - Detailed explanations on the right

4. **Analysis Tab**
   - In-depth evaluation (800-1500 words)
   - Structured feedback by category
   - Specific recommendations

5. **Grades** (if provided)
   - Overall score (0-100)
   - Component breakdown
   - Explanation of scoring

## Choosing the Right Agent

### For Academic Writing
- **Academic Rigor Assessor**: Checks methodology, citations, arguments
- **Clarity Advisor**: Improves readability and structure
- **Literature Enricher**: Adds relevant citations and context

### For Business Documents
- **Executive Summary Writer**: Creates concise summaries
- **Pitch Deck Advisor**: Improves investor presentations
- **Business Plan Assessor**: Evaluates completeness and viability

### For Creative Writing
- **Story Structure Analyst**: Examines plot and character development
- **Style Advisor**: Suggests tone and voice improvements
- **Reader Engagement Assessor**: Predicts audience response

### For Technical Content
- **Documentation Reviewer**: Checks completeness and clarity
- **Code Explainer**: Makes technical content accessible
- **API Documentation Assessor**: Ensures proper API docs

## Pro Tips 🚀

### 1. Use Multiple Agents
Different perspectives reveal different insights:
\`\`\`
Document → Academic Assessor → Find logical gaps
         → Clarity Advisor → Improve readability  
         → Citation Enricher → Add references
\`\`\`

### 2. Iterate on Feedback
1. Get initial evaluation
2. Make improvements
3. Re-evaluate to see progress
4. Compare versions side-by-side

### 3. Create Custom Agents
Once familiar with the system:
- Go to Agents → "Create New"
- Define specific evaluation criteria
- Tailor to your exact needs

### 4. Keyboard Shortcuts
- \`Ctrl/Cmd + Enter\`: Submit evaluation
- \`Esc\`: Close modal
- \`Arrow Keys\`: Navigate comments
- \`C\`: Toggle comment sidebar

## Common Use Cases

### Academic Peer Review
1. Upload paper draft
2. Use "Academic Rigor Assessor"
3. Address major issues
4. Run "Citation Checker"
5. Polish with "Clarity Advisor"

### Blog Post Optimization
1. Import from your blog URL
2. Use "SEO Content Optimizer"
3. Apply "Reader Engagement Assessor"
4. Check with "Fact Checker"

### Grant Proposal Review
1. Upload proposal document
2. Start with "Grant Proposal Assessor"
3. Use "Budget Analyzer"
4. Finish with "Executive Summary Writer"

### Technical Documentation
1. Paste your docs
2. Run "Documentation Reviewer"
3. Apply "Code Example Validator"
4. Use "Beginner-Friendly Explainer"

## Understanding Limitations

### What Roast My Post Does Well
✅ Provides multiple perspectives on your writing
✅ Identifies gaps and inconsistencies
✅ Suggests specific improvements
✅ Offers structured, detailed feedback

### What It Doesn't Do
❌ Replace human judgment entirely
❌ Check facts against real-world data
❌ Understand highly specialized domains perfectly
❌ Make subjective creative decisions

## Troubleshooting

### Evaluation Taking Too Long?
- Normal time: 30-60 seconds
- Complex documents: 2-3 minutes
- If stuck: Refresh and check job status

### Highlights Not Showing?
- Ensure JavaScript is enabled
- Try refreshing the page
- Check for browser extensions blocking scripts

### Agent Not Available?
- Some agents have usage limits
- Try a similar agent
- Create your own version

### Unexpected Results?
- Check agent description matches your needs
- Try a different agent type
- Adjust your document format

## Next Steps

### Explore More Features
- **Version History**: Track document changes
- **Export Options**: Download evaluations
- **API Access**: Integrate with your workflow
- **Team Collaboration**: Share documents (coming soon)

### Join the Community
- **Discord**: Get help and share tips
- **GitHub**: Contribute to development
- **Newsletter**: Stay updated on new features

### Upgrade Your Experience
- **Pro Plan**: More evaluations, priority processing
- **Team Plan**: Collaboration features
- **Enterprise**: Custom agents, SLA, support

## FAQ

**Q: How many evaluations can I run?**
A: Free tier includes 10 evaluations/month. Pro plans offer more.

**Q: Can I edit documents after uploading?**
A: Yes, each edit creates a new version you can evaluate.

**Q: Are my documents private?**
A: Yes, documents are private by default. Only you can see them.

**Q: Can I download evaluations?**
A: Yes, export as PDF, Markdown, or JSON.

**Q: How accurate are the evaluations?**
A: Agents provide helpful perspectives but aren't perfect. Use them as tools, not absolute truth.

## Need Help?

- 📧 Email: support@quantifieduncertainty.org
- 💬 Discord: [Join our community](https://discord.gg/nsTmQqHRnV)
- 📚 Docs: You're already here!
- 🐛 Issues: [GitHub](https://github.com/quantified-uncertainty/roast-my-post/issues)

Happy writing and evaluating! 🚀`;

export default function GettingStartedPage() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(gettingStartedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Getting Started
        </h1>
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          {copied ? (
            <>
              <CheckIcon className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="mr-2 h-4 w-4" />
              Copy as MD
            </>
          )}
        </button>
      </div>
      
      <div className="prose prose-gray max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{gettingStartedContent}</ReactMarkdown>
      </div>
    </div>
  );
}