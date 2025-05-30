/* ===========================================
   GLOBAL VARIABLES AND INITIALIZATION
   =========================================== */
console.log('app.js loaded');

// Network visualization variables
let network;
let nodes;
let edges;

// Data variables
let allCourses = [];
let allConnections = [];

// State variables
let selectedCourseId = null;
let currentView = 'forward'; // 'forward' or 'backward'
let courseHistory = [];
let historyPointer = -1;
let wishList = [];
let showingWishListOnly = false;
let filtersCollapsed = false;

// Constants
const WISHLIST_STORAGE_KEY = 'emiot-wishlist';

// DOM elements - Core
const visualization = document.getElementById('visualization');
const coursesList = document.getElementById('coursesList');
const courseCardTemplate = document.getElementById('courseCardTemplate');
const detailsPanel = document.getElementById('details');
const noSelectionPanel = document.getElementById('noSelection');

// DOM elements - Filters
const levelFilter = document.getElementById('levelFilter');
const providerFilter = document.getElementById('providerFilter');
const subjectFilter = document.getElementById('subjectFilter');
const resetFiltersBtn = document.getElementById('resetFilters');
const filtersContainer = document.getElementById('filtersContainer');
const filtersHeader = document.getElementById('filtersHeader');
const filtersToggle = document.getElementById('filtersToggle');

// DOM elements - Layout
const detailsContainer = document.querySelector('.details-container');
const detailsResize = document.getElementById('detailsResize');
const visualizationContainer = document.querySelector('.visualization-container');
const rightColumn = document.querySelector('.right-column');

/* ===========================================
   DATA LOADING AND INITIALIZATION
   =========================================== */
async function loadData() {
  try {
    // Fetch all courses
    const coursesResponse = await fetch('/api/courses');
    allCourses = await coursesResponse.json();
    console.log('Loaded courses sample:', Array.isArray(allCourses) ? allCourses.slice(0, 3) : allCourses);
    
    // Fetch all connections
    const connectionsResponse = await fetch('/api/connections');
    allConnections = await connectionsResponse.json();
    
    // Initialize UI
    populateFilterOptions();
    displayCourseCards();
    createNetworkVisualization();
    
    // Hide visualization initially
    document.querySelector('.visualization-container').style.display = 'none';
    
    // Load saved states
    loadFiltersState();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

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

/* ===========================================
   WISHLIST FUNCTIONALITY
   =========================================== */
function loadWishList() {
  const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
  wishList = saved ? JSON.parse(saved) : [];
}

function saveWishList() {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishList));
}

function isInWishList(courseId) {
  return wishList.includes(courseId);
}

function toggleWishList(courseId) {
  const course = allCourses.find(c => c.courseId == courseId);
  if (!course) return;
  
  if (isInWishList(courseId)) {
    wishList = wishList.filter(id => id !== courseId);
  } else {
    wishList.push(courseId);
  }
  
  saveWishList();
  updateWishListUI();
  updateWishListCount();
}

function updateWishListUI() {
  const wishlistBtn = document.getElementById('wishlistBtn');
  const wishlistIcon = wishlistBtn?.querySelector('.wishlist-icon');
  const wishlistText = wishlistBtn?.querySelector('.wishlist-text');
  
  if (selectedCourseId && wishlistBtn) {
    const inWishlist = isInWishList(selectedCourseId);
    
    if (inWishlist) {
      wishlistBtn.classList.add('in-wishlist');
      wishlistIcon.textContent = '♥';
      wishlistText.textContent = 'Remove from Wish List';
    } else {
      wishlistBtn.classList.remove('in-wishlist');
      wishlistIcon.textContent = '♡';
      wishlistText.textContent = 'Add to Wish List';
    }
  }
}

function updateWishListCount() {
  const countElement = document.getElementById('wishlistCount');
  if (countElement) {
    countElement.textContent = wishList.length;
  }
}

