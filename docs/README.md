# Documentation

This directory contains organized documentation for the roast-my-post project.

## Documentation Structure

### 📁 [`development/`](development/)
Development guides and technical documentation

- **[agents.md](development/agents.md)** - Agent system architecture, configuration, and management
- **[claude-wrapper-pattern.md](development/claude-wrapper-pattern.md)** - Claude API wrapper pattern for consistent LLM interactions
- **[database.md](development/database.md)** - Database operations, safety procedures, and best practices *(coming soon)*
- **[architecture.md](development/architecture.md)** - System architecture overview *(coming soon)*

### 📁 [`features/`](features/)
Feature documentation and user guides

- **[ephemeral-experiments.md](features/ephemeral-experiments.md)** - Temporary evaluation environments with automatic cleanup

### 📁 [`deployment/`](deployment/)
Deployment guides and production configuration

- **[production-launch.md](deployment/production-launch.md)** - Production launch procedures
- **[docker/](deployment/docker/)** - Docker containerization documentation
  - **[README.md](deployment/docker/README.md)** - Docker Compose guide and quick start
  - **[ci-cd.md](deployment/docker/ci-cd.md)** - CI/CD pipeline with GitHub Actions
  - **[production.md](deployment/docker/production.md)** - Production deployment notes
  - **[troubleshooting.md](deployment/docker/troubleshooting.md)** - Docker build troubleshooting

### 📁 [`operations/`](operations/)
Operational procedures and health monitoring

- **[health-checks.md](operations/health-checks.md)** - Comprehensive codebase health check guide
- **[deployment.md](operations/deployment.md)** - Deployment procedures and environment management *(coming soon)*
- **[monitoring.md](operations/monitoring.md)** - System monitoring and observability *(coming soon)*

### 📁 [`security/`](security/)
Security documentation and procedures

- **[authentication.md](security/authentication.md)** - Authentication systems, authorization patterns, and security best practices
- **[pre-commit.md](security/pre-commit.md)** - Pre-commit security checklist and procedures

## Quick Navigation

### For Developers
- **Getting Started**: See main [README.md](../README.md)
- **Agent Development**: [development/agents.md](development/agents.md)
- **Claude API Integration**: [development/claude-wrapper-pattern.md](development/claude-wrapper-pattern.md)
- **Ephemeral Experiments**: [features/ephemeral-experiments.md](features/ephemeral-experiments.md)
- **Security Guidelines**: [security/authentication.md](security/authentication.md)
- **Code Quality**: [operations/health-checks.md](operations/health-checks.md)

### For Operations
- **Health Monitoring**: [operations/health-checks.md](operations/health-checks.md)
- **Security Procedures**: [security/pre-commit.md](security/pre-commit.md)
- **Database Safety**: [development/agents.md](development/agents.md#database-storage)
- **Docker Deployment**: [deployment/docker/](deployment/docker/)
- **Production Launch**: [deployment/production-launch.md](deployment/production-launch.md)

### For Security Reviews
- **Authentication Guide**: [security/authentication.md](security/authentication.md)
- **Pre-commit Checklist**: [security/pre-commit.md](security/pre-commit.md)
- **Security Sections in Health Checks**: [operations/health-checks.md](operations/health-checks.md#4-security-audit-checklist)

## Claude Code Operations

For Claude-specific development operations and analysis, see:
- **[/claude/README.md](../claude/README.md)** - Claude Code operations guide
- **[/CLAUDE.md](../CLAUDE.md)** - Claude development notes and critical incidents

## Contributing to Documentation

When updating documentation:

1. **Keep it current** - Update docs when making related code changes
2. **Be specific** - Include exact file paths and line numbers for issues
3. **Provide examples** - Code snippets and commands help understanding
4. **Cross-reference** - Link to related documentation sections
5. **Test procedures** - Verify documented procedures actually work

## Migration Notes

This documentation structure consolidates several previously scattered files:
- `AGENTS.md` → `development/agents.md` (updated with current database approach)
- `COMPREHENSIVE_HEALTH_CHECKS.md` + `HEALTH_CHECKS.md` → `operations/health-checks.md`
- `PRE_COMMIT_INVESTIGATION.md` → `security/pre-commit.md`
- `TODO-CRITICAL-ISSUES.md` → *removed (all items completed)*
- `DOCKER_CI_CD.md` → `deployment/docker/ci-cd.md`
- `DOCKER_COMPOSE_GUIDE.md` → `deployment/docker/README.md`
- `DOCKER_PRODUCTION_NOTES.md` → `deployment/docker/production.md`
- `FIX_STATIC_GENERATION.md` → `deployment/docker/troubleshooting.md`
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` → `deployment/checklist.md`

The main `CLAUDE.md` file remains at the project root as it contains critical development notes specific to Claude Code operations.