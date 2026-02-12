describe('Public Pages - Landing & Navigation', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the landing page successfully', () => {
    cy.contains('SAFE-8 AI Readiness Framework').should('be.visible');
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('should display assessment type cards', () => {
    cy.contains('Core Assessment').should('be.visible');
    cy.contains('Advanced Assessment').should('be.visible');
  });

  it('should allow selecting an assessment type', () => {
    cy.contains('.assessment-card', 'Core Assessment').click();
    cy.contains('Select Your Industry').should('be.visible');
  });

  it('should display industry selector after choosing assessment type', () => {
    cy.contains('.assessment-card', 'Core Assessment').click();
    cy.get('.industry-btn').should('have.length.greaterThan', 1);
  });

  it('should enable start button when both selections are made', () => {
    cy.contains('.assessment-card', 'Core Assessment').click();
    cy.get('.industry-btn').first().click();
    cy.contains('button', /Start Assessment|Continue to Assessment/).should('not.be.disabled');
  });
});
