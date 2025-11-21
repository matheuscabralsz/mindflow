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

        // Should navigate to home
    cy.url().should('include', '/home', { timeout: 10000 });
    cy.wait(1000);

    // Navigate to entries page where search button is located
    cy.visit('/entries');
    cy.wait(1000);
  });

  it('should navigate to search page', () => {
    cy.get('ion-button[aria-label="search"]').click();
    cy.url().should('include', '/search');
  });

  it('should create entry for search tests', () => {
    // Create an entry with the word "happy" to be used by other tests
    cy.visit('/entries/new');
    cy.wait(1000);
    cy.get('textarea[data-testid="entry-content"]').clear().type('I am feeling happy today because of the sunshine!', { force: true });
    cy.wait(500);
    cy.get('ion-button').contains('Save').click({ force: true });

    // Wait for navigation back to list
    cy.url().should('include', '/entries', { timeout: 10000 });
    cy.url().should('not.include', '/new');
    cy.wait(2000);
  });

  it('should perform search', () => {
    // Navigate to search
    cy.visit('/search');
    cy.wait(1000);

    // Search for term "happy" (created in previous test)
    cy.get('ion-searchbar').type('happy');
    cy.wait(1500);

    // Should show results
    cy.contains('Found').should('be.visible');
    cy.contains('happy').should('be.visible');
  });

  it('should highlight search terms', () => {
    // Navigate to search
    cy.visit('/search');
    cy.wait(1000);

    // Search for "happy"
    cy.get('ion-searchbar').type('happy');
    cy.wait(1000);

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
    // Navigate to search
    cy.visit('/search');
    cy.wait(1000);

    // Search for "happy" entry (created earlier)
    cy.get('ion-searchbar').type('happy');
    cy.wait(1500);

    // Verify search results appeared
    cy.get('.search-result-card').should('exist');

    // Click on the search result
    cy.get('.search-result-card').first().click();
    cy.wait(2000);

    // Should navigate to entry detail page
    cy.url().should('match', /\/entries\/view\/[a-zA-Z0-9-]+/);

    // Verify we're on the detail page by checking for entry-specific elements
    cy.get('ion-card-content').should('be.visible');
  });
});
