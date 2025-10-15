"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface TagNode {
  name: string;
  fullPath: string;
  count: number;
  children: Map<string, TagNode>;
}

interface TagTreeProps {
  tags: string[][]; // Array of tag arrays from each evaluation
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  className?: string;
}

function buildTagTree(tags: string[][]): TagNode {
  const root: TagNode = {
    name: "",
    fullPath: "",
    count: 0,
    children: new Map(),
  };

  // Flatten and count all tags
  const tagCounts = new Map<string, number>();
  tags.flat().forEach((tag) => {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  });

  // Build tree structure
  tagCounts.forEach((count, tag) => {
    const parts = tag.split("/");
    let current = root;

    parts.forEach((part, index) => {
      const fullPath = parts.slice(0, index + 1).join("/");

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath,
          count: 0,
          children: new Map(),
        });
      }

      const node = current.children.get(part)!;

      // Only add count at the leaf level
      if (index === parts.length - 1) {
        node.count = count;
      }

      current = node;
    });
  });

  return root;
}

function TagTreeNode({
  node,
  depth = 0,
  selectedTags,
  onTagSelect,
}: {
  node: TagNode;
  depth?: number;
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.size > 0;
  const isSelected = selectedTags.includes(node.fullPath);

  return (
    <div>
      {node.name && (
        <div
          className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
            isSelected ? "bg-indigo-50 text-indigo-700 font-medium" : ""
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              setIsExpanded(!isExpanded);
            }
            onTagSelect(node.fullPath);
          }}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDownIcon className="h-3 w-3" />
              ) : (
                <ChevronRightIcon className="h-3 w-3" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-3" />}
          <span className="flex-1 text-sm truncate">{node.name}</span>
          {node.count > 0 && (
            <span className="flex-shrink-0 text-xs text-gray-500 font-normal">
              ({node.count})
            </span>
          )}
        </div>
      )}

      {isExpanded &&
        hasChildren &&
        Array.from(node.children.values()).map((child) => (
          <TagTreeNode
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            selectedTags={selectedTags}
            onTagSelect={onTagSelect}
          />
        ))}
    </div>
  );
}

export function TagTree({
  tags,
  selectedTags,
  onTagSelect,
  className = "",
}: TagTreeProps) {
  const tree = useMemo(() => buildTagTree(tags), [tags]);

  if (tree.children.size === 0) {
    return (
      <div className={`text-sm text-gray-500 p-4 ${className}`}>
        No tags available
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${className}`}>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2 mb-1">
        Filter by Tags
      </div>
      {Array.from(tree.children.values()).map((node) => (
        <TagTreeNode
          key={node.fullPath}
          node={node}
          selectedTags={selectedTags}
          onTagSelect={onTagSelect}
        />
      ))}
    </div>
  );
}
