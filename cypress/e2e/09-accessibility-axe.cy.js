describe('Accessibility Testing with Axe', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('should have no accessibility violations on landing page', () => {
    cy.checkA11y();
  });

  it('should have no accessibility violations on assessment selection', () => {
    cy.contains('.assessment-card', 'Core Assessment').click();
    cy.checkA11y();
  });

  it('should have no accessibility violations on industry selection', () => {
    cy.contains('.assessment-card', 'Core Assessment').click();
    cy.get('.industry-btn').first().click();
    cy.checkA11y();
  });

  it('should check for critical and serious violations only', () => {
    cy.checkA11y(null, {
      includedImpacts: ['critical', 'serious']
    });
  });

  it('should generate accessibility report', () => {
    cy.checkA11y(null, null, (violations) => {
      if (violations.length) {
        cy.log(`Found ${violations.length} accessibility violations`);
        violations.forEach(violation => {
          cy.log(`${violation.impact}: ${violation.description}`);
        });
      }
    });
  });
});
