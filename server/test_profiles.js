import { getProfilesForAssessmentType } from './config/weightProfiles.js';

console.log('Testing getProfilesForAssessmentType...\n');

const advanced = getProfilesForAssessmentType('ADVANCED');
console.log('ADVANCED profiles:', advanced);
console.log('Is array?', Array.isArray(advanced));
console.log('Length:', advanced.length);
console.log('\nFirst profile:', advanced[0]);

const core = getProfilesForAssessmentType('CORE');
console.log('\nCORE profiles count:', core.length);

const frontier = getProfilesForAssessmentType('FRONTIER');
console.log('FRONTIER profiles count:', frontier.length);
