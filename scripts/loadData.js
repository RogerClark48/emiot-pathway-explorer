// ===========================================
// UPDATED: scripts/loadData.js - Using Force Sync
// ===========================================

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Course, Connection, KSB, syncDatabase } = require('../models');

async function loadCoursesFromCSV() {
  return new Promise((resolve, reject) => {
    const courses = [];
    const csvPath = path.join(__dirname, '../public/courselist for claude1.csv');
    
    console.log('Loading courses from:', csvPath);
    
    if (!fs.existsSync(csvPath)) {
      console.error('Courses CSV file not found at:', csvPath);
      reject(new Error('Courses CSV file not found'));
      return;
    }
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        courses.push({
          courseId: parseInt(row.CourseId),
          courseName: row['Course Name'],
          provider: row.Provider,
          level: parseInt(row['Course Level']),
          subjectArea: row.Pathway,
          courseUrl: row.Link
        });
      })
      .on('end', () => {
        console.log(`Parsed ${courses.length} courses from CSV`);
        resolve(courses);
      })
      .on('error', reject);
  });
}

async function loadConnectionsFromCSV() {
  return new Promise((resolve, reject) => {
    const connections = [];
    const csvPath = path.join(__dirname, '../public/progressions for claude.csv');
    
    console.log('Loading connections from:', csvPath);
    
    if (!fs.existsSync(csvPath)) {
      console.error('Connections CSV file not found at:', csvPath);
      reject(new Error('Connections CSV file not found'));
      return;
    }
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        connections.push({
          fromCourseId: parseInt(row.FromCourseID),
          toCourseId: parseInt(row.ToCourseID),
          notes: row.Notes
        });
      })
      .on('end', () => {
        console.log(`Parsed ${connections.length} connections from CSV`);
        resolve(connections);
      })
      .on('error', reject);
  });
}

async function loadKSBFromCSV() {
  return new Promise((resolve, reject) => {
    const ksbMappings = [];
    const csvPath = path.join(__dirname, '../public/course_ksbs_standardized.csv');
    
    console.log('Loading KSB data from:', csvPath);
    
    if (!fs.existsSync(csvPath)) {
      console.warn('KSB CSV file not found at:', csvPath);
      console.warn('Skipping KSB data loading - this is optional');
      resolve([]);
      return;
    }
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const parseJSONField = (jsonStr) => {
            try {
              return JSON.parse(jsonStr || '[]');
            } catch (e) {
              return [];
            }
          };

          const ksbRecord = {
            courseId: parseInt(row.CourseId),
            pathway: row.Pathway,
            knowledgeAreas: parseJSONField(row.KnowledgeAreas),
            skillsAreas: parseJSONField(row.SkillsAreas),
            behaviours: parseJSONField(row.Behaviours),
            occupationalStandards: parseJSONField(row.OccupationalStandards),
            careerPathways: parseJSONField(row.CareerPathways),
            overallConfidenceScore: parseInt(row.OverallConfidenceScore) || 0,
            analysisNotes: row.AnalysisNotes || '',
            processedDate: row.ProcessedDate ? new Date(row.ProcessedDate) : null,
            sourceURL: row.SourceURL || '',
            standardizedResponse: row.StandardizedResponse || ''
          };

          if (!isNaN(ksbRecord.courseId)) {
            ksbMappings.push(ksbRecord);
          }
        } catch (error) {
          console.warn('Error parsing KSB row:', error.message);
        }
      })
      .on('end', () => {
        console.log(`Parsed ${ksbMappings.length} KSB mappings from CSV`);
        resolve(ksbMappings);
      })
      .on('error', (error) => {
        console.error('Error reading KSB CSV:', error);
        reject(error);
      });
  });
}

function validateConnections(connections, courses) {
  const courseIds = new Set(courses.map(c => c.courseId));
  const validConnections = [];
  const invalidConnections = [];
  
  connections.forEach(conn => {
    if (isNaN(conn.fromCourseId) || isNaN(conn.toCourseId)) {
      invalidConnections.push({
        ...conn,
        reason: 'Invalid course ID (NaN)',
        fromExists: false,
        toExists: false
      });
      return;
    }
    
    const fromExists = courseIds.has(conn.fromCourseId);
    const toExists = courseIds.has(conn.toCourseId);
    
    if (fromExists && toExists) {
      validConnections.push(conn);
    } else {
      invalidConnections.push({
        ...conn,
        reason: 'Referenced course ID not found',
        fromExists,
        toExists
      });
    }
  });
  
  return { validConnections, invalidConnections };
}

async function loadAllData() {
  try {
    console.log('🚀 Starting data loading process...');
    console.log('CSV files location: /public directory');
    
    // Force sync - this will drop and recreate tables safely
    await syncDatabase(true);
    
    // Load data from CSVs
    console.log('📊 Loading data from CSV files...');
    const [coursesData, connectionsData, ksbData] = await Promise.all([
      loadCoursesFromCSV(),
      loadConnectionsFromCSV(),
      loadKSBFromCSV()
    ]);
    
    // Validate connections
    console.log('🔍 Validating connections...');
    const { validConnections, invalidConnections } = validateConnections(connectionsData, coursesData);
    
    console.log(`✅ Valid connections: ${validConnections.length}`);
    console.log(`❌ Invalid connections: ${invalidConnections.length}`);
    
    if (invalidConnections.length > 0) {
      console.log('\n🚨 INVALID CONNECTIONS FOUND:');
      
      const missingFromIds = [...new Set(invalidConnections.filter(c => !c.fromExists).map(c => c.fromCourseId))];
      const missingToIds = [...new Set(invalidConnections.filter(c => !c.toExists).map(c => c.toCourseId))];
      
      if (missingFromIds.length > 0) {
        console.log(`Missing 'From' Course IDs: ${missingFromIds.sort((a,b) => a-b).join(', ')}`);
      }
      if (missingToIds.length > 0) {
        console.log(`Missing 'To' Course IDs: ${missingToIds.sort((a,b) => a-b).join(', ')}`);
      }
    }
    
    // Insert data (tables are already empty from force sync)
    console.log('\n📚 Inserting courses...');
    await Course.bulkCreate(coursesData, { validate: true });
    
    console.log('🔗 Inserting valid connections...');
    if (validConnections.length > 0) {
      await Connection.bulkCreate(validConnections, { validate: true });
    }
    
    console.log('🎯 Inserting KSB mappings...');
    const validKSBMappings = ksbData.filter(ksb => !isNaN(ksb.courseId));
    if (validKSBMappings.length > 0) {
      await KSB.bulkCreate(validKSBMappings, { validate: true });
    }
    
    // Final verification
    const courseCount = await Course.count();
    const connectionCount = await Connection.count();
    const ksbCount = await KSB.count();
    
    console.log('\n✅ Data loading completed successfully!');
    console.log(`   📚 ${courseCount} courses loaded`);
    console.log(`   🔗 ${connectionCount} connections loaded (${invalidConnections.length} skipped)`);
    console.log(`   🎯 ${ksbCount} KSB mappings loaded`);
    
  } catch (error) {
    console.error('❌ Error loading data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  loadAllData()
    .then(() => {
      console.log('\n🎉 Data loading script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Data loading script failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  loadAllData,
  loadCoursesFromCSV,
  loadConnectionsFromCSV,
  loadKSBFromCSV
};