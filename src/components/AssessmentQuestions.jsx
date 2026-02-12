import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AssessmentQuestions = ({
  assessmentType,
  industry,
  userId,
  onComplete
}) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [startTime] = useState(Date.now());

  // Load questions from API when component mounts
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get(`/api/questions/questions/${assessmentType}`);
        
        // API returns { "questions": [...] }
        if (response.data.questions && response.data.questions.length > 0) {
          // Transform API questions to match our expected format
          const transformedQuestions = response.data.questions.map(q => ({
            id: q.id,
            text: q.question_text,
            type: 'scale'
          }));
          console.log(`✅ Loaded ${transformedQuestions.length} questions from database`);
          setQuestions(transformedQuestions);
        } else {
          setError(`No questions found for ${assessmentType} assessment`);
        }
      } catch (error) {
        console.error('❌ Error loading questions:', error);
        setError(`Failed to load ${assessmentType} questions from server`);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [assessmentType]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = responses[currentQuestion?.id] || null;

  // Calculate live AI maturity score based on answered questions
  const calculateLiveScore = () => {
    let totalScore = 0;
    let answeredQuestions = 0;

    Object.keys(responses).forEach(questionId => {
      const response = responses[questionId];
      if (response !== null && response !== undefined) {
        answeredQuestions++;
        totalScore += parseInt(response);
      }
    });

    if (answeredQuestions === 0) return 0;
    return Math.round((totalScore / (answeredQuestions * 5)) * 100);
  };

  const liveScore = calculateLiveScore();
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(responses).filter(key => responses[key] !== null).length;

  const handleAnswerChange = async (value) => {
    const newResponses = { ...responses, [currentQuestion.id]: value };
    setResponses(newResponses);

    // Save individual response to database if userId is available
    if (userId && currentQuestion.id) {
      try {
        setIsSaving(true);
        const response = await api.post('/api/assessment-response/response', {
          lead_user_id: userId,
          question_id: currentQuestion.id,
          response_value: parseInt(value)
        });
        
        if (response.data.success) {
          console.log(`✅ Saved response for question ${currentQuestion.id}: ${value}`);
        } else {
          console.warn('⚠️ Failed to save response:', response.data.message);
        }
      } catch (error) {
        console.error('❌ Error saving response:', error);
        // Don't block the user experience if saving fails
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleComplete = async () => {
    console.log('🚀 Starting assessment submission...');
    console.log('User ID:', userId);
    console.log('Assessment Type:', assessmentType);
    console.log('Industry:', industry);
    console.log('Total responses:', Object.keys(responses).length);
    
    // Calculate final score
    const finalScore = calculateLiveScore();
    console.log('Final score calculated:', finalScore);
    
    // Generate dimension/pillar scores from responses
    const calculatePillarScores = () => {
      // Group responses by pillar if available in questions data
      // For now, create a simple breakdown
      const pillars = ['Strategy', 'Architecture', 'Foundation', 'Ethics', 'Culture', 'Capability', 'Governance', 'Performance'];
      const questionsPerPillar = Math.ceil(questions.length / 8);
      
      return pillars.map((pillar, index) => {
        const startIdx = index * questionsPerPillar;
        const endIdx = Math.min(startIdx + questionsPerPillar, questions.length);
        const pillarQuestions = questions.slice(startIdx, endIdx);
        
        let pillarTotal = 0;
        let pillarCount = 0;
        
        pillarQuestions.forEach(q => {
          if (responses[q.id]) {
            pillarTotal += parseInt(responses[q.id]);
            pillarCount++;
          }
        });
        
        const pillarScore = pillarCount > 0 ? Math.round((pillarTotal / (pillarCount * 5)) * 100) : 0;
        
        return {
          pillar_name: pillar,
          dimension_name: pillar,
          score: pillarScore
        };
      });
    };
    
    const pillarScores = calculatePillarScores();
    console.log('Pillar scores calculated:', pillarScores.length, 'pillars');
    
    const payload = {
      lead_id: userId,
      assessment_type: assessmentType.toUpperCase(),
      industry: industry,
      overall_score: finalScore,
      responses: responses,
      pillar_scores: pillarScores,
      risk_assessment: [],
      service_recommendations: [],
      gap_analysis: [],
      completion_time_ms: Date.now() - startTime,
      metadata: {
        questions_count: questions.length,
        completed_at: new Date().toISOString()
      }
    };
    
    console.log('📦 Payload prepared:', payload);
    
    // Submit complete assessment to backend
    try {
      setIsSaving(true);
      console.log('📡 Sending POST request to /api/assessments/submit-complete...');
      
      const submitResponse = await api.post('/api/assessments/submit-complete', payload);
      
      console.log('📥 Response received:', submitResponse.data);

      if (submitResponse.data.success) {
        console.log('✅ Assessment submitted successfully');
        
        // Call onComplete with results
        const results = {
          assessmentType,
          industry,
          responses,
          score: finalScore,
          assessmentId: submitResponse.data.assessment_id,
          completedAt: new Date().toISOString()
        };
        onComplete(results);
        // Navigate to results page
        navigate('/results');
      } else {
        console.error('❌ Failed to submit assessment:', submitResponse.data.message);
        alert('Failed to submit assessment. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error submitting assessment:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error headers:', error.response?.headers);
      console.error('❌ Error message:', error.message);
      
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
      alert(`Error submitting assessment: ${errorMsg}\n\nPlease check the console for details.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="assessment-container">
        <div className="assessment-wrapper">
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin"></i>
            <h2>Loading Questions...</h2>
            <p>Please wait while we prepare your assessment.</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="assessment-container">
        <div className="assessment-wrapper">
          <div className="error-state">
            <i className="fas fa-exclamation-circle"></i>
            <h2>Error Loading Questions</h2>
            <p>{error}</p>
            <button className="btn-retry" onClick={() => navigate('/')}>
              <i className="fas fa-arrow-left"></i>
              Back to Welcome
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No Questions State
  if (questions.length === 0) {
    return (
      <div className="assessment-container">
        <div className="assessment-wrapper">
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <h2>No Questions Available</h2>
            <p>Please try again later.</p>
            <button className="btn-retry" onClick={() => navigate('/')}>
              <i className="fas fa-arrow-left"></i>
              Back to Welcome
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assessment-container">
      <div className="assessment-wrapper">
        {/* Header */}
        <div className="assessment-header">
          <button 
            className="btn-back-home"
            onClick={() => navigate('/')}
            title="Return to Home"
          >
            <i className="fas fa-arrow-left"></i>
            Back to Home
          </button>
          <h1 className="assessment-title">SAFE-8 AI Readiness Assessment</h1>
          <p className="assessment-subtitle">{assessmentType.toUpperCase()} Level • {industry}</p>
        </div>

        {/* Live Score Banner */}
        <div className="score-banner">
          <div className="score-banner-content">
            <div className="score-info">
              <h3 className="score-label">Live AI Maturity Score</h3>
              <p className="score-description">Updated in real-time as you answer</p>
            </div>
            <div className="score-display">{liveScore}%</div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="assessment-progress-section">
          <div className="progress-header">
            <span className="progress-label">Progress</span>
            <span className="progress-count">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-stats">
            <span className="stat-item">
              <i className="fas fa-check-circle"></i>
              {answeredCount} Answered
            </span>
            <span className="stat-item">
              <i className="fas fa-clock"></i>
              {questions.length - answeredCount} Remaining
            </span>
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <div className="question-section">
            <div className="question-card">
              <div className="question-number">Question {currentQuestionIndex + 1}</div>
              <h3 className="question-text">{currentQuestion.text}</h3>
              
              <div className="likert-scale">
                {[
                  { value: 1, text: 'Strongly Disagree', icon: 'fa-times-circle' },
                  { value: 2, text: 'Disagree', icon: 'fa-minus-circle' },
                  { value: 3, text: 'Neutral', icon: 'fa-circle' },
                  { value: 4, text: 'Agree', icon: 'fa-plus-circle' },
                  { value: 5, text: 'Strongly Agree', icon: 'fa-check-circle' }
                ].map(option => (
                  <div
                    key={option.value}
                    className={`likert-option ${currentAnswer === option.value ? 'selected' : ''} ${isSaving ? 'disabled' : ''}`}
                    onClick={() => !isSaving && handleAnswerChange(option.value)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={currentAnswer === option.value}
                  >
                    <div className="option-icon">
                      <i className={`fas ${option.icon}`}></i>
                    </div>
                    <div className="option-value">{option.value}</div>
                    <div className="option-label">{option.text}</div>
                  </div>
                ))}
              </div>

              {isSaving && (
                <div className="saving-indicator">
                  <i className="fas fa-spinner fa-spin"></i>
                  Saving response...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="assessment-actions">
          <button 
            className="btn-previous"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <i className="fas fa-arrow-left"></i>
            Previous
          </button>
          
          {currentQuestionIndex < questions.length - 1 ? (
            <button 
              className="btn-next"
              onClick={handleNext}
              disabled={!currentAnswer || isSaving}
            >
              Next
              <i className="fas fa-arrow-right"></i>
            </button>
          ) : (
            <button 
              className="btn-complete"
              onClick={handleComplete}
              disabled={answeredCount < questions.length || isSaving}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Submitting...
                </>
              ) : (
                <>
                  Complete Assessment
                  <i className="fas fa-flag-checkered"></i>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentQuestions;
