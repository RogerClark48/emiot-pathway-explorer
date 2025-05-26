/* ===========================================
   MOBILE-FIRST PATHWAY EXPLORER - FIXED
   =========================================== */

class PathwayExplorer {
  constructor() {
    // Data
    this.courses = [];
    this.connections = [];
    this.filteredCourses = [];
    
    // State
    this.currentTab = 'browse';
    this.wishlist = this.loadWishlist();
    this.showingWishlistOnly = false;
    this.filtersCollapsed = true;
    this.selectedCourse = null;
    this.currentView = 'forward';
    this.network = null;
    this.nodes = null;
    this.edges = null;
    
    this.init();
  }
  
  /* ===========================================
     INITIALIZATION
     =========================================== */
  async init() {
    try {
      this.showLoading(true);
      await this.loadData();
      this.setupEventListeners();
      this.updateWishlistCount();
      // Initialize with all courses visible
      this.filteredCourses = [...this.courses];
      this.displayCourses();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load courses. Please try again.');
    }
  }
  
  async loadData() {
    try {
      // Load courses
      const coursesResponse = await fetch('/api/courses');
      if (!coursesResponse.ok) throw new Error('Failed to fetch courses');
      this.courses = await coursesResponse.json();
      
      // Load connections
      const connectionsResponse = await fetch('/api/connections');
      if (!connectionsResponse.ok) throw new Error('Failed to fetch connections');
      this.connections = await connectionsResponse.json();
      
      // Populate filter options
      this.populateFilters();
      
      console.log(`Loaded ${this.courses.length} courses and ${this.connections.length} connections`);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }
  
  populateFilters() {
    const providerFilter = document.getElementById('providerFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    
    // Get unique providers
    const providers = [...new Set(this.courses.map(course => course.provider))];
    
    // Clear existing options (except first one)
    providerFilter.innerHTML = '<option value="">All Providers</option>';
    
    // Add provider options
    providers.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = this.getProviderShortName(provider);
      providerFilter.appendChild(option);
    });
    
    // Get unique subjects
    const subjects = [...new Set(this.courses.map(course => course.subjectArea).filter(Boolean))];
    
    // Clear existing options (except first one)
    subjectFilter.innerHTML = '<option value="">All Subjects</option>';
    
    // Add subject options
    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      subjectFilter.appendChild(option);
    });
  }
  
  /* ===========================================
     EVENT LISTENERS
     =========================================== */
  setupEventListeners() {
    // Search
    const searchToggle = document.getElementById('searchToggle');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('searchInput');
    
    if (searchToggle) searchToggle.addEventListener('click', () => this.toggleSearch());
    if (searchClose) searchClose.addEventListener('click', () => this.closeSearch());
    if (searchInput) searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    
    // Filters
    const filtersToggle = document.getElementById('filtersToggle');
    const levelFilter = document.getElementById('levelFilter');
    const providerFilter = document.getElementById('providerFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const clearFilters = document.getElementById('clearFilters');
    
    if (filtersToggle) filtersToggle.addEventListener('click', () => this.toggleFilters());
    if (levelFilter) levelFilter.addEventListener('change', () => this.applyFilters());
    if (providerFilter) providerFilter.addEventListener('change', () => this.applyFilters());
    if (subjectFilter) subjectFilter.addEventListener('change', () => this.applyFilters());
    if (clearFilters) clearFilters.addEventListener('click', () => this.clearFilters());
    
    // Wishlist
    const wishlistToggle = document.getElementById('wishlistToggle');
    if (wishlistToggle) wishlistToggle.addEventListener('click', () => this.toggleWishlistView());
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => this.switchTab(e.target.closest('.nav-item').dataset.tab));
    });
    
    // Modal
    const backBtn = document.getElementById('backBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalWishlistBtn = document.getElementById('modalWishlistBtn');
    
    if (backBtn) backBtn.addEventListener('click', () => this.closeModal());
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeModal();
      });
    }
    if (modalWishlistBtn) {
      modalWishlistBtn.addEventListener('click', () => this.toggleWishlist(this.selectedCourse?.courseId));
    }
    
    // Handle back button (browser)
    window.addEventListener('popstate', () => this.handleBackButton());
  }
  
  /* ===========================================
     SEARCH FUNCTIONALITY
     =========================================== */
  toggleSearch() {
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    
    if (!searchBar) return;
    
    const isHidden = searchBar.classList.contains('hidden');
    if (isHidden) {
      searchBar.classList.remove('hidden');
      if (searchInput) searchInput.focus();
    } else {
      this.closeSearch();
    }
  }
  
  closeSearch() {
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBar) searchBar.classList.add('hidden');
    if (searchInput) searchInput.value = '';
    this.applyFilters();
  }
  
  handleSearch(query) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 300);
  }
  
  /* ===========================================
     FILTER FUNCTIONALITY
     =========================================== */
  toggleFilters() {
    const filtersSection = document.getElementById('filtersSection');
    if (!filtersSection) return;
    
    this.filtersCollapsed = !this.filtersCollapsed;
    
    if (this.filtersCollapsed) {
      filtersSection.classList.add('collapsed');
    } else {
      filtersSection.classList.remove('collapsed');
    }
  }
  
  applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const levelFilter = document.getElementById('levelFilter');
    const providerFilter = document.getElementById('providerFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const levelValue = levelFilter ? levelFilter.value : '';
    const providerValue = providerFilter ? providerFilter.value : '';
    const subjectValue = subjectFilter ? subjectFilter.value : '';
    
    this.filteredCourses = this.courses.filter(course => {
      // Search filter
      if (searchQuery && !course.courseName.toLowerCase().includes(searchQuery) &&
          !course.subjectArea?.toLowerCase().includes(searchQuery)) {
        return false;
      }
      
      // Level filter
      if (levelValue && course.level != levelValue) {
        return false;
      }
      
      // Provider filter
      if (providerValue && course.provider !== providerValue) {
        return false;
      }
      
      // Subject filter
      if (subjectValue && course.subjectArea !== subjectValue) {
        return false;
      }
      
      // Wishlist filter
      if (this.showingWishlistOnly && !this.wishlist.includes(course.courseId)) {
        return false;
      }
      
      return true;
    });
    
    this.displayCourses();
  }
  
  clearFilters() {
    const levelFilter = document.getElementById('levelFilter');
    const providerFilter = document.getElementById('providerFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (levelFilter) levelFilter.value = '';
    if (providerFilter) providerFilter.value = '';
    if (subjectFilter) subjectFilter.value = '';
    if (searchInput) searchInput.value = '';
    this.closeSearch();
    this.applyFilters();
  }
  
  /* ===========================================
     COURSE DISPLAY
     =========================================== */
  displayCourses() {
    let coursesToShow;
    
    if (this.showingWishlistOnly) {
      coursesToShow = this.courses.filter(course => this.wishlist.includes(course.courseId));
    } else {
      // Use filteredCourses if they exist, otherwise show all courses
      coursesToShow = this.filteredCourses.length > 0 || this.hasActiveFilters() ? 
        this.filteredCourses : 
        this.courses;
    }
    
    const coursesGrid = document.getElementById('coursesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!coursesGrid) return;
    
    // Clear grid
    coursesGrid.innerHTML = '';
    
    // Show empty state if no courses
    if (coursesToShow.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    } else {
      if (emptyState) emptyState.classList.add('hidden');
    }
    
    // Create course cards
    coursesToShow.forEach(course => {
      const card = this.createCourseCard(course);
      coursesGrid.appendChild(card);
    });
  }
  
  // Helper method to check if any filters are active
  hasActiveFilters() {
    const searchInput = document.getElementById('searchInput');
    const levelFilter = document.getElementById('levelFilter');
    const providerFilter = document.getElementById('providerFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const levelValue = levelFilter ? levelFilter.value : '';
    const providerValue = providerFilter ? providerFilter.value : '';
    const subjectValue = subjectFilter ? subjectFilter.value : '';
    
    return searchQuery !== '' || levelValue !== '' || providerValue !== '' || subjectValue !== '';
  }
  
  createCourseCard(course) {
    const template = document.getElementById('courseCardTemplate');
    if (!template) return null;
    
    const cardTemplate = template.content.cloneNode(true);
    const card = cardTemplate.querySelector('.course-card');
    
    // Set data
    card.dataset.courseId = course.courseId;
    
    // Level badge
    const levelBadge = card.querySelector('.level-badge');
    const levelNumber = card.querySelector('.level-number');
    if (levelBadge) levelBadge.dataset.level = course.level;
    if (levelNumber) levelNumber.textContent = course.level;
    
    // Wishlist button
    const wishlistBtn = card.querySelector('.card-wishlist-btn');
    if (wishlistBtn) {
      this.updateWishlistButton(wishlistBtn, course.courseId);
      wishlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleWishlist(course.courseId);
      });
    }
    
    // Course info
    const courseTitle = card.querySelector('.course-title');
    if (courseTitle) courseTitle.textContent = course.courseName;
    
    const providerBadge = card.querySelector('.provider-badge');
    if (providerBadge) {
      providerBadge.textContent = this.getProviderShortName(course.provider);
      providerBadge.className = `provider-badge ${this.getProviderClass(course.provider)}`;
    }
    
    const subjectArea = card.querySelector('.subject-area');
    if (subjectArea) subjectArea.textContent = course.subjectArea || 'General';
    
    // Click handler
    card.addEventListener('click', () => this.openCourseModal(course));
    
    return card;
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
    
    if (this.showingWishlistOnly) {
      this.displayCourses();
    }
  }
  
  updateWishlistCount() {
    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) {
      wishlistCount.textContent = this.wishlist.length;
    }
  }
  
  updateWishlistButtons() {
    // Update all wishlist buttons
    document.querySelectorAll('.card-wishlist-btn').forEach(btn => {
      const card = btn.closest('.course-card');
      if (card) {
        const courseId = parseInt(card.dataset.courseId);
        this.updateWishlistButton(btn, courseId);
      }
    });
    
    // Update modal wishlist button
    if (this.selectedCourse) {
      const modalWishlistBtn = document.getElementById('modalWishlistBtn');
      if (modalWishlistBtn) {
        this.updateWishlistButton(modalWishlistBtn, this.selectedCourse.courseId);
      }
    }
  }
  
  updateWishlistButton(button, courseId) {
    if (!button) return;
    
    const isInWishlist = this.wishlist.includes(courseId);
    const heartIcon = button.querySelector('.heart-icon');
    
    if (isInWishlist) {
      button.classList.add('active');
      if (heartIcon) heartIcon.textContent = '♥';
      button.setAttribute('aria-label', 'Remove from wishlist');
    } else {
      button.classList.remove('active');
      if (heartIcon) heartIcon.textContent = '♡';
      button.setAttribute('aria-label', 'Add to wishlist');
    }
  }
  
  toggleWishlistView() {
    this.showingWishlistOnly = !this.showingWishlistOnly;
    
    const toggle = document.getElementById('wishlistToggle');
    if (!toggle) return;
    
    const heartIcon = toggle.querySelector('.heart-icon');
    
    if (this.showingWishlistOnly) {
      toggle.classList.add('active');
      if (heartIcon) heartIcon.textContent = '♥';
      toggle.setAttribute('aria-label', 'Show all courses');
    } else {
      toggle.classList.remove('active');
      if (heartIcon) heartIcon.textContent = '♡';
      toggle.setAttribute('aria-label', 'Show wishlist only');
    }
    
    this.applyFilters();
  }
  
  /* ===========================================
     MODAL FUNCTIONALITY
     =========================================== */
  async openCourseModal(course) {
    this.selectedCourse = course;
    
    const modalTitle = document.getElementById('modalTitle');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalWishlistBtn = document.getElementById('modalWishlistBtn');
    
    if (modalTitle) modalTitle.textContent = course.courseName;
    
    // Update wishlist button
    if (modalWishlistBtn) {
      this.updateWishlistButton(modalWishlistBtn, course.courseId);
    }
    
    // Show modal
    if (modalOverlay) {
      modalOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
    
    // Add to browser history
    history.pushState({ modal: 'course', courseId: course.courseId }, '', `#course-${course.courseId}`);
    
    // Load course details
    await this.loadCourseDetails(course);
  }
  
  closeModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    
    if (modalOverlay) modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    this.selectedCourse = null;
    
    // Update browser history
    if (location.hash.startsWith('#course-')) {
      history.back();
    }
  }
  
  async loadCourseDetails(course) {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;
    
    try {
      // Show loading
      modalContent.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading details...</p></div>';
      
      // Fetch progression data
      const [progressionResponse, precedingResponse] = await Promise.all([
        fetch(`/api/courses/${course.courseId}/progression`),
        fetch(`/api/courses/${course.courseId}/preceding`)
      ]);
      
      const progressionRoutes = progressionResponse.ok ? await progressionResponse.json() : [];
      const precedingRoutes = precedingResponse.ok ? await precedingResponse.json() : [];
      
      // Render course details
      this.renderCourseDetails(course, progressionRoutes, precedingRoutes);
      
    } catch (error) {
      console.error('Failed to load course details:', error);
      modalContent.innerHTML = '<div class="empty-state"><p>Failed to load course details. Please try again.</p></div>';
    }
  }
  
  renderCourseDetails(course, progressionRoutes, precedingRoutes) {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;
    
    modalContent.innerHTML = `
      <div class="course-tabs">
        <button class="tab-btn active" data-tab="details">Details</button>
        <button class="tab-btn" data-tab="pathways">Pathways</button>
        <button class="tab-btn" data-tab="visualization">Visual</button>
      </div>
      
      <div class="tab-content active" data-tab="details">
        <div class="course-summary">
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
          </div>
                   <div class="course-description">
            <h4>About This Course</h4>
            <p>[Specimen text only] The core components provide a broad understanding of the digital industry and the breadth of content will help to ensure you are able to apply the skills in a variety of contexts and for a variety of different purposes. Looking at digital infrastructure, digital support and network cabling, you will learn how to apply procedures and controls to maintain the digital security of an organisation and its data. You will also learn how to explain, install, configure, test and manage both physical and virtual infrastructure while discovering, evaluating and applying reliable sources of knowledge.</p>
          </div>
          ${course.courseUrl ? `
            <a href="${course.courseUrl}" target="_blank" class="course-link-btn">
              View Course Website →
            </a>
          ` : ''}
        </div>
      </div>
      
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
          <div id="visualization">Loading visualization...</div>
        </div>
      </div>
    `;
    
    console.log('Modal content rendered'); // Debug
    
    // Set up tab switching
    this.setupModalTabs();
    
    // Add click handlers for pathway items
    modalContent.querySelectorAll('.pathway-item[data-course-id]').forEach(item => {
      item.addEventListener('click', () => {
        const courseId = parseInt(item.dataset.courseId);
        const course = this.courses.find(c => c.courseId === courseId);
        if (course) {
          this.openCourseModal(course);
        }
      });
    });
    
    // Initialize visualization
    this.initializeVisualization();
  }
  
  setupModalTabs() {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;
    
    const tabBtns = modalContent.querySelectorAll('.tab-btn');
    const tabContents = modalContent.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Update active states
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const targetContent = modalContent.querySelector(`.tab-content[data-tab="${targetTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        } else {
          console.warn(`Tab content not found for: ${targetTab}`);
        }
        
        // Initialize visualization if switching to visual tab
        if (targetTab === 'visualization') {
          setTimeout(() => this.updateVisualization(), 100);
        }
      });
    });
    
    // Ensure the first tab content is visible by default
    const firstTabContent = modalContent.querySelector('.tab-content[data-tab="details"]');
    if (firstTabContent) {
      firstTabContent.classList.add('active');
    }
  }
  
  initializeVisualization() {
    if (!window.vis) {
      console.warn('Vis.js not loaded');
      return;
    }
    
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;
    
    const container = modalContent.querySelector('#visualization');
    if (!container) return;
    
    // Create empty data sets
    this.nodes = new vis.DataSet([]);
    this.edges = new vis.DataSet([]);
    
    // Network options
    const options = {
      layout: {
        hierarchical: {
        direction: 'LR',  // Left to Right
        sortMethod: 'directed',
        levelSeparation: 150,  // More space between levels
        nodeSpacing: 100       // Less space between nodes
        }
      },
      nodes: {
        shape: 'box',
        margin: 8,
        font: { size: 12 }
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.8 } },
        smooth: { type: 'cubicBezier', forceDirection: 'vertical' }
      },
      physics: {
        hierarchicalRepulsion: { nodeDistance: 120 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 300
      }
    };
    
    // Create network
    const data = { nodes: this.nodes, edges: this.edges };
    this.network = new vis.Network(container, data, options);
    
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
    const viewModeSelect = modalContent.querySelector('#viewModeSelect');
    if (viewModeSelect) {
      viewModeSelect.value = this.currentView;
      viewModeSelect.addEventListener('change', (e) => this.switchViewMode(e.target.value));
    }
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
      font: { bold: true, size: 14 },
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
            color: { background: this.getLevelColor(toCourse.level) }
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
            color: { background: this.getLevelColor(fromCourse.level) }
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
     NAVIGATION
     =========================================== */
  switchTab(tab) {
    if (tab === this.currentTab) return;
    
    this.currentTab = tab;
    
    // Update active states
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
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
        const wishlistToggle = document.getElementById('wishlistToggle');
        if (wishlistToggle) wishlistToggle.classList.remove('active');
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
    alert('EMIOT Pathway Explorer\n\nExplore educational pathways and course progressions across East Midlands IoT partners.');
    setTimeout(() => this.switchTab('browse'), 100);
  }
  
  handleBackButton() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay && !modalOverlay.classList.contains('hidden')) {
      this.closeModal();
    }
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
  
  showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const coursesGrid = document.getElementById('coursesGrid');
    
    if (show) {
      if (loadingState) loadingState.classList.remove('hidden');
      if (coursesGrid) coursesGrid.classList.add('hidden');
    } else {
      if (loadingState) loadingState.classList.add('hidden');
      if (coursesGrid) coursesGrid.classList.remove('hidden');
    }
  }
  
  showError(message) {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      emptyState.innerHTML = `
        <div class="empty-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>${message}</p>
      `;
      emptyState.classList.remove('hidden');
    }
  }
}

// Add styles for the tabs and visualization
const additionalStyles = `
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
}

.modal-overlay:not(.hidden) {
  opacity: 1;
  visibility: visible;
}

.course-modal {
  background: white;
  width: 100%;
  max-height: 85vh;
  min-height: 70vh;
  border-radius: 12px 12px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.modal-overlay:not(.hidden) .course-modal {
  transform: translateY(0);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}

.back-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #2a6496;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  padding: 0 8px;
}

.wishlist-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wishlist-btn.active {
  color: #e74c3c;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.course-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin: 0;
  flex-shrink: 0;
  background: white;
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 16px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #2a6496;
  border-bottom-color: #2a6496;
}

.tab-content {
  display: none;
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.tab-content.active {
  display: flex;
  flex-direction: column;
}

.course-summary {
  margin-bottom: 32px;
}

.course-meta-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}
  .course-description p {
  line-height: 1.6;
  color: #444;
  font-size: 15px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item label {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-item span {
  font-size: 16px;
  color: #333;
}

.course-link-btn {
  display: inline-flex;
  align-items: center;
  padding: 16px;
  background: #2a6496;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  margin-top: 16px;
}

.pathways-section {
  flex: 1;
  overflow-y: auto;
}

.pathways-section h3 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #333;
}

.pathway-group {
  margin-bottom: 32px;
}

.pathway-group h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #2a6496;
}

.pathway-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pathway-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pathway-item:active {
  background: #e9ecef;
}

.pathway-course {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pathway-meta {
  font-size: 14px;
  color: #666;
}

.pathway-notes {
  font-size: 14px;
  color: #666;
  font-style: italic;
  margin-top: 4px;
}

.no-pathways {
  text-align: center;
  padding: 24px;
  color: #999;
  font-style: italic;
}

.viz-controls {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 0;
  flex-shrink: 0;
}

.view-mode-select {
  width: 100%;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.visualization-container {
  height: 400px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  flex-shrink: 0;
  margin: 16px;
}

#visualization {
  width: 100%;
  height: 100%;
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PathwayExplorer();
});