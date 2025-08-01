import type { Comment } from '@/types/documentSchema';

interface CommentStatsProps {
  comments: (Comment & { agentName?: string })[];
}

export function CommentStats({ comments }: CommentStatsProps) {
  // Calculate statistics
  const stats = {
    total: comments.length,
    byLevel: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
  };
  
  // Count by level
  comments.forEach(comment => {
    if (comment.level) {
      stats.byLevel[comment.level] = (stats.byLevel[comment.level] || 0) + 1;
    }
    if (comment.source) {
      stats.bySource[comment.source] = (stats.bySource[comment.source] || 0) + 1;
    }
  });
  
  // Level colors
  const levelColors = {
    error: 'text-red-600 bg-red-50',
    warning: 'text-orange-600 bg-orange-50',
    info: 'text-blue-600 bg-blue-50',
    success: 'text-green-600 bg-green-50',
  };
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Comment Statistics
      </h3>
      
      {/* Total Count */}
      <div className="mb-4 text-2xl font-bold text-gray-900">
        {stats.total} {stats.total === 1 ? 'Comment' : 'Comments'}
      </div>
      
      {/* By Level */}
      {Object.keys(stats.byLevel).length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">
            By Level
          </h4>
          <div className="space-y-1">
            {Object.entries(stats.byLevel).map(([level, count]) => (
              <div
                key={level}
                className="flex items-center justify-between text-sm"
              >
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    levelColors[level as keyof typeof levelColors] || 'text-gray-600 bg-gray-100'
                  }`}
                >
                  {level}
                </span>
                <span className="text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* By Source */}
      {Object.keys(stats.bySource).length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">
            By Source
          </h4>
          <div className="space-y-1">
            {Object.entries(stats.bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => (
                <div
                  key={source}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {source.charAt(0).toUpperCase() + source.slice(1)}
                  </span>
                  <span className="text-gray-600">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}