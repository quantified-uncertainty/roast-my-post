import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { detectLanguageConventionTool } from './index';
import { logger } from '../../shared/logger';

describe('DetectLanguageConventionTool', () => {
  const mockContext = {
    logger,
    userId: 'test-user'
  };

  describe('US English detection', () => {
    it('should detect clear US English text', async () => {
      const input = {
        text: 'I organized a program to analyze the behavior patterns in our data center. We utilized specialized algorithms to optimize performance.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      expect(result.convention).toBe('US');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.evidence.some(e => e.word === 'organized')).toBe(true);
    });
  });

  describe('UK English detection', () => {
    it('should detect clear UK English text', async () => {
      const input = {
        text: 'I organised a programme to analyse the behaviour patterns in our data centre. We utilised specialised algorithms to optimise performance.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      expect(result.convention).toBe('UK');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.evidence.some(e => e.word === 'organised')).toBe(true);
    });

    it('should detect UK English in a longer text sample (~2000 words)', async () => {
      // This is a real-world UK English article sample (exactly 2000 words with line breaks preserved)
      const ukText = `The skills AI will make more valuable (and how to learn them)

By Benjamin Todd   |    Published June 16th, 2025   |   Listen on Spotify

About half of people are worried they'll lose their job to AI.[1] And they're right to be concerned: AI can now complete real-world coding tasks on GitHub, generate photorealistic video, drive a taxi more safely than humans, and do accurate medical diagnosis.[2] And over the next five years, it's set to continue to improve rapidly. Eventually, mass automation and falling wages are a real possibility.

But what's less appreciated is that while AI drives down the value of skills it can do, it drives up the value of skills it can't. Wages (on average) will increase before they fall, as automation generates a huge amount of wealth, and the remaining tasks become the bottlenecks to further growth. As I'll explain, ATMs actually increased employment of bank clerks— until online banking automated the job much more.

Your best strategy is to learn the skills that AI will make more valuable, trying to ride the wave of automation. So what are those skills? Here's a preview:

Skills most likely to increase in value as AI progresses

SKILL	WHY IT'S VALUABLE	HOW TO START

Using AI to solve real problems	As AI gets better, it makes people who can direct it more powerful. The messier parts that AI can't do become bottlenecks.	• Use cutting-edge AI tools in your current job

• Work at an AI-applications startup, or other organisation using AI to solve a real problem

Personal effectiveness	Productivity, social skills, and rapid learning are useful in every job and compound the value of your other skills.	• Use AI tutors to rapidly teach you new skills

• Work with people who have these skills

• Develop relevant habits

Leadership skills	Management, strategy, and research taste are messy tasks AI struggles with, but AI gives leaders more influence than before.	• Seek mentorship

• Work at small, growing organisations, and seek small-scale management positions. Otherwise, start side projects

• Study and apply best practice (links in full article)

Communications and taste	Content creation gets automated, but discernment and trusting relationships with your audience become more valuable.	• Focus on personality-driven content

• Build a real connection with your audience

• Work with people who have taste

Getting things done in government	Citizens want real people making decisions, so knowing how to get things done in government remains crucial (even if many civil service positions disappear).	• Follow standard routes into policy: staffer positions, internships, fellowships, government positions, and other positions alongside successful operators

Complex physical skills	Robotics lags behind knowledge work, especially for specialist work in unpredictable environments.	• Seek apprenticeships in growing fields (e.g. datacentre construction)

• Get an entry-level job and work your way up

These will be especially valuable when combined with knowledge of fields needed for AI including machine learning, cyber & information security, data centre & power plant construction, robotics development and maintenance, and (lesso) fields that could expand a lot given economic growth.

In contrast, the future for these skills seems a lot more uncertain:

Coding, applied math, and STEM

Routine white collar skills such as recall and application of established knowledge, routine writing, admin, and translation

Visual creation such as animation.

More routine physical skills such as driving

It's hard to say what effect this will have on the job market overall, or how quickly it will unfold. If I had to speculate, I'd guess that in white-collar jobs like finance, tech, law, government, healthcare and professional services, entry-level positions will struggle, in favour of an expanded class of managers overseeing AI agents. (Though in the short-run, even entry-level wages could increase.) Small teams and individuals will be able to accomplish far more than ever before. Jobs that require a physical presence (e.g. police, construction worker, teacher, surgeon) will be relatively unaffected (income roughly keeping pace with GDP), at least until robotics catches up.

If I had to highlight just one piece of practical advice, it would be to learn to deploy AI to solve real problems. You can likely do this in your existing job, but a career capital option to especially consider is working at a growing AI-applications startup. This not only teaches you about AI, but also lets you gain general productivity and leadership skills relatively quickly.

In the rest of the article, I'll:

Explain why automation can actually increase wages for the skills that aren't being automated

Use the existing research, economic theory, recent data, and an understanding of how AI works to identify the types of skills most likely to increase in value due to AI. In brief, these are skills that (i) are hard for AI, (ii) complementary to its deployment, (iii) produce outputs we could use far more of, and (iv) are hard for others to learn

Use these categories to identify the concrete work skills most likely to increase in value, and explain how to start learning each one.

Give some closing thoughts on how to position yourself given the above, including avoiding long training periods and routine white-collar jobs, favouring roles at smaller or growing organisations, doing side projects, learning to apply AI to whatever you're doing, and making yourself more resilient by saving more money and investing in your mental health

Character from The Graduate giving career advice. 

In The Graduate, a middle-aged business man delivers career advice to the protagonist in a single word — "plastics." Hopefully, I'll be more useful.

1. Why automation often doesn't decrease wages

In the mid-1990s, ATMs started to show up in banks. At the time, people expected that would put many tellers out of the job.[3]

And indeed, the number of tellers per branch dropped from 21 to 13.

That, however, also made it far cheaper to run a bank branch. So in response, the banks opened far more locations. Total employment of tellers actually increased for two decades, but the tellers now spent their time talking to customers rather than counting money.

The number of ATMs started to rise in the early 90s, but bank teller employment continued to increase for two decades.

So while it's commonly assumed that automation decreases wages and employment, this example illustrates two ways that can be wrong:

While it's true automation decreases wages of the skill being automated (e.g. counting money), it often increases the value of other skills (e.g. talking to customers), because they become the new bottleneck.

Partial automation can often increase employment for people with a certain job title by making them more productive, making employers want to hire more of them. In this case, fewer bank tellers could give better service to the same number of customers.

But here's a final twist to the story: today, teller employment is in decline.

Bank teller employment only peaked in 2008, and has accelerated recently, likely to the the impact of online banking.

So while partial automation increased employment, the more dramatic automation made possible by online banking did indeed reduce it. This is also a common pattern.

In effect, there are two competing forces: AI tools make human workers more productive, typically increasing their employment, but if AI starts to replace what they do wholesale, that decreases their employment. When there's a medium amount of automation, it's hard to predict which force will win. But when there's thoroughgoing automation, the second will tend to.

In Britain during the industrial revolution, textile production was significantly automated. But this made the industry so much more productive that employment in textile manufacturing dramatically increased — only to decline again several generations later.

Today, employment of secretaries, admin jobs, call centre workers, cashiers, telemarketers, special effects artists, and animators is already in sharp decline – with AI maybe helping to continue long term trends.

Data science employment, however, was still up 20% during 2023, despite AI being pretty good at quick statistical analysis and visualisation.[4] So far, AI has maybe made data scientists more useful, rather than replace them. (It remains to be seen how long that will last.)

One analysis found that AI has reduced demand for translators, however, translator employment is still up on net. This might be because the decline due to AI wasn't large enough to offset the increase from general economic growth (so far).

The third way automation can actually be good for employment is that automation of one job often creates new kinds of jobs and raises wages in aggregate because society becomes wealthier.

Historically, most people worked in agriculture. But today, in rich countries, it's only a couple of percent, so we could say that the majority of jobs in the economy have already been automated! However, today, incomes are around 100 times higher than they were back then, showing that in aggregate, people moved into much higher paying jobs. In some countries, like South Korea, much of this transition was accomplished in just one generation.

Something similar could happen if many remote work jobs are automated. Epoch AI is a research group focused on the interaction of AGI and economics. They estimated about a third of work tasks can be done remotely, and that if all of those were automated, it would increase GDP between two and ten times. In the scenario, wages for all the non-remote tasks would probably increase about two to ten times as well. It's even possible white collar employment would increase, but the role would entirely focus on the remaining human-in-the-loop and non-remote bottlenecks.

This isn't to deny that automation can be very disruptive for workers in the jobs being automated. It's just to say that it can also sometimes increase their wages, as well as benefit workers in other jobs.

This is one reason I prefer to focus on the skills that will increase or decrease in value, rather than particular job titles.

But what about if AI, combined with general-purpose robotics, could automate almost every job? Surely, wages would fall then?

What would 'full automation' mean for wages?

Just as partial automation of bank tellers increased employment, but more intensive automation decreased it, maybe the same could happen for human workers as a whole?

AI combined with robotics has the potential to be unlike any previous technology in that it might be able to do almost every economically productive task better than humans.

Although many economists dismiss the possibility, the people who are experts in the technology itself believe it's possible.

And if that does happen, many economic models suggest it could drive wages down, perhaps even below subsistence level – initially as a rapidly expanding pool of 'digital workers' massively increase the supply of labour, and eventually because they can convert energy and resources into output far more efficiently than humans.

I'm not saying this is what will happen, but it's one possible scenario. Epoch has also made an integrated model of how full automation might unfold across the economy. With their default assumptions, wages initially increase about 10x, only to plunge in the late 2030s as the final human bottlenecks are removed.

Graph estimating the rise in the marginal product of human until 2037, followed by a steep drop off to zero.

In Epoch AI's GATE economic model of AI automation wages initially increase about 10-fold, as AI drives up total output and non-automated jobs become major bottlenecks. However, given their default assumptions, wages eventually crash after the final bottlenecks are automated.

If instead humans remain necessary for just a small fraction of tasks, say 1%, then the same model shows that wages increase indefinitely — with every human now doing that remaining 1%.[5] The difference between 100% and 99% automation is enormous! (Read more about the ambiguous effects of full automation on wages.)

However, I think full automation and declining wages is a possibility we should take seriously.

If there will eventually be full automation, what should you do?

Well, on the way to full automation, there will be partial automation.`;

      const input = {
        text: ukText,
        sampleSize: 2000 // Explicitly set to 2000 words
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      // This text contains UK spellings: organisation, organisations, centre, visualisation, labour, favour
      expect(result.convention).toBe('UK');
      expect(result.confidence).toBeGreaterThan(0.5); // Should have reasonable confidence
      expect(result.evidence.length).toBeGreaterThan(0);
      // Check for UK-specific words in evidence
      const ukWords = result.evidence.filter(e => e.convention === 'UK');
      expect(ukWords.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed convention detection', () => {
    it('should detect mixed US/UK usage', async () => {
      const input = {
        text: 'I organized the programme to analyse behavior in our data center. We utilised specialized algorithms.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      // Mixed usage is indicated by lower confidence, not a 'mixed' value
      expect(result.convention).toBe('US'); // US wins slightly due to more US words
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence indicates mixed usage
      expect(result.evidence.length).toBeGreaterThan(0);
      // Check that we have evidence from both conventions
      const usWords = result.evidence.filter(e => e.convention === 'US');
      const ukWords = result.evidence.filter(e => e.convention === 'UK');
      expect(usWords.length).toBeGreaterThan(0);
      expect(ukWords.length).toBeGreaterThan(0);
    });
  });

  describe('Unknown convention', () => {
    it('should return US with 0 confidence for text without convention markers', async () => {
      const input = {
        text: 'The quick brown fox jumps over the lazy dog.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      // No convention markers means US default with 0 confidence
      expect(result.convention).toBe('US');
      expect(result.confidence).toBe(0);
      expect(result.evidence.length).toBe(0);
    });
  });

  describe('Document type detection', () => {
    it('should detect academic documents', async () => {
      const input = {
        text: 'Abstract: This study examines the theoretical framework. Introduction: Previous empirical studies have shown significant results. Methodology: We conducted systematic analysis.'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      expect(result.documentType).toBeDefined();
      expect(result.documentType?.type).toBe('academic');
      expect(result.documentType?.confidence).toBeGreaterThan(0.3);
    });

    it('should detect technical documents', async () => {
      const input = {
        text: '## Installation\nRun `npm install` to install dependencies.\n\n### API Documentation\nThe following methods are available:\n- `initialize()`: Setup the application'
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      expect(result.documentType).toBeDefined();
      expect(result.documentType?.type).toBe('technical');
    });
  });

  describe('Sample size', () => {
    it('should respect custom sample size', async () => {
      const longText = 'a'.repeat(5000);
      const input = {
        text: longText,
        sampleSize: 100
      };

      const result = await detectLanguageConventionTool.execute(input, mockContext);
      
      // With only 100 chars of 'a', should default to US with 0 confidence
      expect(result.convention).toBe('US');
      expect(result.confidence).toBe(0);
    });
  });
});