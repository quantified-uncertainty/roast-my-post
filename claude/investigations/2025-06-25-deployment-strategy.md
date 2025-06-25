# Claude Code Task: RoastMyPost Deployment Setup

## Objective

Set up complete deployment infrastructure for the RoastMyPost application using DigitalOcean, Kubernetes, and Terraform. The application consists of a Next.js web server and background job workers sharing the same codebase.

## Repository Context

**Primary Repository:** `https://github.com/quantified-uncertainty/roast-my-post`

- Next.js application with MCP server
- PostgreSQL database requirement
- Background job processing system
- Contains AI document analysis functionality

**Infrastructure Repository:** `https://github.com/quantified-uncertainty/ops`

- Terraform configurations for QURI infrastructure
- Kubernetes manifests (ArgoCD + Helm charts)
- Existing patterns for QURI application deployment

## Task Breakdown

### Phase 1: Repository Analysis and Gap Identification

**Examine roast-my-post repository:**

```bash
# Check for existing deployment files
find . -name "Dockerfile" -o -name "docker-compose*" -o -name "*helm*" -o -name "k8s"
find . -name "package.json" -exec grep -l "scripts" {} \;
find . -name "*.env*" -o -name "*.example"

# Analyze application structure
ls -la src/
grep -r "process.env" src/ --include="*.ts" --include="*.js" | head -20
find . -name "prisma" -type d
```

**Examine ops repository structure:**

```bash
# Understand existing patterns
ls -la terraform/
ls -la k8s/apps/
ls -la k8s/app-manifests/

# Look at similar application deployments
find k8s/apps/ -name "*.yaml" -exec head -5 {} \; -print
find terraform/ -name "*.tf" -exec basename {} \;
```

### Phase 2: Create Missing Deployment Files

#### 2.1 Dockerfile Creation

**File:** `roast-my-post/Dockerfile`

Requirements:

- Multi-stage build for optimization
- Support both web server and worker modes
- Include Prisma for database operations
- Health check endpoints
- Security best practices (non-root user)

Key considerations:

- Single image, different commands for web/worker
- Include all scripts directory for worker functionality
- Optimize for Next.js standalone build

#### 2.2 Environment Configuration

**Files to create/update:**

- `roast-my-post/.env.example` - Template for all required variables
- `roast-my-post/.dockerignore` - Optimize build context
- Update `roast-my-post/package.json` scripts section

**Required environment variables:**

```
# Core Application
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
AUTH_SECRET=<generate with openssl rand -base64 32>
NEXTAUTH_URL=https://roastmypost.com

# API Keys
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
AUTH_RESEND_KEY=
EMAIL_FROM=noreply@roastmypost.com

# Optional/MCP
ROAST_MY_POST_MCP_USER_API_KEY=
ROAST_MY_POST_MCP_DATABASE_URL=
ROAST_MY_POST_MCP_API_BASE_URL=
```

#### 2.3 Health Check Endpoints

**Files to create:**

- `roast-my-post/src/app/api/health/route.ts` - Basic health check
- `roast-my-post/src/app/api/ready/route.ts` - Readiness probe with DB check
- `roast-my-post/scripts/health-check.js` - Docker health check script

### Phase 3: Infrastructure Code

#### 3.1 Terraform Configuration

**In ops repository, create/update:**

**File:** `terraform/roastmypost.tf`

- DigitalOcean managed PostgreSQL cluster
- Database firewall rules for K8s access
- Container registry setup
- Required networking components

**File:** `terraform/secrets.tf` (if not exists)

- Kubernetes secrets management
- Environment variable configuration

#### 3.2 Kubernetes Manifests

**In ops repository:**

**Directory:** `k8s/apps/roastmypost/`
Create Helm chart with:

- `Chart.yaml` - Chart metadata
- `values.yaml` - Default configuration values
- `templates/deployment.yaml` - Main application deployment
- `templates/worker-deployment.yaml` - Background worker deployment
- `templates/service.yaml` - Service definition
- `templates/ingress.yaml` - External access configuration
- `templates/secrets.yaml` - Secret management
- `templates/hpa.yaml` - Horizontal pod autoscaling

**File:** `k8s/app-manifests/roastmypost.yaml`
ArgoCD application manifest following existing QURI patterns

### Phase 4: CI/CD Pipeline

