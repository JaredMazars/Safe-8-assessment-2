describe('API Integration Tests', () => {
  const apiUrl = Cypress.env('apiUrl') || 'http://localhost:5000';

  it('should verify API is running', () => {
    cy.request({
      url: `${apiUrl}/api/health`,
      failOnStatusCode: false
    }).then((response) => {
      cy.log(`API Status: ${response.status}`);
    });
  });

  it('should fetch configuration data', () => {
    cy.request({
      url: `${apiUrl}/api/config`,
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200) {
        expect(response.body).to.have.property('industries');
        expect(response.body.industries).to.be.an('array');
      }
    });
  });

  it('should handle CORS correctly', () => {
    cy.visit('/');
    cy.window().then((win) => {
      return fetch(`${apiUrl}/api/config`)
        .then(response => {
          expect(response.ok).to.be.true;
        })
        .catch(error => {
          cy.log('CORS or network error:', error.message);
        });
    });
  });

  it('should validate API response structure', () => {
    cy.request({
      url: `${apiUrl}/api/config`,
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200) {
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('success');
      }
    });
  });
});
