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

  for (const term of terms) {
    const index = lowerText.indexOf(term);
    if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
      firstIndex = index;
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
