import { detectLanguageConvention, getConventionExamples, detectDocumentType } from './conventionDetector';

describe('conventionDetector', () => {
  describe('detectLanguageConvention', () => {
    describe('improved confidence calculation', () => {
      it('should return 0 confidence with insufficient evidence', () => {
        const result = detectLanguageConvention('The cat sat.');
        expect(result.convention).toBe('unknown');
        expect(result.confidence).toBe(0);
      });

      it('should calculate confidence based on dominance', () => {
        // Strong US signal
        const usResult = detectLanguageConvention(
          'I organized the program to analyze the behavior of the center system.'
        );
        expect(usResult.convention).toBe('US');
        expect(usResult.confidence).toBeGreaterThan(0.8);

        // Strong UK signal
        const ukResult = detectLanguageConvention(
          'I organised the programme to analyse the behaviour of the centre system.'
        );
        expect(ukResult.convention).toBe('UK');
        expect(ukResult.confidence).toBeGreaterThan(0.8);
      });
    });

    describe('weighted patterns', () => {
      it('should weight strong patterns (ize/ise, or/our) more heavily', () => {
        // Strong patterns should outweigh weak ones
        const text = 'I organize colors in the theater.'; // 2 strong (organize, colors), 1 weak (theater)
        const result = detectLanguageConvention(text);
        expect(result.convention).toBe('US');
        
        // Check evidence includes pattern types
        const strongEvidence = result.evidence.filter(e => 
          e.patternType === 'ize/ise' || e.patternType === 'or/our'
        );
        expect(strongEvidence.length).toBeGreaterThan(0);
      });

      it('should handle equal weighted patterns correctly', () => {
        // Equal strong patterns from both conventions
        const text = 'I organize with honour.'; // US: organize (weight 2), UK: honour (weight 2)
        const result = detectLanguageConvention(text);
        expect(result.convention).toBe('mixed');
        expect(result.confidence).toBeGreaterThan(0.3);
      });
    });

    describe('mixed convention detection', () => {
      it('should detect mixed conventions when ratio > 0.3', () => {
        const mixedText = 'I organize the colours and analyze the behaviours in the center.';
        const result = detectLanguageConvention(mixedText);
        expect(result.convention).toBe('mixed');
        expect(result.confidence).toBeGreaterThan(0.3);
        expect(result.confidence).toBeLessThan(1.0);
      });

      it('should not detect mixed when one convention dominates', () => {
        const dominantText = 'I organize, categorize, and analyze everything in the center.';
        const result = detectLanguageConvention(dominantText);
        expect(result.convention).toBe('US');
        expect(result.confidence).toBeGreaterThan(0.7);
      });

      it('should handle balanced mixed usage', () => {
        const balancedText = 'The organization organised events. The color scheme used colours. The analyze function analyses data.';
        const result = detectLanguageConvention(balancedText);
        expect(result.convention).toBe('mixed');
        // Higher confidence for more balanced mixing
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('ambiguous words handling', () => {
      it('should ignore ambiguous words like program and license', () => {
        const text = 'The program has a license for processing.';
        const result = detectLanguageConvention(text);
        // Should be unknown since program and license are ambiguous
        expect(result.convention).toBe('unknown');
        // Aluminum is actually a US/UK difference (aluminum vs aluminium) so it might be detected
        expect(result.evidence.filter(e => e.word === 'program' || e.word === 'license').length).toBe(0);
      });

      it('should still detect convention when mixed with ambiguous words', () => {
        const text = 'The program organized the colour scheme and checked the license.';
        const result = detectLanguageConvention(text);
        // Should detect based on non-ambiguous words only
        expect(result.convention).toBe('mixed'); // organized (US) vs colour (UK)
        expect(result.evidence.find(e => e.word === 'program')).toBeUndefined();
        expect(result.evidence.find(e => e.word === 'license')).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle empty text', () => {
        const result = detectLanguageConvention('');
        expect(result.convention).toBe('unknown');
        expect(result.confidence).toBe(0);
        expect(result.evidence).toHaveLength(0);
      });

      it('should handle text with no convention markers', () => {
        const result = detectLanguageConvention('The quick brown fox jumps over the lazy dog.');
        expect(result.convention).toBe('unknown');
        expect(result.confidence).toBe(0);
      });

      it('should handle repeated words correctly', () => {
        const text = 'Color color color organize organize organize.';
        const result = detectLanguageConvention(text);
        expect(result.convention).toBe('US');
        // Should count weighted occurrences
        const colorEvidence = result.evidence.find(e => e.word === 'color');
        expect(colorEvidence?.count).toBe(6); // 3 occurrences * 2 weight
      });

      it('should require minimum confidence for small samples', () => {
        const text = 'I organize.'; // Only one word
        const result = detectLanguageConvention(text);
        // Even though it's 100% US, confidence should reflect small sample
        expect(result.convention).toBe('unknown'); // Falls below threshold
      });
    });

    describe('vocabulary differences', () => {
      it('should detect US vocabulary', () => {
        const text = 'I took the elevator to my apartment and ate some cookies.';
        const result = detectLanguageConvention(text);
        expect(result.convention).toBe('US');
        expect(result.evidence.some(e => e.word.includes('elevator'))).toBe(true);
      });

      it('should detect UK vocabulary', () => {
        const text = 'I took the lift to my flat and ate some biscuits.';
        const result = detectLanguageConvention(text);
        expect(result.convention).toBe('UK');
        expect(result.evidence.some(e => e.word.includes('lift'))).toBe(true);
      });

      it('should handle mixed vocabulary', () => {
        const text = 'I took the elevator to my flat.'; // US elevator, UK flat
        const result = detectLanguageConvention(text);
        expect(result.convention).toBe('mixed');
      });
    });

    describe('real-world examples', () => {
      it('should handle academic US text', () => {
        const text = `
          This study analyzes organizational behavior patterns in specialized environments.
          We utilized a randomized methodology to categorize responses and optimize data collection.
          The center's program emphasized rigorous analysis of behavioral indicators.
        `;
        const result = detectLanguageConvention(text);
        expect(result.convention).toBe('US');
        expect(result.confidence).toBeGreaterThan(0.7);
      });

      it('should handle blog UK text', () => {
        const text = `
          I've been organising my thoughts about this programme all week. 
          The colours in the theatre were absolutely brilliant, though I realised 
          I'd forgotten to analyse the lighting properly. My neighbour mentioned 
          the same thing when we were queueing for biscuits during the interval.
        `;
        const result = detectLanguageConvention(text);
        expect(result.convention).toBe('UK');
        // Confidence might be lower due to weighted patterns
        expect(result.confidence).toBeGreaterThan(0.6);
        // Verify it found UK evidence
        expect(result.evidence.length).toBeGreaterThan(0);
        expect(result.evidence.some(e => e.convention === 'UK')).toBe(true);
      });

      it('should handle technical documentation with mixed conventions', () => {
        const text = `
          The API standardizes color values while the programme optimizes performance.
          Users can customize the behavior or personalise the behaviour as needed.
          The analyze() function runs analysis on organized data structures.
        `;
        const result = detectLanguageConvention(text);
        expect(result.convention).toBe('mixed');
        expect(result.evidence.length).toBeGreaterThan(3);
      });
    });
  });

  describe('getConventionExamples', () => {
    it('should return US examples', () => {
      const examples = getConventionExamples('US');
      expect(examples).toContain('Uses US spelling: organize, color, center');
      expect(examples).toContain('Uses US vocabulary: elevator, truck, apartment');
    });

    it('should return UK examples', () => {
      const examples = getConventionExamples('UK');
      expect(examples).toContain('Uses UK spelling: organise, colour, centre');
      expect(examples).toContain('Uses UK vocabulary: lift, lorry, flat');
    });

    it('should return mixed examples', () => {
      const examples = getConventionExamples('mixed');
      expect(examples).toContain('Mixed US/UK spelling detected');
      expect(examples).toContain('Consider standardizing to one convention');
    });

    it('should return empty array for unknown', () => {
      const examples = getConventionExamples('unknown');
      expect(examples).toHaveLength(0);
    });
  });

  describe('detectDocumentType', () => {
    it('should detect academic documents', () => {
      const text = `
        Abstract: This study examines the theoretical framework...
        Introduction: Previous empirical studies have shown...
        Methodology: We conducted a systematic analysis...
        Results: The findings indicate significant correlation...
        References: [1] Smith et al. (2023)...
      `;
      const result = detectDocumentType(text);
      expect(result.type).toBe('academic');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect technical documents', () => {
      const text = `
        ## Installation
        Run \`npm install\` to install dependencies.
        
        ### API Documentation
        The following methods are available:
        - \`initialize()\`: Setup the application
        - \`configure(options)\`: Set configuration parameters
        
        \`\`\`javascript
        const app = initialize();
        \`\`\`
      `;
      const result = detectDocumentType(text);
      expect(result.type).toBe('technical');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect blog posts', () => {
      const text = `
        # My Thoughts on Recent Events
        
        I've been thinking about this lately, and I believe we need to 
        reconsider our approach. Yesterday, I had an interesting conversation
        that really changed my perspective. 
        
        What do you think? Leave a comment below and share your thoughts!
      `;
      const result = detectDocumentType(text);
      expect(result.type).toBe('blog');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should default to casual for unclear text', () => {
      const text = 'This is just some regular text without any special markers.';
      const result = detectDocumentType(text);
      expect(result.type).toBe('casual');
      expect(result.confidence).toBe(0.5);
    });
  });
});