# Phase 5: Search & Filtering Capabilities - Detailed Implementation Guide

## Overview

**Goal:** Implement full-text search and advanced filtering for journal entries with PostgreSQL full-text search, search result highlighting, and date-range filtering.

**Time Estimate:** 3-4 hours

**Prerequisites:**
- Phase 1 complete (Foundation & Infrastructure)
- Phase 2 complete (User Authentication)
- Phase 3 complete (Core Journal CRUD)
- Phase 4 complete (Mood Tracking) - MoodFilter component required
- PostgreSQL full-text search index already exists (idx_entries_search)
- date-fns library installed (`npm install date-fns`)

**What You'll Have At The End:**
- Search bar with real-time search
- Full-text search using PostgreSQL tsvector
- Search result highlighting
- Date range filtering
- Combined search + mood + date filters
- Recent searches storage
- Search performance < 500ms
- Critical path tests

---

## Step 1: Verify Full-Text Search Index (5 minutes)

### 1.1 Confirm Search Index Exists

```bash
# Check supabase/schemas/01_entries.sql
cat supabase/schemas/01_entries.sql | grep idx_entries_search

# Should show:
# CREATE INDEX IF NOT EXISTS idx_entries_search ON entries USING GIN(to_tsvector('english', content));
```

### 1.2 Test Full-Text Search in SQL

```sql
-- In Supabase Dashboard → SQL Editor:
SELECT id, content, ts_rank(to_tsvector('english', content), to_tsquery('english', 'happy')) as rank
FROM entries
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'happy')
ORDER BY rank DESC
LIMIT 10;

-- Should return entries containing "happy" ranked by relevance
```

---

## Step 2: Update Types for Search and Filters (10 minutes)

### 2.1 Update Entry Types with Search

```bash
# Update mobile/src/types/entry.types.ts
cat > mobile/src/types/entry.types.ts << 'EOF'
export type MoodType = 'happy' | 'sad' | 'anxious' | 'calm' | 'stressed' | 'neutral';

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  mood: MoodType | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryInput {
  content: string;
  mood?: MoodType | null;
}

export interface UpdateEntryInput {
  content?: string;
  mood?: MoodType | null;
}

export interface EntryFilters {
  mood?: MoodType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface EntriesResponse {
  entries: Entry[];
  total: number;
  hasMore: boolean;
}

export interface SearchResult extends Entry {
  rank?: number;
  highlights?: string[];
}
EOF
```

---

## Step 3: Update Entries Service with Search (20 minutes)

### 3.1 Enhance Entries Service

Add the following method to your entries service (mobile/src/services/entries.service.ts):

```typescript
/**
 * Search entries using full-text search
 */
async searchEntries(
  searchQuery: string,
  page: number = 0,
  limit: number = 20,
  filters?: EntryFilters
): Promise<EntriesResponse> {
  // Build the full-text search query
  // PostgreSQL to_tsquery requires special format
  const tsQuery = searchQuery
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .join(' & ');

  let query = supabase
    .from('entries')
    .select('*', { count: 'exact' })
    .textSearch('content', tsQuery, {
      type: 'websearch',
      config: 'english',
    })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  // Apply additional filters
  if (filters?.mood) {
    query = query.eq('mood', filters.mood);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    entries: data as Entry[],
    total: count || 0,
    hasMore: (page + 1) * limit < (count || 0),
  };
}
```

**Note:** Add this method inside your entriesService object, before the closing brace.

---

## Step 4: Search Utilities (15 minutes)

### 4.1 Create Search Highlighting Utility

