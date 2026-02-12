import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function UserDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFullDetailModal, setShowFullDetailModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assessmentTypes, setAssessmentTypes] = useState([]);

  // Logout handler
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      if (onLogout) {
        onLogout();
      }
      navigate('/');
    }
  };

  // Load dashboard data (stats only on initial load)
  const loadDashboardData = async (loadStatsOnly = false) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Loading dashboard for user:', user);
      const userId = user?.id || user?.leadId || user?.userId;
      console.log('📊 Using user ID:', userId);
      
      if (!userId) {
        throw new Error('User ID not found in user object');
      }

      // Get dashboard statistics from user engagement endpoint
      console.log('📊 Fetching stats from:', `/api/user-engagement/dashboard/${userId}`);
      const statsResponse = await api.get(`/api/user-engagement/dashboard/${userId}`);
      console.log('📊 Stats response:', statsResponse.data);
      setDashboardStats(statsResponse.data.data || {
        totalAssessments: 0,
        averageScore: 0,
        lastAssessmentDate: null,
        completionRate: 100,
        daysSinceLastAssessment: null
      });

      if (!loadStatsOnly) {
        // Get assessment history
        await loadAssessmentHistory(1, 'all');
      }

    } catch (err) {
      console.error('❌ Dashboard Error:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      const errorMsg = err.response?.data?.message || err.message;
      setError(`Failed to load dashboard data: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Load only assessment history (for filtering/pagination)
  const loadAssessmentHistory = async (page = 1, filter = 'all') => {
    try {
      setHistoryLoading(true);
      const userId = user?.id || user?.leadId || user?.userId;
      
      console.log('📊 Fetching history from:', `/api/assessments/user/${userId}/history`);
      const historyResponse = await api.get(`/api/assessments/user/${userId}/history`, {
        params: { 
          page, 
          limit: 10,
          filter: filter !== 'all' ? filter : undefined
        }
      });
      
      console.log('📊 History response:', historyResponse.data);
      setAssessmentHistory(historyResponse.data.assessments || []);
      setPagination(historyResponse.data.pagination);

    } catch (err) {
      console.error('❌ History Error:', err);
      setError('Failed to load assessment history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load specific assessment details
  const loadAssessmentDetail = async (assessmentId) => {
    try {
      console.log('🔍 Loading assessment details for ID:', assessmentId);
      const response = await api.get(`/api/assessments/${assessmentId}?_=${Date.now()}`);
      console.log('📊 Assessment details loaded:', response.data);
      
      if (response.data.success) {
        setSelectedAssessment(response.data.data);
        setShowDetailModal(true);
      } else {
        setError('Failed to load assessment details.');
      }
    } catch (err) {
      console.error('❌ Error loading assessment details:', err);
      console.error('❌ Error response:', err.response?.data);
      setError('Failed to load assessment details: ' + (err.response?.data?.message || err.message));
    }
  };

  // Event handlers
  const handleFilterChange = (newFilter) => {
    setFilterType(newFilter);
    loadAssessmentHistory(1, newFilter);
  };

  const handlePageChange = (page) => {
    loadAssessmentHistory(page, filterType);
  };

  // Utility functions
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    return 'score-needs-focus';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Focus';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return '↑';
    if (trend < 0) return '↓';
    return '→';
  };

  const capitalizeAssessmentType = (type) => {
    if (!type) return '';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  // Export assessment as PDF
  const handleExportPDF = async (assessmentId, contactName) => {
    try {
      console.log('🔄 Exporting PDF for assessment:', assessmentId);
      console.log('📍 Using contact name:', contactName);
      console.log('📍 Full URL:', `/api/lead/assessments/${assessmentId}/export-pdf`);
      
      const response = await api.get(`/api/lead/assessments/${assessmentId}/export-pdf`, {
        responseType: 'blob'
      });

      console.log('📥 PDF response received:', response);
      console.log('📥 Response data type:', response.data.type);
      console.log('📥 Response data size:', response.data.size);

      // Check if response is an error (JSON instead of blob)
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to generate PDF');
      }

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SAFE-8_Assessment_${contactName.replace(/\s+/g, '_')}_${assessmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ PDF downloaded successfully');
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to export PDF';
      alert(`Failed to export PDF: ${errorMessage}\n\nCheck browser console for details.`);
    }
  };

  // Load assessment types for filters
  useEffect(() => {
    const fetchAssessmentTypes = async () => {
      try {
        const response = await api.get('/api/questions/assessment-types-config');
        if (response.data && response.data.configs) {
          setAssessmentTypes(response.data.configs);
        }
      } catch (err) {
        console.error('❌ Error fetching assessment types:', err);
      }
    };
    fetchAssessmentTypes();
  }, []);

  useEffect(() => {
    if (user && (user.id || user.leadId || user.userId)) {
      loadDashboardData(false);
    } else {
      console.error('❌ No valid user ID found in user object:', user);
      setError('Invalid user data. Please log in again.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <h2>Loading Dashboard...</h2>
          <p>Please wait while we load your data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={() => loadDashboardData(false)} className="btn-primary">
            <i className="fas fa-redo"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        
        {/* Back to Home Button */}
        <button onClick={() => navigate('/')} className="btn-back-home" style={{ marginBottom: '20px' }}>
          <i className="fas fa-arrow-left"></i> Back to Home
        </button>
        
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-text">
              <h1 className="dashboard-title">AI Readiness Dashboard</h1>
              <p className="dashboard-subtitle">Track your progress and view assessment history</p>
            </div>
            <div className="header-actions">
              <button onClick={() => navigate('/')} className="btn-primary">
                <i className="fas fa-plus"></i> New Assessment
              </button>
              <button onClick={handleLogout} className="btn-logout">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>
          
          {/* User Info Banner */}
          <div className="user-info-banner">
            <div className="user-info-item">
              <h3>Welcome back!</h3>
              <p className="user-name">{user.contactName || user.contact_name || user.email}</p>
              <p className="user-company">{user.companyName || user.company_name}</p>
            </div>
            <div className="user-info-item">
              <h4>Industry</h4>
              <p>{user.industry || 'Technology'}</p>
            </div>
            <div className="user-info-item">
              <h4>Member Since</h4>
              <p>{formatDate(user.createdAt || user.created_at || new Date())}</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {dashboardStats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Assessments</div>
                <div className="stat-value">{dashboardStats.totalAssessments || 0}</div>
                <div className="stat-note">Lifetime completed</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-green">
                <i className="fas fa-target"></i>
              </div>
              <div className="stat-content">
                <div className="stat-label">Average Score</div>
                <div className="stat-value">{Math.round(dashboardStats.averageScore || 0)}%</div>
                <div className="stat-note">Across all assessments</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-yellow">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-content">
                <div className="stat-label">Recent Activity</div>
                <div className="stat-value">
                  {dashboardStats.daysSinceLastAssessment !== null && dashboardStats.daysSinceLastAssessment !== undefined
                    ? dashboardStats.daysSinceLastAssessment === 0 
                      ? 'Today'
                      : `${dashboardStats.daysSinceLastAssessment}d ago`
                    : 'N/A'
                  }
                </div>
                <div className="stat-note">Last assessment</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-blue">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-content">
                <div className="stat-label">Completion Rate</div>
                <div className="stat-value">{dashboardStats.completionRate || 100}%</div>
                <div className="stat-note">All completed</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="dashboard-controls">
          <h3 className="section-title">Assessment History</h3>
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All Assessments
            </button>
            {assessmentTypes.map((type) => (
              <button 
                key={type.type}
                className={`filter-tab ${filterType === type.type ? 'active' : ''}`}
                onClick={() => handleFilterChange(type.type)}
              >
                {type.title || type.type}
              </button>
            ))}
          </div>
        </div>

        {/* Assessment History Table */}
        <div className="assessment-history-section">
          {historyLoading ? (
            <div className="loading-state-mini">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading assessments...</p>
            </div>
          ) : assessmentHistory.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-inbox"></i>
              <h3>No Assessments Yet</h3>
              <p>Start your first assessment to track your AI readiness journey.</p>
              <button onClick={() => navigate('/')} className="btn-primary">
                <i className="fas fa-rocket"></i> Start Assessment
              </button>
            </div>
          ) : (
            <>
              <div className="assessment-table-wrapper">
                {/* Desktop Table View */}
                <table className="assessment-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Industry</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentHistory.map((assessment) => (
                      <tr key={assessment.id}>
                        <td>
                          <div className="date-cell">
                            <div className="date-primary">{assessment.formatted_date || formatDate(assessment.completed_at)}</div>
                            <div className="date-secondary">{assessment.time_ago}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`type-badge type-${assessment.assessment_type.toLowerCase()}`}>
                            {capitalizeAssessmentType(assessment.assessment_type)}
                          </span>
                        </td>
                        <td>{assessment.industry || 'N/A'}</td>
                        <td>
                          <div className="score-cell">
                            <span className={`score-badge ${getScoreColor(assessment.overall_score)}`}>
                              {assessment.overall_score}%
                            </span>
                            <span className="score-label">{getScoreLabel(assessment.overall_score)}</span>
                          </div>
                        </td>
                        <td>
                          <span className="status-badge status-completed">
                            <i className="fas fa-check-circle"></i> Completed
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn-view-details"
                              onClick={() => loadAssessmentDetail(assessment.id)}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i> View
                            </button>
                            <button 
                              className="btn-export-pdf"
                              onClick={() => handleExportPDF(assessment.id, user.contactName || user.contact_name || 'User')}
                              title="Export PDF"
                            >
                              <i className="fas fa-file-pdf"></i> Export
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Card View */}
                {assessmentHistory.map((assessment) => (
                  <div key={`mobile-${assessment.id}`} className="mobile-table-card">
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Date</span>
                      <span className="mobile-card-value">
                        <div>{assessment.formatted_date || formatDate(assessment.completed_at)}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{assessment.time_ago}</div>
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Type</span>
                      <span className="mobile-card-value">
                        <span className={`type-badge type-${assessment.assessment_type.toLowerCase()}`}>
                          {capitalizeAssessmentType(assessment.assessment_type)}
                        </span>
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Industry</span>
                      <span className="mobile-card-value">{assessment.industry || 'N/A'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Score</span>
                      <span className="mobile-card-value">
                        <span className={`score-badge ${getScoreColor(assessment.overall_score)}`}>
                          {assessment.overall_score}%
                        </span>
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Status</span>
                      <span className="mobile-card-value">
                        <span className="status-badge status-completed">
                          <i className="fas fa-check-circle"></i> Completed
                        </span>
                      </span>
                    </div>
                    <div className="mobile-card-actions">
                      <button 
                        className="btn-view-details"
                        onClick={() => loadAssessmentDetail(assessment.id)}
                      >
                        <i className="fas fa-eye"></i> View Details
                      </button>
                      <button 
                        className="btn-export-pdf"
                        onClick={() => handleExportPDF(assessment.id, user.contactName || user.contact_name || 'User')}
                      >
                        <i className="fas fa-file-pdf"></i> Export PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="pagination">
                  <button 
                    className="pagination-btn"
                    disabled={!pagination.has_prev}
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                  >
                    <i className="fas fa-chevron-left"></i> Previous
                  </button>
                  <span className="pagination-info">
                    Page {pagination.current_page} of {pagination.total_pages}
                  </span>
                  <button 
                    className="pagination-btn"
                    disabled={!pagination.has_next}
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                  >
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Modal - Full Assessment Results */}
        {showDetailModal && selectedAssessment && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content modal-results" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>Assessment Results</h2>
                  <p className="modal-subtitle">{capitalizeAssessmentType(selectedAssessment.assessment_type)} • {selectedAssessment.industry}</p>
                </div>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body modal-body-results">
                {/* Overall Score */}
                <div className="results-hero">
                  <div className="score-container">
                    <div className="score-label">Your AI Readiness Score</div>
                    <div className={`score-value score-${getScoreColor(selectedAssessment.overall_score)}`}>
                      {Math.round(selectedAssessment.overall_score)}%
                    </div>
                    <div className="score-category">
                      {selectedAssessment.insights?.score_category || getScoreLabel(selectedAssessment.overall_score)}
                    </div>
                  </div>
                </div>

                {/* Pillar Scores */}
                {selectedAssessment.dimension_scores && selectedAssessment.dimension_scores.length > 0 && (
                  <div className="pillars-section">
                    <h3>Pillar Breakdown</h3>
                    <div className="pillars-grid">
                      {selectedAssessment.dimension_scores.map((pillar, index) => (
                        <div key={index} className="pillar-card">
                          <div className="pillar-header">
                            <div className="pillar-name">{pillar.pillar_name || pillar.dimension_name}</div>
                            <div className={`pillar-score score-${getScoreColor(pillar.score)}`}>
                              {Math.round(pillar.score)}%
                            </div>
                          </div>
                          <div className="pillar-bar">
                            <div 
                              className={`pillar-bar-fill fill-${getScoreColor(pillar.score)}`}
                              style={{ width: `${pillar.score}%` }}
                            ></div>
                          </div>
                          <div className="pillar-label">{getScoreLabel(pillar.score)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assessment Info */}
                <div className="assessment-meta">
                  <div className="meta-grid">
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <div>
                        <div className="meta-label">Completed</div>
                        <div className="meta-value">{formatDate(selectedAssessment.completed_at)}</div>
                      </div>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-chart-line"></i>
                      <div>
                        <div className="meta-label">Assessment Type</div>
                        <div className="meta-value">{capitalizeAssessmentType(selectedAssessment.assessment_type)}</div>
                      </div>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-industry"></i>
                      <div>
                        <div className="meta-label">Industry</div>
                        <div className="meta-value">{selectedAssessment.industry}</div>
                      </div>
                    </div>
                    {selectedAssessment.responses && (
                      <div className="meta-item">
                        <i className="fas fa-check-circle"></i>
                        <div>
                          <div className="meta-label">Questions</div>
                          <div className="meta-value">{Object.keys(selectedAssessment.responses).length} answered</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Insights */}
                {selectedAssessment.insights && (
                  <div className="insights-section">
                    <h3>Key Insights</h3>
                    <div className="insights-grid">
                      <div className="insight-card">
                        <div className="insight-icon">
                          <i className="fas fa-trophy"></i>
                        </div>
                        <div className="insight-content">
                          <div className="insight-title">Maturity Level</div>
                          <div className="insight-value">{selectedAssessment.insights.score_category || 'N/A'}</div>
                        </div>
                      </div>
                      {selectedAssessment.insights.completion_time_ms && (
                        <div className="insight-card">
                          <div className="insight-icon">
                            <i className="fas fa-clock"></i>
                          </div>
                          <div className="insight-content">
                            <div className="insight-title">Time to Complete</div>
                            <div className="insight-value">
                              {Math.round(selectedAssessment.insights.completion_time_ms / 60000)} min
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Gap Analysis - Areas to Improve */}
                {selectedAssessment.insights?.gap_analysis && selectedAssessment.insights.gap_analysis.length > 0 && (
                  <div className="gaps-section">
                    <div className="section-header">
                      <h3><i className="fas fa-exclamation-triangle"></i> Areas for Improvement</h3>
                    </div>
                    <div className="gaps-grid">
                      {selectedAssessment.insights.gap_analysis.map((gap, index) => (
                        <div key={index} className="gap-card">
                          <div className="gap-header">
                            <h4>{gap.area || gap.dimension}</h4>
                            <span className={`gap-badge gap-${gap.severity?.toLowerCase() || 'medium'}`}>
                              {gap.severity || 'Medium'} Priority
                            </span>
                          </div>
                          <p className="gap-description">
                            {gap.description || gap.recommendation}
                          </p>
                          {gap.current_state && (
                            <div className="gap-detail">
                              <strong>Current:</strong> {gap.current_state}
                            </div>
                          )}
                          {gap.target_state && (
                            <div className="gap-detail">
                              <strong>Target:</strong> {gap.target_state}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service Recommendations */}
                {selectedAssessment.insights?.service_recommendations && selectedAssessment.insights.service_recommendations.length > 0 ? (
                  <div className="recommendations-section">
                    <div className="section-header">
                      <h3><i className="fas fa-lightbulb"></i> Recommended Services & Solutions</h3>
                    </div>
                    <div className="services-grid">
                      {selectedAssessment.insights.service_recommendations.map((service, index) => (
                        <div key={index} className={`service-card service-${service.priority?.toLowerCase() || 'medium'}`}>
                          <div className="service-icon">
                            <i className={service.icon || 'fas fa-cog'}></i>
                          </div>
                          <div className="service-content">
                            <h4 className="service-title">{service.service_name || service.name}</h4>
                            {service.relevance_score && (
                              <span className="service-badge">
                                <i className="fas fa-star"></i>
                                {service.relevance_score}% match
                              </span>
                            )}
                            <p className="service-description">
                              {service.description || service.recommendation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="recommendations-section">
                    <div className="section-header">
                      <h3><i className="fas fa-lightbulb"></i> Recommended Services & Solutions</h3>
                    </div>
                    <div className="services-grid">
                      <div className="service-card service-high">
                        <div className="service-icon">
                          <i className="fas fa-lightbulb"></i>
                        </div>
                        <div className="service-content">
                          <h4 className="service-title">AI Strategy & Roadmap Development</h4>
                          <span className="service-badge">
                            <i className="fas fa-star"></i>
                            Recommended for scores below 60%
                          </span>
                          <p className="service-description">
                            Develop a comprehensive AI strategy aligned with business objectives and create a prioritized implementation roadmap.
                          </p>
                        </div>
                      </div>

                      <div className="service-card service-high">
                        <div className="service-icon">
                          <i className="fas fa-database"></i>
                        </div>
                        <div className="service-content">
                          <h4 className="service-title">Data Foundation & Governance</h4>
                          <span className="service-badge">
                            <i className="fas fa-star"></i>
                            Essential for AI success
                          </span>
                          <p className="service-description">
                            Establish robust data governance frameworks and improve data quality to support AI initiatives.
                          </p>
                        </div>
                      </div>

                      <div className="service-card service-medium">
                        <div className="service-icon">
                          <i className="fas fa-users"></i>
                        </div>
                        <div className="service-content">
                          <h4 className="service-title">AI Talent & Capability Building</h4>
                          <span className="service-badge">
                            <i className="fas fa-check-circle"></i>
                            Long-term competitive advantage
                          </span>
                          <p className="service-description">
                            Build internal AI capabilities through training programs and strategic hiring recommendations.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button className="btn-primary" onClick={() => {
                  setShowDetailModal(false);
                  setShowFullDetailModal(true);
                }}>
                  <i className="fas fa-eye"></i> View Full Details
                </button>
                <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                  <i className="fas fa-times"></i> Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full Assessment Detail Modal */}
        {showFullDetailModal && selectedAssessment && ReactDOM.createPortal(
          <AssessmentDetailModal
            assessment={selectedAssessment}
            onClose={() => {
              setShowFullDetailModal(false);
            }}
          />,
          document.body
        )}

      </div>
    </div>
  );
}

// ========== Assessment Detail Modal Component ==========
const AssessmentDetailModal = ({ assessment, onClose }) => {
  const dimensionScores = assessment.dimension_scores ? 
    (typeof assessment.dimension_scores === 'string' ? JSON.parse(assessment.dimension_scores) : assessment.dimension_scores) 
    : [];
  const insights = assessment.insights ? 
    (typeof assessment.insights === 'string' ? JSON.parse(assessment.insights) : assessment.insights)
    : {};
  const responses = assessment.responses ? 
    (typeof assessment.responses === 'string' ? JSON.parse(assessment.responses) : assessment.responses)
    : {};

  // Debug logging
  console.log('🔍 Assessment Detail Modal Data:', {
    assessmentId: assessment.id,
    dimensionScoresCount: dimensionScores.length,
    dimensionScores: dimensionScores,
    insights: insights,
    hasGapAnalysis: insights.gap_analysis?.length > 0,
    hasRecommendations: insights.service_recommendations?.length > 0,
    responsesCount: Object.keys(responses).length
  });

  const getScoreCategory = (score) => {
    if (score >= 80) return { label: 'AI Leader', color: '#28a745' };
    if (score >= 60) return { label: 'AI Adopter', color: '#ffc107' };
    if (score >= 40) return { label: 'AI Explorer', color: '#fd7e14' };
    return { label: 'AI Starter', color: '#dc3545' };
  };

  const category = getScoreCategory(assessment.overall_score);

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content admin-modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>
            <i className="fas fa-chart-bar"></i> Assessment Details
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="admin-modal-body">
          {/* Assessment Meta Information */}
          <div className="assessment-detail-meta">
            <div className="meta-row">
              <div className="meta-item">
                <strong><i className="fas fa-clipboard-list"></i> Type:</strong>
                <span className={`type-badge type-${assessment.assessment_type.toLowerCase()}`}>
                  {assessment.assessment_type}
                </span>
              </div>
              <div className="meta-item">
                <strong><i className="fas fa-building"></i> Industry:</strong> {assessment.industry || 'N/A'}
              </div>
            </div>
            <div className="meta-row">
              <div className="meta-item">
                <strong><i className="fas fa-calendar"></i> Completed:</strong> 
                {new Date(assessment.completed_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="meta-item">
                <strong><i className="fas fa-trophy"></i> Category:</strong>
                <span style={{ 
                  color: category.color, 
                  fontWeight: 'bold',
                  padding: '4px 12px',
                  background: `${category.color}20`,
                  borderRadius: '12px',
                  fontSize: '14px'
                }}>
                  {category.label}
                </span>
              </div>
            </div>
          </div>

          {/* Overall Score Card */}
          <div className="assessment-score-card" style={{
            background: `linear-gradient(135deg, ${category.color}15 0%, ${category.color}05 100%)`,
            border: `2px solid ${category.color}`,
            borderRadius: '16px',
            padding: '30px',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '18px' }}>Overall Score</h3>
            <div style={{ 
              fontSize: '64px', 
              fontWeight: 'bold', 
              color: category.color,
              lineHeight: '1',
              marginBottom: '10px'
            }}>
              {assessment.overall_score?.toFixed(1)}%
            </div>
            <div style={{
              fontSize: '16px',
              color: '#666',
              marginTop: '10px'
            }}>
              {assessment.overall_score >= 80 ? 'Excellent Performance!' :
               assessment.overall_score >= 60 ? 'Good Progress!' :
               assessment.overall_score >= 40 ? 'Keep Improving!' : 'Start Your Journey!'}
            </div>
          </div>

          {/* Pillar Scores */}
          {dimensionScores.length > 0 ? (
            <div className="assessment-pillars" style={{ marginBottom: '30px' }}>
              <h3 style={{ 
                color: '#00539F', 
                marginBottom: '20px',
                fontSize: '20px',
                borderBottom: '2px solid #00539F',
                paddingBottom: '10px'
              }}>
                <i className="fas fa-chart-pie"></i> Pillar Performance Breakdown
              </h3>
              <div className="pillars-grid">
                {dimensionScores.map((pillar, idx) => {
                  const pillarCategory = getScoreCategory(pillar.score);
                  return (
                    <div key={idx} className="pillar-card" style={{
                      border: `2px solid ${pillarCategory.color}30`,
                      borderRadius: '12px',
                      padding: '20px',
                      background: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div className="pillar-header" style={{ marginBottom: '15px' }}>
                        <div className="pillar-name" style={{ 
                          fontWeight: '600', 
                          fontSize: '16px',
                          color: '#333',
                          marginBottom: '8px'
                        }}>
                          {pillar.pillar_name}
                        </div>
                        <div className="pillar-short" style={{
                          fontSize: '12px',
                          color: '#666',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {pillar.pillar_short_name}
                        </div>
                      </div>
                      <div className="pillar-score" style={{
                        fontSize: '36px',
                        fontWeight: 'bold',
                        color: pillarCategory.color,
                        marginBottom: '10px'
                      }}>
                        {pillar.score?.toFixed(1)}%
                      </div>
                      <div className="pillar-bar" style={{
                        background: '#f0f0f0',
                        height: '12px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        marginBottom: '8px'
                      }}>
                        <div
                          className="pillar-bar-fill"
                          style={{ 
                            width: `${pillar.score}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${pillarCategory.color}, ${pillarCategory.color}dd)`,
                            borderRadius: '6px',
                            transition: 'width 0.5s ease'
                          }}
                        ></div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                        {pillar.score >= 80 ? '🌟 Excellent' :
                         pillar.score >= 60 ? '✅ Good' :
                         pillar.score >= 40 ? '📈 Improving' : '🎯 Needs Focus'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="assessment-pillars" style={{ marginBottom: '30px' }}>
              <h3 style={{ 
                color: '#00539F', 
                marginBottom: '20px',
                fontSize: '20px',
                borderBottom: '2px solid #00539F',
                paddingBottom: '10px'
              }}>
                <i className="fas fa-chart-pie"></i> Pillar Performance Breakdown
              </h3>
              <div style={{
                background: '#f0f8ff',
                border: '1px solid #00539F30',
                borderRadius: '12px',
                padding: '30px',
                textAlign: 'center',
                color: '#666'
              }}>
                <i className="fas fa-info-circle" style={{ fontSize: '48px', color: '#00539F', marginBottom: '15px' }}></i>
                <p style={{ fontSize: '16px', margin: '0' }}>
                  Pillar breakdown not available for this assessment. This data is captured in newer assessments for more detailed insights.
                </p>
              </div>
            </div>
          )}

          {/* Gap Analysis */}
          {insights.gap_analysis && insights.gap_analysis.length > 0 ? (
            <div className="assessment-gaps" style={{ marginBottom: '30px' }}>
              <h3 style={{
                color: '#E31B23',
                marginBottom: '15px',
                fontSize: '20px',
                borderBottom: '2px solid #E31B23',
                paddingBottom: '10px'
              }}>
                <i className="fas fa-exclamation-triangle"></i> Areas for Improvement
              </h3>
              <div style={{
                background: '#fff5f5',
                border: '1px solid #E31B2330',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', lineHeight: '1.8' }}>
                  {insights.gap_analysis.map((gap, idx) => (
                    <li key={idx} style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#E31B23' }}>•</strong> {gap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="assessment-gaps" style={{ marginBottom: '30px' }}>
              <h3 style={{
                color: '#E31B23',
                marginBottom: '15px',
                fontSize: '20px',
                borderBottom: '2px solid #E31B23',
                paddingBottom: '10px'
              }}>
                <i className="fas fa-exclamation-triangle"></i> Areas for Improvement
              </h3>
              <div style={{
                background: '#fff5f5',
                border: '1px solid #E31B2330',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                color: '#999'
              }}>
                <p>Detailed analysis not available for this assessment. Please complete a new assessment to receive comprehensive insights.</p>
              </div>
            </div>
          )}

          {/* Service Recommendations */}
          {insights.service_recommendations && insights.service_recommendations.length > 0 ? (
            <div className="assessment-recommendations" style={{ marginBottom: '30px' }}>
              <h3 style={{
                color: '#F7941D',
                marginBottom: '15px',
                fontSize: '20px',
                borderBottom: '2px solid #F7941D',
                paddingBottom: '10px'
              }}>
                <i className="fas fa-lightbulb"></i> Recommended Services & Next Steps
              </h3>
              <div style={{
                background: '#fffbf0',
                border: '1px solid #F7941D30',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', lineHeight: '1.8' }}>
                  {insights.service_recommendations.map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#F7941D' }}>💡</strong> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="assessment-recommendations" style={{ marginBottom: '30px' }}>
              <h3 style={{
                color: '#F7941D',
                marginBottom: '15px',
                fontSize: '20px',
                borderBottom: '2px solid #F7941D',
                paddingBottom: '10px'
              }}>
                <i className="fas fa-lightbulb"></i> Recommended Services & Next Steps
              </h3>
              <div style={{
                background: '#fffbf0',
                border: '1px solid #F7941D30',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                color: '#999'
              }}>
                <p>Personalized recommendations not available for this assessment. Please complete a new assessment to receive tailored advice.</p>
              </div>
            </div>
          )}

          {/* Additional Metadata */}
          {insights.metadata && (
            <div className="assessment-metadata" style={{
              background: '#f8f9fa',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '20px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#666', fontSize: '16px' }}>
                <i className="fas fa-info-circle"></i> Additional Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {insights.completion_time_ms && (
                  <div>
                    <strong style={{ color: '#888', fontSize: '13px' }}>Completion Time:</strong>
                    <div style={{ color: '#333', fontSize: '16px' }}>
                      {(insights.completion_time_ms / 60000).toFixed(1)} minutes
                    </div>
                  </div>
                )}
                {Object.keys(responses).length > 0 && (
                  <div>
                    <strong style={{ color: '#888', fontSize: '13px' }}>Total Responses:</strong>
                    <div style={{ color: '#333', fontSize: '16px' }}>
                      {Object.keys(responses).length} questions answered
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-primary">
            <i className="fas fa-check"></i> Close
          </button>
        </div>
      </div>
    </div>
  );
};



export default UserDashboard;
