# Docker CI/CD Integration

## Overview

This project includes GitHub Actions workflows for automated Docker builds and deployment.

## Workflows

### 1. CI/CD Pipeline (`test.yml`)
- Runs on every push and PR
- Includes Docker build test to ensure Dockerfile is valid
- Verifies the image can start successfully

### 2. Docker Build and Push (`docker.yml`)
- Builds multi-architecture images (amd64/arm64)
- Pushes to GitHub Container Registry (ghcr.io)
- Runs security scans with Trivy
- Tags images appropriately:
  - Branch builds: `ghcr.io/quantified-uncertainty/roast-my-post:main`
  - PR builds: `ghcr.io/quantified-uncertainty/roast-my-post:pr-123`
  - Version tags: `ghcr.io/quantified-uncertainty/roast-my-post:v1.0.0`
  - SHA tags: `ghcr.io/quantified-uncertainty/roast-my-post:main-abc1234`

## Using the Docker Images

### Pull the latest image:
```bash
docker pull ghcr.io/quantified-uncertainty/roast-my-post:main
```

### Run the web service:
```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e AUTH_SECRET="your-secret" \
  -e ANTHROPIC_API_KEY="..." \
  ghcr.io/quantified-uncertainty/roast-my-post:main
```

### Run the worker:
```bash
docker run -d \
  -e DATABASE_URL="postgresql://..." \
  -e ANTHROPIC_API_KEY="..." \
  ghcr.io/quantified-uncertainty/roast-my-post:main \
  npm run process-jobs-adaptive
```

### Run migrations:
```bash
docker run --rm \
  -e DATABASE_URL="postgresql://..." \
  ghcr.io/quantified-uncertainty/roast-my-post:main \
  npm run db:deploy
```

## Security

- Images are automatically scanned for vulnerabilities using Trivy
- Scan results are uploaded to GitHub Security tab
- Multi-architecture builds support both x86 and ARM platforms
- Images are signed with GitHub's container signing

## Local Development

For local development, use docker-compose:
```bash
docker-compose up -d
```

## Deployment

The Docker images can be deployed to:
- Kubernetes (using the images from ghcr.io)
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- Any Docker-compatible platform

## Best Practices

1. **Never commit secrets** - Use environment variables
2. **Tag releases** - Use semantic versioning (v1.0.0)
3. **Monitor image sizes** - Current optimized size: ~244MB
4. **Regular updates** - Keep base images updated for security