```bash
# mobile/src/utils/search.ts
cat > mobile/src/utils/search.ts << 'EOF'
/**
 * Highlight search terms in text
 * @param text The text to highlight in
 * @param searchQuery The search query
 * @param maxLength Maximum length of highlighted text
 * @returns Highlighted text with <mark> tags
 */
export function highlightSearchTerms(
  text: string,
  searchQuery: string,
  maxLength: number = 200
): string {
  if (!searchQuery.trim()) return text.substring(0, maxLength);

  const terms = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);

  if (terms.length === 0) return text.substring(0, maxLength);

  // Find the first occurrence of any search term
  const lowerText = text.toLowerCase();
  let firstIndex = -1;
  let matchedTerm = '';

  for (const term of terms) {
    const index = lowerText.indexOf(term);
    if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
      firstIndex = index;
      matchedTerm = term;
    }
  }

  // If no match found, return truncated text
  if (firstIndex === -1) {
    return text.substring(0, maxLength);
  }

  // Get context around the match
  const contextStart = Math.max(0, firstIndex - 50);
  const contextEnd = Math.min(text.length, firstIndex + maxLength);
  let excerpt = text.substring(contextStart, contextEnd);

  // Add ellipsis if truncated
  if (contextStart > 0) excerpt = '...' + excerpt;
  if (contextEnd < text.length) excerpt = excerpt + '...';

  // Highlight all search terms
  terms.forEach((term) => {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    excerpt = excerpt.replace(regex, '<mark>$1</mark>');
  });

  return excerpt;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract snippets around search terms
 * @param text The full text
 * @param searchQuery The search query
 * @param snippetLength Length of each snippet
 * @param maxSnippets Maximum number of snippets
 * @returns Array of text snippets containing search terms
 */
export function extractSnippets(
  text: string,
  searchQuery: string,
  snippetLength: number = 100,
  maxSnippets: number = 3
): string[] {
  if (!searchQuery.trim()) return [];

  const terms = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);

  if (terms.length === 0) return [];

  const snippets: string[] = [];
  const lowerText = text.toLowerCase();
  const used: Set<number> = new Set();

  for (const term of terms) {
    if (snippets.length >= maxSnippets) break;

    let index = 0;
    while ((index = lowerText.indexOf(term, index)) !== -1) {
      if (used.has(index)) {
        index++;
        continue;
      }

      const start = Math.max(0, index - snippetLength / 2);
      const end = Math.min(text.length, index + snippetLength / 2);
      let snippet = text.substring(start, end);

      if (start > 0) snippet = '...' + snippet;
      if (end < text.length) snippet = snippet + '...';

      snippets.push(snippet);
      used.add(index);

      if (snippets.length >= maxSnippets) break;

      index++;
    }
  }

  return snippets;
}

/**
 * Store recent search in local storage
 */
export function saveRecentSearch(query: string): void {
  if (!query.trim()) return;

  const recent = getRecentSearches();
  const updated = [query, ...recent.filter((q) => q !== query)].slice(0, 10);

  localStorage.setItem('mindflow_recent_searches', JSON.stringify(updated));
}

/**
 * Get recent searches from local storage
 */
export function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem('mindflow_recent_searches');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Clear recent searches
 */
export function clearRecentSearches(): void {
  localStorage.removeItem('mindflow_recent_searches');
}
EOF
```

---

## Step 5: Search Bar Component (25 minutes)

### 5.1 Create Search Bar Component

```bash
# mobile/src/components/search/SearchBar.tsx
mkdir -p mobile/src/components/search
cat > mobile/src/components/search/SearchBar.tsx << 'EOF'
import React, { useState, useEffect, useRef } from 'react';
import {
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
} from '@ionic/react';
import { timeOutline, closeCircle } from 'ionicons/icons';
import { getRecentSearches, clearRecentSearches } from '../../utils/search';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceTime?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onSearch,
  placeholder = 'Search entries...',
  debounceTime = 300,
}) => {
  const [query, setQuery] = useState(value);
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch(query);
    }, debounceTime);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceTime, onSearch]);

  const handleInputChange = (e: CustomEvent) => {
    setQuery(e.detail.value || '');
  };

  const handleFocus = () => {
    if (recentSearches.length > 0 && !query) {
      setShowRecent(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on recent search
    setTimeout(() => setShowRecent(false), 200);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleRecentClick = (search: string) => {
    setQuery(search);
    onSearch(search);
    setShowRecent(false);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
    setShowRecent(false);
  };

  return (
    <div className="search-bar-container">
      <IonSearchbar
        value={query}
        onIonInput={handleInputChange}
        onIonFocus={handleFocus}
        onIonBlur={handleBlur}
        onIonClear={handleClear}
        placeholder={placeholder}
        debounce={0}
        showClearButton="focus"
        className="search-bar"
      />

      {showRecent && recentSearches.length > 0 && (
        <div className="recent-searches">
          <div className="recent-searches-header">
            <span>Recent Searches</span>
            <IonButton fill="clear" size="small" onClick={handleClearRecent}>
              Clear All
            </IonButton>
          </div>
          <IonList>
            {recentSearches.map((search, index) => (
              <IonItem
                key={index}
                button
                onClick={() => handleRecentClick(search)}
              >
                <IonIcon icon={timeOutline} slot="start" />
                <IonLabel>{search}</IonLabel>
                <IonIcon icon={closeCircle} slot="end" color="medium" />
              </IonItem>
            ))}
          </IonList>
        </div>
      )}
    </div>
  );
};
EOF
```

