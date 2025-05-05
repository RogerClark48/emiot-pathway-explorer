const { sequelize, Course, Connection } = require('../models');

// Sample course data based on our EMIOT portfolio
const courses = [
  // Level 3 Courses
  { courseId: 1, courseName: 'T-Level Construction', provider: 'Derby College Group', level: 3, subjectArea: 'Construction', qualificationType: 'T-Level' },
  { courseId: 2, courseName: 'T-Level Digital Production', provider: 'Derby College Group', level: 3, subjectArea: 'Digital', qualificationType: 'T-Level' },

  // Level 4 Courses
  { courseId: 3, courseName: 'BTEC (HNC) Engineering', provider: 'Loughborough College', level: 4, subjectArea: 'Engineering', qualificationType: 'HNC' },
  { courseId: 4, courseName: 'Higher Apprenticeship - Engineering', provider: 'Loughborough College', level: 4, subjectArea: 'Engineering', qualificationType: 'Higher Apprenticeship' },
  { courseId: 5, courseName: 'HNC Construction Management', provider: 'Derby College Group', level: 4, subjectArea: 'Construction', qualificationType: 'HNC' },
  { courseId: 6, courseName: 'HNC Engineering', provider: 'Derby College Group', level: 4, subjectArea: 'Engineering', qualificationType: 'HNC' },

  // Level 5 Courses
  { courseId: 7, courseName: 'BTEC (HND) Engineering', provider: 'Loughborough College', level: 5, subjectArea: 'Engineering', qualificationType: 'HND' },
  { courseId: 8, courseName: 'BTEC (HND) Computer Systems', provider: 'Loughborough College', level: 5, subjectArea: 'Computing', qualificationType: 'HND' },
  { courseId: 9, courseName: 'FD Integrated Engineering', provider: 'Derby College Group', level: 5, subjectArea: 'Engineering', qualificationType: 'Foundation Degree' },

  // Level 6 Courses
  { courseId: 10, courseName: 'BSc Computer Games', provider: 'University of Derby', level: 6, subjectArea: 'Computing', qualificationType: 'BSc' },
  { courseId: 11, courseName: 'BSc Cyber Security', provider: 'University of Derby', level: 6, subjectArea: 'Computing', qualificationType: 'BSc' },
  { courseId: 12, courseName: 'BSc AI and Data Science', provider: 'University of Derby', level: 6, subjectArea: 'Computing', qualificationType: 'BSc' },
  { courseId: 13, courseName: 'BSc Internet of Things', provider: 'University of Derby', level: 6, subjectArea: 'Computing', qualificationType: 'BSc' },
  { courseId: 14, courseName: 'BSc Engineering (Mechanical)', provider: 'Loughborough College', level: 6, subjectArea: 'Engineering', qualificationType: 'BSc' },
  { courseId: 15, courseName: 'BSc Engineering (Electrical)', provider: 'Loughborough College', level: 6, subjectArea: 'Engineering', qualificationType: 'BSc' },
  { courseId: 16, courseName: 'BSc Sustainable Engineering', provider: 'Loughborough College', level: 6, subjectArea: 'Engineering', qualificationType: 'BSc' },
  { courseId: 17, courseName: 'BEng Electronic Engineering', provider: 'Derby College Group', level: 6, subjectArea: 'Engineering', qualificationType: 'BEng' },
  { courseId: 18, courseName: 'BEng Manufacturing Engineering', provider: 'Derby College Group', level: 6, subjectArea: 'Engineering', qualificationType: 'BEng' },
  { courseId: 19, courseName: 'BEng Mechanical Engineering', provider: 'Derby College Group', level: 6, subjectArea: 'Engineering', qualificationType: 'BEng' },

  // Level 7 Courses
  { courseId: 20, courseName: 'PG-Cert Big Data Analytics', provider: 'University of Derby', level: 7, subjectArea: 'Computing', qualificationType: 'PG-Cert' },
  { courseId: 21, courseName: 'MSc Control and Instrumentation', provider: 'University of Derby', level: 7, subjectArea: 'Engineering', qualificationType: 'MSc' },
  { courseId: 22, courseName: 'MSc Strategic Leadership', provider: 'University of Derby', level: 7, subjectArea: 'Management', qualificationType: 'MSc' },
  { courseId: 23, courseName: 'MSc Data Science', provider: 'Loughborough University', level: 7, subjectArea: 'Computing', qualificationType: 'MSc' },
  { courseId: 24, courseName: 'MSc Renewable Energy Systems', provider: 'Loughborough University', level: 7, subjectArea: 'Engineering', qualificationType: 'MSc' },
  { courseId: 25, courseName: 'MSc Systems Engineering', provider: 'Loughborough University', level: 7, subjectArea: 'Engineering', qualificationType: 'MSc' },
  { courseId: 26, courseName: 'MSc Infrastructure Asset Management', provider: 'Loughborough University', level: 7, subjectArea: 'Engineering', qualificationType: 'MSc' }
];

