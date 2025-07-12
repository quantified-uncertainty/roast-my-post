# Experiment 09: File I/O vs Pre-loaded Content

This experiment compares the performance impact of file I/O operations vs having content pre-loaded in memory when running Claude evaluations.

## Purpose

To measure the overhead of file I/O operations and determine if pre-loading content provides meaningful performance benefits for smaller documents (~500 words).

## Files

- `sample.md` - First ~500 words extracted from the main input document
- `with-file-io.js` - Script that reads from file, calls API, writes results
- `with-preload.js` - Script with content pre-loaded in memory (no file I/O)

## How to Run

1. Make sure you have the Anthropic API key set:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

2. Run the file I/O version:
   ```bash
   node with-file-io.js
   ```

3. Run the pre-loaded version:
   ```bash
   node with-preload.js
   ```

## Expected Results

- File I/O version will show timing for:
  - File read time
  - API call time
  - File write time
  - Total time and I/O overhead percentage

- Pre-loaded version will show:
  - API call time only
  - Total time (should be nearly identical to API time)
  - 0ms I/O overhead

## Key Metrics to Compare

1. **Total execution time** - How much faster is pre-loaded?
2. **I/O overhead percentage** - What % of time is spent on file operations?
3. **Consistency** - Run multiple times to check variance

## Notes

- The sample is kept small (~500 words) to represent a typical chunk size
- Both scripts use the same prompt and model
- Cost estimates are included for reference
- Pre-loaded version simulates a scenario where content is already in memory (e.g., from a database or previous processing step)