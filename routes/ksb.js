const express = require('express');
const router = express.Router();
const { KSB, Course } = require('../models');
const { Op } = require('sequelize');

// GET /api/ksb/mappings - Get all KSB mappings (what your mobile app calls)
router.get('/mappings', async (req, res) => {
  try {
    const ksbMappings = await KSB.findAll({
      include: [{
        model: Course,
        as: 'Course',
        attributes: ['courseId', 'courseName', 'provider', 'level', 'subjectArea']
      }],
      order: [['courseId', 'ASC']]
    });
    
    // Transform data to match what your mobile app expects
    const transformedData = ksbMappings.map(ksb => ({
      CourseId: ksb.courseId,
      CourseName: ksb.Course?.courseName || '',
      Provider: ksb.Course?.provider || '',
      Level: ksb.Course?.level || 0,
      Pathway: ksb.pathway || '',
      KnowledgeAreas: JSON.stringify(ksb.knowledgeAreas),
      SkillsAreas: JSON.stringify(ksb.skillsAreas),
      Behaviours: JSON.stringify(ksb.behaviours),
      OccupationalStandards: JSON.stringify(ksb.occupationalStandards),
      CareerPathways: JSON.stringify(ksb.careerPathways),
      OverallConfidenceScore: ksb.overallConfidenceScore,
      AnalysisNotes: ksb.analysisNotes,
      ProcessedDate: ksb.processedDate,
      SourceURL: ksb.sourceURL,
      StandardizedResponse: ksb.standardizedResponse
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching KSB mappings:', error);
    res.status(500).json({ error: 'Failed to fetch KSB mappings' });
  }
});

// GET /api/ksb/mappings/:courseId - Get KSB data for specific course
router.get('/mappings/:courseId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    
    const ksbMapping = await KSB.findOne({
      where: { courseId },
      include: [{
        model: Course,
        as: 'Course',
        attributes: ['courseId', 'courseName', 'provider', 'level', 'subjectArea']
      }]
    });
    
    if (!ksbMapping) {
      return res.status(404).json({ message: 'KSB data not found for this course' });
    }
    
    // Transform to match expected format
    const transformedData = {
      CourseId: ksbMapping.courseId,
      CourseName: ksbMapping.Course?.courseName || '',
      Provider: ksbMapping.Course?.provider || '',
      Level: ksbMapping.Course?.level || 0,
      Pathway: ksbMapping.pathway || '',
      KnowledgeAreas: JSON.stringify(ksbMapping.knowledgeAreas),
      SkillsAreas: JSON.stringify(ksbMapping.skillsAreas),
      Behaviours: JSON.stringify(ksbMapping.behaviours),
      OccupationalStandards: JSON.stringify(ksbMapping.occupationalStandards),
      CareerPathways: JSON.stringify(ksbMapping.careerPathways),
      OverallConfidenceScore: ksbMapping.overallConfidenceScore,
      AnalysisNotes: ksbMapping.analysisNotes,
      ProcessedDate: ksbMapping.processedDate,
      SourceURL: ksbMapping.sourceURL,
      StandardizedResponse: ksbMapping.standardizedResponse
    };
    
    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching course KSB data:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ksb/skills - Get all unique skills
router.get('/skills', async (req, res) => {
  try {
    const ksbMappings = await KSB.findAll({
      attributes: ['skillsAreas'],
      where: {
        skillsAreas: { [Op.not]: null }
      }
    });
    
    const allSkills = new Set();
    
    ksbMappings.forEach(mapping => {
      const skills = mapping.skillsAreas; // Already parsed by getter
      skills.forEach(skill => {
        if (skill.description) {
          allSkills.add(skill.description);
        }
      });
    });
    
    res.json(Array.from(allSkills).sort());
  } catch (error) {
    console.error('Error extracting skills:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ksb/careers - Get all unique career pathways
router.get('/careers', async (req, res) => {
  try {
    const ksbMappings = await KSB.findAll({
      attributes: ['careerPathways'],
      where: {
        careerPathways: { [Op.not]: null }
      }
    });
    
    const allCareers = new Map();
    
    ksbMappings.forEach(mapping => {
      const careers = mapping.careerPathways; // Already parsed by getter
      careers.forEach(career => {
        if (career.role) {
          const key = career.role;
          if (!allCareers.has(key) || career.confidence > allCareers.get(key).confidence) {
            allCareers.set(key, {
              role: career.role,
              level: career.level,
              confidence: career.confidence
            });
          }
        }
      });
    });
    
    res.json(Array.from(allCareers.values()).sort((a, b) => a.role.localeCompare(b.role)));
  } catch (error) {
    console.error('Error extracting careers:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ksb/search - Advanced KSB search
router.post('/search', async (req, res) => {
  try {
    const { query, searchType = 'all', minConfidence = 0 } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const ksbMappings = await KSB.findAll({
      where: {
        overallConfidenceScore: { [Op.gte]: minConfidence }
      },
      include: [{
        model: Course,
        as: 'Course',
        attributes: ['courseId', 'courseName', 'provider', 'level', 'subjectArea']
      }]
    });
    
    const queryLower = query.toLowerCase();
    const results = [];
    
    ksbMappings.forEach(ksb => {
      const matches = findMatches(ksb, queryLower, searchType);
      if (matches.score > 0) {
        results.push({
          course: {
            CourseId: ksb.courseId,
            CourseName: ksb.Course?.courseName || '',
            Provider: ksb.Course?.provider || '',
            Level: ksb.Course?.level || 0,
            Pathway: ksb.pathway || ''
          },
          matchScore: matches.score,
          matchReasons: matches.reasons,
          confidenceScore: ksb.overallConfidenceScore
        });
      }
    });
    
    // Sort by match score and confidence
    results.sort((a, b) => {
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return b.confidenceScore - a.confidenceScore;
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error performing KSB search:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to find matches in KSB data
function findMatches(ksb, query, searchType) {
  const matches = { score: 0, reasons: [] };
  const queryWords = query.split(' ').filter(word => word.length > 2);
  
  // Search in different areas based on searchType
  if (searchType === 'all' || searchType === 'knowledge') {
    const score = searchInArray(ksb.knowledgeAreas, queryWords, 'Knowledge');
    matches.score += score.score * 0.8;
    matches.reasons.push(...score.reasons);
  }
  
  if (searchType === 'all' || searchType === 'skills') {
    const score = searchInArray(ksb.skillsAreas, queryWords, 'Skill');
    matches.score += score.score * 1.0;
    matches.reasons.push(...score.reasons);
  }
  
  if (searchType === 'all' || searchType === 'careers') {
    const score = searchInArray(ksb.careerPathways, queryWords, 'Career', 'role');
    matches.score += score.score * 0.9;
    matches.reasons.push(...score.reasons);
  }
  
  if (searchType === 'all' || searchType === 'behaviours') {
    const score = searchInArray(ksb.behaviours, queryWords, 'Behaviour');
    matches.score += score.score * 0.7;
    matches.reasons.push(...score.reasons);
  }
  
  // Limit reasons to top 3
  matches.reasons = matches.reasons.slice(0, 3);
  
  return matches;
}

// Helper function to search within an array field
function searchInArray(items, queryWords, fieldType, searchProperty = 'description') {
  const result = { score: 0, reasons: [] };
  
  if (!Array.isArray(items)) return result;
  
  items.forEach(item => {
    const searchText = item[searchProperty];
    if (!searchText) return;
    
    const textLower = searchText.toLowerCase();
    let itemScore = 0;
    
    queryWords.forEach(word => {
      if (textLower.includes(word)) {
        itemScore += 1;
      }
    });
    
    if (itemScore > 0) {
      result.score += itemScore / queryWords.length;
      result.reasons.push(`${fieldType}: ${searchText}`);
    }
  });
  
  return result;
}

module.exports = router;