#### 4.1 GitHub Actions

**File:** `roast-my-post/.github/workflows/deploy.yml`

Pipeline stages:

1. **Test**: TypeScript check, linting, unit tests
2. **Build**: Docker image build and push to DigitalOcean registry
3. **Deploy**: Update Kubernetes deployments
4. **Verify**: Health check validation

#### 4.2 Database Migrations

**File:** `k8s/apps/roastmypost/templates/migration-job.yaml`

- Kubernetes Job for running Prisma migrations
- Run before application deployment
- Proper secret access for database

### Phase 5: Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   DigitalOcean  │     │   Kubernetes    │     │  External APIs  │
│   PostgreSQL    │◄────┤     Cluster     ├────►│  - OpenRouter   │
│   (Managed DB)  │     │                 │     │  - Anthropic    │
└─────────────────┘     │  ┌───────────┐  │     │  - Resend       │
                        │  │ Next.js   │  │     └─────────────────┘
                        │  │ App Pods  │  │
                        │  │ (3 replicas)│  │
                        │  └───────────┘  │
                        │                 │
                        │  ┌───────────┐  │
                        │  │  Worker   │  │
                        │  │   Pods    │  │
                        │  │ (2 replicas)│  │
                        │  └───────────┘  │
                        └─────────────────┘
```

## Technical Specifications

### Resource Requirements

- **Web App Pods**: 1Gi memory, 500m CPU (request), 2Gi memory, 1000m CPU (limit)
- **Worker Pods**: 512Mi memory, 250m CPU (request), 1Gi memory, 500m CPU (limit)
- **Database**: Start with db-s-1vcpu-1gb, auto-scaling enabled

### Scaling Strategy

- **Horizontal Pod Autoscaling**: Scale based on CPU/memory usage
- **Worker Scaling**: Scale based on job queue depth (>30 jobs per worker)
- **Database**: DigitalOcean managed auto-scaling

### Security Considerations

- All secrets stored in Kubernetes secrets
- Database firewall rules (K8s cluster only)
- SSL/TLS enabled for all connections
- Non-root container execution
- Network policies for pod-to-pod communication

## Implementation Priority

1. **Critical Path**: Dockerfile → Basic K8s manifests → Database setup
2. **Infrastructure**: Terraform for managed services
3. **Deployment**: CI/CD pipeline and ArgoCD integration
4. **Monitoring**: Health checks and autoscaling
5. **Optimization**: Resource tuning and cost optimization

## Success Criteria

- [ ] Application builds and runs in containerized environment
- [ ] Database connectivity and migrations working
- [ ] Both web server and worker pods operational
- [ ] External API integrations functional
- [ ] Health checks passing
- [ ] Auto-scaling responding to load
- [ ] CI/CD pipeline deploying successfully
- [ ] Rollback procedures tested

## Constraints and Considerations

### Budget Constraints

- Target: ~$200/month initial cost
- Start with minimal resources, scale based on usage
- Monitor API costs (OpenRouter/Anthropic usage)

### Existing QURI Patterns

- Follow existing Helm chart structure in ops repo
- Match ArgoCD application manifest format
- Use same monitoring and logging setup as other QURI services
- Align with existing Terraform module patterns

### Application-Specific Requirements

- MCP server functionality preservation
- Background job processing reliability
- Database connection pooling (consider PgBouncer)
- File upload handling (document processing)

## Deliverables

1. **Dockerfile** optimized for both web and worker modes
2. **Complete Helm chart** following QURI conventions
3. **Terraform configuration** for managed PostgreSQL and supporting infrastructure
4. **CI/CD pipeline** with proper testing and deployment stages
5. **Documentation** for deployment, scaling, and maintenance procedures
6. **Rollback procedures** and disaster recovery plan

## Notes for Claude Code

- **Repository Access**: You'll need access to both repositories to examine existing patterns
- **Secret Management**: Generate secure secrets but don't commit them - provide templates
- **Environment Parity**: Ensure development environment can replicate production setup
- **Testing Strategy**: Include instructions for testing deployment locally with Docker Compose
- **Monitoring Setup**: Integrate with any existing QURI monitoring infrastructure

This task requires both infrastructure expertise and understanding of the specific application requirements. Focus on creating maintainable, scalable solutions that follow established patterns while meeting the unique needs of the RoastMyPost application.
