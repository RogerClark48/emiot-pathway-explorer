// Global variables
let network;
let nodes;
let edges;
let allCourses = [];
let allConnections = [];
let selectedCourseId = null;
let currentView = 'forward'; // 'forward' or 'backward'

// DOM elements
const visualization = document.getElementById('visualization');
const levelFilter = document.getElementById('levelFilter');
const providerFilter = document.getElementById('providerFilter');
const subjectFilter = document.getElementById('subjectFilter');
const resetFiltersBtn = document.getElementById('resetFilters');
const detailsPanel = document.getElementById('details');
const noSelectionPanel = document.getElementById('noSelection');
const coursesList = document.getElementById('coursesList');
const forwardViewBtn = document.getElementById('forwardViewBtn');
const backwardViewBtn = document.getElementById('backwardViewBtn');
const courseCardTemplate = document.getElementById('courseCardTemplate');
// DOM elements for resize functionality
const detailsContainer = document.querySelector('.details-container');
const detailsResize = document.getElementById('detailsResize');
const visualizationContainer = document.querySelector('.visualization-container');
const rightColumn = document.querySelector('.right-column');

// Fetch all courses and connections on page load
async function loadData() {
  try {
    // Fetch all courses
    const coursesResponse = await fetch('/api/courses');
    allCourses = await coursesResponse.json();
    
    // Add this line to log courses safely
    console.log('Loaded courses sample:', Array.isArray(allCourses) ? allCourses.slice(0, 3) : allCourses);
    
    // Fetch all connections
    const connectionsResponse = await fetch('/api/connections');
    allConnections = await connectionsResponse.json();
    
    // Populate filter dropdowns
    populateFilterOptions();
    
    // Display course cards
    displayCourseCards();
    
    // Initialize visualization (but don't show it yet)
    createNetworkVisualization();
    
    // Hide visualization initially
    document.querySelector('.visualization-container').style.display = 'none';
    
    // Remember the state of the filters toggle
    loadFiltersState();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Populate filter dropdowns with unique values
function populateFilterOptions() {
  // Get unique providers
  const providers = [...new Set(allCourses.map(course => course.provider))];
  providers.forEach(provider => {
    const option = document.createElement('option');
    option.value = provider;
    option.textContent = provider;
    providerFilter.appendChild(option);
  });
  
  // Get unique subject areas
  const subjects = [...new Set(allCourses.map(course => course.subjectArea).filter(Boolean))];
  subjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    option.textContent = subject;
    subjectFilter.appendChild(option);
  });
}

// Display course cards based on filters
function displayCourseCards() {
  // Clear existing cards
  coursesList.innerHTML = '';
  
  // Get filter values
  const levelValue = levelFilter.value;
  const providerValue = providerFilter.value;
  const subjectValue = subjectFilter.value;
  
  // Filter courses
  const filteredCourses = allCourses.filter(course => 
    (levelValue === '' || course.level == levelValue) &&
    (providerValue === '' || course.provider === providerValue) &&
    (subjectValue === '' || course.subjectArea === subjectValue)
  );
  
  // Create a card for each filtered course
  filteredCourses.forEach(course => {
    const card = createCourseCard(course);
    coursesList.appendChild(card);
  });
  
  // Message if no courses match filters
  if (filteredCourses.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'No courses match these filters.';
    message.style.gridColumn = '1 / -1';
    message.style.textAlign = 'center';
    message.style.padding = '20px';
    coursesList.appendChild(message);
  }
}

// Create a course card
function createCourseCard(course) {
  // Clone the template
  const cardTemplate = courseCardTemplate.content.cloneNode(true);
  const card = cardTemplate.querySelector('.course-card');
  
  // Set card data attributes
  card.dataset.courseId = course.courseId;
  
  // Set Level
  card.querySelector('.level-number').textContent = course.level;
  
  // Set Provider badge
  const providerBadge = card.querySelector('.provider-badge');
  providerBadge.textContent = getProviderShortName(course.provider);
  providerBadge.classList.add(getProviderClass(course.provider));
  
  // Set Course Name
  card.querySelector('.course-name').textContent = course.courseName;
  
  // Set Subject Area
  card.querySelector('.subject-area').textContent = course.subjectArea || '';
  
  // Add card background color based on level
  card.style.borderLeft = `4px solid ${getLevelColor(course.level)}`;
  
  // Add click event to View Pathways button
  const viewBtn = card.querySelector('.view-pathways-btn');
  viewBtn.addEventListener('click', () => {
    selectCourse(course.courseId);
  });
  
  return card;
}

