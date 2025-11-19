describe('Search Functionality', () => {
  const testUser = {
    email: 'test@mindflow.com',
    password: 'TestPassword123!',
  };

  beforeEach(() => {
    // Clear any existing sessions
    cy.clearLocalStorage();
    cy.clearCookies();

    // Login
    cy.visit('/login');
    cy.wait(500); // Wait for Ionic to hydrate

    // Fill in login form - need to access native input inside ion-input
    cy.get('ion-input[type="email"]').find('input').type(testUser.email, { force: true });
    cy.get('ion-input[type="password"]').find('input').type(testUser.password, { force: true });

    // Submit form
    cy.get('ion-button[type="submit"]').click();

    // Should navigate to home or entries
    cy.url().should('match', /(home|entries)/, { timeout: 10000 });
    cy.wait(1000);
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

    // Verify filter applied (date button text should change)
    cy.contains('All Time').should('not.exist');
  });

  it('should filter by mood', () => {
    cy.get('ion-button[aria-label="search"]').click();

    // Click a mood chip
    cy.get('.mood-filter ion-chip').first().click();

    // Should trigger search (loading or results should appear)
    cy.get('.search-page-header').should('be.visible');
  });

  it('should show empty state when no results', () => {
    cy.get('ion-button[aria-label="search"]').click();

    // Search for something unlikely to exist
    cy.get('ion-searchbar').type('xyzabc123nonexistent');

    // Should show no results message
    cy.contains('No results found').should('be.visible');
  });

  it('should clear search', () => {
    cy.get('ion-button[aria-label="search"]').click();

    // Type search query
    cy.get('ion-searchbar').type('test');

    // Clear search
    cy.get('ion-searchbar').find('.searchbar-clear-button').click();

    // Should show initial empty state
    cy.contains('Search your journal').should('be.visible');
  });

  it('should navigate to entry from search results', () => {
    // Create entry with specific text
    cy.get('ion-fab-button').click();
    cy.get('ion-textarea').type('A unique test entry for navigation');
    cy.contains('button', 'Save').click();

    // Wait for navigation back to list
    cy.url().should('include', '/entries');

    // Navigate to search
    cy.get('ion-button[aria-label="search"]').click();

    // Search for the entry
    cy.get('ion-searchbar').type('unique test entry');

    // Click on the search result
    cy.get('.search-result-card').first().click();

    // Should navigate to entry detail page
    cy.url().should('include', '/entries');
    cy.url().should('include', '/view/');
    cy.contains('A unique test entry for navigation').should('be.visible');
  });
});
