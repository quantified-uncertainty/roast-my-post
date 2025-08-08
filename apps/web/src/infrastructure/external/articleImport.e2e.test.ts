import { processArticle } from '@/infrastructure/external/articleImport';

describe('Article Import End-to-End Tests', () => {
  jest.setTimeout(30000); // 30 second timeout for network requests

  // Fail fast if required API keys are not available
  beforeAll(() => {
    if (!process.env.FIRECRAWL_KEY) {
      throw new Error('FIRECRAWL_KEY is required for article import e2e tests. Set it in your environment or .env.local file.');
    }
  });

  describe('EA Forum Import', () => {
    const url = 'https://forum.effectivealtruism.org/posts/RPYnR7c6ZmZKBoeLG/you-should-update-on-how-dc-is-talking-about-ai';
    
    it('should import EA Forum article with correct content', async () => {
      const result = await processArticle(url);
      
      // Check metadata
      expect(result.title).toBe('You should update on how DC is talking about AI');
      expect(result.author).toBe('Abby Babby');
      expect(result.platforms).toContain('EA Forum');
      expect(result.url).toBe(url);
      
      // Check opening section
      expect(result.content).toContain('If you are planning on doing AI policy communications');
      expect(result.content).toContain('Select Committee on the CCP hearing');
      
      // Check closing section
      expect(result.content).toContain('The Overton window is rapidly shifting in DC');
      expect(result.content).toContain('What should America do about it?');
      
      // Check content length - EA Forum articles vary in size
      // This particular article is shorter (~1.4k chars)
      expect(result.content.length).toBeGreaterThan(1000);
      
      // Should not contain table of contents
      expect(result.content).not.toContain('Hide table of contents');
      expect(result.content).not.toContain('[Introduction]');
    });
  });

  describe('LessWrong Import', () => {
    const url = 'https://www.lesswrong.com/posts/ainn5APCKHTFxuHKv/jankily-controlling-superintelligence';
    
    it('should import LessWrong article with correct content', async () => {
      const result = await processArticle(url);
      
      // Check metadata
      expect(result.title).toBe('Jankily controlling superintelligence');
      expect(result.author).toBe('ryan_greenblatt');
      expect(result.platforms).toContain('LessWrong');
      expect(result.url).toBe(url);
      
      // Check opening section
      expect(result.content).toContain('When discussing');
      expect(result.content).toContain('AI control');
      expect(result.content).toContain('modestly improving our odds of surviving significantly superhuman systems');
      
      // Check for key content
      expect(result.content).toContain('superintelligence');
      expect(result.content).toContain('control');
      
      // Check that footnotes are included at the end with numbers
      expect(result.content).toContain('---');
      expect(result.content).toContain('[1]'); // Simple numbered references
      expect(result.content).toContain('1. By "risk", I really mean the expected badness');
      
      // Check content length - LessWrong articles should be substantial
      // This article should be at least 15,000 characters (was getting truncated to ~4,500)
      expect(result.content.length).toBeGreaterThan(15000);
      
      // Should not contain navigation elements
      expect(result.content).not.toContain('Hide table of contents');
      expect(result.content).not.toContain('Show all topics');
    });
  });

  describe('Substack Import', () => {
    const url = 'https://ozziegooen.substack.com/p/health-update-positive-results-from';
    
    it('should import Substack article with correct content', async () => {
      const result = await processArticle(url);
      
      // Check metadata
      expect(result.title).toContain('Health Update');
      expect(result.author).toBeTruthy();
      expect(result.platforms).toContain('Substack');
      expect(result.url).toBe(url);
      
      // Check opening section (common patterns in health updates)
      expect(result.content).toMatch(/health|update|positive|results/i);
      
      // Check content length - Substack articles via Firecrawl should be substantial
      expect(result.content.length).toBeGreaterThan(2000);
      
      // Should not contain Substack UI elements
      expect(result.content).not.toContain('Subscribe');
      expect(result.content).not.toContain('Share this post');
      expect(result.content).not.toContain('Copy link');
      expect(result.content).not.toContain('Facebook');
      expect(result.content).not.toContain('Notes');
    });
  });

  describe('Content Cleaning', () => {
    it('should properly format markdown images', async () => {
      // Test with any of the URLs
      const url = 'https://forum.effectivealtruism.org/posts/RPYnR7c6ZmZKBoeLG/you-should-update-on-how-dc-is-talking-about-ai';
      const result = await processArticle(url);
      
      // Should not have double-wrapped image links
      expect(result.content).not.toMatch(/\[\s*!\[.*\]\(.*\)\s*\]\(.*\)/);
      
      // Should have proper image markdown if images exist
      if (result.content.includes('![')) {
        expect(result.content).toMatch(/!\[.*\]\(.*\)/);
      }
    });
  });

  describe('Content Completeness', () => {
    it('should not truncate content when converting HTML to Markdown', async () => {
      // This specific LessWrong article was getting truncated from ~18k to ~4.5k chars
      const url = 'https://www.lesswrong.com/posts/ainn5APCKHTFxuHKv/jankily-controlling-superintelligence';
      const result = await processArticle(url);
      
      // Should include content from beginning
      expect(result.content).toContain('When discussing');
      
      // Should include content from middle
      expect(result.content).toContain('hopes for controlling superintelligence');
      expect(result.content).toContain('How much time can control buy');
      
      // Should include content from end (conclusion)
      expect(result.content).toContain('Conclusion');
      expect(result.content).toContain('jankily controlling superintelligence seems decently helpful');
      
      // Should include footnotes section at the end with numbers
      expect(result.content).toContain('---');
      expect(result.content).toContain('[1]'); // Simple numbered references
      expect(result.content).toContain('1. By "risk", I really mean the expected badness');
      
      // Total length check
      expect(result.content.length).toBeGreaterThan(15000);
    });
  });
});