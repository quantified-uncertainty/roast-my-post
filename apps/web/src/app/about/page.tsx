import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const aboutContent = `
# About Roast My Post

Roast My Post is an open-source AI-powered platform for document analysis and evaluation. We help writers, researchers, and content creators get high-quality feedback on their work through specialized AI agents.

## What We Do

Our platform allows you to:
- Upload documents for AI-powered analysis
- Create custom AI agents with specific evaluation criteria
- Get detailed feedback with inline comments and highlights
- Track evaluation history and compare different perspectives
- Export evaluations for further analysis

## Open Source

Roast My Post is proudly open source and built by the community. We believe in transparent development and welcome contributions from developers, researchers, and users.

- **GitHub Repository**: [github.com/quantified-uncertainty/roast-my-post](https://github.com/quantified-uncertainty/roast-my-post)
- **License**: MIT
- **Contributing**: See our [contribution guidelines](https://github.com/quantified-uncertainty/roast-my-post/blob/main/CONTRIBUTING.md)

## Technology Stack

We use modern, reliable technologies:
- Next.js 15 with App Router
- PostgreSQL with Prisma ORM
- Anthropic Claude API for AI evaluations
- TypeScript for type safety
- Tailwind CSS for styling

## Our Mission

We aim to democratize access to high-quality content feedback by:
1. Making AI evaluation tools accessible to everyone
2. Supporting diverse evaluation perspectives through custom agents
3. Building in public with full transparency
4. Fostering a community of writers and evaluators

## The Team

Roast My Post is developed and maintained by [Quantified Uncertainty Research Institute (QURI)](https://quantifieduncertainty.org/), a nonprofit research organization focused on improving decision-making under uncertainty.

## Contact Us

We'd love to hear from you! Whether you have questions, feedback, or want to contribute:

- **Email**: [contact@quantifieduncertainty.org](mailto:contact@quantifieduncertainty.org)
- **Discord**: [Join our community](https://discord.gg/nsTnQTgtG6)
- **GitHub Issues**: [Report bugs or request features](https://github.com/quantified-uncertainty/roast-my-post/issues)

## Support the Project

If you find Roast My Post valuable, consider:
- ⭐ Starring us on [GitHub](https://github.com/quantified-uncertainty/roast-my-post)
- 🐛 Reporting bugs and suggesting features
- 💻 Contributing code or documentation
- 💰 [Donating to QURI](https://quantifieduncertainty.org/donate) to support development
`;

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Home
          </Link>
        </div>
        
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aboutContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}