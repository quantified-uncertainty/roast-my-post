# Database Backup System

## Overview

The project includes automated database backup infrastructure via GitHub Actions to ensure data safety during migrations and provide disaster recovery options.

## Automated Backups

### Pre-Migration Backups

**Automatic**: Every time migrations are deployed to production, a backup is automatically created first.

- Triggered by: Changes to `prisma/schema.prisma` or `prisma/migrations/**` on main branch
- Backup prefix: `pre-migration`
- Storage: GitHub artifacts (30 days) + optional S3
- Migration only proceeds if backup succeeds

### Scheduled Backups

**Daily backups** run automatically at 2 AM UTC via cron schedule.

- Frequency: Daily
- Backup prefix: `scheduled`
- Retention: 30 days
- Storage: GitHub artifacts + optional S3

### Manual Backups

Create on-demand backups through GitHub Actions:

1. Go to Actions → "Database Backup" workflow
2. Click "Run workflow"
3. Enter a reason for the backup
4. Click "Run workflow"

## Backup Storage

### GitHub Artifacts (Default)

- Automatically stores all backups
- 30-day retention period
- Free with GitHub Actions
- Size limit: 5GB per artifact

### S3 Storage (Optional)

For long-term storage, configure S3:

1. Add these secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `S3_BACKUP_BUCKET`
   - `AWS_REGION` (optional, defaults to us-east-1)

2. Backups will automatically upload to S3
3. Old backups (>30 days) are automatically cleaned up

## Viewing Backups

### GitHub UI

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select a completed backup workflow run
4. Scroll to "Artifacts" section
5. Download the backup file

### Backup Naming Convention

```
{database_name}_{prefix}_{timestamp}.sql.gz

Example: roast_my_post_pre-migration_20250104_143022.sql.gz
```

## Database Restoration

### Automated Restoration

Use the GitHub Actions restore workflow:

1. Go to Actions → "Database Restore" workflow
2. Click "Run workflow"
3. Enter:
   - Backup artifact name (from a previous backup)
   - Type "RESTORE" to confirm
   - Reason for restoration
4. The workflow will:
   - Create a pre-restore backup
   - Restore the specified backup
   - Run any pending migrations
   - Provide a summary

### Manual Restoration

For local restoration using downloaded backups:

```bash
# Download backup from GitHub artifacts
# Decompress the backup
gunzip backup_file.sql.gz

# Restore to database
psql $DATABASE_URL < backup_file.sql

# Run migrations to ensure schema is current
npx prisma migrate deploy
```

## Backup Best Practices

### Regular Testing

1. **Monthly restore test**: Test restoration process with a recent backup
2. **Verify backup integrity**: Check that backups contain expected data
3. **Document restore time**: Know how long restoration takes

### Before Major Changes

1. **Manual backup**: Create an additional manual backup before major schema changes
2. **Test locally first**: Always test migrations on a local/staging database
3. **Have rollback plan**: Know how to restore if something goes wrong

### Monitoring

1. **Check backup status**: Review GitHub Actions for failed backups
2. **Monitor storage**: Ensure sufficient space for backups
3. **Verify S3 uploads**: If using S3, confirm backups are uploading

## Security Considerations

### Access Control

- Production environment secrets required for backup/restore
- Only users with repository write access can trigger workflows
- S3 bucket should have appropriate access policies

### Encryption

- Backups contain sensitive data
- Use encrypted S3 buckets for storage
- Consider additional encryption for highly sensitive data

### Retention Policy

- GitHub artifacts: 30 days (automatic)
- S3 backups: 30 days (configurable in workflow)
- Adjust based on compliance requirements

## Troubleshooting

### Backup Failures

1. **Check PostgreSQL client version**: Ensure compatibility with your database
2. **Verify DATABASE_URL**: Must be accessible from GitHub Actions
3. **Check permissions**: Database user needs backup permissions
4. **Review logs**: Check workflow logs for specific errors

### Restore Failures

1. **Verify backup file**: Ensure it's not corrupted
2. **Check database state**: May need to drop/recreate database
3. **Migration conflicts**: Run `prisma migrate resolve` if needed
4. **Space issues**: Ensure sufficient disk space

### S3 Issues

1. **Verify credentials**: Check AWS access keys
2. **Bucket permissions**: Ensure proper S3 bucket policies
3. **Region settings**: Confirm correct AWS region
4. **Network access**: GitHub Actions must reach S3

## Local Backup Scripts

For additional flexibility, local backup scripts are available:

- `/scripts/backup-database.sh` - Manual backup script
- `/scripts/automated-backup.sh` - Cron-ready backup with retention
- `/scripts/restore-database.sh` - Restoration utility
- `/scripts/setup-cron-backup.sh` - Configure scheduled backups

These scripts are useful for:
- Local development
- Self-hosted deployments
- Additional backup redundancy