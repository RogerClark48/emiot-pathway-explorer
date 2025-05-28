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
  async init() {
    try {
      this.showLoading(true);
      await this.loadData();
      await this.loadKSBData();
      this.setupEventListeners();
      this.updateWishlistCount();
      this.displayCourses();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load courses. Please try again.');
    }
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
      // Load KSB mappings - you'd need to serve this from your backend
      // For now, we'll simulate loading from a CSV endpoint
      const ksbResponse = await fetch('/api/ksb-mappings');
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

  performSkillsSearch(query) {
    if (!query) {
      this.applyFilters();
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

  performTraditionalSearch(query) {
    if (!query) {
      this.applyFilters();
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

  clearSearch() {
    this.elements.searchInput.value = '';
    this.lastSearchQuery = '';
    this.applyFilters();
  }

  /* ===========================================
     ENHANCED MODAL WITH KSB INTELLIGENCE
     =========================================== */
  async openEnhancedCourseModal(course, searchResult = null) {
    this.selectedCourse = course;
    this.elements.modalTitle.textContent = course.courseName;
    
    // Update wishlist button
    this.updateWishlistButton(this.elements.modalWishlistBtn, course.courseId);
    
    // Show modal
    this.elements.modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Add to browser history
    history.pushState({ modal: 'course', courseId: course.courseId }, '', `#course-${course.courseId}`);
    
    // Load enhanced course details
    await this.loadEnhancedCourseDetails(course, searchResult);
  }

  async loadEnhancedCourseDetails(course, searchResult) {
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
      
      // Render enhanced course details
      this.renderEnhancedCourseDetails(course, progressionRoutes, precedingRoutes, ksbData, searchResult);
      
    } catch (error) {
      console.error('Failed to load course details:', error);
      this.elements.modalContent.innerHTML = '<div class="empty-state"><p>Failed to load course details. Please try again.</p></div>';
    }
  }

  renderEnhancedCourseDetails(course, progressionRoutes, precedingRoutes, ksbData, searchResult) {
    const hasKSBData = ksbData && Object.keys(ksbData).length > 0;
    
    this.elements.modalContent.innerHTML = `
      <div class="course-tabs">
        <button class="tab-btn active" data-tab="overview">Overview</button>
        ${hasKSBData ? '<button class="tab-btn" data-tab="skills">Skills & Careers</button>' : ''}
        <button class="tab-btn" data-tab="pathways">Pathways</button>
        <button class="tab-btn" data-tab="visualization">Visual</button>
      </div>
      
      <div class="tab-content active" data-tab="overview">
        <div class="course-summary">
          ${searchResult && searchResult.matchReasons.length > 0 ? `
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
        </div>
      </div>
      
      ${hasKSBData ? `
        <div class="tab-content" data-tab="skills">
          <div class="skills-career-section">
            ${this.renderSkillsSection(ksbData)}
            ${this.renderCareersSection(ksbData)}
          </div>
        </div>
      ` : ''}
      
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
      
      <div class="tab-content" data-tab="visualization">
        <div class="viz-controls">
          <select id="viewModeSelect" class="view-mode-select">
            <option value="forward">Where can I go from here?</option>
            <option value="backward">How do I get to this course?</option>
          </select>
        </div>
        <div class="visualization-container">
          <div id="visualization"></div>
        </div>
      </div>
    `;
    
    // Set up tab switching
    this.setupModalTabs();
    
    // Add click handlers for pathway items
    this.elements.modalContent.querySelectorAll('.pathway-item[data-course-id]').forEach(item => {
      item.addEventListener('click', () => {
        const courseId = parseInt(item.dataset.courseId);
        const course = this.courses.find(c => c.courseId === courseId);
        if (course) {
          this.openEnhancedCourseModal(course);
        }
      });
    });
    
    // Initialize visualization
    this.initializeVisualization();
  }

  renderSkillsSection(ksbData) {
    return `
      <div class="skills-section">
        <h4>What you'll learn:</h4>
        
        ${ksbData.knowledgeAreas.length > 0 ? `
          <div class="ksb-group">
            <h5>Knowledge Areas:</h5>
            <ul class="ksb-list">
              ${ksbData.knowledgeAreas.map(knowledge => `
                <li class="ksb-item">
                  <strong>${knowledge.id}:</strong> ${knowledge.description}
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
                  <strong>${skill.id}:</strong> ${skill.description}
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
                  <strong>${behaviour.id}:</strong> ${behaviour.description}
                  <span class="confidence-badge">${behaviour.confidence}/10</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderCareersSection(ksbData) {
    return `
      <div class="careers-section">
        <h4>Career opportunities:</h4>
        
        ${ksbData.careerPathways.length > 0 ? `
          <div class="career-pathways">
            <h5>Job Roles:</h5>
            <div class="career-grid">
              ${ksbData.careerPathways.map(career => `
                <div class="career-item">
                  <h6>${career.role}</h6>
                  <span class="career-level">${career.level} Level</span>
                  <span class="confidence-badge">${career.confidence}/10</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${ksbData.occupationalStandards.length > 0 ? `
          <div class="occupational-standards">
            <h5>IFATE Occupational Standards:</h5>
            <div class="standards-grid">
              ${ksbData.occupationalStandards.map(standard => `
                <div class="standard-item">
                  <h6>${standard.name}</h6>
                  <span class="standard-level">Level ${standard.level}</span>
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

  /* ===========================================
     EXISTING FUNCTIONALITY (Preserved)
     =========================================== */
  
  // All your existing methods remain the same...
  // (populateFilters, applyFilters, displayCourses, etc.)
  
  populateFilters() {
    // Existing implementation
  }

  // ... (keep all existing methods)
  
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

  // ... (all other existing utility methods)
}

// Initialize the enhanced app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new EnhancedPathwayExplorer();
});