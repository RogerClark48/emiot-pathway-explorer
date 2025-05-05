const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { sequelize, Course, Connection } = require('../models');

// Function to read a CSV file and return its contents as an array of objects
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Function to prepare course data from CSV
function prepareCourseData(csvData) {
  return csvData.map(row => ({
    courseId: parseInt(row.CourseId),
    courseName: row['Course Name'],
    provider: row.Provider,
    level: parseInt(row['Course Level']),
    subjectArea: row.Pathway || null,
    qualificationType: getQualificationFromName(row['Course Name']),
    courseUrl: row.Link || null
  }));
}

// Function to extract qualification type from course name
function getQualificationFromName(courseName) {
  if (courseName.includes('T-Level')) return 'T-Level';
  if (courseName.includes('HNC')) return 'HNC';
  if (courseName.includes('HND')) return 'HND';
  if (courseName.includes('BSc')) return 'BSc';
  if (courseName.includes('BEng')) return 'BEng';
  if (courseName.includes('MSc')) return 'MSc';
  if (courseName.includes('Foundation')) return 'Foundation Degree';
  if (courseName.includes('Apprenticeship')) return 'Apprenticeship';
  return null;
}

// Function to prepare connection data from CSV
function prepareConnectionData(csvData) {
  return csvData.map(row => ({
    fromCourseId: parseInt(row.FromCourseID),
    toCourseId: parseInt(row.ToCourseID),
    notes: row.Notes || null
  }));
}

// Main function to load data from CSV files
async function loadData() {
  try {
    // Sync database (force: true will drop tables if they exist)
    await sequelize.sync({ force: true });
    console.log('Database synchronized');
    
    // Read course data from CSV
    const coursesFilePath = path.join(__dirname, '../public/courselist for claude1.csv');
    const coursesCSV = await readCSV(coursesFilePath);
    const courses = prepareCourseData(coursesCSV);
    
    // Insert all courses
    await Course.bulkCreate(courses);
    console.log('Courses data inserted successfully');
    
    // Read connection data from CSV
    const connectionsFilePath = path.join(__dirname, '../public/progressions for claude.csv');
    const connectionsCSV = await readCSV(connectionsFilePath);
    const connections = prepareConnectionData(connectionsCSV);
    
    // Insert all connections
    await Connection.bulkCreate(connections);
    console.log('Connections data inserted successfully');
    
    console.log('All data loaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error loading data:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the function
loadData();