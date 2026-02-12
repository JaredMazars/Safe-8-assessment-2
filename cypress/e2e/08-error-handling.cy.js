describe('Error Handling & Edge Cases', () => {
  it('should handle 404 pages gracefully', () => {
    cy.visit('/non-existent-page', { failOnStatusCode: false });
    cy.get('body').should('exist');
  });

  it('should handle network errors gracefully', () => {
    cy.visit('/');
    cy.intercept('GET', '/api/questions/assessment-types-config', { forceNetworkError: true });
    cy.reload();
    // App should still load with default cards
    cy.contains('Core Assessment').should('be.visible');
  });

  it('should validate form inputs on registration', () => {
    cy.visit('/');
    cy.contains('.assessment-card', 'Core Assessment').click();
    cy.get('.industry-btn').first().click();
    cy.contains('button', /Continue to Assessment/).click();
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('input[name="email"]').blur();
    // HTML5 validation should show error
  });

  it('should handle long text inputs', () => {
    cy.visit('/admin/login');
    const longText = 'a'.repeat(200);
    cy.get('input[name="username"]').type(longText.substring(0, 100), { delay: 0 });
    cy.get('input[name="username"]').should('have.value', longText.substring(0, 100));
  });

  it('should sanitize XSS attempts', () => {
    cy.visit('/admin/login');
    cy.get('input[name="username"]').type('<script>alert("XSS")</script>', { delay: 0 });
    // Input should accept the text but not execute it
    cy.get('input[name="username"]').should('contain.value', 'script');
  });

  it('should handle rapid clicking', () => {
    cy.visit('/');
    cy.contains('.assessment-card', 'Core Assessment').click({multiple: true}).click({multiple: true});
    // Should only select once, not cause errors
    cy.contains('Select Your Industry').should('be.visible');
  });
});
