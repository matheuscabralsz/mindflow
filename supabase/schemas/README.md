# Database Schemas

This directory contains the database schema organized by entity. Each file represents a separate table or set of related database objects.

## File Structure

Files are prefixed with numbers to indicate the order they should be executed:

- **`00_types.sql`** - Custom PostgreSQL types (enums, composite types)
- **`01_entries.sql`** - Journal entries table with RLS policies
- **`02_user_preferences.sql`** - User preferences table with RLS policies
- **`03_ai_insights.sql`** - AI insights cache table with RLS policies

## Usage

### Option 1: Apply via Supabase Dashboard (Manual)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each file's contents in order (00, 01, 02, 03...)
4. Run each query

### Option 2: Combine and Apply

Run the following command to combine all schemas into the main schema.sql:

```bash
cd supabase
cat schemas/00_types.sql schemas/01_entries.sql schemas/02_user_preferences.sql schemas/03_ai_insights.sql > schema.sql
```

Then apply via SQL Editor or generate a migration.

### Option 3: Generate Migration (Recommended)

After making changes to these schema files, update the main schema.sql and generate a migration:

```bash
# Update main schema.sql (from project root)
cat supabase/schemas/*.sql > supabase/schema.sql

# Generate migration from the diff
npx supabase db diff --schema public -f migration_name

# Apply migration
npx supabase db push
```

## Adding New Entities

When adding a new entity:

1. Create a new file: `04_entity_name.sql`
2. Include table definition, indexes, triggers, and RLS policies
3. Update the main `schema.sql` by combining all files
4. Generate a new migration using `npx supabase db diff`

## Notes

- All tables use `gen_random_uuid()` for UUID generation (built-in to PostgreSQL 15+)
- Row Level Security (RLS) is enabled on all user-facing tables
- Policies use `auth.uid()` to ensure users can only access their own data
- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