// Sample progression routes between courses
const connections = [
  // Level 3 to Level 4
  { fromCourseId: 1, toCourseId: 5, notes: 'Direct progression in construction pathway' },

  // Level 3 to Level 6 (T-Level Digital Production to BSc courses)
  { fromCourseId: 2, toCourseId: 10, notes: 'With Merit grade' },
  { fromCourseId: 2, toCourseId: 11, notes: 'With Merit grade' },
  { fromCourseId: 2, toCourseId: 12, notes: 'With Merit in STEM' },
  { fromCourseId: 2, toCourseId: 13, notes: 'With Merit in STEM' },

  // Level 4 to Level 5
  { fromCourseId: 3, toCourseId: 7, notes: 'Direct progression in same discipline' },
  { fromCourseId: 3, toCourseId: 9, notes: 'Cross-institution progression' },
  { fromCourseId: 4, toCourseId: 7, notes: 'With employer support' },
  { fromCourseId: 4, toCourseId: 9, notes: 'With additional requirements' },
  { fromCourseId: 6, toCourseId: 7, notes: 'Cross-institution progression' },
  { fromCourseId: 6, toCourseId: 9, notes: 'Within-institution progression' },

  // Level 5 to Level 6
  { fromCourseId: 7, toCourseId: 14, notes: 'Direct top-up progression' },
  { fromCourseId: 7, toCourseId: 15, notes: 'Direct top-up progression' },
  { fromCourseId: 7, toCourseId: 16, notes: 'With relevant engineering focus' },
  { fromCourseId: 7, toCourseId: 17, notes: 'Cross-institution progression' },
  { fromCourseId: 7, toCourseId: 18, notes: 'Cross-institution progression' },
  { fromCourseId: 7, toCourseId: 19, notes: 'Cross-institution progression' },
  { fromCourseId: 8, toCourseId: 10, notes: 'Cross-institution progression' },
  { fromCourseId: 8, toCourseId: 11, notes: 'Cross-institution progression' },
  { fromCourseId: 8, toCourseId: 12, notes: 'Cross-institution progression' },
  { fromCourseId: 8, toCourseId: 13, notes: 'Cross-institution progression' },
  { fromCourseId: 9, toCourseId: 14, notes: 'Cross-institution progression' },
  { fromCourseId: 9, toCourseId: 15, notes: 'Cross-institution progression' },
  { fromCourseId: 9, toCourseId: 16, notes: 'Cross-institution progression' },
  { fromCourseId: 9, toCourseId: 17, notes: 'Direct progression' },
  { fromCourseId: 9, toCourseId: 18, notes: 'Direct progression' },
  { fromCourseId: 9, toCourseId: 19, notes: 'Direct progression' },

  // Level 6 to Level 7
  { fromCourseId: 10, toCourseId: 20, notes: 'With 2:2 or above' },
  { fromCourseId: 10, toCourseId: 23, notes: 'With sufficient mathematical content' },
  { fromCourseId: 10, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 11, toCourseId: 20, notes: 'With 2:2 or above' },
  { fromCourseId: 11, toCourseId: 23, notes: 'With sufficient mathematical content' },
  { fromCourseId: 11, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 12, toCourseId: 20, notes: 'Direct progression' },
  { fromCourseId: 12, toCourseId: 23, notes: 'Direct progression' },
  { fromCourseId: 12, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 13, toCourseId: 20, notes: 'Direct progression' },
  { fromCourseId: 13, toCourseId: 21, notes: 'With sufficient engineering content' },
  { fromCourseId: 13, toCourseId: 23, notes: 'With sufficient mathematical content' },
  { fromCourseId: 13, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 14, toCourseId: 21, notes: 'Cross-institution progression' },
  { fromCourseId: 14, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 14, toCourseId: 24, notes: 'Cross-institution progression' },
  { fromCourseId: 14, toCourseId: 25, notes: 'Cross-institution progression' },
  { fromCourseId: 14, toCourseId: 26, notes: 'With relevant focus' },
  { fromCourseId: 15, toCourseId: 21, notes: 'Strong subject alignment' },
  { fromCourseId: 15, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 15, toCourseId: 24, notes: 'Cross-institution progression' },
  { fromCourseId: 15, toCourseId: 25, notes: 'Strong subject alignment' },
  { fromCourseId: 16, toCourseId: 24, notes: 'Strong sustainability alignment' },
  { fromCourseId: 16, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 16, toCourseId: 25, notes: 'Cross-institution progression' },
  { fromCourseId: 17, toCourseId: 21, notes: 'Strong discipline alignment' },
  { fromCourseId: 17, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 17, toCourseId: 25, notes: 'Cross-institution progression' },
  { fromCourseId: 18, toCourseId: 21, notes: 'With sufficient control systems knowledge' },
  { fromCourseId: 18, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 18, toCourseId: 25, notes: 'Strong discipline alignment' },
  { fromCourseId: 18, toCourseId: 26, notes: 'With infrastructure focus' },
  { fromCourseId: 19, toCourseId: 21, notes: 'With sufficient control systems knowledge' },
  { fromCourseId: 19, toCourseId: 22, notes: 'With management experience' },
  { fromCourseId: 19, toCourseId: 24, notes: 'Strong discipline alignment' },
  { fromCourseId: 19, toCourseId: 25, notes: 'Cross-institution progression' },
  { fromCourseId: 19, toCourseId: 26, notes: 'With relevant focus' }
];

// Function to load all data
async function loadData() {
  try {
    // Sync database (force: true will drop tables if they exist)
    await sequelize.sync({ force: true });
    console.log('Database synchronized');
    
    // Insert all courses
    await Course.bulkCreate(courses);
    console.log('Courses data inserted successfully');
    
    // Insert all connections
    await Connection.bulkCreate(connections);
    console.log('Connections data inserted successfully');
    
    console.log('All data loaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error loading data:', error);
    process.exit(1);
  }
}

// Run the function
loadData();