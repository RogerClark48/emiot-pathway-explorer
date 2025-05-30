/* ===========================================
   ENHANCED MOBILE PATHWAY EXPLORER WITH SKILLS DISCOVERY
   =========================================== */

class EnhancedPathwayExplorer {
  constructor() {
    // Data
    this.courses = [];
    this.connections = [];
    this.ksbData = {}; // Will store KSB mappings by courseId
    this.filteredCourses = [];
    
    // State
    this.currentTab = 'browse';
    this.wishlist = this.loadWishlist();
    this.showingWishlistOnly = false;
    this.filtersCollapsed = true;
    this.selectedCourse = null;
    this.currentView = 'forward';
    this.searchMode = 'traditional'; // 'traditional' or 'skills'
    this.lastSearchQuery = '';
    this.ncsJobMappings = null; // ADD THIS LINE
    // DOM elements
    this.elements = {
      // Enhanced search elements
      searchToggle: document.getElementById('searchToggle'),
      searchBar: document.getElementById('searchBar'),
      searchInput: document.getElementById('searchInput'),
      searchClose: document.getElementById('searchClose'),
      searchModeToggle: document.getElementById('searchModeToggle'),
      skillsSuggestions: document.getElementById('skillsSuggestions'),
      
      // Existing elements
      filtersSection: document.getElementById('filtersSection'),
      filtersToggle: document.getElementById('filtersToggle'),
      filtersContent: document.getElementById('filtersContent'),
      levelFilter: document.getElementById('levelFilter'),
      providerFilter: document.getElementById('providerFilter'),
      subjectFilter: document.getElementById('subjectFilter'),
      clearFilters: document.getElementById('clearFilters'),
      
      coursesGrid: document.getElementById('coursesGrid'),
      wishlistToggle: document.getElementById('wishlistToggle'),
      wishlistCount: document.getElementById('wishlistCount'),
      loadingState: document.getElementById('loadingState'),
      emptyState: document.getElementById('emptyState'),
      
      // Modal elements
      modalOverlay: document.getElementById('modalOverlay'),
      courseModal: document.getElementById('courseModal'),
      backBtn: document.getElementById('backBtn'),
      modalTitle: document.getElementById('modalTitle'),
      modalContent: document.getElementById('modalContent'),
      modalWishlistBtn: document.getElementById('modalWishlistBtn'),
      
      // Navigation
      bottomNav: document.querySelector('.bottom-nav'),
      navItems: document.querySelectorAll('.nav-item'),
      
      courseCardTemplate: document.getElementById('courseCardTemplate')
    };
    
    this.init();
  }

  /* ===========================================
     INITIALIZATION
     =========================================== */
/* ===========================================
   INITIALIZATION - FIXED
   =========================================== */
/* ===========================================
   INITIALIZATION - FIXED WITH PROPER FILTER STATE
   =========================================== */
async init() {
  try {
    this.showLoading(true);
    await this.loadData();
    await this.loadKSBData();
    await this.loadCareerMapping();
    this.setupEventListeners();
    this.updateWishlistCount();
    
    // Initialize with all courses visible
    this.filteredCourses = [...this.courses];
    this.displayCourses();
    
    // FIX: Initialize filters in collapsed state
    this.initializeFilterState();
    
    this.showLoading(false);
  } catch (error) {
    console.error('Failed to initialize app:', error);
    this.showError('Failed to load courses. Please try again.');
  }
}
  
async loadCareerMapping() {
  try {
    console.log('Loading career mapping...');
    const response = await fetch('/api/career-mapping');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    this.careerMapping = await response.json();
    console.log(`Loaded ${Object.keys(this.careerMapping).length} career mappings`);
  } catch (error) {
    console.warn('Failed to load career mapping:', error);
    this.careerMapping = {};
  }
}


findNCSUrl(jobTitle) {
  const slug = this.careerMapping[jobTitle];
  return slug ? `https://nationalcareers.service.gov.uk/job-profiles/${slug}` : null;
}


setupPathwayHandlers() {
  // Add click handlers for pathway navigation
  const pathwayItems = this.elements.modalContent.querySelectorAll('.pathway-item[data-course-id]');
  pathwayItems.forEach(item => {
    item.addEventListener('click', () => {
      const courseId = parseInt(item.dataset.courseId);
      const course = this.courses.find(c => c.courseId === courseId);
      if (course) {
        this.openCourseModal(course);
      }
    });
  });
}
initializeFilterState() {
  // Set initial collapsed state
  this.filtersCollapsed = true;
  
  // Apply collapsed styling immediately
  this.elements.filtersSection.classList.add('collapsed');
  
  // Set toggle arrow to collapsed state
  const filtersArrow = this.elements.filtersSection.querySelector('.filters-arrow');
  if (filtersArrow) {
    filtersArrow.textContent = '▼';  // Pointing down when collapsed
  }
  
  console.log('Filters initialized in collapsed state');
}
  async loadData() {
    try {
      // Load courses (existing)
      const coursesResponse = await fetch('/api/courses');
      if (!coursesResponse.ok) throw new Error('Failed to fetch courses');
      this.courses = await coursesResponse.json();
      
      // Load connections (existing)
      const connectionsResponse = await fetch('/api/connections');
      if (!connectionsResponse.ok) throw new Error('Failed to fetch connections');
      this.connections = await connectionsResponse.json();
      
      // Populate filter options (existing)
      this.populateFilters();
      
      console.log(`Loaded ${this.courses.length} courses and ${this.connections.length} connections`);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  async loadKSBData() {
    try {
      // FIXED: Correct endpoint URL
      const ksbResponse = await fetch('/api/ksb/mappings');
      if (ksbResponse.ok) {
        const ksbMappings = await ksbResponse.json();
        
        // Index KSB data by courseId for quick lookup
        this.ksbData = {};
        ksbMappings.forEach(mapping => {
          this.ksbData[mapping.CourseId] = {
            knowledgeAreas: this.parseJSONField(mapping.KnowledgeAreas),
            skillsAreas: this.parseJSONField(mapping.SkillsAreas),
            behaviours: this.parseJSONField(mapping.Behaviours),
            occupationalStandards: this.parseJSONField(mapping.OccupationalStandards),
            careerPathways: this.parseJSONField(mapping.CareerPathways),
            confidenceScore: parseInt(mapping.OverallConfidenceScore) || 0,
            analysisNotes: mapping.AnalysisNotes || ''
          };
        });
        
        console.log(`Loaded KSB data for ${Object.keys(this.ksbData).length} courses`);
      } else {
        console.warn('KSB data not available - falling back to traditional search');
      }
    } catch (error) {
      console.warn('Could not load KSB data:', error);
    }
  }

  parseJSONField(jsonString) {
    try {
      return JSON.parse(jsonString || '[]');
    } catch (e) {
      return [];
    }
  }

  /* ===========================================
     WISHLIST FUNCTIONALITY
     =========================================== */
  loadWishlist() {
    try {
      const saved = localStorage.getItem('emiot-wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Failed to load wishlist:', error);
      return [];
    }
  }

  saveWishlist() {
    try {
      localStorage.setItem('emiot-wishlist', JSON.stringify(this.wishlist));
    } catch (error) {
      console.warn('Failed to save wishlist:', error);
    }
  }

  toggleWishlist(courseId) {
    if (!courseId) return;
    
    const index = this.wishlist.indexOf(courseId);
    if (index > -1) {
      this.wishlist.splice(index, 1);
    } else {
      this.wishlist.push(courseId);
    }
    
    this.saveWishlist();
    this.updateWishlistCount();
    this.updateWishlistButtons();
    
    // Refresh display if showing wishlist only
    if (this.showingWishlistOnly) {
      this.displayCourses();
    }
  }

  updateWishlistCount() {
    this.elements.wishlistCount.textContent = this.wishlist.length;
  }

  updateWishlistButtons() {
    // Update all wishlist buttons
    document.querySelectorAll('.card-wishlist-btn').forEach(btn => {
      const card = btn.closest('.course-card');
      const courseId = parseInt(card.dataset.courseId);
      this.updateWishlistButton(btn, courseId);
    });
    
    // Update modal wishlist button
    if (this.selectedCourse) {
      this.updateWishlistButton(this.elements.modalWishlistBtn, this.selectedCourse.courseId);
    }
  }

  updateWishlistButton(button, courseId) {
    const isInWishlist = this.wishlist.includes(courseId);
    const heartIcon = button.querySelector('.heart-icon');
    
    if (isInWishlist) {
      button.classList.add('active');
      heartIcon.textContent = '♥';
      button.setAttribute('aria-label', 'Remove from wishlist');
    } else {
      button.classList.remove('active');
      heartIcon.textContent = '♡';
      button.setAttribute('aria-label', 'Add to wishlist');
    }
  }

  toggleWishlistView() {
    this.showingWishlistOnly = !this.showingWishlistOnly;
    
    const toggle = this.elements.wishlistToggle;
    const heartIcon = toggle.querySelector('.heart-icon');
    
    if (this.showingWishlistOnly) {
      toggle.classList.add('active');
      heartIcon.textContent = '♥';
      toggle.setAttribute('aria-label', 'Show all courses');
    } else {
      toggle.classList.remove('active');
      heartIcon.textContent = '♡';
      toggle.setAttribute('aria-label', 'Show wishlist only');
    }
    
    this.applyFilters();
  }

  /* ===========================================
     BASIC FUNCTIONALITY
     =========================================== */
  populateFilters() {
    // Get unique providers
    const providers = [...new Set(this.courses.map(course => course.provider))];
    
    // Clear existing options (except first one)
    this.elements.providerFilter.innerHTML = '<option value="">All Providers</option>';
    
    // Add provider options
    providers.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = this.getProviderShortName(provider);
      this.elements.providerFilter.appendChild(option);
    });
    
    // Get unique subjects
    const subjects = [...new Set(this.courses.map(course => course.subjectArea).filter(Boolean))];
    
    // Clear existing options (except first one)
    this.elements.subjectFilter.innerHTML = '<option value="">All Subjects</option>';
    
    // Add subject options
    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      this.elements.subjectFilter.appendChild(option);
    });
  }

  // applyFilters() {
  //   const searchQuery = this.elements.searchInput.value.toLowerCase().trim();
  //   const levelFilter = this.elements.levelFilter.value;
  //   const providerFilter = this.elements.providerFilter.value;
  //   const subjectFilter = this.elements.subjectFilter.value;
    
  //   this.filteredCourses = this.courses.filter(course => {
  //     // Search filter
  //     if (searchQuery && !course.courseName.toLowerCase().includes(searchQuery) &&
  //         !course.subjectArea?.toLowerCase().includes(searchQuery)) {
  //       return false;
  //     }
      
  //     // Level filter
  //     if (levelFilter && course.level != levelFilter) {
  //       return false;
  //     }
      
  //     // Provider filter
  //     if (providerFilter && course.provider !== providerFilter) {
  //       return false;
  //     }
      
  //     // Subject filter
  //     if (subjectFilter && course.subjectArea !== subjectFilter) {
  //       return false;
  //     }
      
  //     // Wishlist filter
  //     if (this.showingWishlistOnly && !this.wishlist.includes(course.courseId)) {
  //       return false;
  //     }
      
  //     return true;
  //   });

  //   this.displayCourses();
  // }
