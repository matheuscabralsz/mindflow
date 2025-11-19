/**
 * Critical Flow E2E Test
 * Tests the main user journey: login -> create entry -> view entry -> delete entry -> logout
 */

describe('Critical User Flow', () => {
  const testUser = {
    email: 'test@mindflow.com',
    password: 'TestPassword123!',
  };

  const testEntry = {
    content: 'This is a test journal entry for E2E testing. Writing about my day and how things are going.',
    mood: 'happy',
  };

  let entryId: string;

  beforeEach(() => {
    // Clear any existing sessions
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should complete the full critical flow', () => {
    // Step 1: Sign in
    cy.log('Step 1: Sign in with test credentials');
    cy.visit('/login');
    cy.wait(500); // Wait for Ionic to hydrate

    // Fill in login form - need to access native input inside ion-input
    cy.get('ion-input[type="email"]').find('input').type(testUser.email, { force: true });
    cy.get('ion-input[type="password"]').find('input').type(testUser.password, { force: true });

    // Submit form
    cy.get('ion-button[type="submit"]').click();

    // Should navigate to home
    cy.url().should('include', '/home', { timeout: 10000 });

    // Step 2: Add new entry - visit directly to avoid Ionic keeping old pages
    cy.log('Step 2: Create new journal entry');
    cy.visit('/entries/new');
    cy.wait(3000); // Wait longer for Ionic to remove old pages from DOM

    // Wait for page title to ensure we're on the right page
    cy.contains('New Entry').should('be.visible');

    // Select mood - invoke click() programmatically to bypass visibility
    cy.get(`ion-button[data-mood="${testEntry.mood}"]`).then($buttons => {
      $buttons.get($buttons.length - 1).click();
    });

    // Type into textarea (now using plain HTML textarea instead of IonTextarea)
    cy.get('textarea[data-testid="entry-content"]').clear().type(testEntry.content, { force: true });
    cy.wait(500);

    // Save entry
    cy.get('ion-button').contains('Save').click({ force: true });

    // Should navigate back to entries list
    cy.url().should('include', '/entries', { timeout: 10000 });
    cy.url().should('not.include', '/new');
    cy.wait(2000); // Wait for entry to be saved and list to refresh

    // Step 3: View entry details and delete
    cy.log('Step 3: View entry and delete it');

    // Click on the entry card to view details - use direct visit to avoid Ionic caching
    cy.visit('/entries');
    cy.wait(1000);
    cy.get('ion-card').first().click();

    // Should navigate to view page
    cy.url().should('match', /\/entries\/view\/[a-zA-Z0-9-]+/);
    cy.wait(1000);

    // Click delete button - it's an icon-only button with color="danger"
    cy.get('ion-button[color="danger"]').click();

    // Confirm deletion in alert
    cy.get('ion-alert').should('be.visible');
    cy.get('ion-alert button').contains('Delete').click();

    // Should navigate back to entries list
    cy.url().should('include', '/entries', { timeout: 5000 });
    cy.url().should('not.match', /\/view\//);
    cy.wait(2000); // Wait for list to refresh after deletion

    // Step 4: Sign out
    cy.log('Step 4: Sign out from profile');

    // Navigate to profile
    cy.visit('/profile');
    cy.wait(500);

    // Click logout button
    cy.get('ion-button[color="danger"]').contains('Logout').click();

    // Should redirect to login page
    cy.url().should('include', '/login');
    cy.wait(500);

    // Should show login form
    cy.contains('Welcome to MindFlow').should('be.visible');
  });
});
