# Docker Build Duplication and Merge Commit Analysis

## Problem Statement

The current GitHub Actions workflow builds Docker images twice:
1. Once during PR review (for testing)
2. Again after merging to main (for deployment)

This duplication wastes CI/CD resources and time, even though the code might be identical between the PR and the merge.

## Root Cause Analysis

### The Merge Commit Problem

When using GitHub's default "Create a merge commit" strategy:
- GitHub creates a new commit that joins the PR branch with main
- This merge commit has a new SHA, different from any commit in the PR
- Docker build checks based on commit SHA will always miss, forcing a rebuild

Example:
```
main:     A---B---C---M (merge commit, new SHA)
                    \ /
PR branch:           D---E (these SHAs built during PR)
```

### Current Workflow Behavior

From `.github/workflows/docker.yml`:
- **On PR**: Builds images, runs tests, but doesn't push to registry
- **On merge to main**: Builds images again (new SHA!), pushes to registry
- Both use GitHub Actions cache (`cache-from: type=gha`), but still duplicate work

## Potential Solutions

### 1. Check for Existing PR Images (Complex but Effective)

When building on main after a merge, check if the PR already built the image:

```yaml
- name: Check if PR image exists
  id: check_image
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  run: |
    # Get the SHA of the PR head (second parent of merge commit)
    PR_SHA=$(git rev-parse HEAD^2 2>/dev/null || echo "")
    
    if [ -n "$PR_SHA" ]; then
      IMAGE_TAG="${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${PR_SHA::7}"
      
      if docker manifest inspect $IMAGE_TAG > /dev/null 2>&1; then
        echo "exists=true" >> $GITHUB_OUTPUT
        echo "existing_tag=$IMAGE_TAG" >> $GITHUB_OUTPUT
      fi
    fi

- name: Retag existing image
  if: steps.check_image.outputs.exists == 'true'
  run: |
    docker pull ${{ steps.check_image.outputs.existing_tag }}
    docker tag ${{ steps.check_image.outputs.existing_tag }} ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main
    docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main
```

**Pros:**
- Eliminates duplicate builds
- Works with existing merge commit workflow

**Cons:**
- Complex git/docker logic
- Requires PR builds to push images (security consideration)

### 2. Change Merge Strategy (Simple and Effective)

Switch from "Create a merge commit" to "Squash and merge" in GitHub settings:

```yaml
# No workflow changes needed!
# The squashed commit would have the same content as tested in PR
# SHA-based detection would "just work"
```

**Pros:**
- Clean, linear git history
- Same SHA between PR test and merge (if no interim commits)
- No workflow complexity needed
- Existing SHA-based image checks would work

**Cons:**
- Loses individual commit history from PRs
- Team needs to agree on the merge strategy change

### 3. Accept Duplication with Better Caching (Pragmatic)

Keep current behavior but optimize cache usage:

```yaml
cache-from: |
  type=gha
  type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main
  type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:pr-${{ github.event.number }}
cache-to: type=gha,mode=max
```

**Pros:**
- Simple, no workflow logic changes
- Builds are faster due to layer caching
- Works with any merge strategy

**Cons:**
- Still wastes some CI time
- Doesn't eliminate the fundamental duplication

### 4. Push from PR Builds (Security Consideration)

Allow trusted PR builds to push images:

```yaml
# In PR workflow
push: ${{ github.event.pull_request.head.repo.full_name == github.repository }}
tags: |
  ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:pr-${{ github.event.number }}
  ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.event.pull_request.head.sha }}
```

**Pros:**
- Images available for reuse immediately
- Can be combined with solution #1

**Cons:**
- Security risk if PRs from forks can push images
- Requires careful permission management

## Understanding Merge Commits

### What They Are
- Commits with two parents joining branches
- Contains no code changes, just pointers to both parent commits
- Created by default when merging PRs on GitHub

### Why They Exist
1. **Historical Accuracy**: Shows exactly what was developed in parallel
2. **PR Context**: Makes it clear which commits belonged to which feature
3. **Easy Reverts**: `git revert -m 1 <merge-commit>` undoes entire PR

### Alternatives
- **Squash and Merge**: Combines all PR commits into one
- **Rebase and Merge**: Replays PR commits linearly on main

## Recommendation

For this project, I recommend **changing to "Squash and merge"** (Solution #2) because:

1. **Simplest solution** - No workflow changes needed
2. **Solves the root cause** - No more SHA mismatches
3. **Cleaner history** - Each PR becomes one commit with clear message
4. **Better for this project** - Individual commit history within PRs is less critical than avoiding duplicate builds

### Implementation Steps

1. Go to Settings → General → Pull Requests
2. Uncheck "Allow merge commits"
3. Check "Allow squash merging"
4. Set as default merge method
5. No workflow file changes needed!

### Alternative If Merge Commits Must Stay

If the team prefers keeping merge commits, implement Solution #1 (PR image checking) but be prepared for:
- Additional workflow complexity
- Need to handle edge cases (rebased PRs, force pushes)
- Potential security considerations if pushing from PR builds

## Cost/Benefit Analysis

### Current State (Duplicate Builds)
- **Cost**: ~10-15 minutes extra CI time per merge
- **Cost**: Docker registry storage for duplicate images
- **Benefit**: Simple, predictable workflow

### With Squash Merge
- **Benefit**: Eliminate duplicate builds entirely
- **Benefit**: Cleaner git history
- **Cost**: Loss of individual commit detail in PRs
- **Cost**: One-time team adjustment to new merge strategy

### With PR Image Checking
- **Benefit**: Eliminate duplicate builds
- **Benefit**: Keep merge commits
- **Cost**: Complex workflow maintenance
- **Cost**: Potential edge case bugs

## Conclusion

The duplicate Docker builds are a direct result of GitHub's merge commit creating new SHAs. While there are several technical solutions, the simplest and most effective is to switch to squash-and-merge, which would make the existing workflow "just work" without any changes. If merge commits are required for historical reasons, implement PR image checking, but be prepared for the additional complexity.