// Get provider short name
function getProviderShortName(provider) {
  if (provider.includes('Derby College')) return 'DCG';
  if (provider.includes('Loughborough College')) return 'LC';
  if (provider.includes('University of Derby')) return 'UoD';
  if (provider.includes('Loughborough University')) return 'LU';
  return provider;
}

// Get provider class for styling
function getProviderClass(provider) {
  if (provider.includes('Derby College')) return 'provider-derby-college';
  if (provider.includes('Loughborough College')) return 'provider-loughborough-college';
  if (provider.includes('University of Derby')) return 'provider-university-derby';
  if (provider.includes('Loughborough University')) return 'provider-loughborough-university';
  return '';
}

// Get color for level
function getLevelColor(level) {
  const colors = {
    3: '#FF9999',
    4: '#FFCC99',
    5: '#FFFF99',
    6: '#99FF99',
    7: '#99CCFF'
  };
  return colors[level] || '#ccc';
}

// Create the network visualization
function createNetworkVisualization() {
  // Options for the network
  const options = {
    layout: {
      hierarchical: {
        direction: 'UD', // Up to down
        sortMethod: 'directed',
        levelSeparation: 150,
        nodeSpacing: 200
      }
    },
    nodes: {
      shape: 'box',
      margin: 10,
      font: {
        size: 14
      }
    },
    edges: {
      arrows: {
        to: { enabled: true, scaleFactor: 1 }
      },
      smooth: {
        type: 'cubicBezier',
        forceDirection: 'vertical'
      }
    },
    physics: {
      hierarchicalRepulsion: {
        nodeDistance: 150
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 200
    }
  };
  
  // Create empty data sets
  nodes = new vis.DataSet([]);
  edges = new vis.DataSet([]);
  
  // Create the network
  const data = { nodes, edges };
  network = new vis.Network(visualization, data, options);
  
  // Event listener for node click
  network.on('click', function(params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      selectCourse(nodeId);
    }
  });
}




// Select a course and show its details and progression pathways
async function selectCourse(courseId) {
  // Find the course
  const course = allCourses.find(c => c.courseId == courseId);
  if (!course) return;

 // Add these debug lines
  console.log('Selected course:', course);
  console.log('Course URL:', course.courseUrl);
 
  // Update selected course
  selectedCourseId = courseId;
  
  // Show visualization container
  document.querySelector('.visualization-container').style.display = 'block';
  

  
 // Show details and hide no selection message
 detailsPanel.classList.remove('hidden');
 noSelectionPanel.classList.add('hidden');
 
 // Make sure resize control is visible
 if (detailsResize) {
   detailsResize.style.display = 'block';
 }

  // Update course details
  document.getElementById('courseTitle').textContent = course.courseName;
  document.getElementById('courseProvider').textContent = course.provider;
  document.getElementById('courseLevel').textContent = course.level;
  document.getElementById('courseSubject').textContent = course.subjectArea || 'N/A';
  document.getElementById('courseQualification').textContent = course.qualificationType || 'N/A';
  
// Update course link
const courseLinkContainer = document.getElementById('courseLinkContainer');
const courseLinkElement = document.getElementById('courseLink');

if (course.courseUrl && course.courseUrl.trim() !== '') {
  courseLinkElement.href = course.courseUrl;
  courseLinkContainer.style.display = 'block';
} else {
  courseLinkContainer.style.display = 'none';
}
  
  // Update visualization based on current view
  updateVisualization();
  
  // Fetch and display progression routes
  await fetchProgressionRoutes(courseId);
}

