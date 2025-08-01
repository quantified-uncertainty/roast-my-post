import React, { useState, useEffect } from 'react';
import type { Comment } from '@/types/documentSchema';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface CommentFiltersProps {
  comments: (Comment & { agentName?: string })[];
  onFilteredCommentsChange: (comments: (Comment & { agentName?: string })[]) => void;
}

export function CommentFilters({ comments, onFilteredCommentsChange }: CommentFiltersProps) {
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'importance' | 'position'>('position');
  const [showFilters, setShowFilters] = useState(false);
  
  // Get unique sources and levels from comments
  const sources = Array.from(new Set(comments.map(c => c.source).filter(Boolean))) as string[];
  const levels = Array.from(new Set(comments.map(c => c.level).filter(Boolean))) as string[];
  
  // Apply filters
  const applyFilters = () => {
    let filtered = [...comments];
    
    // Filter by source
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(c => c.source === sourceFilter);
    }
    
    // Filter by level
    if (levelFilter !== 'all') {
      filtered = filtered.filter(c => c.level === levelFilter);
    }
    
    // Sort
    if (sortBy === 'importance') {
      filtered.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    }
    // Position sort is the default (by array order)
    
    onFilteredCommentsChange(filtered);
  };
  
  // Apply filters whenever they change
  useEffect(() => {
    applyFilters();
  }, [sourceFilter, levelFilter, sortBy, comments]);
  
  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex w-full items-center justify-between text-sm font-medium text-gray-700"
      >
        <span>Filter Comments</span>
        <ChevronDownIcon 
          className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {showFilters && (
        <div className="mt-4 space-y-3">
          {/* Source Filter */}
          {sources.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Source
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Sources</option>
                {sources.map(source => {
                  if (!source) return null;
                  return (
                    <option key={source} value={source}>
                      {source.charAt(0).toUpperCase() + source.slice(1)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          
          {/* Level Filter */}
          {levels.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Level
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                {levels.map(level => {
                  if (!level) return null;
                  return (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          
          {/* Sort By */}
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'importance' | 'position')}
              className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="position">Document Position</option>
              <option value="importance">Importance</option>
            </select>
          </div>
          
          {/* Summary */}
          <div className="text-xs text-gray-500">
            Showing {comments.filter(c => 
              (sourceFilter === 'all' || c.source === sourceFilter) &&
              (levelFilter === 'all' || c.level === levelFilter)
            ).length} of {comments.length} comments
          </div>
        </div>
      )}
    </div>
  );
}