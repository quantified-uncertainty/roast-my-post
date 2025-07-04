"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

const roadmapContent = `# Roadmap

Our vision for the future of Roast My Post and upcoming features.

## Current Focus 🎯

### Q1 2025
- **API Stability**: Finalize v1 API with comprehensive documentation
- **Agent Marketplace**: Community-contributed agents with ratings
- **Batch Processing**: Evaluate multiple documents simultaneously
- **Export Improvements**: Enhanced formats for evaluation exports

## In Progress 🚧

### Performance & Reliability
- [ ] Optimize evaluation processing speed (target: <30s for most docs)
- [ ] Implement evaluation caching for repeated requests
- [ ] Add retry logic with better error handling
- [ ] Websocket support for real-time evaluation updates

### Agent Enhancements
- [ ] Agent versioning with diff viewing
- [ ] Agent performance analytics dashboard
- [ ] Custom agent templates library
- [ ] Agent collaboration tools (fork, merge, share)

### User Experience
- [ ] Dark mode support
- [ ] Mobile-responsive evaluation viewer
- [ ] Keyboard shortcuts for power users
- [ ] Evaluation comparison view (side-by-side)

## Planned Features 📋

### Q2 2025

#### Integration Ecosystem
- **Google Docs Integration**: Direct import and export
- **Notion Integration**: Sync with Notion pages
- **GitHub Integration**: PR review agents
- **Slack Bot**: Get evaluations in Slack

#### Advanced Agent Capabilities
- **Multi-modal Agents**: Support for images and diagrams
- **Chain-of-Thought Agents**: Show reasoning process
- **Collaborative Agents**: Multiple agents working together
- **Custom Tool Access**: Let agents use external APIs

#### Enterprise Features
- **Team Workspaces**: Shared documents and agents
- **SSO/SAML Support**: Enterprise authentication
- **Audit Logs**: Compliance and tracking
- **SLA Guarantees**: Priority processing

### Q3 2025

#### AI Model Flexibility
- **Model Selection**: Choose between Claude, GPT-4, Llama
- **Fine-tuned Models**: Custom models for specific domains
- **Local Model Support**: Run evaluations on-premise
- **Cost Optimization**: Smart model routing based on task

#### Analytics & Insights
- **Document Analytics**: Track evaluation trends
- **Agent Effectiveness**: Measure agent performance
- **User Analytics**: Understanding usage patterns
- **Custom Reports**: Generate insights for teams

### Q4 2025

#### Platform Evolution
- **Plugin System**: Third-party extensions
- **Evaluation Workflows**: Multi-step evaluation pipelines
- **Conditional Logic**: Smart evaluation routing
- **Scheduled Evaluations**: Periodic document reviews

## Long-term Vision 🚀

### 2026 and Beyond

#### Democratizing Feedback
- **Open Protocol**: Standardize document evaluation format
- **Federated Network**: Connect evaluation services
- **Academic Partnerships**: Integration with journals
- **Educational Tools**: Classroom feedback systems

#### Advanced Intelligence
- **Meta-Agents**: Agents that improve other agents
- **Evaluation Synthesis**: Combine multiple perspectives
- **Predictive Feedback**: Suggest improvements before issues
- **Domain Expertise**: Specialized models per field

#### Community & Ecosystem
- **Agent Marketplace**: Buy/sell specialized agents
- **Certification Program**: Verified expert agents
- **Community Challenges**: Competitions for best agents
- **Research Grants**: Fund innovative uses

## Recently Completed ✅

### 2024 Q4
- ✅ Basic agent system implementation
- ✅ Document upload and management
- ✅ Evaluation viewer with highlights
- ✅ User authentication system

### 2025 Q1
- ✅ Import from LessWrong/EA Forum
- ✅ Agent version control
- ✅ Cost tracking and monitoring
- ✅ API authentication system

## Feature Requests 💡

We actively consider community feedback. Popular requests:

1. **Real-time Collaboration** (👍 156)
2. **Word/LaTeX Export** (👍 134) 
3. **Citation Checking** (👍 98)
4. **Plagiarism Detection** (👍 87)
5. **Multi-language Support** (👍 76)

Vote on features or submit new ideas on our [GitHub Discussions](https://github.com/quantified-uncertainty/roast-my-post/discussions).

## Get Involved 🤝

### How to Contribute
- **Code**: Check our [GitHub repo](https://github.com/quantified-uncertainty/roast-my-post)
- **Agents**: Share your agents in the community
- **Feedback**: Join our [Discord](https://discord.gg/nsTmQqHRnV)
- **Sponsorship**: Support development at [QURI](https://quantifieduncertainty.org/donate)

### Open Positions
We're looking for:
- Full-stack developers (Next.js/TypeScript)
- ML engineers (LLM optimization)
- Technical writers (documentation)
- Community managers

Contact: careers@quantifieduncertainty.org

## Development Philosophy 🌟

We believe in:
- **Open Source First**: Transparency in development
- **User Privacy**: Your documents remain yours
- **Quality Over Quantity**: Better to do few things well
- **Community Driven**: Your needs shape our roadmap

## Stay Updated 📬

- **Newsletter**: Monthly updates on progress
- **Blog**: [blog.roastmypost.com](https://blog.roastmypost.com)
- **Twitter**: [@roastmypost](https://twitter.com/roastmypost)
- **Discord**: Real-time updates and discussions

---

*This roadmap is updated monthly. Last update: January 2025*`;

export default function RoadmapPage() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roadmapContent);
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
          Roadmap
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
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmapContent}</ReactMarkdown>
      </div>
    </div>
  );
}