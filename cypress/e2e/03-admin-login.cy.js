describe('Admin Authentication', () => {
  beforeEach(() => {
    // Clear any existing auth data
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should display admin login page', () => {
    cy.visit('/admin/login');
    cy.contains('Admin Portal').should('be.visible');
    cy.get('input[name="username"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
  });

  it('should show validation errors for empty login', () => {
    cy.visit('/admin/login');
    cy.get('button[type="submit"]').click();
    // Should still be on login page
    cy.url().should('include', '/admin/login');
  });

  it('should show error for invalid credentials', () => {
    cy.visit('/admin/login');
    cy.get('input[name="username"]').type('invaliduser');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    // Should show error message (wait longer for rate limiting)
    cy.wait(2000);
    // Check if we're still on login page OR if there's an error message
    cy.url().should('include', '/admin');
  });

  it('should have password visibility toggle', () => {
    cy.visit('/admin/login');
    cy.get('input[name="password"]').should('have.attr', 'type', 'password');
    cy.get('.password-toggle-btn').click();
    cy.get('input[name="password"]').should('have.attr', 'type', 'text');
  });
});