### 5.2 Create Search Bar CSS

```bash
# mobile/src/components/search/SearchBar.css
cat > mobile/src/components/search/SearchBar.css << 'EOF'
.search-bar-container {
  position: relative;
}

.search-bar {
  --background: var(--ion-color-light);
  --border-radius: 8px;
  --box-shadow: none;
  --icon-color: var(--ion-color-medium);
}

.recent-searches {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--ion-background-color);
  border: 1px solid var(--ion-color-light);
  border-radius: 8px;
  margin-top: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.recent-searches-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ion-color-light);
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-medium);
}

.recent-searches ion-list {
  padding: 0;
}

.recent-searches ion-item {
  --padding-start: 16px;
  --padding-end: 16px;
  font-size: 14px;
}
EOF
```

---

## Step 6: Date Range Filter Component (20 minutes)

### 6.1 Create Date Range Filter

```bash
# mobile/src/components/search/DateRangeFilter.tsx
cat > mobile/src/components/search/DateRangeFilter.tsx << 'EOF'
import React, { useState } from 'react';
import {
  IonButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonDatetime,
  IonText,
} from '@ionic/react';
import { format } from 'date-fns';
import './DateRangeFilter.css';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);

  const handleApply = () => {
    onDateRangeChange(tempStartDate, tempEndDate);
    setShowModal(false);
  };

  const handleClear = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onDateRangeChange(null, null);
    setShowModal(false);
  };

  const formatDateLabel = () => {
    if (!startDate && !endDate) return 'All Time';
    if (startDate && !endDate) return `From ${format(startDate, 'MMM d, yyyy')}`;
    if (!startDate && endDate) return `Until ${format(endDate, 'MMM d, yyyy')}`;
    return `${format(startDate!, 'MMM d')} - ${format(endDate!, 'MMM d, yyyy')}`;
  };

  return (
    <>
      <IonButton fill="outline" size="small" onClick={() => setShowModal(true)}>
        <IonText>{formatDateLabel()}</IonText>
      </IonButton>

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Date Range</IonTitle>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowModal(false)}>Cancel</IonButton>
            </IonButtons>
            <IonButtons slot="end">
              <IonButton onClick={handleClear}>Clear</IonButton>
              <IonButton strong onClick={handleApply}>
                Apply
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Start Date</IonLabel>
              <IonDatetime
                value={tempStartDate?.toISOString()}
                onIonChange={(e) => setTempStartDate(e.detail.value ? new Date(e.detail.value as string) : null)}
                presentation="date"
                max={tempEndDate?.toISOString()}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">End Date</IonLabel>
              <IonDatetime
                value={tempEndDate?.toISOString()}
                onIonChange={(e) => setTempEndDate(e.detail.value ? new Date(e.detail.value as string) : null)}
                presentation="date"
                min={tempStartDate?.toISOString()}
              />
            </IonItem>
          </IonList>

          <div className="date-range-presets">
            <IonButton
              expand="block"
              fill="clear"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today);
                lastWeek.setDate(today.getDate() - 7);
                setTempStartDate(lastWeek);
                setTempEndDate(today);
              }}
            >
              Last 7 Days
            </IonButton>

            <IonButton
              expand="block"
              fill="clear"
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today);
                lastMonth.setMonth(today.getMonth() - 1);
                setTempStartDate(lastMonth);
                setTempEndDate(today);
              }}
            >
              Last 30 Days
            </IonButton>

            <IonButton
              expand="block"
              fill="clear"
              onClick={() => {
                const today = new Date();
                const lastYear = new Date(today);
                lastYear.setFullYear(today.getFullYear() - 1);
                setTempStartDate(lastYear);
                setTempEndDate(today);
              }}
            >
              Last Year
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};
EOF
```

