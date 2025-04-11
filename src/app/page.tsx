import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const foo = `
# Hello

This is a test

- List item 1
- List item 2

1. Numbered item 1
2. Numbered item 2
`;

export default function Home() {
  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Document Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <article className="prose prose-slate dark:prose-invert prose-lg max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{foo}</Markdown>
          </article>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Image
              src="/file.svg"
              alt="File icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="text-sm">File</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Image
              src="/edit.svg"
              alt="Edit icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="text-sm">Edit</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Image
              src="/view.svg"
              alt="View icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="text-sm">View</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Image
              src="/share.svg"
              alt="Share icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="text-sm">Share</span>
          </div>
        </div>
      </div>
    </div>
  );
}
