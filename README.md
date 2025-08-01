# RoastMyPost

An AI-powered document evaluation platform that provides intelligent analysis, critiques, and insights on written content. RoastMyPost enables users to get structured feedback from specialized AI agents that examine documents from different perspectives.

## Key Features

- **Multi-Agent Evaluations**: Deploy various AI agents (Assessors, Advisors, Enrichers, Explainers) to analyze documents from different angles
- **Interactive Annotations**: AI agents provide inline comments and highlights with importance ratings and grades
- **Document Versioning**: Track changes and evaluations across multiple versions of documents
- **Batch Processing**: Queue and process multiple evaluations asynchronously with retry logic
- **Cost Tracking**: Monitor AI API usage and costs per evaluation
- **Import from Multiple Sources**: Automatically import content from LessWrong, EA Forum, and general web pages
- **Export Capabilities**: Export evaluations as XML for further processing
- **MCP Integration**: Fast database access via Model Context Protocol for Claude Code users

## Tech Stack

- **Frontend**: Next.js 15.3.2 with App Router, React 19, TypeScript
- **Database**: PostgreSQL with Prisma ORM v6.13.0
- **Authentication**: NextAuth.js 5.0.0-beta.28
- **UI Components**: Tailwind CSS, Heroicons, Slate.js editor
- **AI Integration**: Anthropic Claude API + OpenRouter
- **Background Jobs**: Custom async job processing with exponential backoff
- **Content Extraction**: JSDOM, Turndown, Metascraper suite
- **Monorepo**: pnpm workspaces with Turborepo

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+ (install with `npm install -g pnpm`)
- PostgreSQL database
- API keys for Anthropic Claude and/or OpenRouter
- Resend API key for email authentication (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/quantified-uncertainty/roast-my-post.git
cd roast-my-post
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
DATABASE_URL="postgresql://user:password@localhost:5432/roast_my_post"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="generate-a-secure-random-string"
ANTHROPIC_API_KEY="your-anthropic-key"
HELICONE_API_KEY="your-helicone-key-optional"
OPENROUTER_API_KEY="your-openrouter-key"
EMAIL_FROM="noreply@yourdomain.com"
AUTH_RESEND_KEY="your-resend-api-key"
```

**Optional: Helicone Integration**

To enable monitoring of Anthropic API usage through Helicone:
1. Create a [Helicone account](https://helicone.ai)
2. Add your Helicone API key to `HELICONE_API_KEY` in `.env`
3. All Anthropic API calls will automatically route through Helicone for monitoring and analytics

**Optional: Helicone Prompt Caching**

To enable prompt caching for improved performance and cost savings:
```bash
HELICONE_CACHE_ENABLED=true          # Enable prompt caching
HELICONE_CACHE_MAX_AGE=3600          # Cache duration in seconds (1 hour)
HELICONE_CACHE_BUCKET_MAX_SIZE=1000  # Max cache entries per bucket
```

Prompt caching can significantly reduce API costs for repeated similar requests.

4. Set up the database:
```bash
pnpm run db:push
```

5. Start the development server:
```bash
pnpm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Development

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run typecheck` - Run TypeScript type checking
- `pnpm run lint` - Run ESLint
- `pnpm run test:ci` - Run tests suitable for CI (no external dependencies)
- `pnpm run test:fast` - Run unit and integration tests
- `pnpm run test:e2e` - Run end-to-end tests (requires API keys)
- `pnpm run db:studio` - Open Prisma Studio for database management
- `pnpm run process-jobs` - Process evaluation jobs manually

For package-specific commands:
- `pnpm --filter @roast/web <command>` - Run commands in the web app
- `pnpm --filter @roast/db <command>` - Run commands in the database package
- `pnpm --filter @roast/mcp-server <command>` - Run commands in the MCP server

### Project Structure (Monorepo)

```
apps/
├── web/                    # Next.js web application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   ├── lib/          # Core business logic
│   │   ├── types/        # TypeScript type definitions
│   │   ├── utils/        # Utility functions
│   │   └── scripts/      # CLI scripts for operations
│   └── config/           # App-specific configuration
└── mcp-server/            # Model Context Protocol server

internal-packages/
└── db/                    # Shared database package
    ├── prisma/
    │   ├── schema.prisma  # Database schema
    │   └── migrations/    # Database migrations
    └── src/              # Prisma client exports

dev/                      # Development scripts and tools
docs/                     # Project documentation
claude/                   # Claude Code specific tools and analysis
```

### For Claude Code Users

This project includes an MCP (Model Context Protocol) server that provides instant database access without writing scripts. This is 10-20x faster than creating TypeScript files for data queries.

To set up the MCP server:
```bash
pnpm --filter @roast/mcp-server run setup
```

Then restart Claude Code. See [/apps/mcp-server/README.md](./apps/mcp-server/README.md) for detailed setup instructions.

## Core Concepts

### Agents
AI evaluators that can be configured for various purposes:
- Critical analysis and quality assessment
- Constructive suggestions and improvements
- Context and supplementary information
- Clarification and concept explanation
- Custom evaluation criteria based on specific needs

### Documents
Content items stored with versioning support. Each document can have multiple versions, and each version can be evaluated by multiple agents.

### Evaluations
AI-generated analysis containing:
- Summary and detailed analysis
- Inline comments with highlights
- Importance ratings and grades
- Self-critique from the agent

### Jobs
Asynchronous processing queue for evaluations with:
- Automatic retry logic with exponential backoff
- Cost tracking per job
- Detailed logging for debugging

## API Documentation

### REST API Endpoints

#### Core Resources
- `/api/agents` - Agent management
- `/api/documents` - Document operations  
- `/api/jobs` - Job processing
- `/api/monitor` - System monitoring (admin only)
- `/api/import` - Article import from URLs

#### New Unified API Structure
The API now follows a clean, intuitive structure that matches web URLs:

**Document Operations:**
- `GET /api/docs/{docId}` - Get document with all evaluations
- `PUT /api/docs/{docId}` - Update document (e.g., intended agents)

**Evaluation Operations:**
- `GET /api/docs/{docId}/evals/{agentId}` - Get specific evaluation with full details
- `POST /api/docs/{docId}/evals/{agentId}` - Create new evaluation
- `POST /api/docs/{docId}/evals/{agentId}/rerun` - Re-run existing evaluation
- `GET /api/docs/{docId}/evaluations` - List all evaluations for document

**Key Benefits:**
- Natural identifiers: Use `documentId + agentId` instead of evaluation IDs
- Perfect URL alignment with web interface (`/docs/{docId}/evals/{agentId}`)
- Complete evaluation data including comments, highlights, and job information

### Authentication

The application uses NextAuth.js with support for:
- Email magic links via Resend
- API key authentication for programmatic access

## Testing

The test suite is organized by dependency requirements:

- **Unit tests** (`*.test.ts`): Fast, no external dependencies
- **Integration tests** (`*.integration.test.ts`): Database and internal APIs
- **E2E tests** (`*.e2e.test.ts`): External APIs (Firecrawl, LessWrong)
- **LLM tests** (`*.llm.test.ts`): AI API calls (expensive)

Run tests with:
```bash
pnpm run test:fast    # Unit + integration
pnpm run test:ci      # CI-safe tests only
pnpm run test:e2e     # End-to-end tests
```

## Database Management

### Safety Practices

Always use the safe wrapper scripts for database operations:
```bash
pnpm run db:push          # Safe schema push
pnpm run db:migrate       # Safe migration
```

### Backup Before Changes
```bash
./scripts/backup-database.sh
```

### Performance Optimization

The database includes optimized indexes for:
- Full-text search on document content
- Fast metadata search on titles, authors, platforms
- Efficient evaluation queries

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- [Development Guide](./docs/development/)
- [Deployment Guide](./docs/deployment/)
- [Security Guide](./docs/security/)
- [Operations Guide](./docs/operations/)

For Claude-specific development workflows, see [CLAUDE.md](./CLAUDE.md).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass (`pnpm run test:fast`)
- Type checking passes (`pnpm run typecheck`)
- Code is linted (`pnpm run lint`)

## Security

- Authentication required for all data-modifying operations
- Rate limiting on API endpoints
- Input validation with Zod schemas
- Admin role for sensitive operations

See [Security Documentation](./docs/security/) for detailed security practices.

## Acknowledgments

Built with excellent open source tools including Next.js, Prisma, Tailwind CSS, and Slate.js.