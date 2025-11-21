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
import { MoodFilter } from '../../components/search/MoodFilter';
import { searchEntries } from '../../services/entries.service';
import { highlightSearchTerms, saveRecentSearch } from '../../utils/search';
import type { Entry, MoodType } from '../../types';
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
      const { entries } = await searchEntries(query, 0, 50, {
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
