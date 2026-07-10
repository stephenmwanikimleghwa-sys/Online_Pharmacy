#!/bin/bash
# pg_backup.sh
# Dumps the PostgreSQL database and uploads to AWS S3.
# Usage: ./pg_backup.sh
# Can be run via a cron job on a Linux server.

# Exit immediately if a command exits with a non-zero status
set -e

# Load environment variables (adjust path to .env if needed)
export $(grep -v '^#' ../.env | xargs)

# Required variables
DB_NAME=${DB_NAME:-pharmacy_aggregator}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
S3_BUCKET=${AWS_STORAGE_BUCKET_NAME}

# Timestamp for the backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${DB_NAME}_backup_${TIMESTAMP}.sql"
ARCHIVE_FILE="${BACKUP_FILE}.gz"

echo "Starting backup of ${DB_NAME} at ${TIMESTAMP}..."

# 1. Dump the database using pg_dump
# Note: PGPASSWORD is read by pg_dump automatically if exported
export PGPASSWORD=$DB_PASSWORD
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F c -f "/tmp/${BACKUP_FILE}"

# 2. Compress the backup
echo "Compressing backup..."
gzip "/tmp/${BACKUP_FILE}"

# 3. Upload to S3 using AWS CLI
if [ -n "$S3_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ]; then
    echo "Uploading to S3 bucket: ${S3_BUCKET}..."
    # Ensure aws-cli is installed: sudo apt-get install awscli
    aws s3 cp "/tmp/${ARCHIVE_FILE}" "s3://${S3_BUCKET}/db_backups/${ARCHIVE_FILE}"
    echo "Upload complete."
else
    echo "WARNING: AWS credentials or S3 bucket not found in .env. Skipping upload."
fi

# 4. Cleanup local file
rm "/tmp/${ARCHIVE_FILE}"

echo "Backup process finished successfully."