### 6.2 Create Date Range Filter CSS

```bash
# mobile/src/components/search/DateRangeFilter.css
cat > mobile/src/components/search/DateRangeFilter.css << 'EOF'
.date-range-presets {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-range-presets ion-button {
  font-size: 14px;
}
EOF
```

---

## Step 7: Search Results Page (30 minutes)

### 7.1 Create Search Results Page

```bash
# mobile/src/pages/search/SearchPage.tsx
mkdir -p mobile/src/pages/search
cat > mobile/src/pages/search/SearchPage.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';
import { format } from 'date-fns';
import { SearchBar } from '../../components/search/SearchBar';
import { DateRangeFilter } from '../../components/search/DateRangeFilter';
import { MoodFilter } from '../../components/entries/MoodFilter';
import { entriesService } from '../../services/entries.service';
import { highlightSearchTerms, saveRecentSearch } from '../../utils/search';
import type { Entry, MoodType } from '../../types/entry.types';
import './SearchPage.css';

const SearchPage: React.FC = () => {
  const history = useHistory();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [moodFilter, setMoodFilter] = useState<MoodType | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    performSearch();
  }, [query, moodFilter, startDate, endDate]);

  const performSearch = async () => {
    // Don't search if query is empty and no filters applied
    if (!query.trim() && !moodFilter && !startDate && !endDate) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { entries } = await entriesService.searchEntries(query, 0, 50, {
        mood: moodFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setResults(entries);

      // Save to recent searches if query exists
      if (query.trim()) {
        saveRecentSearch(query);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleEntryClick = (id: string) => {
    history.push(`/entries/view/${id}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/entries" />
          </IonButtons>
          <IonTitle>Search Entries</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="search-page-header">
          <SearchBar value={query} onSearch={setQuery} />

          <div className="search-filters">
            <MoodFilter selectedMood={moodFilter} onMoodSelect={setMoodFilter} />
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        </div>

        {loading && (
          <div className="search-loading">
            <IonSpinner name="crescent" />
            <IonText color="medium">Searching...</IonText>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="search-empty">
            <IonText color="medium">
              <h2>No results found</h2>
              <p>Try different search terms or filters</p>
            </IonText>
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="search-empty">
            <IonText color="medium">
              <h2>Search your journal</h2>
              <p>Enter keywords, select moods, or choose a date range</p>
            </IonText>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="search-results">
            <div className="search-results-count">
              <IonText color="medium">
                Found {results.length} {results.length === 1 ? 'entry' : 'entries'}
              </IonText>
            </div>

            {results.map((entry) => (
              <IonCard
                key={entry.id}
                button
                onClick={() => handleEntryClick(entry.id)}
                className="search-result-card"
              >
                <IonCardHeader>
                  <IonCardTitle className="search-result-date">
                    {format(new Date(entry.created_at), 'EEEE, MMMM d, yyyy')}
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div
                    className="search-result-content"
                    dangerouslySetInnerHTML={{
                      __html: highlightSearchTerms(entry.content, query, 250),
                    }}
                  />
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SearchPage;
EOF
```

### 7.2 Create Search Page CSS

```bash
# mobile/src/pages/search/SearchPage.css
cat > mobile/src/pages/search/SearchPage.css << 'EOF'
.search-page-header {
  padding: 16px;
  border-bottom: 1px solid var(--ion-color-light);
}

.search-filters {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-loading,
.search-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 50vh;
  padding: 20px;
  gap: 12px;
}

.search-results {
  padding: 16px;
}

.search-results-count {
  margin-bottom: 16px;
  font-size: 14px;
}

.search-result-card {
  margin-bottom: 12px;
}

.search-result-date {
  font-size: 16px;
  font-weight: 600;
}

.search-result-content {
  line-height: 1.6;
  color: var(--ion-color-step-600);
}

.search-result-content mark {
  background: var(--ion-color-warning-tint);
  color: var(--ion-color-warning-contrast);
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
}
EOF
```

---

## Step 8: Update App Routing (10 minutes)

### 8.1 Add Search Route

```bash
# Add to mobile/src/App.tsx
# Import SearchPage
import SearchPage from './pages/search/SearchPage';

# Add route
<Route exact path="/search">
  <ProtectedRoute>
    <SearchPage />
  </ProtectedRoute>
</Route>
```

### 8.2 Add Search Button to Entries List

```bash
# Update mobile/src/pages/entries/EntryListPage.tsx
# Import search icon
import { add, personCircleOutline, searchOutline } from 'ionicons/icons';

# Add search button to header
<IonButtons slot="end">
  <IonButton onClick={() => history.push('/search')} aria-label="search">
    <IonIcon slot="icon-only" icon={searchOutline} />
  </IonButton>
  <IonButton onClick={() => history.push('/profile')}>
    <IonIcon slot="icon-only" icon={personCircleOutline} />
  </IonButton>
</IonButtons>
```

---

## Step 9: Testing (25 minutes)

### 9.1 Create Search Tests

```bash
# mobile/src/utils/__tests__/search.test.ts
cat > mobile/src/utils/__tests__/search.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { highlightSearchTerms, extractSnippets } from '../search';

describe('Search Utils', () => {
  describe('highlightSearchTerms', () => {
    it('should highlight single term', () => {
      const text = 'This is a test entry about happiness';
      const result = highlightSearchTerms(text, 'happiness', 200);

      expect(result).toContain('<mark>happiness</mark>');
    });

    it('should highlight multiple terms', () => {
      const text = 'Today was a great day full of joy';
      const result = highlightSearchTerms(text, 'great joy', 200);

      expect(result).toContain('<mark>great</mark>');
      expect(result).toContain('<mark>joy</mark>');
    });

    it('should be case insensitive', () => {
      const text = 'Happiness is important';
      const result = highlightSearchTerms(text, 'HAPPINESS', 200);

      expect(result).toContain('<mark>Happiness</mark>');
    });

    it('should handle empty query', () => {
      const text = 'Some text';
      const result = highlightSearchTerms(text, '', 200);

      expect(result).toBe('Some text');
    });
  });

  describe('extractSnippets', () => {
    it('should extract snippets around search terms', () => {
      const text = 'This is a long text. I felt happy today. Later, I was happy again.';
      const snippets = extractSnippets(text, 'happy', 50, 2);

      expect(snippets.length).toBeGreaterThan(0);
      expect(snippets.length).toBeLessThanOrEqual(2);
    });
  });
});
EOF
```

### 9.2 Create E2E Search Test

```bash
# mobile/cypress/e2e/search.cy.ts
cat > mobile/cypress/e2e/search.cy.ts << 'EOF'
describe('Search Functionality', () => {
  beforeEach(() => {
    // Login
    cy.visit('/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.contains('button', 'Login').click();
    cy.url().should('include', '/entries');
  });

  it('should navigate to search page', () => {
    cy.get('ion-button[aria-label="search"]').click();
    cy.url().should('include', '/search');
  });

  it('should perform search', () => {
    // Create entry with specific text
    cy.get('ion-fab-button').click();
    cy.get('ion-textarea').type('Visited the beach today, it was wonderful!');
    cy.contains('button', 'Save').click();

    // Navigate to search
    cy.get('ion-button[aria-label="search"]').click();

    // Search for term
    cy.get('ion-searchbar').type('beach');

    // Should show results
    cy.contains('Found').should('be.visible');
    cy.contains('beach').should('be.visible');
  });

  it('should highlight search terms', () => {
    // Navigate to search
    cy.get('ion-button[aria-label="search"]').click();

    // Search
    cy.get('ion-searchbar').type('happy');

    // Verify highlighting
    cy.get('mark').should('exist');
  });

  it('should filter by date range', () => {
    cy.get('ion-button[aria-label="search"]').click();

    // Open date filter
    cy.contains('All Time').click();

    // Select last 7 days preset
    cy.contains('Last 7 Days').click();
    cy.contains('Apply').click();

    // Verify filter applied
    cy.contains('Last 7 Days').should('not.exist');
  });
});
EOF
```

---

## Step 10: Manual Testing Checklist (15 minutes)

### 10.1 Test Search Functionality

```bash
# 1. Navigate to /search
# 2. Type search query
# 3. Verify results appear in < 500ms
# 4. Verify search terms are highlighted
# 5. Click a result
# 6. Verify navigates to correct entry
```

### 10.2 Test Filters

```bash
# 1. Search with mood filter
# 2. Search with date range
# 3. Combine search + mood + date
# 4. Verify filters work correctly
# 5. Clear all filters
```

### 10.3 Test Recent Searches

```bash
# 1. Perform several searches
# 2. Click search bar
# 3. Verify recent searches appear
# 4. Click a recent search
# 5. Verify search executes
# 6. Clear recent searches
```

---

## Step 11: Performance Testing (10 minutes)

### 11.1 Test Search Performance

```sql
-- In Supabase Dashboard → SQL Editor:

-- Analyze search query performance
EXPLAIN ANALYZE
SELECT *
FROM entries
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'happy & today')
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 20;

-- Should use idx_entries_search index
-- Should complete in < 100ms
```

### 11.2 Test with Large Dataset

You can test search performance by creating multiple test entries through the app and verifying that:
- Search results appear in < 500ms
- The GIN index is being used (check with EXPLAIN ANALYZE)
- Pagination works correctly with large result sets

---

## Step 12: Quality Gates Checklist

### 12.1 Functional Requirements

- [ ] Keyword search returns relevant entries
- [ ] Full-text search performance < 500ms
- [ ] Date filtering works correctly
- [ ] Mood filtering works with search
- [ ] Search results highlight matched keywords
- [ ] Recent searches are stored and displayed
- [ ] Combined filters work correctly

### 12.2 Technical Requirements

- [ ] PostgreSQL full-text search index is used
- [ ] Search handles special characters
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Unit tests pass
- [ ] E2E tests pass

### 12.3 UX Requirements

- [ ] Search is responsive and fast
- [ ] Highlights are clearly visible
- [ ] Empty states are informative
- [ ] Loading states provide feedback
- [ ] Date picker is easy to use
- [ ] Filter chips are intuitive

---

## Troubleshooting

### Issue: Search returns no results

**Solution:**
```typescript
// Check if tsquery is formatted correctly
const tsQuery = searchQuery
  .trim()
  .split(/\s+/)
  .filter(word => word.length > 0)
  .join(' & ');

// Verify full-text search index exists
```

### Issue: Search is slow

**Solution:**
```sql
-- Verify index is being used
EXPLAIN ANALYZE SELECT * FROM entries
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'keyword');

-- Should show "Index Scan using idx_entries_search"
```

---

## Next Steps

**Phase 5 Complete!** 🎉

You now have:
- ✅ Full-text search
- ✅ Search result highlighting
- ✅ Date range filtering
- ✅ Recent searches
- ✅ Combined filters

**Ready for Phase 6:**
- Phase 6: Basic AI Integration (Complex)

---

**Estimated Total Time:** 3-4 hours
**Complexity:** Moderate
**Prerequisites:** Phases 1, 2, 3, 4 complete

**Deliverables:**
✅ Search bar UI component
✅ Date filter component
✅ Search results screen with highlighting
✅ Full-text search using Supabase
✅ Search utilities (highlighting, recent searches)
✅ E2E tests for search functionality