/* ===========================================
   FILTER LOGIC - FIXED
   =========================================== */
applyFilters() {
  const searchQuery = this.elements.searchInput.value.toLowerCase().trim();
  const levelFilter = this.elements.levelFilter.value;
  const providerFilter = this.elements.providerFilter.value;
  const subjectFilter = this.elements.subjectFilter.value;
  
  // Check if any filters are actually active
  const hasActiveFilters = searchQuery || levelFilter || providerFilter || subjectFilter;
  
  if (!hasActiveFilters && !this.showingWishlistOnly) {
    // No filters active - show all courses
    this.filteredCourses = [...this.courses];
  } else {
    // Apply filtering
    this.filteredCourses = this.courses.filter(course => {
      // Search filter
      if (searchQuery && !course.courseName.toLowerCase().includes(searchQuery) &&
          !course.subjectArea?.toLowerCase().includes(searchQuery)) {
        return false;
      }
      
      // Level filter
      if (levelFilter && course.level != levelFilter) {
        return false;
      }
      
      // Provider filter
      if (providerFilter && course.provider !== providerFilter) {
        return false;
      }
      
      // Subject filter
      if (subjectFilter && course.subjectArea !== subjectFilter) {
        return false;
      }
      
      return true;
    });
  }
  
  this.displayCourses();
}

/* ===========================================
   DISPLAY LOGIC - FIXED
   =========================================== */
displayCourses() {
  let coursesToShow;
  
  if (this.showingWishlistOnly) {
    coursesToShow = this.courses.filter(course => this.wishlist.includes(course.courseId));
  } else {
    // Use filteredCourses if they exist, otherwise show all courses
    coursesToShow = this.filteredCourses.length > 0 ? this.filteredCourses : this.courses;
  }
  
  // Clear grid
  this.elements.coursesGrid.innerHTML = '';
  
  // Show empty state if no courses
  if (coursesToShow.length === 0) {
    this.elements.emptyState.classList.remove('hidden');
    return;
  } else {
    this.elements.emptyState.classList.add('hidden');
  }
  
  // Create course cards
  coursesToShow.forEach(course => {
    const card = this.createCourseCard(course);
    this.elements.coursesGrid.appendChild(card);
  });
}/* ===========================================
   DISPLAY LOGIC - FIXED
   =========================================== */
