"use client";

import React, { useState } from "react";
import { Highlight, themes, Language } from "prism-react-renderer";
import {
  CheckIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";

interface CodeBlockProps {
  code: string;
  language?: string;
  attributes?: any;
  highlightLines?: number[]; // Array of line numbers to highlight (1-indexed)
  highlightPositions?: Array<{ tag: string; lineNumber: number }>; // Position markers for comments
}

// Map our language strings to prism-react-renderer Language type
const languageMap: Record<string, Language> = {
  javascript: "javascript",
  js: "javascript",
  jsx: "jsx",
  typescript: "typescript",
  ts: "typescript",
  tsx: "tsx",
  json: "json",
  markdown: "markdown",
  css: "css",
  python: "python",
  bash: "bash",
  yaml: "yaml",
  squiggle: "javascript", // Use JavaScript as fallback for squiggle
};

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "plain",
  attributes,
  highlightLines = [],
  highlightPositions = [],
}) => {
  const [formattedCode, setFormattedCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  const formatCode = async () => {
    try {
      setFormatError(null);
      setIsFormatting(true);

      // Only format JavaScript/TypeScript code
      if (
        ["javascript", "js", "jsx", "typescript", "ts", "tsx"].includes(
          language
        )
      ) {
        // Dynamic import of prettier for browser usage
        const prettier = await import("prettier/standalone");
        const prettierPluginBabel = await import("prettier/plugins/babel");
        const prettierPluginTypescript = await import(
          "prettier/plugins/typescript"
        );
        const prettierPluginEstree = await import("prettier/plugins/estree");

        // Determine parser based on language
        let parser = "babel";
        if (
          language === "typescript" ||
          language === "ts" ||
          language === "tsx"
        ) {
          parser = "typescript";
        }

        const formatted = await prettier.format(formattedCode, {
          parser,
          plugins: [
            prettierPluginBabel.default,
            prettierPluginTypescript.default,
            prettierPluginEstree.default,
          ],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: "es5",
          printWidth: 80,
        });

        setFormattedCode(formatted.trim());
      } else {
        setFormatError(`Formatting not supported for ${language}`);
      }
    } catch (error) {
      console.error("Prettier formatting error:", error);
      setFormatError("Failed to format code. Please check the syntax.");
    } finally {
      setIsFormatting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Get the language for prism-react-renderer
  const prismLanguage = languageMap[language] || "jsx";

  return (
    <div
      {...attributes}
      className="relative my-4 overflow-hidden rounded-lg bg-gray-800 max-w-full"
      style={{ position: 'relative' }}
    >
      <div className="flex items-center justify-between bg-gray-700 px-4 py-2">
        <span className="text-sm text-gray-400">{language}</span>
        <div className="flex items-center gap-2">
          {["javascript", "js", "jsx", "typescript", "ts", "tsx"].includes(
            language
          ) && (
            <button
              onClick={formatCode}
              disabled={isFormatting}
              className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-600 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              title="Format with Prettier"
            >
              {isFormatting ? "Formatting..." : "Format"}
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-600 hover:text-gray-200"
            title="Copy code"
          >
            {copied ? (
              <>
                <CheckIcon className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <DocumentDuplicateIcon className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      {formatError && (
        <div className="bg-red-900/20 px-4 py-2 text-xs text-red-400">
          {formatError}
        </div>
      )}
      <Highlight
        theme={themes.nightOwl}
        code={formattedCode.trim()}
        language={prismLanguage}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
            <pre
              className={`${className} flex !border-0 bg-transparent text-sm !shadow-none`}
              style={{
                ...style,
                background: "transparent",
                margin: 0,
                maxWidth: '100%',
                overflow: 'visible',
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              }}
            >
              {/* Line numbers column */}
              <div className="flex-shrink-0 select-none px-3 text-right">
                {tokens.map((line, i) => {
                  const lineNumber = i + 1;
                  const isHighlighted = highlightLines.includes(lineNumber);
                  return (
                    <div
                      key={i}
                      className={`text-xs ${
                        isHighlighted ? "text-gray-300" : "text-gray-500"
                      }`}
                      style={{ 
                        lineHeight: "1.5rem",
                        backgroundColor: isHighlighted ? "rgba(59, 130, 246, 0.15)" : "transparent",
                        marginLeft: isHighlighted ? "-12px" : "0",
                        marginRight: isHighlighted ? "-12px" : "0",
                        paddingLeft: isHighlighted ? "12px" : "0",
                        paddingRight: isHighlighted ? "12px" : "0",
                      }}
                    >
                      {lineNumber}
                    </div>
                  );
                })}
              </div>

              {/* Code content */}
              <code className="flex-1 px-4">
                {tokens.map((line, i) => {
                  const lineNumber = i + 1;
                  const isHighlighted = highlightLines.includes(lineNumber);
                  return (
                    <div 
                      key={i} 
                      {...getLineProps({ line })}
                      style={{ 
                        lineHeight: "1.5rem",
                        backgroundColor: isHighlighted ? "rgba(59, 130, 246, 0.15)" : "transparent",
                        marginLeft: isHighlighted ? "-16px" : "0",
                        marginRight: isHighlighted ? "-16px" : "0",
                        paddingLeft: isHighlighted ? "16px" : "0",
                        paddingRight: isHighlighted ? "16px" : "0",
                      }}
                    >
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                      {line.length === 0 && "\n"}
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        )}
      </Highlight>
      
      {/* Position markers for comment alignment */}
      {highlightPositions.map(({ tag, lineNumber }) => {
        // Calculate vertical position based on line number
        // Header height (language bar) is 40px + padding of 14px = 54px
        // Each line is 1.5rem = 24px
        const headerHeight = 54;
        const lineHeight = 24; // 1.5rem
        const topPosition = headerHeight + (lineNumber - 1) * lineHeight;
        
        return (
          <div
            key={tag}
            data-tag={tag}
            style={{
              position: 'absolute',
              top: `${topPosition}px`,
              left: 0,
              width: 0,
              height: 0,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </div>
  );
};

export default CodeBlock;