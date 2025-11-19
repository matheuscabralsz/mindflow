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
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
