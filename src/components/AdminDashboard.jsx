import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { COMPANY_SIZES, COUNTRIES } from '../config/api';
import { COUNTRY_CODES, validatePhoneNumber, formatPhoneNumber, parsePhoneNumber } from '../config/countryCodes';
// import ITACReviewForm from './ITACReviewForm';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  // Dashboard Stats
  const [stats, setStats] = useState(null);

  // Users Tab
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalMode, setUserModalMode] = useState('create'); // 'create' or 'edit'
  const [showUserAssessmentsModal, setShowUserAssessmentsModal] = useState(false);
  const [userAssessments, setUserAssessments] = useState([]);
  const [userAssessmentsLoading, setUserAssessmentsLoading] = useState(false);

  // Questions Tab
  const [questions, setQuestions] = useState([]);
  const [questionsPagination, setQuestionsPagination] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionTypeFilter, setQuestionTypeFilter] = useState('all');
  const [questionPillarFilter, setQuestionPillarFilter] = useState('all');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionModalMode, setQuestionModalMode] = useState('create');
  const [draggedQuestion, setDraggedQuestion] = useState(null);

  // Assessments Tab
  const [assessments, setAssessments] = useState([]);
  const [assessmentsPagination, setAssessmentsPagination] = useState(null);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState('all');
  const [assessmentSearchTerm, setAssessmentSearchTerm] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  // Activity Log Tab
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityPagination, setActivityPagination] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityActionFilter, setActivityActionFilter] = useState('all');
  const [activityEntityFilter, setActivityEntityFilter] = useState('all');

  // Configuration Tab
  const [configLoading, setConfigLoading] = useState(false);
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [newAssessmentType, setNewAssessmentType] = useState('');
  const [newAssessmentDescription, setNewAssessmentDescription] = useState('');
  const [newAssessmentTitle, setNewAssessmentTitle] = useState('');
  const [newAssessmentDuration, setNewAssessmentDuration] = useState('');
  const [newAssessmentIcon, setNewAssessmentIcon] = useState('fas fa-clipboard-check');
  const [newAssessmentFeatures, setNewAssessmentFeatures] = useState('');
  const [newAssessmentAudience, setNewAssessmentAudience] = useState('');
  const [newAssessmentAudienceColor, setNewAssessmentAudienceColor] = useState('blue');
  const [newIndustry, setNewIndustry] = useState('');
  const [editingIndustry, setEditingIndustry] = useState(null);
  const [editingAssessmentType, setEditingAssessmentType] = useState(null);
  const [pillars, setPillars] = useState([]);
  const [newPillar, setNewPillar] = useState({ name: '', short_name: '' });
  const [editingPillar, setEditingPillar] = useState(null);
  const [editingPillarData, setEditingPillarData] = useState({ name: '', short_name: '' });

  // Manage Admins Tab (Super Admin only)
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminModalMode, setAdminModalMode] = useState('create');

  // ITAC Review Form
  // const [showITACReviewForm, setShowITACReviewForm] = useState(false);

  const ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'ASSESSMENT_START', 'ASSESSMENT_COMPLETE', 'ASSESSMENT_UPDATE'];
  const ENTITY_TYPES = ['admin', 'user', 'question', 'assessment'];

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      navigate('/admin/login');
      return;
    }
    setAdminUser(JSON.parse(adminData));
    loadDashboardStats();
    // Load configuration data for dropdowns
    loadConfiguration();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers(1);
    } else if (activeTab === 'questions') {
      loadQuestions(1);
      // Load config data for question modal dropdowns
      if (assessmentTypes.length === 0 || pillars.length === 0) {
        loadConfiguration();
      }
    } else if (activeTab === 'assessments') {
      loadAssessments(1);
    } else if (activeTab === 'activity') {
      loadActivityLogs(1);
    } else if (activeTab === 'config') {
      // Only load if config is empty (prevents repeated DB calls)
      if (assessmentTypes.length === 0 && industries.length === 0 && pillars.length === 0) {
        loadConfiguration();
      }
    } else if (activeTab === 'admins' && adminUser?.role === 'super_admin') {
      loadAdmins();
    }
  }, [activeTab, questionTypeFilter, questionPillarFilter, assessmentTypeFilter, activityActionFilter, activityEntityFilter]);

  // ========== Manage Admins (Super Admin Only) ==========
  const loadAdmins = async () => {
    try {
      console.log('🔄 Loading admins...');
      setAdminsLoading(true);
      const response = await api.get('/api/admin/admins');
      console.log('✅ Admins response:', response.data);
      console.log('📊 Admins array:', response.data.admins);
      setAdmins(response.data.admins || []);
    } catch (err) {
      console.error('❌ Error loading admins:', err);
      console.error('Error details:', err.response?.data);
      setError('Failed to load admins');
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleCreateAdmin = () => {
    setSelectedAdmin(null);
    setAdminModalMode('create');
    setShowAdminModal(true);
  };

  const handleEditAdmin = (admin) => {
    setSelectedAdmin(admin);
    setAdminModalMode('edit');
    setShowAdminModal(true);
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return;
    }

    try {
      await api.delete(`/api/admin/admins/${adminId}`);
      alert('Admin deleted successfully');
      loadAdmins();
    } catch (err) {
      console.error('Error deleting admin:', err);
      alert('Failed to delete admin: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleAdminStatus = async (adminId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this admin?`)) {
      return;
    }

    try {
      await api.patch(`/api/admin/admins/${adminId}/toggle-status`);
      alert(`Admin ${action}d successfully`);
      loadAdmins();
    } catch (err) {
      console.error('Error toggling admin status:', err);
      alert(`Failed to ${action} admin: ` + (err.response?.data?.message || err.message));
    }
  };

  // ========== Dashboard Stats ==========
  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/admin/dashboard/stats');
      // Handle both response formats: { stats: {...} } or direct stats object
      setStats(response.data.stats || response.data);
      console.log('📊 Dashboard stats loaded:', response.data.stats || response.data);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  // ========== Users Management ==========
  const loadUsers = async (page = 1) => {
    try {
      setUsersLoading(true);
      const response = await api.get('/api/admin/users', {
        params: {
          page,
          limit: 20,
          search: userSearchTerm || undefined
        }
      });
      // Filter out deleted users (those with deleted_ prefix in email)
      const activeUsers = (response.data.users || []).filter(user => 
        !user.email.startsWith('deleted_') && user.full_name !== 'DELETED USER'
      );
      setUsers(activeUsers);
      setUsersPagination(response.data.pagination);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setUserModalMode('create');
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserModalMode('edit');
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/admin/users/${userId}`);
      alert('User deleted successfully');
      loadUsers(usersPagination?.current_page || 1);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewUserAssessments = async (user) => {
    try {
      setSelectedUser(user);
      setUserAssessmentsLoading(true);
      setShowUserAssessmentsModal(true);
      
      console.log('🔍 Fetching assessments for user:', user.id, user.email);
      
      // Fetch user's assessments
      const response = await api.get('/api/admin/assessments', {
        params: {
          lead_id: user.id,
          limit: 100
        }
      });
      
      console.log('✅ User assessments response:', response.data);
      console.log('📊 Number of assessments:', response.data.assessments?.length || 0);
      
      setUserAssessments(response.data.assessments || []);
    } catch (err) {
      console.error('❌ Error loading user assessments:', err);
      alert('Failed to load assessments: ' + (err.response?.data?.message || err.message));
      setShowUserAssessmentsModal(false);
    } finally {
      setUserAssessmentsLoading(false);
    }
  };

  const handleUserSearch = (e) => {
    e.preventDefault();
    loadUsers(1);
  };

  // ========== Questions Management ==========
  const loadQuestions = async (page = 1) => {
    try {
      setQuestionsLoading(true);
      const response = await api.get('/api/admin/questions', {
        params: {
          page,
          limit: 20,
          assessment_type: questionTypeFilter !== 'all' ? questionTypeFilter : undefined,
          pillar_name: questionPillarFilter !== 'all' ? questionPillarFilter : undefined
          // No is_active filter - show all questions
        }
      });
      setQuestions(response.data.questions || []);
      setQuestionsPagination(response.data.pagination);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Failed to load questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleCreateQuestion = () => {
    setSelectedQuestion(null);
    setQuestionModalMode('create');
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question) => {
    setSelectedQuestion(question);
    setQuestionModalMode('edit');
    setShowQuestionModal(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This will soft-delete the question.')) {
      return;
    }

    try {
      await api.delete(`/api/admin/questions/${questionId}`);
      // Immediately remove from the list (soft delete = set is_active to 0)
      setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== questionId));
      alert('Question deleted successfully');
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Failed to delete question: ' + (err.response?.data?.message || err.message));
      // Reload on error to ensure consistency
      loadQuestions(questionsPagination?.current_page || 1);
    }
  };

  const handleReorderQuestion = async (questionId, direction) => {
    try {
      console.log('Reordering question:', questionId, 'direction:', direction);
      const response = await api.put(`/api/admin/questions/${questionId}/reorder`, { direction });
      if (response.data.success) {
        loadQuestions(questionsPagination?.current_page || 1);
      }
    } catch (err) {
      console.error('Error reordering question:', err);
      console.error('Error details:', err.response?.data);
      alert('Failed to reorder question: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDragStart = (e, question) => {
    setDraggedQuestion(question);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedQuestion(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetQuestion) => {
    e.preventDefault();
    
    if (!draggedQuestion || draggedQuestion.id === targetQuestion.id) {
      return;
    }

    // Only allow reordering within same assessment type and pillar
    if (draggedQuestion.assessment_type !== targetQuestion.assessment_type ||
        draggedQuestion.pillar_name !== targetQuestion.pillar_name) {
      alert('Questions can only be reordered within the same assessment type and pillar');
      return;
    }

    try {
      // Swap the order values
      await api.put(`/api/admin/questions/${draggedQuestion.id}/reorder`, {
        newOrder: targetQuestion.question_order
      });
      
      loadQuestions(questionsPagination?.current_page || 1);
    } catch (err) {
      console.error('Error reordering question:', err);
      alert('Failed to reorder question: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleQuestionStatus = async (questionId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this question?`)) {
      return;
    }

    try {
      const response = await api.patch(`/api/admin/questions/${questionId}/toggle-status`);
      // Update the question status in the list without reloading
      setQuestions(prevQuestions => 
        prevQuestions.map(q => 
          q.id === questionId 
            ? { ...q, is_active: response.data.is_active }
            : q
        )
      );
      alert(`Question ${action}d successfully`);
    } catch (err) {
      console.error('Error toggling question status:', err);
      alert(`Failed to ${action} question: ` + (err.response?.data?.message || err.message));
    }
  };

  // ========== Assessments Management ==========
  const loadAssessments = async (page = 1) => {
    try {
      setAssessmentsLoading(true);
      const response = await api.get('/api/admin/assessments', {
        params: {
          page,
          limit: 20,
          assessment_type: assessmentTypeFilter !== 'all' ? assessmentTypeFilter : undefined,
          search: assessmentSearchTerm || undefined
        }
      });
      setAssessments(response.data.assessments || []);
      setAssessmentsPagination(response.data.pagination);
    } catch (err) {
      console.error('Error loading assessments:', err);
      setError('Failed to load assessments');
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const handleAssessmentSearch = (e) => {
    e.preventDefault();
    loadAssessments(1);
  };

  const handleViewAssessment = async (assessmentId) => {
    try {
      const response = await api.get(`/api/admin/assessments/${assessmentId}`);
      setSelectedAssessment(response.data.assessment);
      setShowAssessmentModal(true);
    } catch (err) {
      console.error('Error loading assessment details:', err);
      alert('Failed to load assessment details: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/admin/assessments/${assessmentId}`);
      alert('Assessment deleted successfully');
      loadAssessments(assessmentsPagination?.current_page || 1);
    } catch (err) {
      console.error('Error deleting assessment:', err);
      alert('Failed to delete assessment: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleExportAssessmentPDF = async (assessmentId, userName) => {
    try {
      console.log('📄 Exporting assessment PDF:', assessmentId);
      
      const response = await api.get(`/api/admin/assessments/${assessmentId}/export-pdf`, {
        responseType: 'blob'
      });

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SAFE-8_Assessment_${userName.replace(/\s+/g, '_')}_${assessmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ PDF exported successfully');
    } catch (err) {
      console.error('❌ Error exporting PDF:', err);
      alert('Failed to export PDF: ' + (err.response?.data?.message || err.message));
    }
  };

  // ========== Activity Logs ==========
  const loadActivityLogs = async (page = 1) => {
    try {
      setActivityLoading(true);
      const response = await api.get('/api/admin/activity-logs/detailed', {
        params: {
          page,
          limit: 50,
          action_type: activityActionFilter !== 'all' ? activityActionFilter : undefined,
          entity_type: activityEntityFilter !== 'all' ? activityEntityFilter : undefined
        }
      });
      setActivityLogs(response.data.logs || []);
      setActivityPagination(response.data.pagination);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      setError('Failed to load activity logs');
    } finally {
      setActivityLoading(false);
    }
  };

  // ========== Logout ==========
  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) {
      return;
    }

    try {
      await api.post('/api/admin/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/admin/login');
    }
  };

  // ========== Utility Functions ==========
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreClass = (score) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    return 'score-needs-focus';
  };

  // ========== Configuration Management ==========
  const loadConfiguration = async () => {
    setConfigLoading(true);
    try {
      console.log('🔄 Loading configuration...');
      
      const [typesResponse, industriesResponse, pillarsResponse] = await Promise.all([
        api.get('/api/admin/config/assessment-types'),
        api.get('/api/admin/config/industries'),
        api.get('/api/admin/config/pillars')
      ]);

      console.log('📊 Raw API Responses:');
      console.log('  Types:', JSON.stringify(typesResponse.data, null, 2));
      console.log('  Industries:', JSON.stringify(industriesResponse.data, null, 2));
      console.log('  Pillars:', JSON.stringify(pillarsResponse.data, null, 2));

      console.log('📊 Response Success Flags:');
      console.log('  Types success:', typesResponse.data.success);
      console.log('  Industries success:', industriesResponse.data.success);
      console.log('  Pillars success:', pillarsResponse.data.success);

      if (typesResponse.data.success && typesResponse.data.assessmentTypes) {
        console.log('✅ Setting assessment types:', typesResponse.data.assessmentTypes);
        setAssessmentTypes(typesResponse.data.assessmentTypes);
      } else {
        console.warn('⚠️ Assessment types not set - success:', typesResponse.data.success, 'data:', typesResponse.data.assessmentTypes);
        setAssessmentTypes([]);
      }

      if (industriesResponse.data.success && industriesResponse.data.industries) {
        console.log('✅ Setting industries:', industriesResponse.data.industries);
        setIndustries(industriesResponse.data.industries);
      } else {
        console.warn('⚠️ Industries not set - success:', industriesResponse.data.success, 'data:', industriesResponse.data.industries);
        setIndustries([]);
      }

      if (pillarsResponse.data.success && pillarsResponse.data.pillars) {
        setPillars(pillarsResponse.data.pillars);
      } else {
        console.warn('⚠️ Pillars response:', pillarsResponse.data);
        setPillars([]);
      }
    } catch (error) {
      console.error('❌ Error loading configuration:', error);
      console.error('Error details:', error.response?.data);
      setError('Failed to load configuration');
      setAssessmentTypes([]);
      setIndustries([]);
      setPillars([]);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleCreateAssessmentType = async (e) => {
    e.preventDefault();
    if (!newAssessmentType.trim()) return;

    try {
      // Parse features from comma-separated string
      const featuresArray = newAssessmentFeatures
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const response = await api.post('/api/admin/config/assessment-types', {
        assessment_type: newAssessmentType.trim(),
        title: newAssessmentTitle.trim() || `${newAssessmentType.trim()} Assessment`,
        description: newAssessmentDescription.trim(),
        duration: newAssessmentDuration.trim() || '~10 minutes',
        icon: newAssessmentIcon.trim() || 'fas fa-clipboard-check',
        features: featuresArray.length > 0 ? featuresArray : ['Comprehensive evaluation'],
        audience: newAssessmentAudience.trim() || 'All Users',
        audience_color: newAssessmentAudienceColor || 'blue'
      });

      if (response.data.success) {
        // Reset all fields
        setNewAssessmentType('');
        setNewAssessmentTitle('');
        setNewAssessmentDescription('');
        setNewAssessmentDuration('');
        setNewAssessmentIcon('fas fa-clipboard-check');
        setNewAssessmentFeatures('');
        setNewAssessmentAudience('');
        setNewAssessmentAudienceColor('blue');
        await loadConfiguration();
        alert('✅ Assessment type created successfully with card configuration! It will now appear on the home screen.');
      }
    } catch (error) {
      console.error('Error creating assessment type:', error);
      alert('❌ ' + (error.response?.data?.message || 'Failed to create assessment type'));
    }
  };

  const handleCreateIndustry = async (e) => {
    e.preventDefault();
    if (!newIndustry.trim()) return;

    try {
      const response = await api.post('/api/admin/config/industries', {
        name: newIndustry.trim()
      });

      if (response.data.success) {
        setNewIndustry('');
        await loadConfiguration();
        alert('✅ Industry created successfully!');
      }
    } catch (error) {
      console.error('Error creating industry:', error);
      const errorMsg = error.response?.data?.error || 
                       error.response?.data?.message || 
                       'Failed to create industry';
      alert('❌ ' + errorMsg);
    }
  };

  const handleUpdateIndustry = async (industryId, updates) => {
    try {
      const response = await api.put(`/api/admin/config/industries/${industryId}`, updates);

      if (response.data.success) {
        setEditingIndustry(null);
        await loadConfiguration();
        alert('✅ Industry updated successfully!');
      }
    } catch (error) {
      console.error('Error updating industry:', error);
      alert('❌ ' + (error.response?.data?.message || 'Failed to update industry'));
    }
  };

  const handleDeleteIndustry = async (industryId, industryName) => {
    if (!confirm(`Are you sure you want to delete the industry "${industryName}"?`)) return;

    try {
      const response = await api.delete(`/api/admin/config/industries/${industryId}`);

      if (response.data.success) {
        await loadConfiguration();
        alert('✅ Industry deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting industry:', error);
      alert('❌ ' + (error.response?.data?.message || 'Failed to delete industry'));
    }
  };

  const handleUpdateAssessmentType = async (oldType, newType) => {
    if (!newType || newType === oldType) {
      setEditingAssessmentType(null);
      return;
    }

    try {
      const response = await api.put(`/api/admin/config/assessment-types/${oldType}`, {
        new_type: newType
      });

      if (response.data.success) {
        setEditingAssessmentType(null);
        await loadConfiguration();
        alert('✅ Assessment type updated successfully!');
      }
    } catch (error) {
      console.error('Error updating assessment type:', error);
      setEditingAssessmentType(null);
      alert('❌ ' + (error.response?.data?.message || 'Failed to update assessment type'));
    }
  };

  const handleDeleteAssessmentType = async (assessmentType) => {
    if (!confirm(`Are you sure you want to delete the assessment type "${assessmentType}"?\n\nThis will deactivate all questions associated with this type.`)) return;

    try {
      const response = await api.delete(`/api/admin/config/assessment-types/${assessmentType}`);

      if (response.data.success) {
        await loadConfiguration();
        alert('✅ Assessment type deleted successfully! All associated questions have been deactivated.');
      }
    } catch (error) {
      console.error('Error deleting assessment type:', error);
      alert('❌ ' + (error.response?.data?.message || 'Failed to delete assessment type'));
    }
  };

  const handleCreatePillar = async (e) => {
    e.preventDefault();
    if (!newPillar.name.trim() || !newPillar.short_name.trim()) return;

    try {
      const response = await api.post('/api/admin/config/pillars', {
        name: newPillar.name.trim(),
        short_name: newPillar.short_name.trim().toUpperCase()
      });

      if (response.data.success) {
        setNewPillar({ name: '', short_name: '' });
        await loadConfiguration();
        alert('✅ Pillar created successfully!');
      }
    } catch (error) {
      console.error('Error creating pillar:', error);
      alert('❌ ' + (error.response?.data?.message || 'Failed to create pillar'));
    }
  };

  const handleUpdatePillar = async (pillarId, updates) => {
    if (!updates.name && !updates.short_name && updates.is_active === undefined) {
      setEditingPillar(null);
      return;
    }

    try {
      console.log('Updating pillar:', pillarId, updates);
      const response = await api.put(`/api/admin/config/pillars/${pillarId}`, updates);

      if (response.data.success) {
        setEditingPillar(null);
        setEditingPillarData({ name: '', short_name: '' });
        await loadConfiguration();
        alert('✅ Pillar updated successfully!');
      }
    } catch (error) {
      console.error('Error updating pillar:', error);
      console.error('Error response:', error.response?.data);
      alert('❌ ' + (error.response?.data?.message || 'Failed to update pillar'));
    }
  };

  const handleDeletePillar = async (pillarId, pillarName) => {
    if (!confirm(`Are you sure you want to delete the pillar "${pillarName}"?\n\nThis will affect all questions using this pillar.`)) return;

    try {
      const response = await api.delete(`/api/admin/config/pillars/${pillarId}`);

      if (response.data.success) {
        await loadConfiguration();
        alert('✅ Pillar deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting pillar:', error);
      alert('❌ ' + (error.response?.data?.message || 'Failed to delete pillar'));
    }
  };



  // ========== Render Loading State ==========
  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <h2>Loading Admin Dashboard...</h2>
        </div>
      </div>
    );
  }

  // ========== Render Error State ==========
  if (error && activeTab === 'dashboard') {
    return (
      <div className="admin-container">
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={loadDashboardStats} className="btn-primary">
            <i className="fas fa-redo"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  // ========== Main Render ==========
  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-content">
            <div className="admin-header-left">
              <div className="admin-logo">
                <img 
                  src="/ForvisMazars-Logo-Color-RGB.jpg" 
                  alt="Forvis Mazars" 
                  style={{ height: '40px', width: 'auto' }}
                />
              </div>
              <div className="admin-header-info">
                <h1>Admin Dashboard</h1>
                <p>SAFE-8 Assessment Platform</p>
              </div>
            </div>
            <div className="admin-header-right">
              
              <div className="admin-user-info">
                <i className="fas fa-user-shield"></i>
                <div>
                  <div className="admin-user-name">{adminUser?.full_name || adminUser?.username}</div>
                  <div className="admin-user-role">{adminUser?.role}</div>
                </div>
              </div>
              {/* <button onClick={() => setShowITACReviewForm(true)} className="btn-itac-review">
                <i className="fas fa-file-contract"></i> ITAC Review
              </button> */}
              <button onClick={() => navigate('/')} className="btn-back-home">
                <i className="fas fa-home"></i> Back to Home
              </button>
              <button onClick={handleLogout} className="btn-logout">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="fas fa-chart-line"></i> Dashboard
            </button>
            <button
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <i className="fas fa-users"></i> Users
            </button>
            <button
              className={`admin-tab ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              <i className="fas fa-question-circle"></i> Questions
            </button>
            <button
              className={`admin-tab ${activeTab === 'assessments' ? 'active' : ''}`}
              onClick={() => setActiveTab('assessments')}
            >
              <i className="fas fa-clipboard-check"></i> Assessments
            </button>
            <button
              className={`admin-tab ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <i className="fas fa-history"></i> Activity Log
            </button>
            <button
              className={`admin-tab ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              <i className="fas fa-cog"></i> Configuration
            </button>
            {adminUser?.role === 'super_admin' && (
              <button
                className={`admin-tab ${activeTab === 'admins' ? 'active' : ''}`}
                onClick={() => setActiveTab('admins')}
              >
                <i className="fas fa-user-shield"></i> Manage Admins
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="admin-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="admin-dashboard-tab">
              <h2 className="admin-section-title">Dashboard Overview</h2>
              
              {stats && (
                <>
                  <div className="admin-stats-grid">
                    <div className="admin-stat-card stat-primary">
                      <div className="stat-icon">
                        <i className="fas fa-users"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.total_users || 0}</div>
                        <div className="stat-label">Total Users</div>
                      </div>
                    </div>

                    <div className="admin-stat-card stat-secondary">
                      <div className="stat-icon">
                        <i className="fas fa-clipboard-check"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.total_assessments || 0}</div>
                        <div className="stat-label">Total Assessments</div>
                      </div>
                    </div>

                    <div className="admin-stat-card stat-accent">
                      <div className="stat-icon">
                        <i className="fas fa-question-circle"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.total_questions || 0}</div>
                        <div className="stat-label">Total Questions</div>
                      </div>
                    </div>

                    <div className="admin-stat-card stat-success">
                      <div className="stat-icon">
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.avg_score ? `${stats.avg_score.toFixed(1)}%` : 'N/A'}</div>
                        <div className="stat-label">Average Score</div>
                      </div>
                    </div>
                  </div>

                  {stats.assessment_type_breakdown && stats.assessment_type_breakdown.length > 0 && (
                    <div className="admin-panel">
                      <h3>Assessment Type Breakdown</h3>
                      <div className="breakdown-grid">
                        {stats.assessment_type_breakdown.map((item) => (
                          <div key={item.assessment_type} className="breakdown-card">
                            <div className={`type-badge type-${item.assessment_type.toLowerCase()}`}>
                              {item.assessment_type}
                            </div>
                            <div className="breakdown-value">{item.count} assessments</div>
                            <div className="breakdown-avg">Avg: {item.avg_score ? `${item.avg_score.toFixed(1)}%` : 'N/A'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.recent_activity && stats.recent_activity.length > 0 && (
                    <div className="admin-panel">
                      <h3>Recent Activity</h3>
                      <div className="recent-activity-list">
                        {stats.recent_activity.slice(0, 10).map((activity, idx) => (
                          <div key={idx} className="activity-item">
                            <div className="activity-icon">
                              <i className={`fas fa-${activity.action_type === 'CREATE' ? 'plus' : activity.action_type === 'UPDATE' ? 'edit' : activity.action_type === 'DELETE' ? 'trash' : 'eye'}`}></i>
                            </div>
                            <div className="activity-details">
                              <div className="activity-description">{activity.description}</div>
                              <div className="activity-meta">
                                {activity.admin_username} • {formatDate(activity.created_at)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="admin-users-tab">
              <div className="admin-section-header">
                <h2 className="admin-section-title">User Management</h2>
                <button onClick={handleCreateUser} className="btn-primary">
                  <i className="fas fa-plus"></i> Create User
                </button>
              </div>

              <div className="admin-filters">
                <form onSubmit={handleUserSearch} className="admin-search-form">
                  <input
                    type="text"
                    placeholder="Search users by name, email, or company..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="admin-search-input"
                  />
                  <button type="submit" className="btn-secondary">
                    <i className="fas fa-search"></i> Search
                  </button>
                </form>
              </div>

              {usersLoading ? (
                <div className="loading-state-mini">
                  <i className="fas fa-spinner fa-spin"></i> Loading users...
                </div>
              ) : (
                <>
                  <div className="admin-table-wrapper">
                    {/* Desktop Table View */}
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Company</th>
                          <th>Industry</th>
                          <th>Assessments</th>
                          <th>Last Login</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="admin-table-empty">
                              No users found
                            </td>
                          </tr>
                        ) : (
                          users.map((user) => (
                            <tr key={user.id}>
                              <td>{user.id}</td>
                              <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.full_name}>{user.full_name}</td>
                              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.email}>{user.email}</td>
                              <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.company_name || 'N/A'}>{user.company_name || 'N/A'}</td>
                              <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.industry || 'N/A'}>{user.industry || 'N/A'}</td>
                              <td>{user.total_assessments || 0}</td>
                              <td>{formatDate(user.last_login_at)}</td>
                              <td>
                                <div className="admin-action-btns">
                                  <button
                                    onClick={() => handleViewUserAssessments(user)}
                                    className="btn-action btn-view"
                                    title="View assessments"
                                  >
                                    <i className="fas fa-chart-line"></i>
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => handleEditUser(user)}
                                    className="btn-action btn-edit"
                                    title="Edit user"
                                  >
                                    <i className="fas fa-edit"></i>
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="btn-action btn-delete"
                                    title="Delete user"
                                  >
                                    <i className="fas fa-trash"></i>
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Mobile Card View */}
                    {users.map((user) => (
                      <div key={`mobile-${user.id}`} className="mobile-table-card">
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">ID</span>
                          <span className="mobile-card-value">{user.id}</span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">Name</span>
                          <span className="mobile-card-value">{user.full_name}</span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">Email</span>
                          <span className="mobile-card-value" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{user.email}</span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">Company</span>
                          <span className="mobile-card-value">{user.company_name || 'N/A'}</span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">Industry</span>
                          <span className="mobile-card-value">{user.industry || 'N/A'}</span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">Assessments</span>
                          <span className="mobile-card-value">{user.total_assessments || 0}</span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">Last Login</span>
                          <span className="mobile-card-value">{formatDate(user.last_login_at)}</span>
                        </div>
                        <div className="mobile-card-actions">
                          <button
                            onClick={() => handleViewUserAssessments(user)}
                            className="btn-action btn-view"
                          >
                            <i className="fas fa-chart-line"></i> View
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="btn-action btn-edit"
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn-action btn-delete"
                          >
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {usersPagination && usersPagination.total_pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={!usersPagination.has_prev}
                        onClick={() => loadUsers(usersPagination.current_page - 1)}
                        className="btn-pagination"
                      >
                        <i className="fas fa-chevron-left"></i> Previous
                      </button>
                      <span className="pagination-info">
                        Page {usersPagination.current_page} of {usersPagination.total_pages}
                      </span>
                      <button
                        disabled={!usersPagination.has_next}
                        onClick={() => loadUsers(usersPagination.current_page + 1)}
                        className="btn-pagination"
                      >
                        Next <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div className="admin-questions-tab">
              <div className="admin-section-header">
                <h2 className="admin-section-title">Question Management</h2>
                <button onClick={handleCreateQuestion} className="btn-primary">
                  <i className="fas fa-plus"></i> Create Question
                </button>
              </div>

              <div className="admin-filters">
                <select
                  value={questionTypeFilter}
                  onChange={(e) => setQuestionTypeFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Types</option>
                  {assessmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <select
                  value={questionPillarFilter}
                  onChange={(e) => setQuestionPillarFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Pillars</option>
                  {pillars.map(pillar => (
                    <option key={pillar.name || pillar} value={pillar.name || pillar}>{pillar.name || pillar}</option>
                  ))}
                </select>
              </div>

              {questionsLoading ? (
                <div className="loading-state-mini">
                  <i className="fas fa-spinner fa-spin"></i> Loading questions...
                </div>
              ) : (
                <>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Type</th>
                          <th>Pillar</th>
                          <th>Question</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="admin-table-empty">
                              No questions found
                            </td>
                          </tr>
                        ) : (
                          questions.map((question) => (
                            <tr 
                              key={question.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, question)}
                              onDragEnd={handleDragEnd}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, question)}
                              style={{ cursor: 'move' }}
                            >
                              <td>
                                <div className="question-order-controls">
                                  <i className="fas fa-grip-vertical" style={{ marginRight: '8px', color: '#999', cursor: 'grab' }}></i>
                                  <span style={{ fontWeight: 'bold', minWidth: '30px', display: 'inline-block' }}>{question.question_order || 0}</span>
                                  <div className="order-btns">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReorderQuestion(question.id, 'up');
                                      }}
                                      className="btn-reorder"
                                      title="Move up"
                                    >
                                      <i className="fas fa-chevron-up"></i>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                      e.stopPropagation();
                                        handleReorderQuestion(question.id, 'down');
                                      }}
                                      className="btn-reorder"
                                      title="Move down"
                                    >
                                      <i className="fas fa-chevron-down"></i>
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`type-badge type-${question.assessment_type.toLowerCase()}`}>
                                  {question.assessment_type}
                                </span>
                              </td>
                              <td>
                                <span className="pillar-badge">{question.pillar_short_name}</span>
                              </td>
                              <td className="question-text-cell">{question.question_text}</td>
                              <td>
                                <span className={`status-badge ${question.is_active === 1 || question.is_active === true ? 'status-active' : 'status-inactive'}`}>
                                  {question.is_active === 1 || question.is_active === true ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                <div className="admin-action-btns">
                                  <button
                                    onClick={() => handleEditQuestion(question)}
                                    className="btn-action btn-edit"
                                    title="Edit question"
                                  >
                                    <i className="fas fa-edit"></i>
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleQuestionStatus(question.id, question.is_active)}
                                    className={`btn-action ${question.is_active ? 'btn-warning' : 'btn-success'}`}
                                    title={question.is_active ? 'Deactivate question' : 'Activate question'}
                                  >
                                    <i className={`fas ${question.is_active ? 'fa-toggle-off' : 'fa-toggle-on'}`}></i>
                                    <span>{question.is_active ? 'Deactivate' : 'Activate'}</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuestion(question.id)}
                                    className="btn-action btn-delete"
                                    title="Delete question"
                                  >
                                    <i className="fas fa-trash"></i>
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {questionsPagination && questionsPagination.total_pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={!questionsPagination.has_prev}
                        onClick={() => loadQuestions(questionsPagination.current_page - 1)}
                        className="btn-pagination"
                      >
                        <i className="fas fa-chevron-left"></i> Previous
                      </button>
                      <span className="pagination-info">
                        Page {questionsPagination.current_page} of {questionsPagination.total_pages}
                      </span>
                      <button
                        disabled={!questionsPagination.has_next}
                        onClick={() => loadQuestions(questionsPagination.current_page + 1)}
                        className="btn-pagination"
                      >
                        Next <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Assessments Tab */}
          {activeTab === 'assessments' && (
            <div className="admin-assessments-tab">
              <div className="admin-section-header">
                <h2 className="admin-section-title">Assessment Management</h2>
              </div>

              <div className="admin-filters">
                <form onSubmit={handleAssessmentSearch} className="admin-search-form">
                  <input
                    type="text"
                    placeholder="Search by user name, email, company, or industry..."
                    value={assessmentSearchTerm}
                    onChange={(e) => setAssessmentSearchTerm(e.target.value)}
                    className="admin-search-input"
                  />
                  <button type="submit" className="btn-secondary">
                    <i className="fas fa-search"></i> Search
                  </button>
                </form>

                <select
                  value={assessmentTypeFilter}
                  onChange={(e) => setAssessmentTypeFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Types</option>
                  {assessmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {assessmentsLoading ? (
                <div className="loading-state-mini">
                  <i className="fas fa-spinner fa-spin"></i> Loading assessments...
                </div>
              ) : (
                <>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>User</th>
                          <th>Type</th>
                          <th>Industry</th>
                          <th>Score</th>
                          <th>Completed</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessments.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="admin-table-empty">
                              No assessments found
                            </td>
                          </tr>
                        ) : (
                          assessments.map((assessment) => (
                            <tr key={assessment.id}>
                              <td>{assessment.id}</td>
                              <td>{assessment.user_name || 'Unknown'}</td>
                              <td>
                                <span className={`type-badge type-${assessment.assessment_type.toLowerCase()}`}>
                                  {assessment.assessment_type}
                                </span>
                              </td>
                              <td>{assessment.industry || 'N/A'}</td>
                              <td>
                                <span className={`score-badge ${getScoreClass(assessment.overall_score)}`}>
                                  {assessment.overall_score ? `${assessment.overall_score.toFixed(1)}%` : 'N/A'}
                                </span>
                              </td>
                              <td>{formatDate(assessment.completed_at)}</td>
                              <td>
                                <div className="admin-action-btns">
                                  <button
                                    onClick={() => handleViewAssessment(assessment.id)}
                                    className="btn-action btn-view"
                                    title="View details"
                                  >
                                    <i className="fas fa-eye"></i>
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => handleExportAssessmentPDF(assessment.id, assessment.user_name)}
                                    className="btn-action btn-export"
                                    title="Export as PDF"
                                  >
                                    <i className="fas fa-file-pdf"></i>
                                    <span>Export</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAssessment(assessment.id)}
                                    className="btn-action btn-delete"
                                    title="Delete assessment"
                                  >
                                    <i className="fas fa-trash"></i>
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {assessmentsPagination && assessmentsPagination.total_pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={!assessmentsPagination.has_prev}
                        onClick={() => loadAssessments(assessmentsPagination.current_page - 1)}
                        className="btn-pagination"
                      >
                        <i className="fas fa-chevron-left"></i> Previous
                      </button>
                      <span className="pagination-info">
                        Page {assessmentsPagination.current_page} of {assessmentsPagination.total_pages}
                      </span>
                      <button
                        disabled={!assessmentsPagination.has_next}
                        onClick={() => loadAssessments(assessmentsPagination.current_page + 1)}
                        className="btn-pagination"
                      >
                        Next <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <div className="admin-activity-tab">
              <div className="admin-section-header">
                <h2 className="admin-section-title">Activity Log</h2>
              </div>

              <div className="admin-filters">
                <select
                  value={activityActionFilter}
                  onChange={(e) => setActivityActionFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Actions</option>
                  {ACTION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <select
                  value={activityEntityFilter}
                  onChange={(e) => setActivityEntityFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Entities</option>
                  {ENTITY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {activityLoading ? (
                <div className="loading-state-mini">
                  <i className="fas fa-spinner fa-spin"></i> Loading activity logs...
                </div>
              ) : (
                <>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>User/Admin</th>
                          <th>Type</th>
                          <th>Action</th>
                          <th>Entity</th>
                          <th>Description</th>
                          {/* <th>IP Address</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {activityLogs.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="admin-table-empty">
                              No activity logs found
                            </td>
                          </tr>
                        ) : (
                          activityLogs.map((log) => (
                            <tr key={log.id}>
                              <td>{formatDate(log.created_at)}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: '600' }}>{log.actor_name || 'Unknown'}</span>
                                  {log.company_name && (
                                    <span style={{ fontSize: '0.85em', color: '#6c757d' }}>{log.company_name}</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`actor-type-badge actor-${log.actor_type}`}>
                                  {log.actor_type === 'admin' ? '👤 Admin' : '👥 User'}
                                </span>
                              </td>
                              <td>
                                <span className={`action-badge action-${log.action_type.toLowerCase()}`}>
                                  {log.action_type}
                                </span>
                              </td>
                              <td>
                                <span className="entity-badge">{log.entity_type}</span>
                              </td>
                              <td className="description-cell">{log.description}</td>
                              {/* <td>{log.ip_address || 'N/A'}</td> */}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {activityPagination && activityPagination.total_pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={!activityPagination.has_prev}
                        onClick={() => loadActivityLogs(activityPagination.current_page - 1)}
                        className="btn-pagination"
                      >
                        <i className="fas fa-chevron-left"></i> Previous
                      </button>
                      <span className="pagination-info">
                        Page {activityPagination.current_page} of {activityPagination.total_pages}
                      </span>
                      <button
                        disabled={!activityPagination.has_next}
                        onClick={() => loadActivityLogs(activityPagination.current_page + 1)}
                        className="btn-pagination"
                      >
                        Next <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>
                  <i className="fas fa-cog"></i> Configuration Management
                </h2>
              </div>

              {configLoading ? (
                <div className="loading-state">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading configuration...</p>
                </div>
              ) : (
                <>
                  {/* Assessment Types Section */}
                  <div className="config-section">
                    <div className="section-header">
                      <h3><i className="fas fa-clipboard-list"></i> Assessment Types</h3>
                    </div>
                    
                    <div className="config-grid">
                      <div className="config-card">
                        <h4>Current Assessment Types</h4>
                        <div className="assessment-types-list">
                          {assessmentTypes.map(type => (
                            <div key={type} className="assessment-type-item">
                              {editingAssessmentType === type ? (
                                <div className="edit-assessment-type">
                                  <input
                                    type="text"
                                    defaultValue={type}
                                    onBlur={(e) => {
                                      if (e.target.value !== type) {
                                        handleUpdateAssessmentType(type, e.target.value);
                                      } else {
                                        setEditingAssessmentType(null);
                                      }
                                    }}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdateAssessmentType(type, e.target.value);
                                      }
                                    }}
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <>
                                  <span className={`type-badge type-${type.toLowerCase()}`}>
                                    {type}
                                  </span>
                                  <div className="assessment-type-actions">
                                    <button
                                      onClick={() => setEditingAssessmentType(type)}
                                      className="btn-icon"
                                      title="Edit"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAssessmentType(type)}
                                      className="btn-icon btn-danger"
                                      title="Delete"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        {assessmentTypes.length === 0 && (
                          <p className="no-data">No assessment types found</p>
                        )}
                      </div>

                      <div className="config-card">
                        <h4>Create New Assessment Type</h4>
                        <form onSubmit={handleCreateAssessmentType} className="config-form">
                          <div className="form-row">
                            <div className="form-group">
                              <label>Type Code * (e.g., EXPERT, BASIC)</label>
                              <input
                                type="text"
                                value={newAssessmentType}
                                onChange={(e) => setNewAssessmentType(e.target.value.toUpperCase())}
                                placeholder="EXPERT"
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Display Title *</label>
                              <input
                                type="text"
                                value={newAssessmentTitle}
                                onChange={(e) => setNewAssessmentTitle(e.target.value)}
                                placeholder="Expert Assessment"
                                required
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Description</label>
                            <textarea
                              value={newAssessmentDescription}
                              onChange={(e) => setNewAssessmentDescription(e.target.value)}
                              placeholder="Brief description of this assessment..."
                              rows="2"
                            />
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Duration</label>
                              <input
                                type="text"
                                value={newAssessmentDuration}
                                onChange={(e) => setNewAssessmentDuration(e.target.value)}
                                placeholder="30 questions • ~8 minutes"
                              />
                            </div>
                            <div className="form-group">
                              <label>Icon (FontAwesome class)</label>
                              <input
                                type="text"
                                value={newAssessmentIcon}
                                onChange={(e) => setNewAssessmentIcon(e.target.value)}
                                placeholder="fas fa-trophy"
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Features (comma-separated)</label>
                            <input
                              type="text"
                              value={newAssessmentFeatures}
                              onChange={(e) => setNewAssessmentFeatures(e.target.value)}
                              placeholder="Advanced analytics, Deep insights, Expert recommendations"
                            />
                            <small>Separate features with commas</small>
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Target Audience</label>
                              <input
                                type="text"
                                value={newAssessmentAudience}
                                onChange={(e) => setNewAssessmentAudience(e.target.value)}
                                placeholder="Senior Executives"
                              />
                            </div>
                            <div className="form-group">
                              <label>Audience Badge Color</label>
                              <select
                                value={newAssessmentAudienceColor}
                                onChange={(e) => setNewAssessmentAudienceColor(e.target.value)}
                              >
                                <option value="blue">Blue</option>
                                <option value="green">Green</option>
                                <option value="purple">Purple</option>
                                <option value="orange">Orange</option>
                                <option value="red">Red</option>
                                <option value="teal">Teal</option>
                              </select>
                            </div>
                          </div>

                          <button type="submit" className="btn-primary">
                            <i className="fas fa-plus"></i> Create Assessment Type Card
                          </button>
                        </form>
                        <div className="info-box">
                          <i className="fas fa-info-circle"></i>
                          <p>This will create a new assessment type card on the home screen with all the details you provide. Don't forget to add questions in the Questions tab!</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Industries Section */}
                  <div className="config-section">
                    <div className="section-header">
                      <h3><i className="fas fa-industry"></i> Industries</h3>
                    </div>

                    <div className="config-grid">
                      <div className="config-card">
                        <h4>Manage Industries</h4>
                        <div className="industries-list">
                          {Array.isArray(industries) && industries.length > 0 ? (
                            industries.map(industry => (
                              <div key={industry.id || industry} className="industry-item">
                                {editingIndustry === (industry.id || industry) ? (
                                  <div className="edit-industry">
                                    <input
                                      type="text"
                                      defaultValue={industry.name || industry}
                                      onBlur={(e) => {
                                        if (e.target.value !== (industry.name || industry)) {
                                          handleUpdateIndustry(industry.id, { name: e.target.value });
                                        } else {
                                          setEditingIndustry(null);
                                        }
                                      }}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateIndustry(industry.id, { name: e.target.value });
                                        }
                                      }}
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <span className="industry-name">
                                      {industry.name || industry}
                                      {industry.is_active === false && (
                                        <span className="status-badge inactive">Inactive</span>
                                      )}
                                    </span>
                                    {industry.id && !String(industry.id).startsWith('default-') && (
                                      <div className="industry-actions">
                                        <button
                                          onClick={() => setEditingIndustry(industry.id)}
                                          className="btn-icon"
                                          title="Edit"
                                        >
                                          <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                          onClick={() => handleUpdateIndustry(industry.id, { is_active: !industry.is_active })}
                                          className="btn-icon"
                                          title={industry.is_active ? 'Deactivate' : 'Activate'}
                                        >
                                          <i className={`fas fa-${industry.is_active ? 'toggle-on' : 'toggle-off'}`}></i>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteIndustry(industry.id, industry.name)}
                                          className="btn-icon btn-danger"
                                          title="Delete"
                                        >
                                          <i className="fas fa-trash"></i>
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="no-data">No industries found</p>
                          )}
                        </div>
                      </div>

                      <div className="config-card">
                        <h4>Add New Industry</h4>
                        <form onSubmit={handleCreateIndustry} className="config-form">
                          <div className="form-group">
                            <label>Industry Name *</label>
                            <input
                              type="text"
                              value={newIndustry}
                              onChange={(e) => setNewIndustry(e.target.value)}
                              placeholder="e.g., Telecommunications, Aerospace, etc."
                              required
                            />
                          </div>
                          <button type="submit" className="btn-primary">
                            <i className="fas fa-plus"></i> Add Industry
                          </button>
                        </form>
                        <div className="info-box">
                          <i className="fas fa-info-circle"></i>
                          <p>Industries appear in the user registration and assessment forms. Users can select their industry to get tailored benchmarks.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pillars Section */}
                  <div className="config-section">
                    <div className="section-header">
                      <h3><i className="fas fa-columns"></i> Assessment Pillars</h3>
                    </div>

                    <div className="config-grid">
                      <div className="config-card">
                        <h4>Manage Pillars</h4>
                        <div className="industries-list">
                          {Array.isArray(pillars) && pillars.length > 0 ? (
                            pillars.map(pillar => (
                              <div key={pillar.id || pillar.name || pillar} className="industry-item">
                                {editingPillar === (pillar.id || pillar.name) ? (
                                  <div className="edit-pillar" style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                    <input
                                      type="text"
                                      className="admin-input"
                                      value={editingPillarData.name}
                                      onChange={(e) => setEditingPillarData(prev => ({ ...prev, name: e.target.value }))}
                                      placeholder="Full Name"
                                      style={{ flex: 2 }}
                                    />
                                    <input
                                      type="text"
                                      className="admin-input"
                                      value={editingPillarData.short_name}
                                      onChange={(e) => setEditingPillarData(prev => ({ ...prev, short_name: e.target.value }))}
                                      placeholder="Short Name"
                                      style={{ flex: 1, maxWidth: '150px' }}
                                    />
                                    <button
                                      className="btn-icon"
                                      onClick={() => {
                                        handleUpdatePillar(pillar.id, {
                                          name: editingPillarData.name,
                                          short_name: editingPillarData.short_name
                                        });
                                      }}
                                      title="Confirm"
                                      style={{ color: 'var(--fm-green)' }}
                                    >
                                      <i className="fas fa-check"></i>
                                    </button>
                                    <button
                                      className="btn-icon"
                                      onClick={() => {
                                        setEditingPillar(null);
                                        setEditingPillarData({ name: '', short_name: '' });
                                      }}
                                      title="Cancel"
                                      style={{ color: 'var(--fm-red)' }}
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="industry-name">
                                      <strong>{pillar.name || pillar}</strong>
                                      {pillar.short_name && (
                                        <span style={{ marginLeft: '0.5rem', color: 'var(--fm-gray)', fontSize: '0.85rem' }}>
                                          ({pillar.short_name})
                                        </span>
                                      )}
                                      {pillar.is_active === false && (
                                        <span className="status-badge inactive">Inactive</span>
                                      )}
                                    </span>
                                    {pillar.id && (
                                      <div className="industry-actions">
                                        <button
                                          onClick={() => {
                                            setEditingPillar(pillar.id);
                                            setEditingPillarData({
                                              name: pillar.name || '',
                                              short_name: pillar.short_name || ''
                                            });
                                          }}
                                          className="btn-icon"
                                          title="Edit"
                                        >
                                          <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                          onClick={() => handleUpdatePillar(pillar.id, { is_active: !pillar.is_active })}
                                          className="btn-icon"
                                          title={pillar.is_active ? 'Deactivate' : 'Activate'}
                                        >
                                          <i className={`fas fa-${pillar.is_active ? 'toggle-on' : 'toggle-off'}`}></i>
                                        </button>
                                        <button
                                          onClick={() => handleDeletePillar(pillar.id, pillar.name)}
                                          className="btn-icon btn-danger"
                                          title="Delete"
                                        >
                                          <i className="fas fa-trash"></i>
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="no-data">No pillars found</p>
                          )}
                        </div>
                      </div>

                      <div className="config-card">
                        <h4>Add New Pillar</h4>
                        <form onSubmit={handleCreatePillar} className="config-form">
                          <div className="form-group">
                            <label>Pillar Name *</label>
                            <input
                              type="text"
                              value={newPillar.name}
                              onChange={(e) => setNewPillar({ ...newPillar, name: e.target.value })}
                              placeholder="e.g., Innovation, Compliance, etc."
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Short Name * (uppercase, 3-5 chars)</label>
                            <input
                              type="text"
                              value={newPillar.short_name}
                              onChange={(e) => setNewPillar({ ...newPillar, short_name: e.target.value.toUpperCase() })}
                              placeholder="e.g., INNOV, COMP"
                              maxLength="5"
                              required
                            />
                            <small>Used in internal references and database</small>
                          </div>
                          <button type="submit" className="btn-primary">
                            <i className="fas fa-plus"></i> Add Pillar
                          </button>
                        </form>
                        <div className="info-box">
                          <i className="fas fa-info-circle"></i>
                          <p>Pillars are the core assessment dimensions used to evaluate different aspects of AI readiness. Questions are organized by pillars.</p>
                        </div>
                      </div>
                    </div>
                  </div>


                </>
              )}
            </div>
          )}

          {/* Manage Admins Tab (Super Admin Only) */}
          {activeTab === 'admins' && adminUser?.role === 'super_admin' && (
            <div className="admin-section">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>
                  <i className="fas fa-user-shield"></i> Manage Admins
                </h2>
                <button className="btn-primary" onClick={handleCreateAdmin}>
                  <i className="fas fa-user-plus"></i> Create Admin
                </button>
              </div>

              {adminsLoading ? (
                <div className="loading-state">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Loading admins...</p>
                </div>
              ) : admins.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-user-shield"></i>
                  <p>No admins found</p>
                  <button className="btn-primary" onClick={handleCreateAdmin} style={{ padding: '10px 20px', fontSize: '14px' }}>
                    <i className="fas fa-user-plus"></i> Create First Admin
                  </button>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Full Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => (
                        <tr key={admin.id}>
                          <td>
                            <strong>{admin.username}</strong>
                            {admin.id === adminUser?.id && (
                              <span className="badge badge-info" style={{ marginLeft: '8px' }}>You</span>
                            )}
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={admin.email}>{admin.email}</td>
                          <td>{admin.full_name || '-'}</td>
                          <td>
                            <span className={`badge ${admin.role === 'super_admin' ? 'badge-danger' : 'badge-primary'}`}>
                              {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${admin.is_active ? 'status-active' : 'status-inactive'}`}>
                              {admin.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="admin-action-btns">
                              <button
                                onClick={() => handleEditAdmin(admin)}
                                className="btn-action btn-edit"
                                title="Edit admin"
                              >
                                <i className="fas fa-edit"></i>
                                <span>Edit</span>
                              </button>
                              {admin.id !== adminUser?.id && (
                                <>
                                  <button
                                    className={`btn-action ${admin.is_active ? 'btn-warning' : 'btn-success'}`}
                                    onClick={() => handleToggleAdminStatus(admin.id, admin.is_active)}
                                    title={admin.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    <i className={`fas ${admin.is_active ? 'fa-ban' : 'fa-check'}`}></i>
                                    <span>{admin.is_active ? 'Deactivate' : 'Activate'}</span>
                                  </button>
                                  <button
                                    className="btn-action btn-delete"
                                    onClick={() => handleDeleteAdmin(admin.id)}
                                    title="Delete admin"
                                  >
                                    <i className="fas fa-trash"></i>
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Modal */}
      {showAdminModal && ReactDOM.createPortal(
        <AdminModal
          mode={adminModalMode}
          admin={selectedAdmin}
          onClose={() => {
            setShowAdminModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={() => {
            setShowAdminModal(false);
            setSelectedAdmin(null);
            loadAdmins();
          }}
        />,
        document.body
      )}


      {/* User Modal */}
      {showUserModal && ReactDOM.createPortal(
        <UserModal
          mode={userModalMode}
          user={selectedUser}
          industries={industries}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowUserModal(false);
            setSelectedUser(null);
            loadUsers(usersPagination?.current_page || 1);
          }}
        />,
        document.body
      )}

      {/* User Assessments Modal */}
      {showUserAssessmentsModal && selectedUser && ReactDOM.createPortal(
        <UserAssessmentsModal
          user={selectedUser}
          assessments={userAssessments}
          loading={userAssessmentsLoading}
          onClose={() => {
            setShowUserAssessmentsModal(false);
            setSelectedUser(null);
            setUserAssessments([]);
          }}
          onViewDetails={handleViewAssessment}
          onExportPDF={handleExportAssessmentPDF}
        />,
        document.body
      )}

      {/* Question Modal */}
      {showQuestionModal && ReactDOM.createPortal(
        <QuestionModal
          mode={questionModalMode}
          question={selectedQuestion}
          assessmentTypes={assessmentTypes}
          pillars={pillars}
          onClose={() => {
            setShowQuestionModal(false);
            setSelectedQuestion(null);
          }}
          onSuccess={() => {
            setShowQuestionModal(false);
            setSelectedQuestion(null);
            loadQuestions(questionsPagination?.current_page || 1);
          }}
        />,
        document.body
      )}

      {/* Assessment Detail Modal */}
      {showAssessmentModal && selectedAssessment && ReactDOM.createPortal(
        <AssessmentDetailModal
          assessment={selectedAssessment}
          onClose={() => {
            setShowAssessmentModal(false);
            setSelectedAssessment(null);  
          }}
        />,
        document.body
      )}

      {/* ITAC Review Form */}
      {/* {showITACReviewForm && ReactDOM.createPortal(
        <ITACReviewForm
          onClose={() => setShowITACReviewForm(false)}
        />,
        document.body
      )} */}
    </div>
  );
};


// ========== Admin Modal Component (For Super Admin) ==========
const AdminModal = ({ mode, admin, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: admin?.username || '',
    email: admin?.email || '',
    full_name: admin?.full_name || '',
    password: '',
    role: admin?.role || 'admin'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setShowTempPassword(false);

    // Validation
    if (formData.password && formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsSubmitting(false);
      return;
    }

    try {
      const submitData = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role
      };

      // Only include password if it's provided
      if (formData.password) {
        submitData.password = formData.password;
      }

      // console.log('📤 Submitting admin data:', { ...submitData, password: '***' });

      if (mode === 'create') {
        const response = await api.post('/api/admin/admins', submitData);
        console.log('✅ Admin created:', response.data);
        
        // Store temp password and show it to admin
        if (response.data.tempPassword) {
          setTempPassword(response.data.tempPassword);
          setShowTempPassword(true);
        } else {
          alert('Admin created successfully!');
          onSuccess();
        }
      } else {
        const response = await api.put(`/api/admin/admins/${admin.id}`, submitData);
        console.log('✅ Admin updated:', response.data);
        alert('Admin updated successfully!');
        onSuccess();
      }
    } catch (err) {
      console.error('❌ Error saving admin:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to save admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTempPassword = () => {
    setShowTempPassword(false);
    setTempPassword('');
    onSuccess();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    alert('Password copied to clipboard!');
  };

  // Show temp password display after creation
  if (showTempPassword && tempPassword) {
    return (
      <div className="modal-overlay" onClick={handleCloseTempPassword}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>✅ Admin Created Successfully</h2>
            <button className="close-button" onClick={handleCloseTempPassword}>×</button>
          </div>

          <div className="modal-content">
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              border: '2px solid #00539F', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#00539F', marginBottom: '15px' }}>🔑 Temporary Password</h3>
              <p style={{ marginBottom: '15px', color: '#666' }}>
                The admin has been emailed their login credentials. The temporary password is also shown below:
              </p>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #00539F'
              }}>
                <code style={{ 
                  flex: 1,
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#00539F',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}>
                  {tempPassword}
                </code>
                <button 
                  onClick={copyToClipboard}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Copy
                </button>
              </div>
              
              <div style={{ 
                marginTop: '15px', 
                padding: '12px', 
                backgroundColor: '#fff3cd', 
                borderLeft: '4px solid #ffc107',
                borderRadius: '4px'
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#856404' }}>
                  <strong>⚠️ Security Notice:</strong> The admin will be required to change this password on first login.
                </p>
              </div>
            </div>

            <div style={{ 
              padding: '20px', 
              backgroundColor: '#e8f4f8',
              border: '1px solid #00539F',
              borderRadius: '8px',
              marginBottom: '25px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#00539F', fontSize: '16px' }}>
                📧 Email Sent To:
              </h4>
              <p style={{ margin: 0, color: '#333', fontSize: '15px', fontWeight: '500' }}>
                {formData.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Create New Admin' : 'Edit Admin'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={mode === 'edit'}
                placeholder="admin_user"
                className="form-input"
              />
              {mode === 'edit' && (
                <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>Username cannot be changed</small>
              )}
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="admin@example.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                className="form-input"
              />
            </div>

            {mode === 'edit' && (
              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                  minLength="8"
                  className="form-input"
                />
                <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                  Only enter a password if you want to change it
                </small>
              </div>
            )}

            <div className="form-group">
              <label>Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="form-input"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                Super Admins can manage other admins. Regular Admins can only manage users and content.
              </small>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className={`fas ${mode === 'create' ? 'fa-plus' : 'fa-save'}`}></i>
                    {mode === 'create' ? ' Create Admin' : ' Update Admin'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


// ========== User Modal Component ==========
const UserModal = ({ mode, user, onClose, onSuccess, industries }) => {
  // Split full_name into first_name and last_name if it exists
  const splitName = (fullName) => {
    if (!fullName) return { first: '', last: '' };
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { first: parts[0], last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
  };
  
  const nameParts = splitName(user?.full_name);
  
  // Parse existing phone number if it has country code
  const parsedPhone = parsePhoneNumber(user?.phone_number || '');
  
  const [formData, setFormData] = useState({
    first_name: nameParts.first,
    last_name: nameParts.last,
    email: user?.email || '',
    company_name: user?.company_name || '',
    company_size: user?.company_size || '',
    country: user?.country || '',
    industry: user?.industry || '',
    job_title: user?.position || '',
    phone_number: parsedPhone.phone
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Clear phone error when user types
    if (e.target.name === 'phone_number') {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setPhoneError('');
    setShowTempPassword(false);

    // Validate phone number if provided
    if (formData.phone_number && formData.country) {
      const countryCode = COUNTRY_CODES[formData.country] || '';
      const phoneValidation = validatePhoneNumber(formData.phone_number, countryCode);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.message);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Get country code for phone number
      const countryCode = COUNTRY_CODES[formData.country] || '';
      
      // Prepare data with contact_name for backend compatibility
      const submitData = {
        contact_name: `${formData.first_name} ${formData.last_name}`.trim(),
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        company_name: formData.company_name,
        company_size: formData.company_size,
        country: formData.country,
        industry: formData.industry,
        job_title: formData.job_title,
        phone_number: formData.phone_number ? formatPhoneNumber(formData.phone_number, countryCode) : ''
      };
      
      console.log('📤 Submitting user data:', submitData);
      
      if (mode === 'create') {
        const response = await api.post('/api/admin/users', submitData);
        console.log('✅ User created:', response.data);
        
        // Store temp password and show it to admin
        if (response.data.tempPassword) {
          setTempPassword(response.data.tempPassword);
          setShowTempPassword(true);
        } else {
          alert('User created successfully!');
          onSuccess();
        }
      } else {
        const response = await api.put(`/api/admin/users/${user.id}`, submitData);
        console.log('✅ User updated:', response.data);
        alert('User updated successfully!');
        onSuccess();
      }
    } catch (err) {
      console.error('❌ Error saving user:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTempPassword = () => {
    setShowTempPassword(false);
    setTempPassword('');
    onSuccess();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    alert('Password copied to clipboard!');
  };

  // Show temp password display after creation
  if (showTempPassword && tempPassword) {
    return (
      <div className="modal-overlay" onClick={handleCloseTempPassword}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>✅ User Created Successfully</h2>
            <button className="close-button" onClick={handleCloseTempPassword}>×</button>
          </div>

          <div className="modal-content">
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              border: '2px solid #00539F', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#00539F', marginBottom: '15px' }}>🔑 Temporary Password</h3>
              <p style={{ marginBottom: '15px', color: '#666' }}>
                The user has been emailed their login credentials. The temporary password is also shown below:
              </p>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #00539F'
              }}>
                <code style={{ 
                  flex: 1,
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#00539F',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}>
                  {tempPassword}
                </code>
                <button 
                  onClick={copyToClipboard}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Copy
                </button>
              </div>
              
              <div style={{ 
                marginTop: '15px', 
                padding: '12px', 
                backgroundColor: '#fff3cd', 
                borderLeft: '4px solid #ffc107',
                borderRadius: '4px'
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#856404' }}>
                  <strong>⚠️ Security Notice:</strong> The user will be required to change this password on first login.
                </p>
              </div>
            </div>

            <div style={{ 
              padding: '20px', 
              backgroundColor: '#e8f4f8',
              border: '1px solid #00539F',
              borderRadius: '8px',
              marginBottom: '25px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#00539F', fontSize: '16px' }}>
                📧 Email Sent To:
              </h4>
              <p style={{ margin: 0, color: '#333', fontSize: '15px', fontWeight: '500' }}>
                {formData.email}
              </p>
            </div>

            {/* <button onClick={handleCloseTempPassword} className="btn-primary" style={{ width: '100%', padding: '12px' }}>
              Close
            </button> */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Create New User' : 'Edit User'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Company Size</label>
              <select
                name="company_size"
                value={formData.company_size}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select company size</option>
                {COMPANY_SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select country</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Industry</label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select industry</option>
                {industries.map(ind => (
                  <option key={ind.id || ind.name} value={ind.name || ind}>
                    {ind.name || ind}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Job Title</label>
              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {COUNTRY_CODES[formData.country] && (
                  <input
                    type="text"
                    value={COUNTRY_CODES[formData.country]}
                    disabled
                    style={{ width: '80px', backgroundColor: '#f5f5f5' }}
                    className="form-input"
                  />
                )}
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder={formData.country ? "Enter phone number" : "Select country first"}
                  className="form-input"
                  style={{ flex: 1 }}
                />
              </div>
              {phoneError && <p className="error-message" style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>{phoneError}</p>}
            </div>

            {mode === 'create' && (
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#e8f4f8', 
                border: '1px solid #00539F', 
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#00539F' }}>
                  <strong>ℹ️ Password:</strong> A secure temporary password will be automatically generated and emailed to the user. They will be required to change it on first login.
                </p>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ========== User Assessments Modal Component ==========
const UserAssessmentsModal = ({ user, assessments, loading, onClose, onViewDetails, onExportPDF }) => {
  console.log('🎨 UserAssessmentsModal rendering:', {
    userName: user?.full_name,
    userEmail: user?.email,
    assessmentsCount: assessments?.length || 0,
    loading
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content admin-modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>
            <i className="fas fa-chart-line"></i> {user.full_name}'s Assessments
          </h2>
          <button onClick={onClose} className="modal-close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="admin-modal-body">
          <div className="user-info-summary">
            <div className="info-item">
              <strong>Email:</strong> {user.email}
            </div>
            <div className="info-item">
              <strong>Company:</strong> {user.company_name || 'N/A'}
            </div>
            <div className="info-item">
              <strong>Company Size:</strong> {user.company_size || 'N/A'}
            </div>
            <div className="info-item">
              <strong>Country:</strong> {user.country || 'N/A'}
            </div>
            <div className="info-item">
              <strong>Industry:</strong> {user.industry || 'N/A'}
            </div>
            <div className="info-item">
              <strong>Job Title:</strong> {user.position || 'N/A'}
            </div>
            <div className="info-item">
              <strong>Phone:</strong> {user.phone_number || 'N/A'}
            </div>
            <div className="info-item">
              <strong>Total Assessments:</strong> {assessments.length}
            </div>
            <div className="info-item">
              <strong>Average Score:</strong> {
                assessments.length > 0
                  ? (assessments.reduce((sum, a) => sum + (a.overall_score || 0), 0) / assessments.length).toFixed(1)
                  : 'N/A'
              }
            </div>
          </div>

          {loading ? (
            <div className="loading-state-mini">
              <i className="fas fa-spinner fa-spin"></i> Loading assessments...
            </div>
          ) : assessments.length === 0 ? (
            <div className="admin-table-empty">
              <i className="fas fa-inbox"></i>
              <p>No assessments found for this user</p>
            </div>
          ) : (
            <div className="assessments-list">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="assessment-card">
                  <div className="assessment-card-header">
                    <div>
                      <h4>{assessment.assessment_type} Assessment</h4>
                      <span className="assessment-industry">
                        <i className="fas fa-industry"></i> {assessment.industry}
                      </span>
                    </div>
                    <div className="assessment-score" style={{ color: getScoreColor(assessment.overall_score) }}>
                      <div className="score-value">{assessment.overall_score}</div>
                      <div className="score-label">Score</div>
                    </div>
                  </div>
                  
                  <div className="assessment-card-body">
                    <div className="assessment-meta">
                      <span>
                        <i className="fas fa-calendar"></i> 
                        Completed: {formatDate(assessment.completed_at)}
                      </span>
                    </div>
                    
                    {assessment.dimension_scores && (() => {
                      try {
                        const dimensions = typeof assessment.dimension_scores === 'string' 
                          ? JSON.parse(assessment.dimension_scores) 
                          : assessment.dimension_scores;
                        
                        if (Array.isArray(dimensions) && dimensions.length > 0) {
                          return (
                            <div className="dimension-scores-preview">
                              <strong>Dimension Scores:</strong>
                              <div className="dimension-chips">
                                {dimensions.slice(0, 4).map((dim, idx) => (
                                  <span key={idx} className="dimension-chip">
                                    {dim.pillar_name}: <strong>{dim.score}</strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      } catch (e) {
                        console.error('Error parsing dimension_scores:', e);
                      }
                      return null;
                    })()}
                  </div>

                  <div className="assessment-card-footer">
                    <button
                      onClick={async () => {
                        try {
                          await onViewDetails(assessment.id);
                          onClose();
                        } catch (err) {
                          console.error('Error viewing assessment:', err);
                        }
                      }}
                      className="btn-secondary btn-sm"
                    >
                      <i className="fas fa-eye"></i> View Full Details
                    </button>
                    <button
                      onClick={() => onExportPDF(assessment.id, user.full_name)}
                      className="btn-primary btn-sm"
                      style={{ marginLeft: '10px' }}
                    >
                      <i className="fas fa-file-pdf"></i> Export PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== Question Modal Component ==========
const QuestionModal = ({ mode, question, assessmentTypes, pillars, onClose, onSuccess }) => {
  // Debug logging
  console.log('🔍 QuestionModal props:', {
    assessmentTypesCount: assessmentTypes?.length || 0,
    pillarsCount: pillars?.length || 0,
    assessmentTypes,
    pillars
  });

  const [formData, setFormData] = useState({
    question_text: question?.question_text || '',
    assessment_type: question?.assessment_type || (assessmentTypes?.[0] || 'CORE'),
    pillar_name: question?.pillar_name || 'Strategy',
    pillar_short_name: question?.pillar_short_name || '',
    question_order: question?.question_order || 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pillarShortNames = {
    'Strategy': 'STRAT',
    'Architecture': 'ARCH',
    'Foundation': 'FOUND',
    'Ethics': 'ETHIC',
    'Culture': 'CULT',
    'Capability': 'CAP',
    'Governance': 'GOV',
    'Performance': 'PERF'
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };
    
    // Auto-update short name when pillar changes
    if (name === 'pillar_name') {
      updates.pillar_short_name = pillarShortNames[value] || value.substring(0, 5).toUpperCase();
    }
    
    setFormData({ ...formData, ...updates });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      console.log('📝 Submitting question form data:', formData);
      if (mode === 'create') {
        const response = await api.post('/api/admin/questions', formData);
        console.log('✅ Question created successfully:', response.data);
        alert('Question created successfully!');
      } else {
        const response = await api.put(`/api/admin/questions/${question.id}`, formData);
        console.log('✅ Question updated successfully:', response.data);
        alert('Question updated successfully!');
      }
      onSuccess();
    } catch (err) {
      console.error('❌ Error saving question:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      setError(err.response?.data?.message || 'Failed to save question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Create New Question' : 'Edit Question'}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Question Text *</label>
              <textarea
                name="question_text"
                value={formData.question_text}
                onChange={handleChange}
                required
                rows="4"
                className="form-textarea"
                placeholder="Enter the question text..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Assessment Type *</label>
                <select
                  name="assessment_type"
                  value={formData.assessment_type}
                  onChange={handleChange}
                  required
                  className="form-select"
                  disabled={!assessmentTypes || assessmentTypes.length === 0}
                >
                  {(!assessmentTypes || assessmentTypes.length === 0) ? (
                    <option value="">Loading assessment types...</option>
                  ) : (
                    assessmentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Pillar *</label>
                <select
                  name="pillar_name"
                  value={formData.pillar_name}
                  onChange={handleChange}
                  required
                  className="form-select"
                  disabled={!pillars || pillars.length === 0}
                >
                  {(!pillars || pillars.length === 0) ? (
                    <option value="">Loading pillars...</option>
                  ) : (
                    pillars.map(pillar => {
                      const pillarName = typeof pillar === 'string' ? pillar : pillar.name;
                      return (
                        <option key={pillarName} value={pillarName}>{pillarName}</option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pillar Short Name *</label>
                <input
                  type="text"
                  name="pillar_short_name"
                  value={formData.pillar_short_name}
                  onChange={handleChange}
                  required
                  maxLength="10"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Question Order *</label>
                <input
                  type="number"
                  name="question_order"
                  value={formData.question_order}
                  onChange={handleChange}
                  required
                  min="1"
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Question' : 'Update Question'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ========== Assessment Detail Modal Component ==========
const AssessmentDetailModal = ({ assessment, onClose }) => {
  const dimensionScores = assessment.dimension_scores ? JSON.parse(assessment.dimension_scores) : [];
  const insights = assessment.insights ? JSON.parse(assessment.insights) : {};
  const responses = assessment.responses ? JSON.parse(assessment.responses) : {};

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
          {dimensionScores.length > 0 && (
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
          )}

          {/* Gap Analysis */}
          {insights.gap_analysis && insights.gap_analysis.length > 0 && (
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
          )}

          {/* Service Recommendations */}
          {insights.service_recommendations && insights.service_recommendations.length > 0 && (
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
          )}

          {/* Risk Assessment */}
          {insights.risk_assessment && insights.risk_assessment.length > 0 && (
            <div className="assessment-risks" style={{ marginBottom: '30px' }}>
              <h3 style={{
                color: '#dc3545',
                marginBottom: '15px',
                fontSize: '20px',
                borderBottom: '2px solid #dc3545',
                paddingBottom: '10px'
              }}>
                <i className="fas fa-shield-alt"></i> Risk Assessment
              </h3>
              <div style={{
                background: '#fff0f0',
                border: '1px solid #dc354530',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#555', lineHeight: '1.8' }}>
                  {insights.risk_assessment.map((risk, idx) => (
                    <li key={idx} style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#dc3545' }}>⚠️</strong> {risk}
                    </li>
                  ))}
                </ul>
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

export default AdminDashboard;
