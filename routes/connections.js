const express = require('express');
const router = express.Router();
const { Connection, Course } = require('../models');

// Get all connections
router.get('/', async (req, res) => {
  try {
    const connections = await Connection.findAll({
      include: [
        { model: Course, as: 'FromCourse' },
        { model: Course, as: 'ToCourse' }
      ]
    });
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific connection
router.get('/:id', async (req, res) => {
  try {
    const connection = await Connection.findByPk(req.params.id, {
      include: [
        { model: Course, as: 'FromCourse' },
        { model: Course, as: 'ToCourse' }
      ]
    });
    
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    
    res.json(connection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;