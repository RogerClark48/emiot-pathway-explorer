const { Sequelize, DataTypes } = require('sequelize');

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './emiot.sqlite',
  logging: false // Set to console.log to see SQL queries
});

// Define models
const Course = require('./Course')(sequelize, DataTypes);
const Connection = require('./Connection')(sequelize, DataTypes);

// Define relationships
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

// Sync models with database
const syncDatabase = async () => {
  try {
    await sequelize.sync();
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};

module.exports = {
  sequelize,
  Course,
  Connection,
  syncDatabase
};