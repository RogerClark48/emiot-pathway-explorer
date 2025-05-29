// ===========================================
// NEW MODEL: models/KSB.js
// ===========================================

const { DataTypes } = require('sequelize');
const sequelize = require('../database'); // Adjust path to your database config

const KSB = sequelize.define('KSB', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Courses', // Assumes your Course table is called 'Courses'
      key: 'courseId'
    }
  },
  pathway: {
    type: DataTypes.STRING,
    allowNull: true
  },
  knowledgeAreas: {
    type: DataTypes.TEXT, // Store as JSON string
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('knowledgeAreas');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('knowledgeAreas', JSON.stringify(value || []));
    }
  },
  skillsAreas: {
    type: DataTypes.TEXT, // Store as JSON string
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('skillsAreas');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('skillsAreas', JSON.stringify(value || []));
    }
  },
  behaviours: {
    type: DataTypes.TEXT, // Store as JSON string
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('behaviours');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('behaviours', JSON.stringify(value || []));
    }
  },
  occupationalStandards: {
    type: DataTypes.TEXT, // Store as JSON string
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('occupationalStandards');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('occupationalStandards', JSON.stringify(value || []));
    }
  },
  careerPathways: {
    type: DataTypes.TEXT, // Store as JSON string
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('careerPathways');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('careerPathways', JSON.stringify(value || []));
    }
  },
  overallConfidenceScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 10
    }
  },
  analysisNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sourceURL: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  standardizedResponse: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ksb_mappings',
  timestamps: true, // Adds createdAt and updatedAt
  indexes: [
    {
      fields: ['courseId'] // Index for faster lookups
    },
    {
      fields: ['overallConfidenceScore'] // Index for filtering by quality
    }
  ]
});

module.exports = KSB;