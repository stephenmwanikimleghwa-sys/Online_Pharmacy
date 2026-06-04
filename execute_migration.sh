#!/bin/bash

# Supabase Migration Execution Script
# This script requires SUPABASE_DB_URL environment variable to be set
# Example: SUPABASE_DB_URL="postgresql://user:password@host:port/database"

set -e

echo "================================"
echo "Supabase Product Migration"
echo "================================"

# Check if database URL is provided
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL environment variable is not set"
    echo ""
    echo "Usage: SUPABASE_DB_URL='postgresql://...' bash execute_migration.sh"
    echo ""
    echo "To get your Supabase database URL:"
    echo "1. Go to https://app.supabase.com"
    echo "2. Select your project"
    echo "3. Go to Settings > Database"
    echo "4. Copy the 'Connection string' (URI format)"
    echo ""
    exit 1
fi

echo "📝 Reading migration file..."
MIGRATION_FILE="/home/steve/pharmacy-aggregator/supabase/migrations/20260604_products_migration.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "✓ Found migration file ($(wc -l < "$MIGRATION_FILE") lines)"

echo ""
echo "🚀 Executing migration on Supabase..."
echo "   This will:"
echo "   1. Create/update 3 branches (TRANSCOUNTY_MAIN, TRANSCOUNTY_ANNEX, PEAKFARM)"
echo "   2. Insert/update 3,744 products"
echo "   3. Create branch stock entries for all products"
echo ""

# Execute the migration using psql
psql "$SUPABASE_DB_URL" \
    --set ON_ERROR_STOP=on \
    -f "$MIGRATION_FILE" \
    2>&1 | tee /tmp/migration_output.log

echo ""
echo "✓ Migration executed successfully!"
echo "📊 Check /tmp/migration_output.log for detailed output"
