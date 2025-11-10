# Database Development Scripts

Helper scripts for importing production database schema and data to local development environment.

## Quick Start

```bash
# 1. Set up credentials
cp .env.prod.example .env.prod
# Edit .env.prod with your actual production credentials

# 2. Load credentials and run import
source .env.prod
./setup_db.sh
```

## Files

- **`setup_db.sh`** - Main import script (see script comments for details)
- **`lib/db_functions.sh`** - Database helper functions (psql wrappers)
- **`.env.prod.example`** - Template for database credentials

## Security

- **Never commit `.env.prod`** - It's already in `.gitignore`
- Production credentials are required but never stored in git
- Scripts use Docker for database operations
