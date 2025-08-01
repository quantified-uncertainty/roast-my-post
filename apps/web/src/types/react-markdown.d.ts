declare module 'react-markdown' {
  import { FC } from 'react';
  
  interface ReactMarkdownProps {
    children: string;
    className?: string;
    components?: Record<string, any>;
    remarkPlugins?: any[];
    rehypePlugins?: any[];
    disallowedElements?: string[];
    unwrapDisallowed?: boolean;
    [key: string]: any;
  }
  
  const ReactMarkdown: FC<ReactMarkdownProps>;
  export = ReactMarkdown;
}