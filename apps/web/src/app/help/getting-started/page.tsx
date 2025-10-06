"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";

const gettingStartedContent = `# Getting Started with Roast My Post

## Quick Start (3 Steps)

### 1. Sign Up / Sign In
- Click "Sign In" in the top navigation
- Use your email address
- You'll receive a magic link to sign in

### 2. Upload Your First Document
- Click the "New Document" button in the header
- Either:
  - **Paste content** directly
  - **Import from URL** (supports LessWrong, EA Forum, and more)

### 3. Select Evaluators
- Choose a set of evaluators from the list
- Wait 1-5 minutes for results. Refresh the page to check for updates. There might also be a queue for evaluations, in which case you'll need to wait longer.

## Need Help?

- 📧 Email: support@quantifieduncertainty.org
- 💬 Discord: [Join our community](https://discord.gg/nsTnQTgtG6)
- 📚 Docs: You're already here!
- 🐛 Issues: [GitHub](https://github.com/quantified-uncertainty/roast-my-post/issues)

Happy writing and evaluating! 🚀`;

export default function GettingStartedPage() {
  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Getting Started</h1>
        <CopyMarkdownButton content={gettingStartedContent} />
      </div>

      <div className="prose prose-gray max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {gettingStartedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
