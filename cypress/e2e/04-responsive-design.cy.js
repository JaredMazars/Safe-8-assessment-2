describe('Responsive Design & Mobile View', () => {
  const viewports = [
    { device: 'Mobile', width: 375, height: 667 },
    { device: 'Tablet', width: 768, height: 1024 },
    { device: 'Desktop', width: 1280, height: 720 }
  ];

  viewports.forEach(({ device, width, height }) => {
    describe(`${device} viewport (${width}x${height})`, () => {
      beforeEach(() => {
        cy.viewport(width, height);
        cy.visit('/');
      });

      it('should load homepage correctly', () => {
        cy.contains('SAFE-8 AI Readiness Framework').should('be.visible');
      });

      it('should display navigation', () => {
        cy.contains('Core Assessment').should('be.visible');
      });

      it('should have clickable CTA button', () => {
        cy.contains('.assessment-card', 'Core Assessment').click();
        cy.get('.industry-btn').first().click();
        cy.contains('button', /Start Assessment|Continue to Assessment/).should('be.visible');
      });
    });
  });

  it('should handle orientation change on mobile', () => {
    cy.viewport(667, 375); // Landscape
    cy.visit('/');
    cy.contains('SAFE-8 AI Readiness Framework').should('be.visible');
    
    cy.viewport(375, 667); // Portrait
    cy.contains('SAFE-8 AI Readiness Framework').should('be.visible');
  });
});
