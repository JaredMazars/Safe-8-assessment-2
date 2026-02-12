// import { useState } from 'react';
// import api from '../services/api';
// import './ITACReviewForm.css';

// const ITACReviewForm = ({ onClose }) => {
//   const [formData, setFormData] = useState({
//     toolName: '',
//     vendor: '',
//     useCase: '',
//     department: '',
//     requestedBy: '',
//     requestDate: new Date().toISOString().split('T')[0],
//     outOfScope: [],
//     outOfScopeExplanation: '',
//     security: {
//       dataSensitivity: false,
//       vendorAssessment: false,
//       legalReview: false,
//       dataPrivacy: false
//     },
//     securityExplanation: '',
//     dueDiligence: {
//       integration: false,
//       scalability: false,
//       support: false,
//       redundancy: false
//     },
//     dueDiligenceExplanation: '',
//     performance: {
//       testing: false,
//       benchmarks: false,
//       monitoring: false
//     },
//     performanceExplanation: '',
//     documentation: [],
//     additionalNotes: ''
//   });

//   const [loading, setLoading] = useState(false);

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const handleCheckboxChange = (section, field) => {
//     if (Array.isArray(formData[section])) {
//       setFormData(prev => ({
//         ...prev,
//         [section]: prev[section].includes(field)
//           ? prev[section].filter(item => item !== field)
//           : [...prev[section], field]
//       }));
//     } else {
//       setFormData(prev => ({
//         ...prev,
//         [section]: {
//           ...prev[section],
//           [field]: !prev[section][field]
//         }
//       }));
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       const response = await api.post('/admin/itac-review/generate-pdf', formData, {
//         responseType: 'blob'
//       });

//       const blob = new Blob([response.data], { type: 'application/pdf' });
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = `ITAC_Review_${formData.toolName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);

//       alert('ITAC Review PDF generated successfully!');
//       if (onClose) onClose();
//     } catch (error) {
//       console.error('Error generating PDF:', error);
//       alert('Error generating PDF. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="itac-modal-overlay">
//       <div className="itac-modal-container">
//         <div className="itac-modal-header">
//           <h2>ITAC Review Form</h2>
//           <button onClick={onClose} className="itac-close-btn">&times;</button>
//         </div>

//         <form onSubmit={handleSubmit} className="itac-form">
//           <div className="itac-section">
//             <h3>1. Tool/Platform Details</h3>
//             <div className="form-group">
//               <label>Tool/Platform Name *</label>
//               <input
//                 type="text"
//                 name="toolName"
//                 value={formData.toolName}
//                 onChange={handleInputChange}
//                 required
//               />
//             </div>
//             <div className="form-group">
//               <label>Vendor</label>
//               <input
//                 type="text"
//                 name="vendor"
//                 value={formData.vendor}
//                 onChange={handleInputChange}
//               />
//             </div>
//             <div className="form-group">
//               <label>Proposed Use Case</label>
//               <textarea
//                 name="useCase"
//                 value={formData.useCase}
//                 onChange={handleInputChange}
//                 rows="3"
//               />
//             </div>
//             <div className="form-row">
//               <div className="form-group">
//                 <label>Department/Team</label>
//                 <input
//                   type="text"
//                   name="department"
//                   value={formData.department}
//                   onChange={handleInputChange}
//                 />
//               </div>
//               <div className="form-group">
//                 <label>Requested By</label>
//                 <input
//                   type="text"
//                   name="requestedBy"
//                   value={formData.requestedBy}
//                   onChange={handleInputChange}
//                 />
//               </div>
//             </div>
//             <div className="form-group">
//               <label>Date of Request</label>
//               <input
//                 type="date"
//                 name="requestDate"
//                 value={formData.requestDate}
//                 onChange={handleInputChange}
//               />
//             </div>
//           </div>

//           <div className="itac-section">
//             <h3>2. Items Out-of-Scope</h3>
//             <div className="checkbox-group">
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.outOfScope.includes('existing')}
//                   onChange={() => handleCheckboxChange('outOfScope', 'existing')}
//                 />
//                 Use of existing approved platforms
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.outOfScope.includes('internal')}
//                   onChange={() => handleCheckboxChange('outOfScope', 'internal')}
//                 />
//                 Internal development tools already in use
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.outOfScope.includes('minor')}
//                   onChange={() => handleCheckboxChange('outOfScope', 'minor')}
//                 />
//                 Minor updates to approved tools
//               </label>
//             </div>
//             <div className="form-group">
//               <label>Additional Explanation</label>
//               <textarea
//                 name="outOfScopeExplanation"
//                 value={formData.outOfScopeExplanation}
//                 onChange={handleInputChange}
//                 rows="3"
//               />
//             </div>
//           </div>

//           <div className="itac-section">
//             <h3>3. Security, Legal, and Compliance</h3>
//             <div className="checkbox-group">
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.security.dataSensitivity}
//                   onChange={() => handleCheckboxChange('security', 'dataSensitivity')}
//                 />
//                 Does the tool handle sensitive client or firm data?
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.security.vendorAssessment}
//                   onChange={() => handleCheckboxChange('security', 'vendorAssessment')}
//                 />
//                 Has a vendor security assessment been completed?
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.security.legalReview}
//                   onChange={() => handleCheckboxChange('security', 'legalReview')}
//                 />
//                 Has Legal reviewed the vendor contract and terms?
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.security.dataPrivacy}
//                   onChange={() => handleCheckboxChange('security', 'dataPrivacy')}
//                 />
//                 Does the tool comply with data privacy regulations?
//               </label>
//             </div>
//             <div className="form-group">
//               <label>Security & Compliance Notes</label>
//               <textarea
//                 name="securityExplanation"
//                 value={formData.securityExplanation}
//                 onChange={handleInputChange}
//                 rows="3"
//               />
//             </div>
//           </div>

//           <div className="itac-section">
//             <h3>4. IT Due Diligence</h3>
//             <div className="checkbox-group">
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.dueDiligence.integration}
//                   onChange={() => handleCheckboxChange('dueDiligence', 'integration')}
//                 />
//                 Can the tool integrate with existing firm systems?
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.dueDiligence.scalability}
//                   onChange={() => handleCheckboxChange('dueDiligence', 'scalability')}
//                 />
//                 Is the solution scalable for future growth?
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.dueDiligence.support}
//                   onChange={() => handleCheckboxChange('dueDiligence', 'support')}
//                 />
//                 Does the vendor provide adequate support and SLAs?
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.dueDiligence.redundancy}
//                   onChange={() => handleCheckboxChange('dueDiligence', 'redundancy')}
//                 />
//                 Is there redundancy or overlap with existing tools?
//               </label>
//             </div>
//             <div className="form-group">
//               <label>IT Due Diligence Notes</label>
//               <textarea
//                 name="dueDiligenceExplanation"
//                 value={formData.dueDiligenceExplanation}
//                 onChange={handleInputChange}
//                 rows="3"
//               />
//             </div>
//           </div>

//           <div className="itac-section">
//             <h3>5. Tool Accuracy and Performance</h3>
//             <div className="checkbox-group">
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.performance.testing}
//                   onChange={() => handleCheckboxChange('performance', 'testing')}
//                 />
//                 Has the tool been tested for accuracy?
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.performance.benchmarks}
//                   onChange={() => handleCheckboxChange('performance', 'benchmarks')}
//                 />
//                 Are performance benchmarks documented?
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.performance.monitoring}
//                   onChange={() => handleCheckboxChange('performance', 'monitoring')}
//                 />
//                 Is there a plan for ongoing monitoring?
//               </label>
//             </div>
//             <div className="form-group">
//               <label>Performance Notes</label>
//               <textarea
//                 name="performanceExplanation"
//                 value={formData.performanceExplanation}
//                 onChange={handleInputChange}
//                 rows="3"
//               />
//             </div>
//           </div>

//           <div className="itac-section">
//             <h3>6. Supporting Documentation</h3>
//             <div className="checkbox-group">
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.documentation.includes('vendor_proposal')}
//                   onChange={() => handleCheckboxChange('documentation', 'vendor_proposal')}
//                 />
//                 Vendor proposal and product documentation
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.documentation.includes('security_assessment')}
//                   onChange={() => handleCheckboxChange('documentation', 'security_assessment')}
//                 />
//                 Security and privacy assessment results
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.documentation.includes('contract')}
//                   onChange={() => handleCheckboxChange('documentation', 'contract')}
//                 />
//                 Draft or executed contract
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.documentation.includes('integration_plan')}
//                   onChange={() => handleCheckboxChange('documentation', 'integration_plan')}
//                 />
//                 Integration and implementation plan
//               </label>
//               <label>
//                 <input
//                   type="checkbox"
//                   checked={formData.documentation.includes('business_case')}
//                   onChange={() => handleCheckboxChange('documentation', 'business_case')}
//                 />
//                 Business case or ROI analysis
//               </label>
//             </div>
//             <div className="form-group">
//               <label>Additional Notes</label>
//               <textarea
//                 name="additionalNotes"
//                 value={formData.additionalNotes}
//                 onChange={handleInputChange}
//                 rows="4"
//               />
//             </div>
//           </div>

//           <div className="itac-form-actions">
//             <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
//               Cancel
//             </button>
//             <button type="submit" className="btn-generate" disabled={loading}>
//               {loading ? 'Generating...' : 'Generate PDF'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default ITACReviewForm;
