// ===========================================
// UPDATED: models/index.js - Safe Database Sync
// ===========================================

const { Sequelize, DataTypes } = require('sequelize');

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './emiot.sqlite',
  logging: false, // Set to console.log to see SQL queries
  // Add these options for better SQLite support
  define: {
    freezeTableName: true, // Prevent pluralization
    timestamps: false      // Disable automatic timestamps unless needed
  }
});

// Define models using your existing pattern
const Course = require('./Course')(sequelize, DataTypes);
const Connection = require('./Connection')(sequelize, DataTypes);

// NEW: Define KSB model with safer approach
const KSB = sequelize.define('KSB', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // Don't define foreign key constraint in model - we'll handle it manually
  },
  pathway: {
    type: DataTypes.STRING,
    allowNull: true
  },
  knowledgeAreas: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('knowledgeAreas');
      try {
        return rawValue ? JSON.parse(rawValue) : [];
      } catch (e) {
        return [];
      }
    },
    set(value) {
      this.setDataValue('knowledgeAreas', JSON.stringify(value || []));
    }
  },
  skillsAreas: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('skillsAreas');
      try {
        return rawValue ? JSON.parse(rawValue) : [];
      } catch (e) {
        return [];
      }
    },
    set(value) {
      this.setDataValue('skillsAreas', JSON.stringify(value || []));
    }
  },
  behaviours: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('behaviours');
      try {
        return rawValue ? JSON.parse(rawValue) : [];
      } catch (e) {
        return [];
      }
    },
    set(value) {
      this.setDataValue('behaviours', JSON.stringify(value || []));
    }
  },
  occupationalStandards: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('occupationalStandards');
      try {
        return rawValue ? JSON.parse(rawValue) : [];
      } catch (e) {
        return [];
      }
    },
    set(value) {
      this.setDataValue('occupationalStandards', JSON.stringify(value || []));
    }
  },
  careerPathways: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('careerPathways');
      try {
        return rawValue ? JSON.parse(rawValue) : [];
      } catch (e) {
        return [];
      }
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
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ksb_mappings',
  timestamps: true,
  indexes: [
    {
      fields: ['courseId']
    },
    {
      fields: ['overallConfidenceScore']
    }
  ]
});

// Define relationships (keeping your existing ones)
Course.hasMany(Connection, { 
  as: 'OutgoingConnections',
  foreignKey: 'fromCourseId' 
});

Course.hasMany(Connection, { 
  as: 'IncomingConnections',
  foreignKey: 'toCourseId' 
});

Connection.belongsTo(Course, { 
  as: 'FromCourse',
  foreignKey: 'fromCourseId' 
});

Connection.belongsTo(Course, { 
  as: 'ToCourse',
  foreignKey: 'toCourseId' 
});

// NEW KSB associations - using looser association to avoid FK issues
Course.hasOne(KSB, { foreignKey: 'courseId', as: 'KSBData', constraints: false });
KSB.belongsTo(Course, { foreignKey: 'courseId', as: 'Course', constraints: false });

// SAFER sync function
const syncDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    if (force) {
      console.log('⚠️  FORCE MODE: Dropping and recreating all tables...');
      // Drop in correct order (KSB first, then connections, then courses)
      await sequelize.query('PRAGMA foreign_keys = OFF;');
      
      try {
        await KSB.drop({ cascade: true });
        console.log('   Dropped KSB table');
      } catch (e) {
        console.log('   KSB table did not exist');
      }
      
      try {
        await Connection.drop({ cascade: true });
        console.log('   Dropped Connection table');
      } catch (e) {
        console.log('   Connection table did not exist');
      }
      
      try {
        await Course.drop({ cascade: true });
        console.log('   Dropped Course table');
      } catch (e) {
        console.log('   Course table did not exist');
      }
      
      await sequelize.query('PRAGMA foreign_keys = ON;');
    }
    
    // Sync models in correct order
    await Course.sync();
    console.log('   ✅ Course table synchronized');
    
    await Connection.sync();
    console.log('   ✅ Connection table synchronized');
    
    await KSB.sync();
    console.log('   ✅ KSB table synchronized');
    
    console.log('Database synchronized successfully');
    
    return sequelize;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Course,
  Connection,
  KSB,
  syncDatabase
};