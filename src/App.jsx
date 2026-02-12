import { useState, useEffect } from 'react'
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import WelcomeScreen from './components/WelcomeScreen'
import LeadForm from './components/LeadForm'
import AssessmentQuestions from './components/AssessmentQuestions'
import AssessmentResults from './components/AssessmentResults'
import UserDashboard from './components/UserDashboard'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import ChangePassword from './components/ChangePassword'
import api from './services/api'

function App() {
  const [industries, setIndustries] = useState([])
  const [selectedAssessmentType, setSelectedAssessmentType] = useState(
    () => sessionStorage.getItem('assessmentType') || null
  )
  const [selectedIndustry, setSelectedIndustry] = useState(
    () => sessionStorage.getItem('industry') || null
  )
  const [userData, setUserData] = useState(
    () => {
      const saved = sessionStorage.getItem('userData')
      return saved ? JSON.parse(saved) : null
    }
  )
  const [userId, setUserId] = useState(
    () => sessionStorage.getItem('userId') || null
  )
  const [assessmentResults, setAssessmentResults] = useState(
    () => {
      const saved = sessionStorage.getItem('assessmentResults')
      return saved ? JSON.parse(saved) : null
    }
  )

  // Persist state to sessionStorage
  useEffect(() => {
    if (selectedAssessmentType) {
      sessionStorage.setItem('assessmentType', selectedAssessmentType)
    } else {
      sessionStorage.removeItem('assessmentType')
    }
  }, [selectedAssessmentType])

  useEffect(() => {
    if (selectedIndustry) {
      sessionStorage.setItem('industry', selectedIndustry)
    } else {
      sessionStorage.removeItem('industry')
    }
  }, [selectedIndustry])

  useEffect(() => {
    if (userData) {
      sessionStorage.setItem('userData', JSON.stringify(userData))
      sessionStorage.setItem('userId', userData.id || userData.leadId || '')
      setUserId(userData.id || userData.leadId)
    } else {
      sessionStorage.removeItem('userData')
      sessionStorage.removeItem('userId')
    }
  }, [userData])

  useEffect(() => {
    if (assessmentResults) {
      sessionStorage.setItem('assessmentResults', JSON.stringify(assessmentResults))
    } else {
      sessionStorage.removeItem('assessmentResults')
    }
  }, [assessmentResults])

  // Load industries from API
  useEffect(() => {
    const loadIndustries = async () => {
      try {
        const response = await api.get('/api/industries')
        if (response.data && Array.isArray(response.data)) {
          // Extract just the industry names
          const industryNames = response.data.map(ind => ind.name)
          setIndustries(industryNames)
        }
      } catch (error) {
        console.error('Error loading industries:', error)
        // Fallback to defaults if API fails
        setIndustries([
          'Financial Services',
          'Technology',
          'Healthcare',
          'Manufacturing',
          'Retail & E-commerce',
          'Energy & Utilities',
          'Government',
          'Education',
          'Professional Services',
          'Other'
        ])
      }
    }
    loadIndustries()
  }, [])

  const handleLogin = (loginData) => {
    setUserData(loginData.user)
    setUserId(loginData.user.id)
    console.log('User logged in:', loginData)
  }

  const handleLogout = () => {
    console.log('User logging out')
    setUserData(null)
    setUserId(null)
    setSelectedAssessmentType(null)
    setSelectedIndustry(null)
    setAssessmentResults(null)
    sessionStorage.clear()
  }

  const handleLeadSubmit = (submittedLeadData) => {
    setUserId(submittedLeadData.leadId)
    setUserData(submittedLeadData)
  }

  const handleAssessmentComplete = (results) => {
    setAssessmentResults(results)
    console.log('Assessment completed:', results)
  }

  const handleRestart = () => {
    setSelectedAssessmentType(null)
    setSelectedIndustry(null)
    setAssessmentResults(null)
  }

  return (
    <Routes>
      {/* Home / Welcome Screen */}
      <Route 
        path="/" 
        element={
          <WelcomeScreen
            industries={industries}
            selectedAssessmentType={selectedAssessmentType}
            selectedIndustry={selectedIndustry}
            onAssessmentTypeSelect={setSelectedAssessmentType}
            onIndustrySelect={setSelectedIndustry}
            onLogin={handleLogin}
            userData={userData}
          />
        } 
      />

      {/* Lead Registration Form */}
      <Route 
        path="/register" 
        element={
          selectedAssessmentType && selectedIndustry ? (
            <LeadForm
              assessmentType={selectedAssessmentType}
              industry={selectedIndustry}
              onSubmit={handleLeadSubmit}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      {/* User Dashboard */}
      <Route 
        path="/dashboard" 
        element={
          userData ? (
            <UserDashboard
              user={userData}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      {/* Assessment Questions */}
      <Route 
        path="/assessment" 
        element={
          selectedAssessmentType && (userData || userId) ? (
            <AssessmentQuestions
              assessmentType={selectedAssessmentType}
              industry={selectedIndustry}
              userId={userId}
              onComplete={handleAssessmentComplete}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      {/* Assessment Results */}
      <Route 
        path="/results" 
        element={
          assessmentResults ? (
            <AssessmentResults
              results={assessmentResults}
              assessmentType={selectedAssessmentType}
              industry={selectedIndustry}
              userId={userId}
              userData={userData}
              onRestart={handleRestart}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      
      {/* Password Reset Routes */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />
      
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}


export default App