function toggleWishListFilter() {
  console.log('toggleWishListFilter called');
  console.log('Current wishList:', wishList);
  console.log('showingWishListOnly before toggle:', showingWishListOnly);
  
  showingWishListOnly = !showingWishListOnly;
  console.log('showingWishListOnly after toggle:', showingWishListOnly);
  
  const btn = document.getElementById('showWishlistBtn');
  if (btn) {
    if (showingWishListOnly) {
      btn.classList.add('active');
      btn.innerHTML = '<span class="wishlist-icon">♥</span> Show All Courses';
      console.log('Button set to "Show All Courses"');
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<span class="wishlist-icon">♡</span> Show Wish List (<span id="wishlistCount">' + wishList.length + '</span>)';
      console.log('Button set to "Show Wish List"');
    }
  }
  
  console.log('About to call displayCourseCards');
  displayCourseCards();
}

/* ===========================================
   COURSE DISPLAY FUNCTIONALITY
   =========================================== */
function displayCourseCards() {
  console.log('displayCourseCards called');
  console.log('showingWishListOnly:', showingWishListOnly);
  console.log('wishList:', wishList);
  
  // Clear existing cards
  coursesList.innerHTML = '';
  
  let filteredCourses;
  
  if (showingWishListOnly) {
    // When showing wishlist, ignore other filters and show all wishlist courses
    console.log('Showing wishlist only - ignoring other filters');
    filteredCourses = allCourses.filter(course => isInWishList(course.courseId));
  } else {
    // Normal filtering when not showing wishlist
    const levelValue = levelFilter.value;
    const providerValue = providerFilter.value;
    const subjectValue = subjectFilter.value;
    
    filteredCourses = allCourses.filter(course => 
      (levelValue === '' || course.level == levelValue) &&
      (providerValue === '' || course.provider === providerValue) &&
      (subjectValue === '' || course.subjectArea === subjectValue)
    );
  }
 
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

function applyFilters() {
  displayCourseCards();
}

function resetFilters() {
  levelFilter.value = '';
  providerFilter.value = '';
  subjectFilter.value = '';
  displayCourseCards();
}

/* ===========================================
   UTILITY FUNCTIONS
   =========================================== */
function getProviderShortName(provider) {
  if (provider.includes('Derby College')) return 'DCG';
  if (provider.includes('Loughborough College')) return 'LC';
  if (provider.includes('University of Derby')) return 'UoD';
  if (provider.includes('Loughborough University')) return 'LU';
  return provider;
}

function getProviderClass(provider) {
  if (provider.includes('Derby College')) return 'provider-derby-college';
  if (provider.includes('Loughborough College')) return 'provider-loughborough-college';
  if (provider.includes('University of Derby')) return 'provider-university-derby';
  if (provider.includes('Loughborough University')) return 'provider-loughborough-university';
  return '';
}

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

/* ===========================================
   NETWORK VISUALIZATION
   =========================================== */
function createNetworkVisualization() {
  // Options for the network
  const options = {
    layout: {
      hierarchical: {
        direction: 'UD',
        sortMethod: 'directed',
        levelSeparation: 150,
        nodeSpacing: 300
      }
    },
    nodes: {
      shape: 'box',
      margin: 10,
      size: 20,
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
    shape: 'box',
    color: {
      background: getLevelColor(course.level),
      border: 'rgb(34, 73, 163)',
      highlight: {
        background: '#FFC107',
        border: '#FF9800'
      }
    },
    font: {
      bold: true,
      size: 24,
      color: '#000000'
    },
    borderWidth: 3,
  });
  
  // Add relevant connections based on view mode
  if (currentView === 'forward') {
    // Forward view: show where this course leads to
    const outgoingConnections = allConnections.filter(conn => conn.fromCourseId == selectedCourseId);
    
    outgoingConnections.forEach(conn => {
      const toCourse = allCourses.find(c => c.courseId == conn.toCourseId);
      if (toCourse) {
        nodes.add({
          id: toCourse.courseId,
          label: toCourse.courseName,
          title: `${toCourse.provider} - ${toCourse.courseName} (Level ${toCourse.level})`,
          level: toCourse.level,
          size: 20,
          color: {
            background: getLevelColor(toCourse.level)
          }
        });
        
        edges.add({
          from: selectedCourseId,
          to: toCourse.courseId,
          title: conn.notes || 'Progression route'
        });
      }
    });
  } else {
    // Backward view: show what leads to this course
    const incomingConnections = allConnections.filter(conn => conn.toCourseId == selectedCourseId);
    
    incomingConnections.forEach(conn => {
      const fromCourse = allCourses.find(c => c.courseId == conn.fromCourseId);
      if (fromCourse) {
        nodes.add({
          id: fromCourse.courseId,
          label: fromCourse.courseName,
          title: `${fromCourse.provider} - ${fromCourse.courseName} (Level ${fromCourse.level})`,
          level: fromCourse.level,
          color: {
            background: getLevelColor(fromCourse.level)
          }
        });
        
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

function switchViewMode(mode) {
  currentView = mode;
  
  // Update selected option in dropdown
  const viewModeSelect = document.getElementById('viewModeSelect');
  if (viewModeSelect) {
    viewModeSelect.value = mode;
  }
  
  // Update visualization if a course is selected
  if (selectedCourseId) {
    updateVisualization();
  }
}

/* ===========================================
   COURSE SELECTION AND HISTORY
   =========================================== */
async function selectCourse(courseId, addToHistory = true) {
  const appContainer = document.querySelector('.app-container');
  const inCompactView = appContainer.classList.contains('compact-view');
  
  // If in compact view, switch back to normal view
  if (inCompactView) {
    appContainer.classList.remove('compact-view');
    document.getElementById('toggleCompactView').textContent = 'Expanded View ▶';
    document.getElementById('toggleCompactView').classList.remove('expanded');
  }
  
  // Find the course
  const course = allCourses.find(c => c.courseId == courseId);
  if (!course) return;
  
  const dummyText = "Specimen text: The core components provide a broad understanding of the digital industry and the breadth of content will help to ensure you are able to apply the skills in a variety of contexts and for a variety of different purposes.Looking at digital infrastructure, digital support and network cabling, you will learn how to apply procedures and controls to maintain the digital security of an organisation and its data. You will also learn how to explain, install, configure, test and manage both physical and virtual infrastructure while discovering, evaluating and applying reliable sources of knowledge.";
  
  console.log('Selected course:', course);
  console.log('Course URL:', course.courseUrl);
  
  // Update selected course
  selectedCourseId = courseId;
  
  // Handle history
  if (addToHistory) {
    console.log("Before adding to history:", {
      courseHistory: [...courseHistory],
      historyPointer,
      newCourseId: courseId
    });
    
    // If we're not at the end of the history, truncate the forward history
    if (historyPointer < courseHistory.length - 1) {
      courseHistory = courseHistory.slice(0, historyPointer + 1);
    }
    
    // Add this course to history if it's different from the current one
    if (historyPointer < 0 || courseHistory[historyPointer] !== courseId) {
      courseHistory.push(courseId);
      historyPointer = courseHistory.length - 1;
    }
    
    console.log("After adding to history:", {
      courseHistory: [...courseHistory],
      historyPointer
    });
    
    updateHistoryButtons();
  }

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
  document.getElementById('courseDescription').textContent = dummyText;
  
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
  
  // Update wishlist UI
  updateWishListUI();
}

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

function closeDetails() {
  detailsPanel.classList.add('hidden');
  noSelectionPanel.classList.remove('hidden');
  selectedCourseId = null;
  document.querySelector('.visualization-container').style.display = 'none';
  
  // Clear visualization
  nodes.clear();
  edges.clear();
}

/* ===========================================
   HISTORY NAVIGATION
   =========================================== */
function goToPreviousCourse() {
  if (historyPointer > 0) {
    historyPointer--;
    selectCourse(courseHistory[historyPointer], false);
    updateHistoryButtons();
  }
}

function goToNextCourse() {
  if (historyPointer < courseHistory.length - 1) {
    historyPointer++;
    selectCourse(courseHistory[historyPointer], false);
    updateHistoryButtons();
  }
}

function updateHistoryButtons() {
  // Get the buttons and indicator
  const prevBtn = document.getElementById('prevCourseBtn');
  const nextBtn = document.getElementById('nextCourseBtn');
  const indicator = document.getElementById('historyIndicator');
  
  // Update disabled state for buttons
  if (prevBtn) {
    prevBtn.disabled = historyPointer <= 0;
  }
  
  if (nextBtn) {
    nextBtn.disabled = historyPointer >= courseHistory.length - 1;
  }
  
  // Update the history indicator
  if (indicator && courseHistory.length > 0) {
    const current = historyPointer + 1;
    const total = courseHistory.length;
    indicator.textContent = `${current} of ${total}`;
    
    // Hide the indicator if there's only one item
    indicator.style.display = total > 1 ? 'flex' : 'none';
  }
}

/* ===========================================
   FILTERS FUNCTIONALITY
   =========================================== */
function toggleFilters() {
  filtersCollapsed = !filtersCollapsed;
  
  if (filtersCollapsed) {
    // Collapsed state
    filtersContainer.classList.add('collapsed');
    filtersToggle.textContent = '▼';
    localStorage.setItem('emiotFiltersCollapsed', 'true');
  } else {
    // Expanded state
    filtersContainer.classList.remove('collapsed');
    filtersToggle.textContent = '▲';
    localStorage.setItem('emiotFiltersCollapsed', 'false');
  }
}

function loadFiltersState() {
  const savedState = localStorage.getItem('emiotFiltersCollapsed');
  
  if (savedState === 'true') {
    // Initialize as collapsed if that was the previous state
    filtersCollapsed = false; // Set to false so toggle will flip it to true
    toggleFilters();
  }
}

/* ===========================================
   UI SETUP FUNCTIONS
   =========================================== */
function setupTabSwitching() {
  const visualTab = document.getElementById('visualTab');
  const detailsTab = document.getElementById('detailsTab');
  const visualContainer = document.getElementById('visualizationContainer');
  const detailsContainer = document.getElementById('detailsContainer');
  const viewModeSelect = document.getElementById('viewModeSelect');
  
  if (!visualTab || !detailsTab) {
    console.log('Tab elements not found');
    return;
  }
  
  visualTab.addEventListener('click', function() {
    visualTab.classList.add('active');
    detailsTab.classList.remove('active');
    visualContainer.classList.add('active');
    detailsContainer.classList.remove('active');
    
    // Make sure dropdown is visible when visualization tab is active
    if (viewModeSelect) {
      viewModeSelect.style.display = 'block';
    }
    
    // Resize network if visible
    if (network && visualContainer.classList.contains('active')) {
      setTimeout(() => network.fit(), 100);
    }
  });
  
  detailsTab.addEventListener('click', function() {
    detailsTab.classList.add('active');
    visualTab.classList.remove('active');
    detailsContainer.classList.add('active');
    visualContainer.classList.remove('active');
    
    // Hide dropdown when details tab is active
    if (viewModeSelect) {
      viewModeSelect.style.display = 'none';
    }
  });
  
  // Set up view mode dropdown
  if (viewModeSelect) {
    viewModeSelect.addEventListener('change', function() {
      switchViewMode(this.value);
    });
    
    // Initially hide dropdown if details tab is active
    if (!visualTab.classList.contains('active')) {
      viewModeSelect.style.display = 'none';
    }
  }
  
  // Debug - check initial state
  console.log('Initial tab state:');
  console.log('- Visual tab active:', visualTab.classList.contains('active'));
  console.log('- Details tab active:', detailsTab.classList.contains('active'));
  console.log('- Details container active:', detailsContainer.classList.contains('active'));
}

function setupCompactViewToggle() {
  // Create the toggle button
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'view-options';
  
  const toggleButton = document.createElement('button');
  toggleButton.id = 'toggleCompactView';
  toggleButton.className = 'compact-toggle';
  toggleButton.textContent = 'Expanded View ▶';
  
  toggleContainer.appendChild(toggleButton);
  
  // Insert before the courses list
  const coursesContainer = document.querySelector('.courses-container');
  if (coursesContainer) {
    // Make sure we don't add it twice
    const existingToggle = document.getElementById('toggleCompactView');
    if (existingToggle) {
      existingToggle.parentNode.removeChild(existingToggle);
    }
    
    coursesContainer.insertBefore(toggleContainer, document.getElementById('coursesList'));
    
    // Add click handler
    toggleButton.addEventListener('click', function() {
      const appContainer = document.querySelector('.app-container');
      const isCurrentlyExpanded = appContainer.classList.contains('compact-view');
      
      if (isCurrentlyExpanded) {
        // Currently expanded full screen, return to split view
        appContainer.classList.remove('compact-view');
        this.textContent = 'Expanded View ▶';
        this.classList.remove('expanded');
        
        // If a course is selected, make sure network is properly displayed
        if (selectedCourseId) {
          setTimeout(() => {
            if (network) network.fit();
          }, 300);
        }
      } else {
        // Currently in normal state, expand to full screen
        appContainer.classList.add('compact-view');
        this.textContent = '◀ Split View';
        this.classList.add('expanded');
      }
    });
  }
}

/* ===========================================
   EVENT LISTENERS AND INITIALIZATION
   =========================================== */
document.addEventListener('DOMContentLoaded', function() {
  // Load wishlist on page load
  loadWishList();
  updateWishListCount();
  
  // Add wishlist event listeners
  const wishlistBtn = document.getElementById('wishlistBtn');
  const showWishlistBtn = document.getElementById('showWishlistBtn');
  
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', () => {
      if (selectedCourseId) {
        toggleWishList(selectedCourseId);
      }
    });
  }
  
  if (showWishlistBtn) {
    showWishlistBtn.addEventListener('click', toggleWishListFilter);
  }
  
  // Filter event listeners
  levelFilter.addEventListener('change', applyFilters);
  providerFilter.addEventListener('change', applyFilters);
  subjectFilter.addEventListener('change', applyFilters);
  resetFiltersBtn.addEventListener('click', resetFilters);
  
  // Filter toggle event listener
  if (filtersHeader) {
    filtersHeader.addEventListener('click', toggleFilters);
  }
  
  // History navigation listeners
  const prevCourseBtn = document.getElementById('prevCourseBtn');
  const nextCourseBtn = document.getElementById('nextCourseBtn');
  
  if (prevCourseBtn) {
    prevCourseBtn.addEventListener('click', () => {
      if (historyPointer > 0) {
        historyPointer--;
        const courseId = courseHistory[historyPointer];
        selectCourse(courseId, false);
        updateHistoryButtons();
      }
    });
  }

  if (nextCourseBtn) {
    nextCourseBtn.addEventListener('click', () => {
      if (historyPointer < courseHistory.length - 1) {
        historyPointer++;
        const courseId = courseHistory[historyPointer];
        selectCourse(courseId, false);
        updateHistoryButtons();
      }
    });
  }

  // View mode dropdown handler
  const viewModeSelect = document.getElementById('viewModeSelect');
  if (viewModeSelect) {
    viewModeSelect.addEventListener('change', function() {
      switchViewMode(this.value);
    });
  }
  
  if (selectedCourseId) {
    updateVisualization();
  }
  
  // Set up color key toggle
  const toggleColorKey = document.getElementById('toggleColorKey');
  const colorKeyPopup = document.getElementById('colorKeyPopup');
  
  if (toggleColorKey && colorKeyPopup) {
    toggleColorKey.addEventListener('click', () => {
      colorKeyPopup.classList.toggle('hidden');
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', (event) => {
      if (!toggleColorKey.contains(event.target) && !colorKeyPopup.contains(event.target)) {
        colorKeyPopup.classList.add('hidden');
      }
    });
  }
  
  // Initialize the application
  loadData();
  
  // Call setup functions
  setupTabSwitching();
  setupCompactViewToggle();
});