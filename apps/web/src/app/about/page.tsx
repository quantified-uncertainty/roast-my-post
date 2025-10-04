import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const aboutContent = `
# About RoastMyPost

RoastMyPost is an open-source AI-powered platform for document analysis and evaluation. It hosts a variety of llm-powered evaluators that can be used to evaluate documents.

## What We Do

With RoastMyPost, you can:
- Upload documents for AI-powered analysis
- Get detailed feedback with inline comments and highlights
- Track evaluation history and compare different perspectives
- Export evaluations for review and analysis
- Create custom AI evaluators with specific evaluation criteria

## Open Source

RoastMyPost is open source. We believe in transparent development and welcome contributions from developers, researchers, and users.

- **GitHub Repository**: [github.com/quantified-uncertainty/roast-my-post](https://github.com/quantified-uncertainty/roast-my-post)
- **License**: MIT
- **Contributing**: See our [contribution guidelines](https://github.com/quantified-uncertainty/roast-my-post/blob/main/CONTRIBUTING.md)

## The Team

Roast My Post is developed and maintained by [Quantified Uncertainty Research Institute (QURI)](https://quantifieduncertainty.org/), a nonprofit research organization focused on improving decision-making under uncertainty.

## Contact Us

We'd love to hear from you! Whether you have questions, feedback, or want to contribute:

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
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-sm">
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {aboutContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