displayCourses() {
  let coursesToShow;
  
  if (this.showingWishlistOnly) {
    coursesToShow = this.courses.filter(course => this.wishlist.includes(course.courseId));
  } else {
    // Use filteredCourses if they exist, otherwise show all courses
    coursesToShow = this.filteredCourses.length > 0 ? this.filteredCourses : this.courses;
  }
  
  // Clear grid
  this.elements.coursesGrid.innerHTML = '';
  
  // Show empty state if no courses
  if (coursesToShow.length === 0) {
    this.elements.emptyState.classList.remove('hidden');
    return;
  } else {
    this.elements.emptyState.classList.add('hidden');
  }
  
  // Create course cards
  coursesToShow.forEach(course => {
    const card = this.createCourseCard(course);
    this.elements.coursesGrid.appendChild(card);
  });
}
  createCourseCard(course) {
    const template = this.elements.courseCardTemplate.content.cloneNode(true);
    const card = template.querySelector('.course-card');
    
    // Set data
    card.dataset.courseId = course.courseId;
    
    // Level badge
    const levelBadge = card.querySelector('.level-badge');
    const levelNumber = card.querySelector('.level-number');
    levelBadge.dataset.level = course.level;
    levelNumber.textContent = course.level;
    
    // Wishlist button
    const wishlistBtn = card.querySelector('.card-wishlist-btn');
    this.updateWishlistButton(wishlistBtn, course.courseId);
    wishlistBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleWishlist(course.courseId);
    });
    
    // Course info
    card.querySelector('.course-title').textContent = course.courseName;
    
    const providerBadge = card.querySelector('.provider-badge');
    providerBadge.textContent = this.getProviderShortName(course.provider);
    providerBadge.className = `provider-badge ${this.getProviderClass(course.provider)}`;
    
    card.querySelector('.subject-area').textContent = course.subjectArea || 'General';
    
    // Click handler
    card.addEventListener('click', () => this.openCourseModal(course));
    
    return card;
  }

  /* ===========================================
     ENHANCED SEARCH FUNCTIONALITY
     =========================================== */
  setupEventListeners() {
    // Enhanced search listeners
    this.elements.searchToggle.addEventListener('click', () => this.toggleSearch());
    this.elements.searchClose.addEventListener('click', () => this.closeSearch());
    this.elements.searchInput.addEventListener('input', (e) => this.handleEnhancedSearch(e.target.value));
    
    // Search mode toggle
    if (this.elements.searchModeToggle) {
      this.elements.searchModeToggle.addEventListener('click', () => this.toggleSearchMode());
    }
    
    // Filters (existing)
    this.elements.filtersToggle.addEventListener('click', () => this.toggleFilters());
    this.elements.levelFilter.addEventListener('change', () => this.applyFilters());
    this.elements.providerFilter.addEventListener('change', () => this.applyFilters());
    this.elements.subjectFilter.addEventListener('change', () => this.applyFilters());
    this.elements.clearFilters.addEventListener('click', () => this.clearFilters());
    
    // Wishlist (existing)
    this.elements.wishlistToggle.addEventListener('click', () => this.toggleWishlistView());
    
    // Navigation (existing)
    this.elements.navItems.forEach(item => {
      item.addEventListener('click', (e) => this.switchTab(e.target.closest('.nav-item').dataset.tab));
    });
    
    // Modal (existing)
    this.elements.backBtn.addEventListener('click', () => this.closeModal());
    this.elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.modalOverlay) this.closeModal();
    });
    this.elements.modalWishlistBtn.addEventListener('click', () => this.toggleWishlist(this.selectedCourse?.courseId));
    
    // Handle back button (browser)
    window.addEventListener('popstate', () => this.handleBackButton());
  }

  toggleSearchMode() {
    this.searchMode = this.searchMode === 'traditional' ? 'skills' : 'traditional';
    
    const toggle = this.elements.searchModeToggle;
    const input = this.elements.searchInput;
    
    if (this.searchMode === 'skills') {
      toggle.classList.add('skills-mode');
      toggle.textContent = 'Skills';
      input.placeholder = 'Search by skills or career goals...';
      input.value = '';
    } else {
      toggle.classList.remove('skills-mode');
      toggle.textContent = 'Courses';
      input.placeholder = 'Search courses...';
      input.value = '';
    }
    
    this.clearSearch();
  }

  handleEnhancedSearch(query) {
    clearTimeout(this.searchTimeout);
    this.lastSearchQuery = query.toLowerCase().trim();
    
    this.searchTimeout = setTimeout(() => {
      if (this.searchMode === 'skills') {
        this.performSkillsSearch(this.lastSearchQuery);
      } else {
        this.performTraditionalSearch(this.lastSearchQuery);
      }
    }, 300);
  }

  // performSkillsSearch(query) {
  //   if (!query) {
  //     this.applyFilters();
  //     return;
  //   }

  //   const searchResults = [];
    
  //   this.courses.forEach(course => {
  //     const ksbData = this.ksbData[course.courseId];
  //     if (!ksbData) {
  //       // Fallback to traditional search if no KSB data
  //       if (this.matchesTraditionalSearch(course, query)) {
  //         searchResults.push({
  //           course,
  //           matchScore: 0.5,
  //           matchReasons: ['Course name or provider match'],
  //           confidenceScore: 0
  //         });
  //       }
  //       return;
  //     }

  //     const matches = this.findKSBMatches(ksbData, query);
  //     if (matches.totalScore > 0) {
  //       searchResults.push({
  //         course,
  //         matchScore: matches.totalScore,
  //         matchReasons: matches.reasons,
  //         confidenceScore: ksbData.confidenceScore,
  //         ksbData
  //       });
  //     }
  //   });

  //   // Sort by match score and confidence
  //   searchResults.sort((a, b) => {
  //     if (a.matchScore !== b.matchScore) {
  //       return b.matchScore - a.matchScore;
  //     }
  //     return b.confidenceScore - a.confidenceScore;
  //   });

  //   this.displaySearchResults(searchResults, query);
  // }
