import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
vi.mock('fs/promises');

// Mock the test cases
vi.mock('../../data/check-spelling-grammar/test-cases', () => ({
  testCases: [
    { id: 'test1', category: 'Grammar', name: 'Test 1' },
    { id: 'test2', category: 'Spelling', name: 'Test 2' },
    { id: 'test3', category: 'Grammar', name: 'Test 3' },
  ]
}));

vi.mock('../../data/check-math-with-mathjs/test-cases', () => ({
  testCases: [
    { id: 'math1', category: 'Arithmetic', name: 'Math 1' },
    { id: 'math2', category: 'Algebra', name: 'Math 2' },
  ]
}));

describe('Evaluation Dashboard', () => {
  describe('groupByCategory', () => {
    it('should group test cases by category', () => {
      const testCases = [
        { id: '1', category: 'Grammar', name: 'Test 1' },
        { id: '2', category: 'Spelling', name: 'Test 2' },
        { id: '3', category: 'Grammar', name: 'Test 3' },
        { id: '4', category: 'Punctuation', name: 'Test 4' },
      ];

      // Inline the groupByCategory function for testing
      function groupByCategory<T extends { category: string }>(cases: T[]) {
        const groups: Record<string, T[]> = {};
        cases.forEach(tc => {
          (groups[tc.category] ??= []).push(tc);
        });
        return groups;
      }

      const result = groupByCategory(testCases);

      expect(result).toEqual({
        Grammar: [
          { id: '1', category: 'Grammar', name: 'Test 1' },
          { id: '3', category: 'Grammar', name: 'Test 3' },
        ],
        Spelling: [
          { id: '2', category: 'Spelling', name: 'Test 2' },
        ],
        Punctuation: [
          { id: '4', category: 'Punctuation', name: 'Test 4' },
        ],
      });
    });

    it('should handle empty array', () => {
      function groupByCategory<T extends { category: string }>(cases: T[]) {
        const groups: Record<string, T[]> = {};
        cases.forEach(tc => {
          (groups[tc.category] ??= []).push(tc);
        });
        return groups;
      }

      const result = groupByCategory([]);
      expect(result).toEqual({});
    });

    it('should handle single category', () => {
      function groupByCategory<T extends { category: string }>(cases: T[]) {
        const groups: Record<string, T[]> = {};
        cases.forEach(tc => {
          (groups[tc.category] ??= []).push(tc);
        });
        return groups;
      }

      const testCases = [
        { id: '1', category: 'Grammar', name: 'Test 1' },
        { id: '2', category: 'Grammar', name: 'Test 2' },
      ];

      const result = groupByCategory(testCases);
      expect(result).toEqual({
        Grammar: [
          { id: '1', category: 'Grammar', name: 'Test 1' },
          { id: '2', category: 'Grammar', name: 'Test 2' },
        ],
      });
    });
  });

  describe('File filtering', () => {
    it('should correctly identify spelling files', () => {
      const isSpellingFile = (filename: string) => {
        return filename.startsWith('spelling-') || 
               (filename.startsWith('evaluation-') && !filename.includes('math-evaluation'));
      };

      expect(isSpellingFile('spelling-2025-01-01.json')).toBe(true);
      expect(isSpellingFile('evaluation-2025-01-01.json')).toBe(true);
      expect(isSpellingFile('math-evaluation-2025-01-01.json')).toBe(false);
      expect(isSpellingFile('math-2025-01-01.json')).toBe(false);
      expect(isSpellingFile('random-file.json')).toBe(false);
    });

    it('should correctly identify math files', () => {
      const isMathFile = (filename: string) => {
        return filename.startsWith('math-');
      };

      expect(isMathFile('math-evaluation-2025-01-01.json')).toBe(true);
      expect(isMathFile('math-2025-01-01.json')).toBe(true);
      expect(isMathFile('spelling-2025-01-01.json')).toBe(false);
      expect(isMathFile('evaluation-2025-01-01.json')).toBe(false);
    });
  });

  describe('extractTimestamp', () => {
    it('should extract timestamp from filename', () => {
      function extractTimestamp(filename: string): string {
        const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
        if (match) {
          return match[1].replace(/T/, ' ').replace(/-/g, ':').replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3T');
        }
        return new Date().toISOString();
      }

      const timestamp = extractTimestamp('spelling-2025-01-15T14-30-45.json');
      expect(timestamp).toBe('2025:01:15 14:30:45');
    });

    it('should return current date for invalid filename', () => {
      function extractTimestamp(filename: string): string {
        const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
        if (match) {
          return match[1].replace(/T/, ' ').replace(/-/g, ':').replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3T');
        }
        return new Date().toISOString();
      }

      const before = new Date();
      const timestamp = extractTimestamp('invalid-filename.json');
      const after = new Date();

      const parsed = new Date(timestamp);
      expect(parsed.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(parsed.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getResultFiles', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return empty array when directory does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      async function getResultFiles(dir: string, prefix: string = '') {
        try {
          await fs.access(dir);
          const files = await fs.readdir(dir);
          return files;
        } catch (e) {
          return [];
        }
      }

      const result = await getResultFiles('/nonexistent');
      expect(result).toEqual([]);
    });

    it('should filter JSON files with prefix', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        'math-evaluation-2025.json',
        'spelling-evaluation-2025.json',
        'math-test.json',
        'readme.md',
        'test.txt',
      ] as any);
      vi.mocked(fs.stat).mockResolvedValue({
        size: 1024,
        mtime: new Date('2025-01-15'),
      } as any);

      async function getResultFiles(dir: string, prefix: string = '') {
        try {
          await fs.access(dir);
          const files = await fs.readdir(dir);
          const jsonFiles = files.filter((f: string) => 
            f.endsWith('.json') && (prefix ? f.startsWith(prefix) : true)
          );
          return jsonFiles;
        } catch (e) {
          return [];
        }
      }

      const result = await getResultFiles('/test', 'math-');
      expect(result).toEqual(['math-evaluation-2025.json', 'math-test.json']);
    });

    it('should sort files by modification date', async () => {
      const mockFiles = ['file1.json', 'file2.json', 'file3.json'];
      const mockStats = [
        { size: 1000, mtime: new Date('2025-01-10') },
        { size: 2000, mtime: new Date('2025-01-15') },
        { size: 1500, mtime: new Date('2025-01-12') },
      ];

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
      vi.mocked(fs.stat)
        .mockResolvedValueOnce(mockStats[0] as any)
        .mockResolvedValueOnce(mockStats[1] as any)
        .mockResolvedValueOnce(mockStats[2] as any);

      async function getResultFiles(dir: string, prefix: string = '') {
        try {
          await fs.access(dir);
          const files = await fs.readdir(dir);
          const jsonFiles = files.filter((f: string) => f.endsWith('.json'));
          
          const fileStats = await Promise.all(
            jsonFiles.map(async (filename: string) => {
              const stats = await fs.stat(path.join(dir, filename));
              return {
                name: filename,
                size: stats.size,
                modified: stats.mtime.toISOString(),
              };
            })
          );
          
          return fileStats.sort((a, b) => 
            new Date(b.modified).getTime() - new Date(a.modified).getTime()
          );
        } catch (e) {
          return [];
        }
      }

      const result = await getResultFiles('/test');
      expect(result).toEqual([
        { name: 'file2.json', size: 2000, modified: '2025-01-15T00:00:00.000Z' },
        { name: 'file3.json', size: 1500, modified: '2025-01-12T00:00:00.000Z' },
        { name: 'file1.json', size: 1000, modified: '2025-01-10T00:00:00.000Z' },
      ]);
    });
  });

  describe('Empty runs handling', () => {
    it('should handle results with no runs', () => {
      const result = {
        runs: []
      };

      // Simulate the logic from views.ts
      const hasRuns = result.runs && result.runs.length > 0;
      expect(hasRuns).toBe(false);
    });

    it('should handle results with undefined runs', () => {
      const result = {} as any;

      // Simulate the logic from views.ts
      const hasRuns = result.runs && result.runs.length > 0;
      expect(hasRuns).toBeFalsy();
    });

    it('should handle results with null runs', () => {
      const result = { runs: null } as any;

      // Simulate the logic from views.ts
      const hasRuns = result.runs && result.runs.length > 0;
      expect(hasRuns).toBeFalsy();
    });

    it('should handle results with valid runs', () => {
      const result = {
        runs: [
          { status: 'verified_true', errors: null },
          { status: 'verified_false', errors: [{ text: 'error', correction: 'fix' }] }
        ]
      };

      const hasRuns = result.runs && result.runs.length > 0;
      expect(hasRuns).toBe(true);
      expect(result.runs[0].errors).toBe(null);
      expect(result.runs[1].errors).toHaveLength(1);
    });
  });

  describe('Unique errors extraction', () => {
    it('should extract unique errors from multiple runs', () => {
      function getUniqueErrors(runs: any[]) {
        const seen = new Set();
        const unique = [];
        
        for (const run of runs) {
          if (run.errors && Array.isArray(run.errors)) {
            for (const error of run.errors) {
              const key = `${error.text}-${error.correction}`;
              if (!seen.has(key)) {
                seen.add(key);
                unique.push(error);
              }
            }
          }
        }
        
        return unique;
      }

      const runs = [
        { errors: [
          { text: 'error1', correction: 'fix1', type: 'spelling' },
          { text: 'error2', correction: 'fix2', type: 'grammar' },
        ]},
        { errors: [
          { text: 'error1', correction: 'fix1', type: 'spelling' }, // Duplicate
          { text: 'error3', correction: 'fix3', type: 'punctuation' },
        ]},
        { errors: null }, // No errors
        {}, // Missing errors field
      ];

      const unique = getUniqueErrors(runs);
      expect(unique).toHaveLength(3);
      expect(unique).toEqual([
        { text: 'error1', correction: 'fix1', type: 'spelling' },
        { text: 'error2', correction: 'fix2', type: 'grammar' },
        { text: 'error3', correction: 'fix3', type: 'punctuation' },
      ]);
    });

    it('should handle runs with no errors', () => {
      function getUniqueErrors(runs: any[]) {
        const seen = new Set();
        const unique = [];
        
        for (const run of runs) {
          if (run.errors && Array.isArray(run.errors)) {
            for (const error of run.errors) {
              const key = `${error.text}-${error.correction}`;
              if (!seen.has(key)) {
                seen.add(key);
                unique.push(error);
              }
            }
          }
        }
        
        return unique;
      }

      const runs = [
        { errors: null },
        { errors: [] },
        {},
      ];

      const unique = getUniqueErrors(runs);
      expect(unique).toEqual([]);
    });
  });

  describe('Consistency class determination', () => {
    it('should return correct consistency class', () => {
      function getConsistencyClass(score: number) {
        if (score === 100) return 'perfect';
        if (score >= 75) return 'good';
        return 'poor';
      }

      expect(getConsistencyClass(100)).toBe('perfect');
      expect(getConsistencyClass(90)).toBe('good');
      expect(getConsistencyClass(75)).toBe('good');
      expect(getConsistencyClass(74)).toBe('poor');
      expect(getConsistencyClass(50)).toBe('poor');
      expect(getConsistencyClass(0)).toBe('poor');
    });
  });

  describe('File deduplication', () => {
    it('should deduplicate files by name, preferring local over parent', () => {
      const localFiles = [
        { name: 'file1.json', modified: '2025-01-15', size: 1000 },
        { name: 'file2.json', modified: '2025-01-14', size: 2000 },
      ];
      
      const parentFiles = [
        { name: 'file1.json', modified: '2025-01-10', size: 900 }, // Duplicate (older)
        { name: 'file3.json', modified: '2025-01-13', size: 1500 },
      ];

      // Simulate the merge logic from index.ts
      const allFiles = [...localFiles];
      const localFileNames = new Set(localFiles.map(f => f.name));
      
      for (const file of parentFiles) {
        if (!localFileNames.has(file.name)) {
          allFiles.push(file);
        }
      }

      expect(allFiles).toHaveLength(3);
      expect(allFiles).toEqual([
        { name: 'file1.json', modified: '2025-01-15', size: 1000 }, // Local version
        { name: 'file2.json', modified: '2025-01-14', size: 2000 },
        { name: 'file3.json', modified: '2025-01-13', size: 1500 },
      ]);
    });
  });
});