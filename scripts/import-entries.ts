/**
 * Import Markdown Entries Script
 *
 * Imports journal entries from markdown files into the Supabase database.
 *
 * Usage:
 *   npx tsx scripts/import-entries.ts <folder_path> <user_id> [--dry-run]
 *
 * Options:
 *   --dry-run  Preview what would be imported without actually inserting
 *
 * File format expected:
 *   Line 1: # Title
 *   Line 2: (empty)
 *   Line 3: Created: <date>
 *   Line 4: Date: <date> (or Tags: if no Date line)
 *   Line 5: Tags: <tags> (optional)
 *   Line 6+: Content
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from mobile/.env
dotenv.config({ path: path.join(__dirname, '../mobile/.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in mobile/.env');
  console.error('');
  console.error('The service role key is required to bypass RLS policies.');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key');
  console.error('Add to mobile/.env: SUPABASE_SERVICE_ROLE_KEY=your-key-here');
  process.exit(1);
}

// Use service role key to bypass RLS (required for inserting with arbitrary user_id)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ParsedEntry {
  fileName: string;
  createdAt: string;
  entryDate: string;
  content: string;
}

/**
 * Parse a date string like "October 22, 2023 1:14 AM" or "March 6, 2024"
 * Returns ISO date string
 */
function parseDate(dateStr: string): string {
  const cleaned = dateStr.trim();
  const date = new Date(cleaned);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  return date.toISOString();
}

/**
 * Parse a date string and return just YYYY-MM-DD format
 */
function parseDateToYMD(dateStr: string): string {
  const cleaned = dateStr.trim();
  const date = new Date(cleaned);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  return date.toISOString().split('T')[0];
}

/**
 * Parse a markdown file and extract entry data
 */
function parseMarkdownFile(filePath: string): ParsedEntry | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length < 6) {
    console.warn(`Skipping ${filePath}: Not enough lines`);
    return null;
  }

  // Line 3 (index 2): Created: <date>
  const createdLine = lines[2];
  if (!createdLine.startsWith('Created:')) {
    console.warn(`Skipping ${filePath}: Line 3 doesn't start with "Created:"`);
    return null;
  }
  const createdAt = createdLine.replace('Created:', '').trim();

  // Line 4 (index 3): Date: <date> or Tags: <tags>
  const line4 = lines[3];
  let entryDate: string;

  if (line4.startsWith('Date:')) {
    entryDate = line4.replace('Date:', '').trim();
  } else {
    // No Date line, use Created date as entry_date
    entryDate = createdAt;
  }

  // Content starts from line 6 (index 5) onwards
  const contentLines = lines.slice(5);
  const entryContent = contentLines.join('\n').trim();

  return {
    fileName: path.basename(filePath),
    createdAt: parseDate(createdAt),
    entryDate: parseDateToYMD(entryDate),
    content: entryContent,
  };
}

/**
 * Import entries to Supabase
 */
async function importEntries(folderPath: string, userId: string, dryRun: boolean = false): Promise<void> {
  // Get all .md files in the folder
  const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.md'));

  console.log(`Found ${files.length} markdown files in ${folderPath}`);

  const entries: ParsedEntry[] = [];
  const errors: string[] = [];

  // Parse all files
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    try {
      const entry = parseMarkdownFile(filePath);
      if (entry) {
        entries.push(entry);
      }
    } catch (err) {
      errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`Successfully parsed ${entries.length} entries`);
  if (errors.length > 0) {
    console.log(`Errors (${errors.length}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  if (entries.length === 0) {
    console.log('No entries to import');
    return;
  }

  // Check for duplicate entry_dates (app only allows one entry per date)
  const dateMap = new Map<string, ParsedEntry[]>();
  for (const entry of entries) {
    const existing = dateMap.get(entry.entryDate) || [];
    existing.push(entry);
    dateMap.set(entry.entryDate, existing);
  }

  const duplicates = Array.from(dateMap.entries()).filter(([, v]) => v.length > 1);
  if (duplicates.length > 0) {
    console.log('\nWarning: Multiple entries for the same date found.');
    console.log('These will be merged (content concatenated):');
    for (const [date, dups] of duplicates) {
      console.log(`  ${date}: ${dups.map((d) => d.fileName).join(', ')}`);
    }
  }

  // Merge entries with the same date
  const mergedEntries: Map<string, { createdAt: string; content: string }> = new Map();
  for (const entry of entries) {
    const existing = mergedEntries.get(entry.entryDate);
    if (existing) {
      // Merge content with separator
      existing.content += '\n\n---\n\n' + entry.content;
      // Use earlier created_at
      if (new Date(entry.createdAt) < new Date(existing.createdAt)) {
        existing.createdAt = entry.createdAt;
      }
    } else {
      mergedEntries.set(entry.entryDate, {
        createdAt: entry.createdAt,
        content: entry.content,
      });
    }
  }

  if (dryRun) {
    console.log(`\n--- DRY RUN: Would import ${mergedEntries.size} unique entries ---\n`);

    // Sort by date
    const sortedEntries = Array.from(mergedEntries.entries()).sort(([a], [b]) => a.localeCompare(b));

    for (const [entryDate, data] of sortedEntries) {
      const preview = data.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(`  ${entryDate}: ${preview}${data.content.length > 100 ? '...' : ''}`);
    }

    console.log('\n--- Dry Run Summary ---');
    console.log(`Total parsed: ${entries.length}`);
    console.log(`Unique dates: ${mergedEntries.size}`);
    console.log('\nRun without --dry-run to import.');
    return;
  }

  console.log(`\nImporting ${mergedEntries.size} unique entries...`);

  // Insert entries
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const [entryDate, data] of mergedEntries) {
    try {
      // Check if entry already exists for this date
      const { data: existing } = await supabase
        .from('entries')
        .select('id')
        .eq('entry_date', entryDate)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        console.log(`  Skipping ${entryDate}: Entry already exists`);
        skipCount++;
        continue;
      }

      // Insert new entry
      const { error } = await supabase.from('entries').insert({
        user_id: userId,
        entry_date: entryDate,
        content: data.content,
        created_at: data.createdAt,
      });

      if (error) {
        console.error(`  Error inserting ${entryDate}:`, error.message);
        errorCount++;
      } else {
        console.log(`  Imported ${entryDate}`);
        successCount++;
      }
    } catch (err) {
      console.error(
        `  Error processing ${entryDate}:`,
        err instanceof Error ? err.message : String(err)
      );
      errorCount++;
    }
  }

  console.log('\n--- Import Summary ---');
  console.log(`Total parsed: ${entries.length}`);
  console.log(`Unique dates: ${mergedEntries.size}`);
  console.log(`Imported: ${successCount}`);
  console.log(`Skipped (already exists): ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
}

// Main
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const filteredArgs = args.filter((a) => a !== '--dry-run');

if (filteredArgs.length < 2) {
  console.log('Usage: npx tsx scripts/import-entries.ts <folder_path> <user_id> [--dry-run]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run  Preview what would be imported without inserting');
  console.log('');
  console.log('Example:');
  console.log('  npx tsx scripts/import-entries.ts ./temp abc123-user-uuid --dry-run');
  process.exit(1);
}

const [folderPath, userId] = filteredArgs;

if (!fs.existsSync(folderPath)) {
  console.error(`Error: Folder not found: ${folderPath}`);
  process.exit(1);
}

if (dryRun) {
  console.log('Running in DRY RUN mode - no data will be inserted\n');
}

importEntries(folderPath, userId, dryRun)
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