performSkillsSearch(query) {
  if (!query) {
    // When search is cleared, reset to show all courses
    this.filteredCourses = [...this.courses];
    this.displayCourses();
    return;
  }

  const searchResults = [];
  
  this.courses.forEach(course => {
    const ksbData = this.ksbData[course.courseId];
    if (!ksbData) {
      // Fallback to traditional search if no KSB data
      if (this.matchesTraditionalSearch(course, query)) {
        searchResults.push({
          course,
          matchScore: 0.5,
          matchReasons: ['Course name or provider match'],
          confidenceScore: 0
        });
      }
      return;
    }

    const matches = this.findKSBMatches(ksbData, query);
    if (matches.totalScore > 0) {
      searchResults.push({
        course,
        matchScore: matches.totalScore,
        matchReasons: matches.reasons,
        confidenceScore: ksbData.confidenceScore,
        ksbData
      });
    }
  });

  // Sort by match score and confidence
  searchResults.sort((a, b) => {
    if (a.matchScore !== b.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return b.confidenceScore - a.confidenceScore;
  });

  this.displaySearchResults(searchResults, query);
}

  findKSBMatches(ksbData, query) {
    const matches = {
      totalScore: 0,
      reasons: []
    };

    const queryWords = query.split(' ').filter(word => word.length > 2);
    
    // Search in knowledge areas
    ksbData.knowledgeAreas.forEach(knowledge => {
      const score = this.calculateTextMatch(knowledge.description, queryWords);
      if (score > 0) {
        matches.totalScore += score * 0.8; // Knowledge weighted at 80%
        matches.reasons.push(`Knowledge: ${knowledge.description}`);
      }
    });

    // Search in skills areas
    ksbData.skillsAreas.forEach(skill => {
      const score = this.calculateTextMatch(skill.description, queryWords);
      if (score > 0) {
        matches.totalScore += score * 1.0; // Skills weighted at 100%
        matches.reasons.push(`Skill: ${skill.description}`);
      }
    });

    // Search in career pathways
    ksbData.careerPathways.forEach(career => {
      const score = this.calculateTextMatch(career.role, queryWords);
      if (score > 0) {
        matches.totalScore += score * 0.9; // Career paths weighted at 90%
        matches.reasons.push(`Career path: ${career.role}`);
      }
    });

    // Search in occupational standards
    ksbData.occupationalStandards.forEach(standard => {
      const score = this.calculateTextMatch(standard.name, queryWords);
      if (score > 0) {
        matches.totalScore += score * 0.7; // Standards weighted at 70%
        matches.reasons.push(`Occupational standard: ${standard.name}`);
      }
    });

    // Limit reasons to top 3
    matches.reasons = matches.reasons.slice(0, 3);
    
    return matches;
  }

  calculateTextMatch(text, queryWords) {
    if (!text) return 0;
    
    const textLower = text.toLowerCase();
    let score = 0;
    
    queryWords.forEach(word => {
      if (textLower.includes(word)) {
        // Exact word match
        score += 1;
      } else if (this.fuzzyMatch(textLower, word)) {
        // Fuzzy match (for typos or similar words)
        score += 0.5;
      }
    });
    
    return score / queryWords.length; // Normalize by query length
  }

  fuzzyMatch(text, word) {
    // Simple fuzzy matching - could be enhanced
    if (word.length < 4) return false;
    
    const variations = [
      word.slice(0, -1), // Remove last character
      word + 'ing',      // Add common suffix
      word + 's',        // Add plural
      word.replace('ing', ''), // Remove -ing
    ];
    
    return variations.some(variation => text.includes(variation));
  }

  // performTraditionalSearch(query) {
  //   if (!query) {
  //     this.applyFilters();
  //     return;
  //   }

  //   const searchResults = [];
    
  //   this.courses.forEach(course => {
  //     if (this.matchesTraditionalSearch(course, query)) {
  //       const ksbData = this.ksbData[course.courseId];
  //       searchResults.push({
  //         course,
  //         matchScore: 1.0,
  //         matchReasons: ['Course name or provider match'],
  //         confidenceScore: ksbData ? ksbData.confidenceScore : 0,
  //         ksbData
  //       });
  //     }
  //   });

  //   this.displaySearchResults(searchResults, query);
  // }
/* ===========================================
   SEARCH HANDLING - FIXED
   =========================================== */
performTraditionalSearch(query) {
  if (!query) {
    // When search is cleared, reset to show all courses
    this.filteredCourses = [...this.courses];
    this.displayCourses();
    return;
  }

  const searchResults = [];
  
  this.courses.forEach(course => {
    if (this.matchesTraditionalSearch(course, query)) {
      const ksbData = this.ksbData[course.courseId];
      searchResults.push({
        course,
        matchScore: 1.0,
        matchReasons: ['Course name or provider match'],
        confidenceScore: ksbData ? ksbData.confidenceScore : 0,
        ksbData
      });
    }
  });

  this.displaySearchResults(searchResults, query);
}
  matchesTraditionalSearch(course, query) {
    const searchFields = [
      course.courseName,
      course.provider,
      course.subjectArea
    ].filter(Boolean);
    
    return searchFields.some(field => 
      field.toLowerCase().includes(query)
    );
  }

  displaySearchResults(results, query) {
    // Clear grid
    this.elements.coursesGrid.innerHTML = '';
    
    if (results.length === 0) {
      this.showSearchEmptyState(query);
      return;
    }

    // Create enhanced course cards
    results.forEach(result => {
      const card = this.createEnhancedCourseCard(result);
      this.elements.coursesGrid.appendChild(card);
    });

    this.elements.emptyState.classList.add('hidden');
  }

  // createEnhancedCourseCard(result) {
  //   const { course, matchScore, matchReasons, confidenceScore, ksbData } = result;
    
  //   const template = this.elements.courseCardTemplate.content.cloneNode(true);
  //   const card = template.querySelector('.course-card');
    
  //   // Set data
  //   card.dataset.courseId = course.courseId;
    
  //   // Add match indicator if this is a skills search
  //   if (this.searchMode === 'skills' && matchScore > 0) {
  //     const matchIndicator = document.createElement('div');
  //     matchIndicator.className = 'match-indicator';
  //     matchIndicator.textContent = `${Math.round(matchScore * 100)}% match`;
  //     card.appendChild(matchIndicator);
  //   }
    
  //   // Level badge
  //   const levelBadge = card.querySelector('.level-badge');
  //   const levelNumber = card.querySelector('.level-number');
  //   levelBadge.dataset.level = course.level;
  //   levelNumber.textContent = course.level;
    
  //   // Wishlist button
  //   const wishlistBtn = card.querySelector('.card-wishlist-btn');
  //   this.updateWishlistButton(wishlistBtn, course.courseId);
  //   wishlistBtn.addEventListener('click', (e) => {
  //     e.stopPropagation();
  //     this.toggleWishlist(course.courseId);
  //   });
    
  //   // Course info
  //   card.querySelector('.course-title').textContent = course.courseName;
    
  //   const providerBadge = card.querySelector('.provider-badge');
  //   providerBadge.textContent = this.getProviderShortName(course.provider);
  //   providerBadge.className = `provider-badge ${this.getProviderClass(course.provider)}`;
    
  //   card.querySelector('.subject-area').textContent = course.subjectArea || 'General';
    
  //   // Add match reasons if this is a skills search
  //   if (this.searchMode === 'skills' && matchReasons.length > 0) {
  //     const matchInfo = document.createElement('div');
  //     matchInfo.className = 'match-info';
  //     matchInfo.innerHTML = matchReasons.slice(0, 2).map(reason => 
  //       `<div class="match-reason">${reason}</div>`
  //     ).join('');
  //     card.appendChild(matchInfo);
  //   }
    
  //   // Add confidence indicator
  //   if (confidenceScore > 0) {
  //     const confidenceIndicator = document.createElement('div');
  //     confidenceIndicator.className = 'confidence-indicator';
  //     confidenceIndicator.textContent = `Quality: ${confidenceScore}/10`;
  //     card.appendChild(confidenceIndicator);
  //   }
    
  //   // Click handler
  //   card.addEventListener('click', () => this.openEnhancedCourseModal(course, result));
    
  //   return card;
  // }
/* ===========================================
     ENHANCED COURSE CARD CAREER HINTS
     =========================================== */
  createEnhancedCourseCard(result) {
    const { course, matchScore, matchReasons, confidenceScore, ksbData } = result;
    
    const template = this.elements.courseCardTemplate.content.cloneNode(true);
    const card = template.querySelector('.course-card');
    
    // Set data
    card.dataset.courseId = course.courseId;
    
    // Add match indicator if this is a skills search
    if (this.searchMode === 'skills' && matchScore > 0) {
      const matchIndicator = document.createElement('div');
      matchIndicator.className = 'match-indicator';
      matchIndicator.textContent = `${Math.round(matchScore * 100)}% match`;
      card.appendChild(matchIndicator);
    }
    
    // Level badge
    const levelBadge = card.querySelector('.level-badge');
    const levelNumber = card.querySelector('.level-number');
    levelBadge.dataset.level = course.level;
    levelNumber.textContent = course.level;
    
    // Wishlist button
    const wishlistBtn = card.querySelector('.card-wishlist-btn');
    this.updateWishlistButton(wishlistBtn, course.courseId);
    wishlistBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleWishlist(course.courseId);
    });
    
    // Course info
    card.querySelector('.course-title').textContent = course.courseName;
    
    const providerBadge = card.querySelector('.provider-badge');
    providerBadge.textContent = this.getProviderShortName(course.provider);
    providerBadge.className = `provider-badge ${this.getProviderClass(course.provider)}`;
    
    card.querySelector('.subject-area').textContent = course.subjectArea || 'General';
    
    // Add career hint if KSB data available
    if (ksbData && ksbData.careerPathways.length > 0) {
      const topCareers = ksbData.careerPathways
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 2)
        .map(career => career.role);
      
      const careerHint = document.createElement('div');
      careerHint.className = 'career-hint';
      careerHint.innerHTML = `<span class="hint-icon">💼</span> ${topCareers.join(', ')}`;
      card.appendChild(careerHint);
    }
    
    // Add match reasons if this is a skills search
    if (this.searchMode === 'skills' && matchReasons.length > 0) {
      const matchInfo = document.createElement('div');
      matchInfo.className = 'match-info';
      matchInfo.innerHTML = matchReasons.slice(0, 2).map(reason => 
        `<div class="match-reason">${reason}</div>`
      ).join('');
      card.appendChild(matchInfo);
    }
    
    // Add confidence indicator
    if (confidenceScore > 0) {
      const confidenceIndicator = document.createElement('div');
      confidenceIndicator.className = 'confidence-indicator';
      confidenceIndicator.textContent = `Quality: ${confidenceScore}/10`;
      card.appendChild(confidenceIndicator);
    }
    
    // Click handler
    card.addEventListener('click', () => this.openEnhancedCourseModal(course, result));
    
    return card;
  }

  showSearchEmptyState(query) {
    this.elements.emptyState.innerHTML = `
      <div class="empty-icon">🔍</div>
      <h3>No courses found</h3>
      <p>No courses match "${query}"</p>
      <p>Try different keywords or switch search modes</p>
    `;
    this.elements.emptyState.classList.remove('hidden');
  }

  // clearSearch() {
  //   this.elements.searchInput.value = '';
  //   this.lastSearchQuery = '';
  //   this.applyFilters();
  // }
