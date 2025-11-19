/**
 * Mood Tracking E2E Test
 * Tests the critical mood tracking flow: create with mood -> view -> edit mood -> delete
 */

describe('Mood Tracking Critical Flow', () => {
  const testUser = {
    email: 'test@mindflow.com',
    password: 'TestPassword123!',
  };

  const testEntry = {
    content: 'Testing mood tracking functionality with this journal entry.',
    initialMood: 'happy',
    updatedMood: 'calm',
  };

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should complete mood tracking flow: create with mood, view, edit mood, delete', () => {
    // Step 1: Login
    cy.log('Step 1: Login');
    cy.visit('/login');
    cy.wait(500);

    cy.get('ion-input[type="email"]').find('input').type(testUser.email, { force: true });
    cy.get('ion-input[type="password"]').find('input').type(testUser.password, { force: true });
    cy.get('ion-button[type="submit"]').click();

    cy.url().should('include', '/home', { timeout: 10000 });

    // Step 2: Create entry with mood
    cy.log('Step 2: Create entry with initial mood (happy)');
    cy.visit('/entries/new');
    cy.wait(3000);

    cy.contains('New Entry').should('be.visible');

    // Select initial mood (happy)
    cy.get(`ion-button[data-mood="${testEntry.initialMood}"]`).then($buttons => {
      $buttons.get($buttons.length - 1).click();
    });

    // Type content
    cy.get('textarea[data-testid="entry-content"]').clear().type(testEntry.content, { force: true });
    cy.wait(500);

    // Save entry
    cy.get('ion-button').contains('Save').click({ force: true });

    cy.url().should('include', '/entries', { timeout: 10000 });
    cy.url().should('not.include', '/new');
    cy.wait(2000);

    // Step 3: Verify mood displays on entry card
    cy.log('Step 3: Verify mood displays on entry list');
    cy.visit('/entries');
    cy.wait(1000);

    // Should see mood emoji on the entry card (😊 for happy)
    cy.get('ion-card').first().should('contain', '😊');

    // Step 4: View entry detail and verify mood
    cy.log('Step 4: View entry detail and verify mood display');
    cy.get('ion-card').first().click();
    cy.url().should('match', /\/entries\/view\/[a-zA-Z0-9-]+/);
    cy.wait(2000);

    // Force page visit to avoid cached pages
    cy.url().then((url) => {
      cy.visit(url);
      cy.wait(1000);
    });

    // Should see mood emoji and label on detail page
    cy.get('ion-card-content').should('contain', '😊');
    cy.get('ion-card-content').should('contain', 'Happy');

    // Step 5: Edit entry and change mood
    cy.log('Step 5: Edit entry and change mood to calm');
    // Navigate directly to edit page
    cy.url().then((url) => {
      const entryId = url.split('/view/')[1];
      cy.visit(`/entries/edit/${entryId}`);
      cy.wait(3000);
    });

    // Change mood to calm
    cy.get(`ion-button[data-mood="${testEntry.updatedMood}"]`).then($buttons => {
      $buttons.get($buttons.length - 1).click();
    });
    cy.wait(500);

    // Save changes
    cy.get('ion-button').contains('Save').click({ force: true });
    cy.url().should('include', '/entries', { timeout: 10000 });
    cy.wait(2000);

    // Step 6: Verify updated mood displays
    cy.log('Step 6: Verify updated mood displays on entry');
    cy.visit('/entries');
    cy.wait(1000);

    // Should see updated mood emoji (😌 for calm)
    cy.get('ion-card').first().should('contain', '😌');
    cy.get('ion-card').first().click();
    cy.wait(2000);

    // Force page visit to avoid cached pages
    cy.url().then((url) => {
      cy.visit(url);
      cy.wait(1000);
    });

    // Verify on detail page
    cy.get('ion-card-content').should('contain', '😌');
    cy.get('ion-card-content').should('contain', 'Calm');

    // Step 7: Delete entry
    cy.log('Step 7: Delete entry');
    cy.get('ion-button[color="danger"]').click();
    cy.get('ion-alert').should('be.visible');
    cy.get('ion-alert button').contains('Delete').click();

    cy.url().should('include', '/entries', { timeout: 5000 });
    cy.url().should('not.match', /\/view\//);
    cy.wait(2000);

    // Step 8: Logout
    cy.log('Step 8: Logout');
    cy.visit('/profile');
    cy.wait(500);

    cy.get('ion-button[color="danger"]').contains('Logout').click();
    cy.url().should('include', '/login');
    cy.wait(500);

    cy.contains('Welcome to MindFlow').should('be.visible');
  });
});
