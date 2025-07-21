# Archive: Historical Plugin System Documentation

This archive contains historical documentation files from the evolution of the plugin system. These documents are kept for reference to understand the design decisions and iterations that led to the current implementation.

## Archived Files

### naming-proposal.md
- **Purpose**: Early proposal for standardizing plugin naming conventions
- **Status**: Superseded by current naming conventions in the main README
- **Key Ideas**: Proposed consistent naming patterns for plugins, methods, and types

### new-plugin-interface.md
- **Purpose**: Documentation of the previous plugin interface design
- **Status**: Replaced by the current plugin system implementation
- **Key Changes**: The system evolved from this interface to support:
  - Better finding stages (extract → filter → synthesize)
  - Improved location tracking with FindingWithContext
  - More flexible comment generation

## Why These Are Archived

These documents represent important stages in the plugin system's evolution but no longer reflect the current implementation. They are kept here to:

1. Provide historical context for design decisions
2. Help understand why certain patterns were chosen or avoided
3. Serve as reference for potential future refactoring

## Current Documentation

For up-to-date information about the plugin system, please refer to:
- [Plugin System README](../../README.md) - Current implementation guide
- [LOCATION_TRACKING_DESIGN.md](../../LOCATION_TRACKING_DESIGN.md) - Legacy design document with historical context