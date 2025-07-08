# Document Analysis Cleanup Project

## Overview
This project aims to clean up and improve the document analysis system in roast-my-post, addressing code duplication, schema mismatches, and comment extraction issues.

## Key Problems Identified

### 1. Critical Comment Extraction Bug
- Agents generate 5 highlights in markdown but only 2-3 in `commentInsights` array
- System uses array and ignores markdown, resulting in missing comments
- Users see highlights in analysis text that don't become actual comments

### 2. Schema Mismatch  
- AI generates rich comment structure (title, observation, significance)
- Database only saves the comment text - 80% of data is discarded
- No way to preserve the valuable context AI provides

### 3. Code Duplication
- Identical error handling logic duplicated across files
- Inconsistent logging patterns (logger.error vs console.error)
- Repeated helper functions

### 4. Confusing Terminology
- Mixed use of "highlights" and "comments" 
- Unclear what agents should generate

## Project Structure
- `ideation/` - Analysis and design documents
- `scripts/` - Implementation scripts and utilities
- `tests/` - Test cases for validations

## Implementation Plan

### Phase 1: Quick Fixes (Low Risk)
1. Extract shared error handler utility
2. Fix terminology consistency 
3. Add validation for comment count mismatches

### Phase 2: Schema Enhancement (Medium Risk)
1. Extend Comment model to preserve titles and metadata
2. Update comment extraction to use all AI data
3. Add retry logic for insufficient comments

### Phase 3: Architecture Refactor (Higher Risk)
1. Create unified DocumentAnalyzer class
2. Implement per-agent comment strategies
3. Comprehensive test coverage

## Next Steps
1. [ ] Review and approve cleanup plan
2. [ ] Implement Phase 1 quick fixes
3. [ ] Test comment extraction improvements
4. [ ] Plan database migration for schema changes