# Claude Development Notes

## Shell Issues
- If basic commands fail with `_safe_eval` errors, use full paths: `/bin/rm`, `/bin/ls`, `/bin/mv`

## Project Overview
"RoastMyPost" (open-annotate) - AI-powered document annotation and evaluation platform

### Tech Stack
- **Framework**: Next.js 15.3.2 with App Router, React 19, TypeScript
- **Database**: PostgreSQL with Prisma ORM v6.8.2
- **Authentication**: NextAuth.js 5.0.0-beta.28
- **UI**: Tailwind CSS, Slate.js editor for document highlighting
- **AI**: Anthropic Claude API + OpenAI integration

### Core Architecture
- **Documents**: Content items for analysis (with versioning)
- **Agents**: AI evaluators (ASSESSOR, ADVISOR, ENRICHER, EXPLAINER) stored as TOML configs
- **Evaluations**: AI-generated analysis with comments and highlights
- **Jobs**: Asynchronous processing queue for AI analysis with retry logic

### Key Components
- `DocumentWithEvaluations.tsx`: Main split-pane document viewer
- `SlateEditor.tsx`: Rich text editor with sophisticated highlighting system
- Highlight system converts between character offsets and line-based positions
- Agent-based architecture with version control and specialized instruction sets

### Notable Features
- **Intelligent Import**: Supports LessWrong, EA Forum, general web with content extraction
- **Advanced Highlighting**: Real-time interaction, validation, error recovery
- **Cost Tracking**: Detailed monitoring of AI API usage and token counting
- **Job Processing**: Background queue with exponential backoff retry logic
- **Type Safety**: Comprehensive Zod schemas throughout

### Development Patterns
- Async job processing prevents UI blocking
- Memoized highlight rendering for performance  
- Runtime validation for LLM outputs
- Platform-specific content extraction logic

## Recent Fixes
- Added node validation in SlateEditor.tsx to prevent "Cannot get the start point" errors
- Replaced custom SVG icons with Heroicons in DocumentWithEvaluations.tsx
- Created shared articleImport library to eliminate duplication between API route and CLI script
- Replaced OpenAI with Claude + tool use for metadata extraction and content cleaning
- Fixed JSDOM configuration to prevent CSS/JS spam in console logs

## Commands
- `npm run dev` - Development server
- `npm run typecheck` - Type checking
- `npm run db:push` - Push schema changes
- `npm run process-jobs` - Manual job processing