clearSearch() {
  this.elements.searchInput.value = '';
  this.lastSearchQuery = '';
  
  // Reset to show all courses
  this.filteredCourses = [...this.courses];
  this.displayCourses();
}
  /* ===========================================
     MODAL FUNCTIONALITY
     =========================================== */
  async openCourseModal(course, searchResult = null) {
    this.selectedCourse = course;
    this.elements.modalTitle.textContent = course.courseName;
    
    // Update wishlist button
    this.updateWishlistButton(this.elements.modalWishlistBtn, course.courseId);
    
    // Show modal
    this.elements.modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Add to browser history
    history.pushState({ modal: 'course', courseId: course.courseId }, '', `#course-${course.courseId}`);
    
    // Load course details
    await this.loadCourseDetails(course, searchResult);
  }

  async openEnhancedCourseModal(course, searchResult = null) {
    return this.openCourseModal(course, searchResult);
  }

  closeModal() {
    this.elements.modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    this.selectedCourse = null;
    
    // Update browser history
    if (location.hash.startsWith('#course-')) {
      history.back();
    }
  }

  async loadCourseDetails(course, searchResult = null) {
    try {
      // Show loading
      this.elements.modalContent.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading details...</p></div>';
      
      // Get KSB data for this course
      const ksbData = this.ksbData[course.courseId];
      
      // Fetch progression data (existing)
      const [progressionResponse, precedingResponse] = await Promise.all([
        fetch(`/api/courses/${course.courseId}/progression`),
        fetch(`/api/courses/${course.courseId}/preceding`)
      ]);
      
      const progressionRoutes = progressionResponse.ok ? await progressionResponse.json() : [];
      const precedingRoutes = precedingResponse.ok ? await precedingResponse.json() : [];
      
      // Render course details
      this.renderCourseDetails(course, progressionRoutes, precedingRoutes, ksbData, searchResult);
      
    } catch (error) {
      console.error('Failed to load course details:', error);
      this.elements.modalContent.innerHTML = '<div class="empty-state"><p>Failed to load course details. Please try again.</p></div>';
    }
  }

  async loadEnhancedCourseDetails(course, searchResult) {
    return this.loadCourseDetails(course, searchResult);
  }

  // renderCourseDetails(course, progressionRoutes, precedingRoutes, ksbData, searchResult) {
  //   const hasKSBData = ksbData && Object.keys(ksbData).length > 0;
    
  //   this.elements.modalContent.innerHTML = `
  //     <div class="course-tabs">
  //       <button class="tab-btn active" data-tab="overview">Overview</button>
  //       ${hasKSBData ? '<button class="tab-btn" data-tab="skills">Skills & Careers</button>' : ''}
  //       <button class="tab-btn" data-tab="pathways">Pathways</button>
  //     </div>
      
  //     <div class="tab-content active" data-tab="overview">
  //       <div class="course-summary">
  //         ${searchResult && searchResult.matchReasons.length > 0 ? `
  //           <div class="match-summary">
  //             <h4>Why this course matches:</h4>
  //             <ul class="match-reasons-list">
  //               ${searchResult.matchReasons.map(reason => `<li>${reason}</li>`).join('')}
  //             </ul>
  //           </div>
  //         ` : ''}
          
  //         <div class="course-meta-grid">
  //           <div class="meta-item">
  //             <label>Provider</label>
  //             <span>${course.provider}</span>
  //           </div>
  //           <div class="meta-item">
  //             <label>Level</label>
  //             <span>Level ${course.level}</span>
  //           </div>
  //           <div class="meta-item">
  //             <label>Subject Area</label>
  //             <span>${course.subjectArea || 'General'}</span>
  //           </div>
  //           ${hasKSBData ? `
  //             <div class="meta-item">
  //               <label>Analysis Quality</label>
  //               <span>${ksbData.confidenceScore}/10</span>
  //             </div>
  //           ` : ''}
  //         </div>
          
  //         ${course.courseUrl ? `
  //           <a href="${course.courseUrl}" target="_blank" class="course-link-btn">
  //             View Course Website →
  //           </a>
  //         ` : ''}
  //       </div>
  //     </div>
      
  //     ${hasKSBData ? `
  //       <div class="tab-content" data-tab="skills">
  //         <div class="skills-career-section">
  //           ${this.renderSkillsSection(ksbData)}
  //           ${this.renderCareersSection(ksbData)}
  //         </div>
  //       </div>
  //     ` : ''}
      
  //     <div class="tab-content" data-tab="pathways">
  //       <div class="pathways-section">
  //         <div class="pathway-group">
  //           <h4>This course leads to:</h4>
  //                         <div class="pathway-list">
  //               ${progressionRoutes.length > 0 ? 
  //                 progressionRoutes.map(route => `
  //                   <div class="pathway-item" data-course-id="${route.toId}">
  //                     <div class="pathway-course">
  //                       <strong>${route.course.courseName}</strong>
  //                       <span class="pathway-meta">Level ${route.course.level} • ${this.getProviderShortName(route.course.provider)}</span>
  //                     </div>
  //                     ${route.notes ? `<div class="pathway-notes">${route.notes}</div>` : ''}
  //                   </div>
  //                 `).join('') : 
  //                 '<div class="no-pathways">No further progressions available within EMIOT</div>'
  //               }
  //             </div>
  //           </div>
            
  //           <div class="pathway-group">
  //             <h4>Courses that lead here:</h4>
  //             <div class="pathway-list">
  //               ${precedingRoutes.length > 0 ? 
  //                 precedingRoutes.map(route => `
  //                   <div class="pathway-item" data-course-id="${route.fromId}">
  //                     <div class="pathway-course">
  //                       <strong>${route.course.courseName}</strong>
  //                       <span class="pathway-meta">Level ${route.course.level} • ${this.getProviderShortName(route.course.provider)}</span>
  //                     </div>
  //                     ${route.notes ? `<div class="pathway-notes">${route.notes}</div>` : ''}
  //                   </div>
  //                 `).join('') : 
  //                 '<div class="no-pathways">No prerequisite courses found</div>'
  //               }
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   `;
    
  //   // Set up tab switching
  //   this.setupModalTabs();
    
  //   // Add click handlers for pathway items
  //   this.elements.modalContent.querySelectorAll('.pathway-item[data-course-id]').forEach(item => {
  //     item.addEventListener('click', () => {
  //       const courseId = parseInt(item.dataset.courseId);
  //       const course = this.courses.find(c => c.courseId === courseId);
  //       if (course) {
  //         this.openCourseModal(course);
  //       }
  //     });
  //   });
  // }

renderCourseDetails(course, progressionRoutes, precedingRoutes, ksbData, searchResult) {
  const hasKSBData = ksbData && Object.keys(ksbData).length > 0;
  
  // Dummy description - you mentioned you'll get proper ones in production
  const specimenDescription = "The core components provide a broad understanding of the digital industry and the breadth of content will help to ensure you are able to apply the skills in a variety of contexts and for a variety of different purposes. Looking at digital infrastructure, digital support and network cabling, you will learn how to apply procedures and controls to maintain the digital security of an organisation and its data.";
  
  this.elements.modalContent.innerHTML = `
    <div class="course-tabs">
      <button class="tab-btn active" data-tab="overview">Overview</button>
      ${hasKSBData ? '<button class="tab-btn" data-tab="skills">Skills & Careers</button>' : ''}
      <button class="tab-btn" data-tab="pathways">Pathways</button>
      <button class="tab-btn" data-tab="visual">Visual</button>
    </div>
    
    <div class="tab-content-container">
      <!-- OVERVIEW TAB - Clean and focused -->
      <div class="tab-content active" data-tab="overview">
        <div class="course-summary">
          ${searchResult && searchResult.matchReasons && searchResult.matchReasons.length > 0 ? `
            <div class="match-summary">
              <h4>Why this course matches:</h4>
              <ul class="match-reasons-list">
                ${searchResult.matchReasons.map(reason => `<li>${reason}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="course-meta-grid">
            <div class="meta-item">
              <label>Provider</label>
              <span>${course.provider}</span>
            </div>
            <div class="meta-item">
              <label>Level</label>
              <span>Level ${course.level}</span>
            </div>
            <div class="meta-item">
              <label>Subject Area</label>
              <span>${course.subjectArea || 'General'}</span>
            </div>
            ${hasKSBData ? `
              <div class="meta-item">
                <label>Analysis Quality</label>
                <span>${ksbData.confidenceScore}/10</span>
              </div>
            ` : ''}
          </div>
          
          ${course.courseUrl ? `
            <a href="${course.courseUrl}" target="_blank" class="course-link-btn">
              View Course Website →
            </a>
          ` : ''}
          
          <div class="course-description">
            <h4>Course Description</h4>
            <p>${specimenDescription}</p>
          </div>
        </div>
      </div>
      
      <!-- SKILLS & CAREERS TAB - Your existing KSB content -->
      ${hasKSBData ? `
        <div class="tab-content" data-tab="skills">
          <div class="skills-career-section">
            ${this.renderCareersSection(ksbData)}
            ${this.renderSkillsSection(ksbData)}
          </div>
        </div>
      ` : ''}
      
 <!-- PATHWAYS TAB - Working version -->
<div class="tab-content" data-tab="pathways">
  <div class="pathways-section">
    <div class="pathway-group">
      <h4>This course leads to:</h4>
      <div class="pathway-list">
        ${progressionRoutes.length > 0 ? 
          progressionRoutes.map(route => `
            <div class="pathway-item" data-course-id="${route.toId}">
              <div class="pathway-course">
                <strong>${route.course.courseName}</strong>
                <span class="pathway-meta">Level ${route.course.level} • ${this.getProviderShortName(route.course.provider)}</span>
              </div>
              ${route.notes ? `<div class="pathway-notes">${route.notes}</div>` : ''}
            </div>
          `).join('') : 
          '<div class="no-pathways">No further progressions available within EMIOT</div>'
        }
      </div>
    </div>
    
    <div class="pathway-group">
      <h4>Courses that lead here:</h4>
      <div class="pathway-list">
        ${precedingRoutes.length > 0 ? 
          precedingRoutes.map(route => `
            <div class="pathway-item" data-course-id="${route.fromId}">
              <div class="pathway-course">
                <strong>${route.course.courseName}</strong>
                <span class="pathway-meta">Level ${route.course.level} • ${this.getProviderShortName(route.course.provider)}</span>
              </div>
              ${route.notes ? `<div class="pathway-notes">${route.notes}</div>` : ''}
            </div>
          `).join('') : 
          '<div class="no-pathways">No prerequisite courses found</div>'
        }
      </div>
    </div>
  </div>
</div>

<!-- VISUAL TAB - Working version -->
<div class="tab-content" data-tab="visual">
  <div class="visualization-section">
    <div class="viz-controls">
      <select id="viewModeSelect" class="view-mode-select">
        <option value="forward">Where can I go from here?</option>
        <option value="backward">How do I get to this course?</option>
      </select>
    </div>
    <div class="visualization-container">
      <div id="visualization">Loading visualization...</div>
    </div>
  </div>
</div>
      
    </div> <!-- Close tab-content-container -->
  `;
  
  // Set up tab switching
  this.setupModalTabs();
}
// returns nothing
  renderSkillsSection(ksbData) {
    return `` }

    // This deprecated pending discussion
  renderSkillsSectionDeprecated(ksbData) {
    return `
      <div class="skills-section">
        <h4>What you'll learn:</h4>
        
        ${ksbData.knowledgeAreas.length > 0 ? `
          <div class="ksb-group">
            <h5>Knowledge Areas:</h5>
            <ul class="ksb-list">
              ${ksbData.knowledgeAreas.map(knowledge => `
                <li class="ksb-item">
                  <div>
                    <strong>${knowledge.id}:</strong> ${knowledge.description}
                  </div>
                  <span class="confidence-badge">${knowledge.confidence}/10</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${ksbData.skillsAreas.length > 0 ? `
          <div class="ksb-group">
            <h5>Practical Skills:</h5>
            <ul class="ksb-list">
              ${ksbData.skillsAreas.map(skill => `
                <li class="ksb-item">
                  <div>
                    <strong>${skill.id}:</strong> ${skill.description}
                  </div>
                  <span class="confidence-badge">${skill.confidence}/10</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${ksbData.behaviours.length > 0 ? `
          <div class="ksb-group">
            <h5>Professional Behaviours:</h5>
            <ul class="ksb-list">
              ${ksbData.behaviours.map(behaviour => `
                <li class="ksb-item">
                  <div>
                    <strong>${behaviour.id}:</strong> ${behaviour.description}
                  </div>
                  <span class="confidence-badge">${behaviour.confidence}/10</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  
 /* ===========================================
     ENHANCED CAREER RENDERING WITH NCS LINKS
     =========================================== */
       // ===========================================
// This version does not show the KSB details, just the NCS links
// ===========================================
  renderCareersSection(ksbData) {
    return `
      <div class="careers-section">
        <h4>Career opportunities:</h4>
        
        ${ksbData.careerPathways.length > 0 ? `
          <div class="career-pathways">
            <h5>Job Roles:</h5>
            <div class="career-grid">
              ${ksbData.careerPathways.map(career => {
                const ncsUrl = this.findNCSUrl(career.role);
                
                return `
                  <div class="career-item">
                    <div class="career-details">
                      <h6>${career.role}</h6>
                      <span class="career-level">${career.level} Level</span>
                      ${ncsUrl ? `
                        <a href="${ncsUrl}" target="_blank" class="career-link">
                          <span class="link-icon">🔗</span>
                          View Career Details
                        </a>
                      ` : `
                        <span class="no-link">Career details not available</span>
                      `}
                    </div>
                    <span class="confidence-badge">${career.confidence}/10</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        

        
        ${ksbData.analysisNotes ? `
          <div class="analysis-notes">
            <h5>Analysis Notes:</h5>
            <p>${ksbData.analysisNotes}</p>
          </div>
        ` : ''}
      </div>
    `;
  }
  // ===========================================
// This not called. Previous version showing all the KSB details
// ===========================================
  renderCareersSectionAllKSB(ksbData) {
    return `
      <div class="careers-section">
        <h4>Career opportunities:</h4>
        
        ${ksbData.careerPathways.length > 0 ? `
          <div class="career-pathways">
            <h5>Job Roles:</h5>
            <div class="career-grid">
              ${ksbData.careerPathways.map(career => {
                const ncsUrl = this.findNCSUrl(career.role);
                
                return `
                  <div class="career-item">
                    <div class="career-details">
                      <h6>${career.role}</h6>
                      <span class="career-level">${career.level} Level</span>
                      ${ncsUrl ? `
                        <a href="${ncsUrl}" target="_blank" class="career-link">
                          <span class="link-icon">🔗</span>
                          View Career Details
                        </a>
                      ` : `
                        <span class="no-link">Career details not available</span>
                      `}
                    </div>
                    <span class="confidence-badge">${career.confidence}/10</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        
        ${ksbData.occupationalStandards.length > 0 ? `
          <div class="occupational-standards">
            <h5>IFATE Occupational Standards:</h5>
            <div class="standards-grid">
              ${ksbData.occupationalStandards.map(standard => `
                <div class="standard-item">
                  <div class="standard-details">
                    <h6>${standard.name}</h6>
                    <span class="standard-level">Level ${standard.level}</span>
                  </div>
                  <span class="confidence-badge">${standard.confidence}/10</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${ksbData.analysisNotes ? `
          <div class="analysis-notes">
            <h5>Analysis Notes:</h5>
            <p>${ksbData.analysisNotes}</p>
          </div>
        ` : ''}
      </div>
    `;
  }
  // setupModalTabs() {
  //   const tabBtns = this.elements.modalContent.querySelectorAll('.tab-btn');
  //   const tabContents = this.elements.modalContent.querySelectorAll('.tab-content');
    
  //   tabBtns.forEach(btn => {
  //     btn.addEventListener('click', () => {
  //       const targetTab = btn.dataset.tab;
        
  //       // Update active states
  //       tabBtns.forEach(b => b.classList.remove('active'));
  //       tabContents.forEach(c => c.classList.remove('active'));
        
  //       btn.classList.add('active');
  //       this.elements.modalContent.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
  //     });
  //   });
  // }
// ===========================================
// DEBUGGING VERSION - Replace your setupModalTabs() method
// ===========================================

// setupModalTabs() {
//   console.log('🔧 Setting up modal tabs...');
  
//   const tabBtns = this.elements.modalContent.querySelectorAll('.tab-btn');
//   const tabContents = this.elements.modalContent.querySelectorAll('.tab-content');
  
//   console.log('📋 Found tab buttons:', tabBtns.length);
//   console.log('📄 Found tab contents:', tabContents.length);
  
//   // Log what tabs we found
//   tabBtns.forEach((btn, index) => {
//     console.log(`Tab ${index}:`, btn.dataset.tab, btn.textContent);
//   });
  
//   tabContents.forEach((content, index) => {
//     console.log(`Content ${index}:`, content.dataset.tab, content.classList.contains('active'));
//   });
  
//   tabBtns.forEach(btn => {
//     btn.addEventListener('click', () => {
//       const targetTab = btn.dataset.tab;
//       console.log('🖱️ Clicked tab:', targetTab);
      
//       // Update active states
//       tabBtns.forEach(b => {
//         b.classList.remove('active');
//         console.log('Removed active from:', b.dataset.tab);
//       });
      
//       tabContents.forEach(c => {
//         c.classList.remove('active');
//         console.log('Removed active from content:', c.dataset.tab);
//       });
      
//       // Add active to clicked tab
//       btn.classList.add('active');
//       console.log('Added active to button:', targetTab);
      
//       // Add active to corresponding content
//       const targetContent = this.elements.modalContent.querySelector(`[data-tab="${targetTab}"]`);
//       if (targetContent) {
//         targetContent.classList.add('active');
//         console.log('Added active to content:', targetTab);
//       } else {
//         console.error('❌ Could not find content for tab:', targetTab);
//       }
//     });
//   });
// }
// Replace your existing setupModalTabs() method with this fixed version

setupModalTabs() {
  const tabBtns = this.elements.modalContent.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      console.log('Tab clicked:', targetTab);
      
      // Remove active from all buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      
      // Remove active from all TAB CONTENT (be very specific)
      const allTabContents = this.elements.modalContent.querySelectorAll('.tab-content');
      allTabContents.forEach(c => c.classList.remove('active'));
      
      // Add active to clicked button
      btn.classList.add('active');
      
      // Find and activate the matching CONTENT (very specific selector)
      const targetContent = this.elements.modalContent.querySelector(`.tab-content[data-tab="${targetTab}"]`);
      
      if (targetContent) {
        targetContent.classList.add('active');
        console.log('SUCCESS: Activated content for:', targetTab);
      } else {
        console.error('ERROR: Could not find content for tab:', targetTab);
      }
    });
  });
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      console.log('Tab clicked:', targetTab);
      
      // ... your existing click handling code ...
      
      // NEW: Initialize visualization when Visual tab is clicked
      if (targetTab === 'visual') {
        setTimeout(() => this.initializeVisualization(), 100);
      }
    });
  });
  
  // NEW: Add click handlers for pathway items after modal content is rendered
  this.setupPathwayHandlers();
}
  /* ===========================================
     NAVIGATION & UTILITY METHODS
     =========================================== */
  switchTab(tab) {
    if (tab === this.currentTab) return;
    
    this.currentTab = tab;
    
    // Update active states
    this.elements.navItems.forEach(item => {
      if (item.dataset.tab === tab) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Handle tab content
    switch (tab) {
      case 'browse':
        this.showingWishlistOnly = false;
        this.elements.wishlistToggle.classList.remove('active');
        this.applyFilters();
        break;
      case 'wishlist':
        this.showingWishlistOnly = true;
        this.displayCourses();
        break;
      case 'info':
        this.showInfoModal();
        break;
    }
  }

  showInfoModal() {
    alert('EMIOT Pathway Explorer\n\nExplore educational pathways and course progressions with AI-powered skills discovery.');
    setTimeout(() => this.switchTab('browse'), 100);
  }

  handleBackButton() {
    if (!this.elements.modalOverlay.classList.contains('hidden')) {
      this.closeModal();
    }
  }

  // toggleFilters() {
  //   this.filtersCollapsed = !this.filtersCollapsed;
    
  //   if (this.filtersCollapsed) {
  //     this.elements.filtersSection.classList.add('collapsed');
  //   } else {
  //     this.elements.filtersSection.classList.remove('collapsed');
  //   }
  // }
// Update your toggleFilters method to work without the elements object:
/* ===========================================
   FIXED TOGGLE FILTERS METHOD
   =========================================== */
toggleFilters() {
  this.filtersCollapsed = !this.filtersCollapsed;
  
  const filtersArrow = this.elements.filtersSection.querySelector('.filters-arrow');
  
  if (this.filtersCollapsed) {
    // Collapsed state
    this.elements.filtersSection.classList.add('collapsed');
    if (filtersArrow) {
      filtersArrow.textContent = '▼';  // Arrow pointing down
    }
    console.log('Filters collapsed');
  } else {
    // Expanded state
    this.elements.filtersSection.classList.remove('collapsed');
    if (filtersArrow) {
      filtersArrow.textContent = '▲';  // Arrow pointing up
    }
    console.log('Filters expanded');
  }
}
  // clearFilters() {
  //   this.elements.levelFilter.value = '';
  //   this.elements.providerFilter.value = '';
  //   this.elements.subjectFilter.value = '';
  //   this.elements.searchInput.value = '';
  //   this.closeSearch();
  //   this.applyFilters();
  // }
/* ===========================================
   CLEAR FUNCTIONS - FIXED
   =========================================== */
clearFilters() {
  this.elements.levelFilter.value = '';
  this.elements.providerFilter.value = '';
  this.elements.subjectFilter.value = '';
  this.elements.searchInput.value = '';
  this.closeSearch();
  
  // Reset to show all courses
  this.filteredCourses = [...this.courses];
  this.displayCourses();
}
  toggleSearch() {
    const isHidden = this.elements.searchBar.classList.contains('hidden');
    if (isHidden) {
      this.elements.searchBar.classList.remove('hidden');
      this.elements.searchInput.focus();
    } else {
      this.closeSearch();
    }
  }

  closeSearch() {
    this.elements.searchBar.classList.add('hidden');
    this.elements.searchInput.value = '';
    this.applyFilters();
  }

  showLoading(show) {
    if (show) {
      this.elements.loadingState.classList.remove('hidden');
      this.elements.coursesGrid.classList.add('hidden');
    } else {
      this.elements.loadingState.classList.add('hidden');
      this.elements.coursesGrid.classList.remove('hidden');
    }
  }

  showError(message) {
    this.elements.emptyState.innerHTML = `
      <div class="empty-icon">⚠️</div>
      <h3>Something went wrong</h3>
      <p>${message}</p>
    `;
    this.elements.emptyState.classList.remove('hidden');
  }
// Add these methods to your EnhancedPathwayExplorer class

initializeVisualization() {
  if (!window.vis) {
    console.warn('Vis.js not loaded');
    return;
  }
  
  const container = this.elements.modalContent.querySelector('#visualization');
  if (!container) {
    console.warn('Visualization container not found');
    return;
  }
  
  console.log('Initializing visualization...');
  
  // IMPORTANT: Force container to have proper dimensions
container.style.width = '100%';
container.style.height = '450px';  // Changed from 350px
container.style.minHeight = '450px';  // Changed from 350px
  
  // Create empty data sets
  this.nodes = new vis.DataSet([]);
  this.edges = new vis.DataSet([]);
    // Responsive network options
  const isDesktop = window.innerWidth >= 768;
  // Network options optimized for mobile
  const options = {
    layout: {
      hierarchical: {
        direction: 'LR',  // Keep Left to Right
        sortMethod: 'directed',
        levelSeparation: isDesktop ? 450 : 150,  // More space on desktop
        nodeSpacing: isDesktop ? 15 : 10       // More node spacing too
      }
    },
    nodes: {
      shape: 'box',
      margin: isDesktop ? 14 : 8,               // Bigger margins on desktop
      font: { 
        size: isDesktop ? 14 : 12,              // Larger font on desktop
        multi: true,                            // Allow text wrapping
        maxWid: isDesktop ? 200 : 150          // Wider text boxes
      }
    },
    edges: {
      arrows: { to: { enabled: true, scaleFactor: 0.8 } },
      smooth: { type: 'cubicBezier', forceDirection: 'horizontal' }  // Changed to horizontal
    },
    physics: {
      hierarchicalRepulsion: { 
        nodeDistance: isDesktop ? 50: 60     // More space between nodes
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 300
    },
    // IMPORTANT: Force canvas size
    width: '100%',
    height: '450px'  // Changed from 350px
  };
  
  // Create network
  const data = { nodes: this.nodes, edges: this.edges };
  this.network = new vis.Network(container, data, options);
  
  // IMPORTANT: Force resize after creation
  setTimeout(() => {
    if (this.network) {
      this.network.redraw();
      this.network.fit();
    }
  }, 200);
  
  // Handle node clicks
  this.network.on('click', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const course = this.courses.find(c => c.courseId == nodeId);
      if (course) {
        this.openCourseModal(course);
      }
    }
  });
  
  // Set up view mode selector
  const viewModeSelect = this.elements.modalContent.querySelector('#viewModeSelect');
  if (viewModeSelect) {
    viewModeSelect.value = this.currentView || 'forward';
    viewModeSelect.addEventListener('change', (e) => this.switchViewMode(e.target.value));
  }
  
  // Update visualization for current course
  this.updateVisualization();
}

switchViewMode(mode) {
  this.currentView = mode;
  this.updateVisualization();
}

updateVisualization() {
  if (!this.network || !this.selectedCourse) return;
  
  // Clear existing nodes and edges
  this.nodes.clear();
  this.edges.clear();
  
  const course = this.selectedCourse;
  
  // Add central node
  this.nodes.add({
    id: course.courseId,
    label: course.courseName,
    title: `${course.provider} - ${course.courseName} (Level ${course.level})`,
    color: {
      background: this.getLevelColor(course.level),
      border: '#2a6496',
      highlight: { background: '#FFC107', border: '#FF9800' }
    },
    font: { bold: true, size: 12 },
    borderWidth: 2
  });
  
  if (this.currentView === 'forward') {
    // Show outgoing connections
    const outgoing = this.connections.filter(conn => conn.fromCourseId == course.courseId);
    outgoing.forEach(conn => {
      const toCourse = this.courses.find(c => c.courseId == conn.toCourseId);
      if (toCourse) {
        this.nodes.add({
          id: toCourse.courseId,
          label: toCourse.courseName,
          title: `${toCourse.provider} - ${toCourse.courseName} (Level ${toCourse.level})`,
          color: { background: this.getLevelColor(toCourse.level) },
          font: { size: 10 }
        });
        this.edges.add({
          from: course.courseId,
          to: toCourse.courseId,
          title: conn.notes || 'Progression route'
        });
      }
    });
  } else {
    // Show incoming connections
    const incoming = this.connections.filter(conn => conn.toCourseId == course.courseId);
    incoming.forEach(conn => {
      const fromCourse = this.courses.find(c => c.courseId == conn.fromCourseId);
      if (fromCourse) {
        this.nodes.add({
          id: fromCourse.courseId,
          label: fromCourse.courseName,
          title: `${fromCourse.provider} - ${fromCourse.courseName} (Level ${fromCourse.level})`,
          color: { background: this.getLevelColor(fromCourse.level) },
          font: { size: 10 }
        });
        this.edges.add({
          from: fromCourse.courseId,
          to: course.courseId,
          title: conn.notes || 'Progression route'
        });
      }
    });
  }
  
  // Fit network to view
  setTimeout(() => this.network.fit(), 100);
}

getLevelColor(level) {
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
     UTILITY FUNCTIONS
     =========================================== */
  getProviderShortName(provider) {
    if (provider.includes('Derby College')) return 'DCG';
    if (provider.includes('Loughborough College')) return 'LC';
    if (provider.includes('University of Derby')) return 'UoD';
    if (provider.includes('Loughborough University')) return 'LU';
    return provider;
  }
  
  getProviderClass(provider) {
    if (provider.includes('Derby College')) return 'dcg';
    if (provider.includes('Loughborough College')) return 'lc';
    if (provider.includes('University of Derby')) return 'uod';
    if (provider.includes('Loughborough University')) return 'lu';
    return '';
  }
}

// Initialize the enhanced app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new EnhancedPathwayExplorer();
});