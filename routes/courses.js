const express = require('express');
const router = express.Router();
const { Course, Connection } = require('../models');
const { Op } = require('sequelize');

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.findAll({
      order: [['level', 'ASC'], ['provider', 'ASC'], ['courseName', 'ASC']]
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses by level
router.get('/level/:level', async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { level: req.params.level },
      order: [['provider', 'ASC'], ['courseName', 'ASC']]
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific course
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get progression routes from a course
router.get('/:id/progression', async (req, res) => {
  try {
    const connections = await Connection.findAll({
      where: { fromCourseId: req.params.id },
      include: [
        { model: Course, as: 'ToCourse' }
      ]
    });
    
    const progressionRoutes = connections.map(conn => ({
      toId: conn.toCourseId,
      course: conn.ToCourse,
      notes: conn.notes
    }));
    
    res.json(progressionRoutes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses that lead to this course
router.get('/:id/preceding', async (req, res) => {
  try {
    const connections = await Connection.findAll({
      where: { toCourseId: req.params.id },
      include: [
        { model: Course, as: 'FromCourse' }
      ]
    });
    
    const precedingRoutes = connections.map(conn => ({
      fromId: conn.fromCourseId,
      course: conn.FromCourse,
      notes: conn.notes
    }));
    
    res.json(precedingRoutes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;