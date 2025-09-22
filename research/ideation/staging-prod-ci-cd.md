# Staging → Production CI/CD Plan

This document captures the proposed workflow for how code moves from PR → Staging → Production.

---

## 1. Pull Requests → `main`
- **Workflow**: `test.yml`  
- **Trigger**: `pull_request` into `main`  
- **Purpose**:  
  - Run static analysis, lint, typecheck.  
  - Run unit tests and integration tests.  
  - Build the application & test Docker build.  
- **Outcome**: Ensures code is valid and safe to merge.

---

## 2. Merge into `main` → Deploy to Staging
- **Workflow**: `docker.yml` (adapted)  
- **Trigger**: `push` to `main`  
- **Behavior**:  
  - Build & push Docker images.  
  - Deploy to **Staging environment** (ArgoCD Kubernetes + Vercel staging at `staging.roastmypost.org`).  
  - No production deployment at this stage.

---

## 3. Integration Tests on Staging
- **Workflow**: `integration-on-merge.yml` (adapted)  
- **Trigger**: `workflow_run` after successful completion of `docker.yml`.  
- **Actions**:  
  - Run end-to-end integration + Playwright tests against staging.  
  - Post results as a GitHub comment on the PR/commit.  
  - Humans may manually verify staging.

---

## 4. Manual Approval → Promote to Production
- After tests complete, human reviewer approves promotion.  
- Implemented as a `workflow_dispatch` or `environment: Production` with required reviewers.  
- Once approved → merge `main` into `prod`.

---

## 5. Merge to `prod`
- **Trigger**: `push` to `prod`.  
- **Behavior**: executes production deploy workflows.

---

## 6. Deploy to Production
- **Workflow**: `docker.yml` (adapted for production).  
- **Steps**:  
  1. Build + Push Docker image tagged for production.  
  2. Deploy to **Kubernetes Production** via ArgoCD.  
  3. Deploy app via **Vercel Production** (live domain).

---

## ✅ Summary
- CI (`test.yml`) runs on PR → `main`.  
- Deployments to **Staging** come from `main`.  
- Tests run against **Staging** (`integration-on-merge.yml`).  
- After staging verification & manual approval → merge `main` → `prod`.  
- Production environment deploys from `prod`.  


---                                                                                                                               
                                                                                                                                  
## 7. 🔧 Development Plan for Safe Rollout                                                                                        
                                                                                                                                  
To develop this new pipeline without impacting production:                                                                        
                                                                                                                                  
1. **Work in a feature branch** (e.g. `feature/staging-pipeline`) until tested.                                                   
2. **Create a `staging` branch** and a GitHub Environment `Staging` with separate secrets.                                        
                
                           