/**
 * Pillar Weight Profiles Configuration
 * Provides pre-defined weight profiles for different strategic focuses
 */

// Validation function to ensure weights sum to 100%
export function validateWeights(weights) {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const tolerance = 0.01; // Allow 0.01% tolerance for rounding
  
  if (Math.abs(total - 100) > tolerance) {
    return {
      valid: false,
      total: total,
      difference: total - 100,
      message: `Weights sum to ${total.toFixed(2)}% instead of 100%`
    };
  }
  
  return {
    valid: true,
    total: total,
    message: 'Weights are valid'
  };
}

// Normalize weights to ensure they sum to exactly 100%
export function normalizeWeights(weights) {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const normalized = {};
  
  Object.keys(weights).forEach(key => {
    normalized[key] = parseFloat(((weights[key] / total) * 100).toFixed(2));
  });
  
  // Adjust the largest weight to account for rounding errors
  const newTotal = Object.values(normalized).reduce((sum, weight) => sum + weight, 0);
  if (newTotal !== 100) {
    const largestKey = Object.keys(normalized).reduce((a, b) => 
      normalized[a] > normalized[b] ? a : b
    );
    normalized[largestKey] += 100 - newTotal;
    normalized[largestKey] = parseFloat(normalized[largestKey].toFixed(2));
  }
  
  return normalized;
}

// Preset weight profiles
export const weightProfiles = {
  balanced: {
    name: 'Balanced',
    description: 'Equal weight across all pillars for comprehensive assessment',
    applicableTo: ['CORE', 'ADVANCED', 'FRONTIER', 'TEST'],
    weights: {
      // 8 pillars
      'Strategy & Leadership': 12.50,
      'Governance & Ethics': 12.50,
      'Data Readiness': 12.50,
      'Technology & Infrastructure': 12.50,
      'Security & Compliance': 12.50,
      'Skills & Talent': 12.50,
      'Culture & Change': 12.50,
      'Value & ROI': 12.50
    }
  },

  strategyFirst: {
    name: 'Strategy-First',
    description: 'Emphasizes strategic alignment and governance',
    applicableTo: ['CORE', 'ADVANCED'],
    weights: {
      'Strategy & Leadership': 25.00,
      'Governance & Ethics': 20.00,
      'Data Readiness': 12.00,
      'Technology & Infrastructure': 12.00,
      'Security & Compliance': 10.00,
      'Skills & Talent': 10.00,
      'Culture & Change': 6.00,
      'Value & ROI': 5.00
    }
  },

  complianceFocused: {
    name: 'Compliance-Focused',
    description: 'Prioritizes ethics, governance, and security',
    applicableTo: ['CORE', 'ADVANCED'],
    weights: {
      'Security & Compliance': 25.00,
      'Governance & Ethics': 25.00,
      'Data Readiness': 15.00,
      'Technology & Infrastructure': 12.00,
      'Strategy & Leadership': 10.00,
      'Culture & Change': 8.00,
      'Skills & Talent': 3.00,
      'Value & ROI': 2.00
    }
  },

  innovationDriven: {
    name: 'Innovation-Driven',
    description: 'Focuses on innovation, technology, and capability',
    applicableTo: ['ADVANCED', 'FRONTIER'],
    weights: {
      'Technology & Infrastructure': 22.00,
      'Strategy & Leadership': 20.00,
      'Data Readiness': 15.00,
      'Skills & Talent': 15.00,
      'Security & Compliance': 10.00,
      'Governance & Ethics': 8.00,
      'Culture & Change': 7.00,
      'Value & ROI': 3.00
    }
  },

  // Industry-specific profiles
  healthcare: {
    name: 'Healthcare',
    description: 'Healthcare industry focus: compliance, ethics, and data quality',
    applicableTo: ['CORE', 'ADVANCED'],
    weights: {
      'Governance & Ethics': 22.00,
      'Security & Compliance': 20.00,
      'Data Readiness': 18.00,
      'Technology & Infrastructure': 12.00,
      'Strategy & Leadership': 10.00,
      'Culture & Change': 8.00,
      'Value & ROI': 6.00,
      'Skills & Talent': 4.00
    }
  },

  financialServices: {
    name: 'Financial Services',
    description: 'Banking and finance: governance, security, and performance',
    applicableTo: ['CORE', 'ADVANCED'],
    weights: {
      'Security & Compliance': 25.00,
      'Governance & Ethics': 20.00,
      'Data Readiness': 15.00,
      'Technology & Infrastructure': 15.00,
      'Value & ROI': 10.00,
      'Strategy & Leadership': 8.00,
      'Culture & Change': 5.00,
      'Skills & Talent': 2.00
    }
  },

  technology: {
    name: 'Technology',
    description: 'Tech sector: innovation, architecture, and talent',
    applicableTo: ['ADVANCED', 'FRONTIER'],
    weights: {
      'Technology & Infrastructure': 22.00,
      'Skills & Talent': 20.00,
      'Data Readiness': 18.00,
      'Strategy & Leadership': 15.00,
      'Security & Compliance': 10.00,
      'Governance & Ethics': 8.00,
      'Culture & Change': 5.00,
      'Value & ROI': 2.00
    }
  },

  manufacturing: {
    name: 'Manufacturing',
    description: 'Manufacturing industry: process, technology, and performance',
    applicableTo: ['CORE', 'ADVANCED'],
    weights: {
      'Technology & Infrastructure': 22.00,
      'Data Readiness': 20.00,
      'Value & ROI': 15.00,
      'Strategy & Leadership': 12.00,
      'Skills & Talent': 12.00,
      'Culture & Change': 8.00,
      'Governance & Ethics': 6.00,
      'Security & Compliance': 5.00
    }
  }
};

// Get applicable profiles for an assessment type
export function getProfilesForAssessmentType(assessmentType) {
  const applicableProfiles = [];
  
  Object.keys(weightProfiles).forEach(key => {
    const profile = weightProfiles[key];
    if (profile.applicableTo.includes(assessmentType.toUpperCase()) || 
        profile.applicableTo.includes('ALL')) {
      applicableProfiles.push({
        key: key,
        ...profile
      });
    }
  });
  
  return applicableProfiles;
}

// Get a specific profile
export function getProfile(profileName) {
  return weightProfiles[profileName] || null;
}

// Apply profile to specific pillars (map generic weights to actual pillar names)
export function applyProfileToPillars(profileName, pillarNames) {
  const profile = getProfile(profileName);
  if (!profile) {
    return null;
  }
  
  const weights = {};
  const profileWeights = profile.weights;
  
  // Try to map profile weights to actual pillar names
  pillarNames.forEach(pillarName => {
    // Exact match
    if (profileWeights[pillarName]) {
      weights[pillarName] = profileWeights[pillarName];
    } else {
      // Default to balanced if not in profile
      weights[pillarName] = 100 / pillarNames.length;
    }
  });
  
  // Normalize to ensure 100%
  return normalizeWeights(weights);
}

export default {
  weightProfiles,
  validateWeights,
  normalizeWeights,
  getProfilesForAssessmentType,
  getProfile,
  applyProfileToPillars
};
