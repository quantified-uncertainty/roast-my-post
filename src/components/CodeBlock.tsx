"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as Prism from 'prismjs';
// You can change this to other themes like:
// import 'prismjs/themes/prism.css'; // Default theme
// import 'prismjs/themes/prism-twilight.css'; // Twilight theme
// import 'prismjs/themes/prism-okaidia.css'; // Monokai-like theme
// import 'prismjs/themes/prism-solarizedlight.css'; // Solarized Light
import 'prismjs/themes/prism-tomorrow.css'; // Tomorrow Night theme
import { DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline';

// Import additional language support
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';

// Define basic Squiggle language support
if (typeof Prism !== 'undefined') {
  Prism.languages.squiggle = {
    'comment': /\/\/.*/,
    'string': {
      pattern: /"(?:\\.|[^\\"\r\n])*"/,
      greedy: true
    },
    'number': /\b\d+(?:\.\d+)?\b/,
    'operator': /[+\-*\/=<>!]=?|->|=>|\|>/,
    'punctuation': /[{}[\];(),.:]/,
    'builtin': /\b(?:normal|uniform|beta|lognormal|sample|mean|variance|quantile)\b/,
    'keyword': /\b(?:let|if|then|else|to)\b/,
    'function': /\b[a-zA-Z_]\w*(?=\s*\()/,
    'variable': /\b[a-zA-Z_]\w*\b/
  };
}

interface CodeBlockProps {
  code: string;
  language?: string;
  attributes?: any;
  children?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language = 'plain', 
  attributes, 
  children
}) => {
  const [formattedCode, setFormattedCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const codeRef = useRef<HTMLElement>(null);

  // Apply syntax highlighting
  useEffect(() => {
    if (codeRef.current && language !== 'plain') {
      try {
        Prism.highlightElement(codeRef.current);
      } catch (error) {
        console.error('Prism highlighting error:', error);
      }
    }
  }, [formattedCode, language]);

  const formatCode = async () => {
    try {
      setFormatError(null);
      setIsFormatting(true);

      // Only format JavaScript/TypeScript code
      if (['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'].includes(language)) {
        // Dynamic import of prettier for browser usage
        const prettier = await import('prettier/standalone');
        const prettierPluginBabel = await import('prettier/plugins/babel');
        const prettierPluginTypescript = await import('prettier/plugins/typescript');
        const prettierPluginEstree = await import('prettier/plugins/estree');

        // Determine parser based on language
        let parser = 'babel';
        if (language === 'typescript' || language === 'ts' || language === 'tsx') {
          parser = 'typescript';
        }

        const formatted = await prettier.format(formattedCode, {
          parser,
          plugins: [
            prettierPluginBabel,
            prettierPluginTypescript,
            prettierPluginEstree
          ],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'es5',
          printWidth: 80,
        });
        
        setFormattedCode(formatted.trim());
      } else {
        setFormatError(`Formatting not supported for ${language}`);
      }
    } catch (error) {
      console.error('Prettier formatting error:', error);
      setFormatError('Failed to format code. Please check the syntax.');
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

  return (
    <div {...attributes} className="relative my-4 overflow-hidden rounded-lg bg-gray-900">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <span className="text-sm text-gray-400">{language}</span>
        <div className="flex items-center gap-2">
          {['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'].includes(language) && (
            <button
              onClick={formatCode}
              disabled={isFormatting}
              className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Format with Prettier"
            >
              {isFormatting ? 'Formatting...' : 'Format'}
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-200"
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
      <div className="overflow-x-auto">
        <div className="flex">
          {/* Line numbers column */}
          <div className="flex-shrink-0 bg-gray-800 border-r border-gray-700 px-3 py-4 text-right">
            {formattedCode.split('\n').map((_, index) => {
              const lineNumber = index + 1;
              return (
                <div 
                  key={index}
                  className="text-xs leading-[1.5] text-gray-500"
                  style={{ height: '1.5em' }}
                >
                  {lineNumber}
                </div>
              );
            })}
          </div>
          
          {/* Code content */}
          <div className="flex-1 p-4">
            <pre className="text-sm">
              <code ref={codeRef} className={`language-${language}`}>
                {formattedCode}
              </code>
            </pre>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

export default CodeBlock;