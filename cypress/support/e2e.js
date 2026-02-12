// Import commands
import './commands';

// Global before hook
before(() => {
  cy.log('Starting SAFE-8 Test Suite');
});

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Don't fail tests on unhandled promise rejections or React errors
  if (err.message.includes('ResizeObserver') || 
      err.message.includes('hydration') ||
      err.message.includes('Not implemented: HTMLFormElement.prototype.requestSubmit')) {
    return false;
  }
  return true;
});

// Add custom assertions
Cypress.Commands.add('shouldBeAccessible', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).should('be.visible');
  cy.wrap(subject).should('not.be.disabled');
  return cy.wrap(subject);
});
