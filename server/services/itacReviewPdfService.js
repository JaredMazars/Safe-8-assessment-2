import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Forvis Mazars brand colors
const primaryBlue = '#00539F';
const secondaryRed = '#E31B23';
const accentOrange = '#F7941D';

/**
 * Generate ITAC Review PDF
 * @param {Object} data - Form data for ITAC review
 * @param {string} outputPath - Optional path to save PDF file
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateITACReviewPDF(data, outputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true
      });

      const chunks = [];
      
      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        if (outputPath) {
          fs.writeFileSync(outputPath, pdfBuffer);
        }
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Helper functions
      const addCheckbox = (x, y, checked = false, label = '') => {
        doc.rect(x, y, 12, 12).stroke();
        if (checked) {
          doc.fontSize(10).text('✓', x + 2, y + 1);
        }
        if (label) {
          doc.fontSize(11).text(label, x + 18, y);
        }
      };

      const addField = (label, value, isMultiline = false) => {
        doc.fontSize(11).fillColor('#000000').text(label, { continued: !isMultiline, bold: true });
        if (isMultiline) {
          doc.moveDown(0.3);
          doc.fontSize(10).fillColor('#333333').text(value || 'N/A', { indent: 20 });
        } else {
          doc.fontSize(10).fillColor('#333333').text(' ' + (value || 'N/A'));
        }
        doc.moveDown(0.5);
      };

      // Header with Forvis Mazars branding
      const logoPath = path.join(__dirname, '../../public/ForvisMazars-Logo-Color-RGB.jpg');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 40, { height: 40 });
      }

      doc.fontSize(20).fillColor(primaryBlue).text('IT ADVISORY COMMITTEE REVIEW', 200, 50, { align: 'right' });
      doc.fontSize(12).fillColor('#666666').text('Tool/Platform Approval Form', 200, 75, { align: 'right' });
      
      doc.moveDown(3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(primaryBlue);
      doc.moveDown(1);

      // Section 1: Tool/Platform Details
      doc.fontSize(14).fillColor(primaryBlue).text('1. Tool/Platform Details', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(11).fillColor('#000000');
      addField('Tool/Platform Name:', data.toolName || '');
      addField('Vendor:', data.vendor || '');
      addField('Proposed Use Case:', data.useCase || '');
      addField('Department/Team:', data.department || '');
      addField('Requested By:', data.requestedBy || '');
      addField('Date of Request:', data.requestDate || new Date().toLocaleDateString());
      
      doc.moveDown(1);

      // Section 2: Items Out-of-Scope
      doc.fontSize(14).fillColor(primaryBlue).text('2. Items Out-of-Scope for ITAC Review', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(11).fillColor('#000000');
      doc.text('The following items do not require ITAC approval:');
      doc.moveDown(0.5);

      const currentY1 = doc.y;
      addCheckbox(70, currentY1, data.outOfScope?.includes('existing'), 'Use of existing approved platforms');
      doc.moveDown(0.5);
      
      const currentY2 = doc.y;
      addCheckbox(70, currentY2, data.outOfScope?.includes('internal'), 'Internal development tools already in use');
      doc.moveDown(0.5);
      
      const currentY3 = doc.y;
      addCheckbox(70, currentY3, data.outOfScope?.includes('minor'), 'Minor updates to approved tools');
      doc.moveDown(1);

      if (data.outOfScopeExplanation) {
        doc.fontSize(11).fillColor('#000000').text('Additional Explanation:', { bold: true });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#333333').text(data.outOfScopeExplanation, { indent: 20 });
        doc.moveDown(1);
      }

      // Section 3: Security, Legal, and Compliance
      doc.fontSize(14).fillColor(primaryBlue).text('3. Security, Legal, and Compliance Considerations', { underline: true });
      doc.moveDown(0.5);

      const secY1 = doc.y;
      addCheckbox(70, secY1, data.security?.dataSensitivity === true);
      doc.fontSize(11).fillColor('#000000').text('Does the tool handle sensitive client or firm data?', 88, secY1);
      doc.moveDown(0.5);

      const secY2 = doc.y;
      addCheckbox(70, secY2, data.security?.vendorAssessment === true);
      doc.fontSize(11).fillColor('#000000').text('Has a vendor security assessment been completed?', 88, secY2);
      doc.moveDown(0.5);

      const secY3 = doc.y;
      addCheckbox(70, secY3, data.security?.legalReview === true);
      doc.fontSize(11).fillColor('#000000').text('Has Legal reviewed the vendor contract and terms?', 88, secY3);
      doc.moveDown(0.5);

      const secY4 = doc.y;
      addCheckbox(70, secY4, data.security?.dataPrivacy === true);
      doc.fontSize(11).fillColor('#000000').text('Does the tool comply with data privacy regulations (GDPR, CCPA, etc.)?', 88, secY4);
      doc.moveDown(1);

      if (data.securityExplanation) {
        doc.fontSize(11).fillColor('#000000').text('Security & Compliance Notes:', { bold: true });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#333333').text(data.securityExplanation, { indent: 20, align: 'left' });
        doc.moveDown(1);
      }

      // Add new page if needed
      if (doc.y > 650) {
        doc.addPage();
      }

      // Section 4: IT Due Diligence
      doc.fontSize(14).fillColor(primaryBlue).text('4. IT Due Diligence', { underline: true });
      doc.moveDown(0.5);

      const ddY1 = doc.y;
      addCheckbox(70, ddY1, data.dueDiligence?.integration === true);
      doc.fontSize(11).fillColor('#000000').text('Can the tool integrate with existing firm systems?', 88, ddY1);
      doc.moveDown(0.5);

      const ddY2 = doc.y;
      addCheckbox(70, ddY2, data.dueDiligence?.scalability === true);
      doc.fontSize(11).fillColor('#000000').text('Is the solution scalable for future growth?', 88, ddY2);
      doc.moveDown(0.5);

      const ddY3 = doc.y;
      addCheckbox(70, ddY3, data.dueDiligence?.support === true);
      doc.fontSize(11).fillColor('#000000').text('Does the vendor provide adequate support and SLAs?', 88, ddY3);
      doc.moveDown(0.5);

      const ddY4 = doc.y;
      addCheckbox(70, ddY4, data.dueDiligence?.redundancy === true);
      doc.fontSize(11).fillColor('#000000').text('Is there redundancy or overlap with existing tools?', 88, ddY4);
      doc.moveDown(1);

      if (data.dueDiligenceExplanation) {
        doc.fontSize(11).fillColor('#000000').text('IT Due Diligence Notes:', { bold: true });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#333333').text(data.dueDiligenceExplanation, { indent: 20, align: 'left' });
        doc.moveDown(1);
      }

      // Section 5: Tool Accuracy and Performance
      doc.fontSize(14).fillColor(primaryBlue).text('5. Tool Accuracy and Performance', { underline: true });
      doc.moveDown(0.5);

      const perfY1 = doc.y;
      addCheckbox(70, perfY1, data.performance?.testing === true);
      doc.fontSize(11).fillColor('#000000').text('Has the tool been tested for accuracy in its intended use case?', 88, perfY1);
      doc.moveDown(0.5);

      const perfY2 = doc.y;
      addCheckbox(70, perfY2, data.performance?.benchmarks === true);
      doc.fontSize(11).fillColor('#000000').text('Are performance benchmarks documented?', 88, perfY2);
      doc.moveDown(0.5);

      const perfY3 = doc.y;
      addCheckbox(70, perfY3, data.performance?.monitoring === true);
      doc.fontSize(11).fillColor('#000000').text('Is there a plan for ongoing monitoring and validation?', 88, perfY3);
      doc.moveDown(1);

      if (data.performanceExplanation) {
        doc.fontSize(11).fillColor('#000000').text('Performance Notes:', { bold: true });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#333333').text(data.performanceExplanation, { indent: 20, align: 'left' });
        doc.moveDown(1);
      }

      // Add new page if needed
      if (doc.y > 650) {
        doc.addPage();
      }

      // Section 6: Supporting Documentation
      doc.fontSize(14).fillColor(primaryBlue).text('6. Supporting Documentation', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(11).fillColor('#000000').text('Please attach or reference the following documents:', { bold: true });
      doc.moveDown(0.5);

      const docY1 = doc.y;
      addCheckbox(70, docY1, data.documentation?.includes('vendor_proposal'));
      doc.fontSize(10).fillColor('#333333').text('Vendor proposal and product documentation', 88, docY1);
      doc.moveDown(0.5);

      const docY2 = doc.y;
      addCheckbox(70, docY2, data.documentation?.includes('security_assessment'));
      doc.fontSize(10).fillColor('#333333').text('Security and privacy assessment results', 88, docY2);
      doc.moveDown(0.5);

      const docY3 = doc.y;
      addCheckbox(70, docY3, data.documentation?.includes('contract'));
      doc.fontSize(10).fillColor('#333333').text('Draft or executed contract', 88, docY3);
      doc.moveDown(0.5);

      const docY4 = doc.y;
      addCheckbox(70, docY4, data.documentation?.includes('integration_plan'));
      doc.fontSize(10).fillColor('#333333').text('Integration and implementation plan', 88, docY4);
      doc.moveDown(0.5);

      const docY5 = doc.y;
      addCheckbox(70, docY5, data.documentation?.includes('business_case'));
      doc.fontSize(10).fillColor('#333333').text('Business case or ROI analysis', 88, docY5);
      doc.moveDown(1.5);

      if (data.additionalNotes) {
        doc.fontSize(11).fillColor('#000000').text('Additional Notes:', { bold: true });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#333333').text(data.additionalNotes, { indent: 20, align: 'left' });
        doc.moveDown(1.5);
      }

      // Signature section
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#CCCCCC');
      doc.moveDown(1);

      doc.fontSize(12).fillColor(primaryBlue).text('ITAC Committee Review', { bold: true });
      doc.moveDown(1);

      doc.fontSize(10).fillColor('#000000');
      doc.text('Reviewed By: _________________________________    Date: _________________');
      doc.moveDown(0.8);
      doc.text('Decision:      ☐ Approved      ☐ Denied      ☐ Requires Additional Information');
      doc.moveDown(1);
      doc.text('Comments:');
      doc.moveDown(0.5);
      doc.moveTo(70, doc.y).lineTo(545, doc.y).stroke('#CCCCCC');
      doc.moveDown(0.5);
      doc.moveTo(70, doc.y).lineTo(545, doc.y).stroke('#CCCCCC');
      doc.moveDown(0.5);
      doc.moveTo(70, doc.y).lineTo(545, doc.y).stroke('#CCCCCC');

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#999999');
        doc.text(
          `ITAC Review Form - Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
        doc.text(
          `Generated: ${new Date().toLocaleDateString()} | Forvis Mazars Confidential`,
          50,
          doc.page.height - 20,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate ITAC Review PDF Buffer (for downloads)
 * @param {Object} data - Form data for ITAC review
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateITACReviewPDFBuffer(data) {
  return generateITACReviewPDF(data, null);
}
