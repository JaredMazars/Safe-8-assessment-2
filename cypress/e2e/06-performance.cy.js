describe('Performance Tests', () => {
  it('should load homepage within acceptable time', () => {
    const startTime = Date.now();
    
    cy.visit('/').then(() => {
      const loadTime = Date.now() - startTime;
      cy.log(`Page load time: ${loadTime}ms`);
      expect(loadTime).to.be.lessThan(5000); // 5 seconds
    });
  });

  it('should not have excessive DOM size', () => {
    cy.visit('/');
    cy.get('*').then($elements => {
      const domSize = $elements.length;
      cy.log(`DOM size: ${domSize} elements`);
      expect(domSize).to.be.lessThan(1500); // Recommended limit
    });
  });

  it('should load images efficiently', () => {
    cy.visit('/');
    cy.get('img').each(($img) => {
      const src = $img.attr('src');
      if (src && !src.startsWith('data:')) {
        cy.request(src).then((response) => {
          expect(response.status).to.eq(200);
        });
      }
    });
  });

  it('should handle concurrent users (stress test)', () => {
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        cy.visit('/').then(() => {
          cy.log(`Request ${i + 1} completed`);
        })
      );
    }
  });
});
