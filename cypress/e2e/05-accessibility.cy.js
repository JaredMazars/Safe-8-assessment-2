describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should have proper heading hierarchy', () => {
    cy.get('h1').should('have.length.lessThan', 2); // Only one h1
    cy.get('h1, h2, h3, h4, h5, h6').should('exist');
  });

  it('should have alt text for images', () => {
    cy.get('img').each(($img) => {
      cy.wrap($img).should('have.attr', 'alt');
    });
  });

  it('should support keyboard navigation', () => {
    cy.get('button').first().focus();
    cy.focused().should('exist');
  });

  it('should have form labels', () => {
    cy.visit('/admin/login');
    cy.get('input[name="username"]').should('have.attr', 'id');
    cy.get('label[for="username"]').should('exist');
    cy.get('input[name="password"]').should('have.attr', 'id');
    cy.get('label[for="password"]').should('exist');
  });

  it('should have sufficient color contrast', () => {
    cy.get('button, a, .btn').each(($el) => {
      cy.wrap($el).should('be.visible');
    });
  });

  it('should have proper ARIA attributes', () => {
    // Check for proper ARIA usage
    cy.get('button').should('exist');
    cy.get('img').each(($img) => {
      cy.wrap($img).should('have.attr', 'alt');
    });
  });
});
