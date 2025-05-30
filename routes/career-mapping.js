const express = require('express');
const router = express.Router();

// Load the mapping data once at startup
let careerMapping = null;
try {
  careerMapping = require('../ksb_ncs_mapping.json');
  console.log(`Loaded ${Object.keys(careerMapping).length} career mappings`);
} catch (error) {
  console.error('Failed to load career mapping:', error);
  careerMapping = {};
}

// Get full mapping
router.get('/', (req, res) => {
  try {
    res.json(careerMapping);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve career mapping' });
  }
});

// Get specific job title mapping
router.get('/:jobTitle', (req, res) => {
  try {
    const jobTitle = decodeURIComponent(req.params.jobTitle);
    const slug = careerMapping[jobTitle];
    const url = slug ? `https://nationalcareers.service.gov.uk/job-profiles/${slug}` : null;
    
    res.json({
      jobTitle,
      ncsSlug: slug,
      ncsUrl: url,
      hasMapping: slug !== null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process career mapping request' });
  }
});

module.exports = router;