// Update the visualization based on selected course and view mode
function updateVisualization() {
  // Clear existing nodes and edges
  nodes.clear();
  edges.clear();
  
  if (!selectedCourseId) return;
  
  const course = allCourses.find(c => c.courseId == selectedCourseId);
  if (!course) return;
  
  // Create central node for selected course
  nodes.add({
    id: course.courseId,
    label: course.courseName,
    title: `${course.provider} - ${course.courseName} (Level ${course.level})`,
    level: course.level,
    color: {
      background: getLevelColor(course.level),
      border: '#2B7CE9',
      highlight: {
        background: '#FFC107',
        border: '#FF9800'
      }
    },
    font: {
      bold: true
    },
    borderWidth: 2
  });
  
  // Add relevant connections based on view mode
  if (currentView === 'forward') {
    // Forward view: show where this course leads to
    // Find all connections where this course is the 'from' course
    const outgoingConnections = allConnections.filter(conn => conn.fromCourseId == selectedCourseId);
    
    // Add nodes for destination courses
    outgoingConnections.forEach(conn => {
      const toCourse = allCourses.find(c => c.courseId == conn.toCourseId);
      if (toCourse) {
        // Add node for destination course
        nodes.add({
          id: toCourse.courseId,
          label: toCourse.courseName,
          title: `${toCourse.provider} - ${toCourse.courseName} (Level ${toCourse.level})`,
          level: toCourse.level,
          color: {
            background: getLevelColor(toCourse.level)
          }
        });
        
        // Add edge for the connection
        edges.add({
          from: selectedCourseId,
          to: toCourse.courseId,
          title: conn.notes || 'Progression route'
        });
      }
    });
  } else {
    // Backward view: show what leads to this course
    // Find all connections where this course is the 'to' course
    const incomingConnections = allConnections.filter(conn => conn.toCourseId == selectedCourseId);
    
    // Add nodes for source courses
    incomingConnections.forEach(conn => {
      const fromCourse = allCourses.find(c => c.courseId == conn.fromCourseId);
      if (fromCourse) {
        // Add node for source course
        nodes.add({
          id: fromCourse.courseId,
          label: fromCourse.courseName,
          title: `${fromCourse.provider} - ${fromCourse.courseName} (Level ${fromCourse.level})`,
          level: fromCourse.level,
          color: {
            background: getLevelColor(fromCourse.level)
          }
        });
        
        // Add edge for the connection
        edges.add({
          from: fromCourse.courseId,
          to: selectedCourseId,
          title: conn.notes || 'Progression route'
        });
      }
    });
  }
  
  // Fit the network to view all nodes
  network.fit();
}

