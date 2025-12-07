describe('AI Summaries', () => {
  beforeEach(() => {
    // Login with test user
    cy.visit('/login');
    cy.get('input[type="email"]').type(Cypress.env('TEST_USER_EMAIL') || 'test@example.com');
    cy.get('input[type="password"]').type(Cypress.env('TEST_USER_PASSWORD') || 'password123');
    cy.contains('button', 'Log In').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
  });

  it('should navigate to summaries page from entry list', () => {
    cy.visit('/entries');
    cy.get('ion-button[aria-label="AI summaries"]').click();
    cy.url().should('include', '/summaries');
    cy.contains('AI Summaries').should('be.visible');
  });

  it('should display empty state on summaries page', () => {
    cy.visit('/summaries');
    cy.contains('AI Summaries').should('be.visible');
    cy.contains('No Summary Yet').should('be.visible');
    cy.contains('Generate Summary').should('be.visible');
  });

  it('should switch between daily and weekly tabs', () => {
    cy.visit('/summaries');

    // Default is daily
    cy.get('ion-segment-button[value="daily"]').should('have.class', 'segment-button-checked');

    // Switch to weekly
    cy.get('ion-segment-button[value="weekly"]').click();
    cy.get('ion-segment-button[value="weekly"]').should('have.class', 'segment-button-checked');

    // Switch back to daily
    cy.get('ion-segment-button[value="daily"]').click();
    cy.get('ion-segment-button[value="daily"]').should('have.class', 'segment-button-checked');
  });

  it('should show error toast when generating summary without entries', () => {
    cy.visit('/summaries');
    cy.contains('Generate Summary').click();

    // Should show error for no entries or AI not configured
    cy.get('ion-toast', { timeout: 15000 }).should('be.visible');
  });

  it('should navigate back to entries from summaries page', () => {
    cy.visit('/summaries');
    cy.get('ion-back-button').click();
    cy.url().should('include', '/entries');
  });
});
