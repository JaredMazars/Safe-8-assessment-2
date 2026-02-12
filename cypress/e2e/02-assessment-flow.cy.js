describe('Assessment Flow - User Journey', () => {
  beforeEach(() => {
    cy.visit('/');
    // Select assessment type and industry
    cy.contains('.assessment-card', 'Core Assessment').click();
    cy.get('.industry-btn').first().click();
  });

  it('should navigate to next step after selections', () => {
    cy.contains('button', /Continue to Assessment/).should('be.visible');
  });

  it('should allow clicking the continue button', () => {
    cy.contains('button', /Continue to Assessment/).click();
    cy.url().should('include', '/register');
  });

  it('should display registration page after clicking continue', () => {
    cy.contains('button', /Continue to Assessment/).click();
    cy.url().should('include', '/register');
    // Registration page should load
    cy.get('form').should('exist');
  });

  it('should show form inputs on registration page', () => {
    cy.contains('button', /Continue to Assessment/).click();
    cy.get('input').should('have.length.greaterThan', 0);
  });
});