// Fetch progression routes for a course
async function fetchProgressionRoutes(courseId) {
  try {
    // Fetch outgoing progression routes
    const progressionResponse = await fetch(`/api/courses/${courseId}/progression`);
    const progressionRoutes = await progressionResponse.json();
    
    // Fetch incoming progression routes
    const precedingResponse = await fetch(`/api/courses/${courseId}/preceding`);
    const precedingRoutes = await precedingResponse.json();
    
    // Update the "leads to" list
    const leadsToList = document.getElementById('leadsTo');
    leadsToList.innerHTML = '';
    if (progressionRoutes.length === 0) {
      leadsToList.innerHTML = '<li class="no-routes">No further progression within EMIOT</li>';
    } else {
      progressionRoutes.forEach(route => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${route.course.courseName}</strong> (Level ${route.course.level}) - ${route.course.provider}`;
        if (route.notes) {
          li.innerHTML += `<br><span class="route-notes">${route.notes}</span>`;
        }
        li.dataset.courseId = route.toId;
        li.addEventListener('click', () => selectCourse(route.toId));
        leadsToList.appendChild(li);
      });
    }
    
    // Update the "coming from" list
    const comingFromList = document.getElementById('comingFrom');
    comingFromList.innerHTML = '';
    if (precedingRoutes.length === 0) {
      comingFromList.innerHTML = '<li class="no-routes">No courses lead here</li>';
    } else {
      precedingRoutes.forEach(route => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${route.course.courseName}</strong> (Level ${route.course.level}) - ${route.course.provider}`;
        if (route.notes) {
          li.innerHTML += `<br><span class="route-notes">${route.notes}</span>`;
        }
        li.dataset.courseId = route.fromId;
        li.addEventListener('click', () => selectCourse(route.fromId));
        comingFromList.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Error fetching progression routes:', error);
  }
}

// Apply filters to the course list
function applyFilters() {
  displayCourseCards();
}

// Reset all filters
function resetFilters() {
  levelFilter.value = '';
  providerFilter.value = '';
  subjectFilter.value = '';
  displayCourseCards();
}

// Switch view mode (forward/backward)
function switchViewMode(mode) {
  currentView = mode;
  
  // Update active button
  if (mode === 'forward') {
    forwardViewBtn.classList.add('active');
    backwardViewBtn.classList.remove('active');
  } else {
    forwardViewBtn.classList.remove('active');
    backwardViewBtn.classList.add('active');
  }
  
  // Update visualization if a course is selected
  if (selectedCourseId) {
    updateVisualization();
  }
}

// Close details panel
function closeDetails() {
  detailsPanel.classList.add('hidden');
  noSelectionPanel.classList.remove('hidden');
  selectedCourseId = null;
  document.querySelector('.visualization-container').style.display = 'none';
  
  // Clear visualization
  nodes.clear();
  edges.clear();
}
// Add these functions to your existing app.js file

// DOM Elements for collapsible filters
const filtersContainer = document.getElementById('filtersContainer');
const filtersHeader = document.getElementById('filtersHeader');
const filtersToggle = document.getElementById('filtersToggle');

// Initialize filters state (expanded by default)
let filtersCollapsed = false;

// Function to toggle filters visibility
function toggleFilters() {
  filtersCollapsed = !filtersCollapsed;
  
  if (filtersCollapsed) {
    // Collapsed state
    filtersContainer.classList.add('collapsed');
    // Don't use innerHTML or classList for the toggle element
    filtersToggle.textContent = '▼'; // Down arrow when collapsed
    localStorage.setItem('emiotFiltersCollapsed', 'true');
  } else {
    // Expanded state
    filtersContainer.classList.remove('collapsed');
    filtersToggle.textContent = '▲'; // Up arrow when expanded
    localStorage.setItem('emiotFiltersCollapsed', 'false');
  }
}





// Add event listener to toggle filters
filtersHeader.addEventListener('click', toggleFilters);

// Remember filters state between sessions
function loadFiltersState() {
  const savedState = localStorage.getItem('emiotFiltersCollapsed');
  
  if (savedState === 'true') {
    // Initialize as collapsed if that was the previous state
    filtersCollapsed = false; // Set to false so toggle will flip it to true
    toggleFilters();
  }
}

// Track expanded state
let detailsExpanded = false;

// Set up details resize functionality
function setupDetailsResize() {
  // Make resize control visible
  if (detailsResize) {
    detailsResize.style.display = 'block';
    
    // Add click handler
    detailsResize.addEventListener('click', toggleDetailsSize);
  }
}

// Toggle details panel size
function toggleDetailsSize() {
  if (!detailsExpanded) {
    // Expand details (make bigger)
    detailsContainer.style.height = '70%';
    visualizationContainer.style.height = '30%';
    detailsResize.innerHTML = '⬇'; // down arrow
    detailsResize.title = 'Reduce details panel';
  } else {
    // Return to normal size
    detailsContainer.style.height = '40%';
    visualizationContainer.style.height = '60%';
    detailsResize.innerHTML = '⬆'; // up arrow
    detailsResize.title = 'Expand details panel';
  }
  
  // Toggle state
  detailsExpanded = !detailsExpanded;
  
  // Save preference
  localStorage.setItem('emiotDetailsExpanded', detailsExpanded.toString());
}

// Load saved preference for details size
function loadDetailsSizePreference() {
  const savedPreference = localStorage.getItem('emiotDetailsExpanded');
  if (savedPreference === 'true') {
    // Apply expanded state
    detailsExpanded = false; // Set to opposite so toggle will set it correctly
    toggleDetailsSize();
  }
}

// Call this function in your initialization
document.addEventListener('DOMContentLoaded', function() {
  setupDetailsResize();
  
  // Add this to the selectCourse function to ensure resize control is visible
  // when a course is selected
});

// Event listeners
levelFilter.addEventListener('change', applyFilters);
providerFilter.addEventListener('change', applyFilters);
subjectFilter.addEventListener('change', applyFilters);
resetFiltersBtn.addEventListener('click', resetFilters);
document.getElementById('closeDetails').addEventListener('click', closeDetails);
forwardViewBtn.addEventListener('click', () => switchViewMode('forward'));
backwardViewBtn.addEventListener('click', () => switchViewMode('backward'));

// Initialize the application
loadData();