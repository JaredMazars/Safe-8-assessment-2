// Custom commands for SAFE-8 testing

Cypress.Commands.add('login', (email, password) => {
  cy.visit('/admin/login');
  cy.get('input[type="email"], input[name="email"]').type(email);
  cy.get('input[type="password"], input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('startAssessment', (userData) => {
  cy.visit('/');
  cy.contains('Start Assessment').click();
  
  if (userData.name) {
    cy.get('input[name="fullName"], input[placeholder*="name"]').first().type(userData.name);
  }
  if (userData.email) {
    cy.get('input[type="email"]').first().type(userData.email);
  }
  if (userData.industry) {
    cy.get('select').first().select(userData.industry);
  }
  
  cy.get('button').contains(/start|begin|continue/i).click();
});

Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject) => {
  (subject ? cy.wrap(subject) : cy.focused()).trigger('keydown', { keyCode: 9, which: 9, key: 'Tab' });
  // Don't return anything to avoid Cypress error
});
