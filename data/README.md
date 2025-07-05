# Data Directory

This directory contains runtime data that should not be tracked in version control:

## Structure

- `backups/` - Database backups (manual and automated)
- `logs/` - Job processing logs and debug output

## Important Notes

- All files in this directory are ignored by git (except README files)
- Backups contain sensitive data and should be handled securely
- Logs may contain sensitive information and should be reviewed before sharing

## Backup Management

See `/docs/operations/database-backups.md` for information about:
- Creating backups
- Restoring from backups
- Automated backup schedules
- Retention policies