// ===========================================
// NCS JOB TITLES SCRAPER
// Run this Node.js script to extract all job titles from NCS
// ===========================================

const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeNCSJobTitles() {
  console.log('🕷️ Starting NCS job titles scraper...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set user agent to avoid blocking
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  const allJobs = [];
  let currentPage = 1;
  let hasMorePages = true;
  
  while (hasMorePages) {
    console.log(`📄 Scraping page ${currentPage}...`);
    
    try {
      // Navigate to the current page
      const url = currentPage === 1 
        ? 'https://nationalcareers.service.gov.uk/explore-careers/all-careers'
        : `https://nationalcareers.service.gov.uk/explore-careers/all-careers?page=${currentPage}`;
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for job links to load
      await page.waitForSelector('a[href*="/job-profiles/"]', { timeout: 10000 });
      
      // Extract job titles and URLs from current page
      const pageJobs = await page.evaluate(() => {
        const jobLinks = document.querySelectorAll('a[href*="/job-profiles/"]');
        return Array.from(jobLinks).map(link => {
          const href = link.getAttribute('href');
          const title = link.textContent.trim();
          const slug = href.replace('/job-profiles/', '');
          
          return {
            title: title,
            slug: slug,
            url: `https://nationalcareers.service.gov.uk${href}`
          };
        });
      });
      
      console.log(`   Found ${pageJobs.length} jobs on page ${currentPage}`);
      allJobs.push(...pageJobs);
      
      // Check if there's a "Next" button or page navigation
      const hasNext = await page.evaluate(() => {
        // Look for pagination indicators
        const nextButton = document.querySelector('a[aria-label="Next page"]') || 
                          document.querySelector('a[rel="next"]') ||
                          document.querySelector('.pagination a:last-child');
        
        return nextButton && !nextButton.classList.contains('disabled');
      });
      
      if (hasNext && pageJobs.length > 0) {
        currentPage++;
        // Add delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        hasMorePages = false;
      }
      
    } catch (error) {
      console.warn(`⚠️ Error on page ${currentPage}:`, error.message);
      hasMorePages = false;
    }
  }
  
  await browser.close();
  
  // Remove duplicates and sort
  const uniqueJobs = Array.from(
    new Map(allJobs.map(job => [job.slug, job])).values()
  ).sort((a, b) => a.title.localeCompare(b.title));
  
  console.log(`✅ Scraped ${uniqueJobs.length} unique job titles`);
  
  // Save to multiple formats
  await saveJobData(uniqueJobs);
  
  return uniqueJobs;
}

async function saveJobData(jobs) {
  // 1. Save as JSON for programmatic use
  const jsonData = {
    scrapeDate: new Date().toISOString(),
    totalJobs: jobs.length,
    jobs: jobs
  };
  
  fs.writeFileSync('ncs_job_titles.json', JSON.stringify(jsonData, null, 2));
  console.log('💾 Saved ncs_job_titles.json');
  
  // 2. Save as CSV for easy viewing
  const csvHeader = 'Title,Slug,URL\n';
  const csvData = jobs.map(job => 
    `"${job.title}","${job.slug}","${job.url}"`
  ).join('\n');
  
  fs.writeFileSync('ncs_job_titles.csv', csvHeader + csvData);
  console.log('💾 Saved ncs_job_titles.csv');
  
  // 3. Save as simple title mapping for fuzzy matching
  const titleMapping = {};
  jobs.forEach(job => {
    // Create variations for matching
    const normalized = job.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    titleMapping[normalized] = job.slug;
    
    // Add common variations
    titleMapping[job.title.toLowerCase()] = job.slug;
    titleMapping[job.slug.replace(/-/g, ' ')] = job.slug;
  });
  
  fs.writeFileSync('ncs_title_mapping.json', JSON.stringify(titleMapping, null, 2));
  console.log('💾 Saved ncs_title_mapping.json');
  
  // 4. Show sample data
  console.log('\n📋 Sample jobs found:');
  jobs.slice(0, 10).forEach(job => {
    console.log(`   ${job.title} → ${job.slug}`);
  });
}

// ===========================================
// JOB TITLE MATCHER - Use this in your app
// ===========================================

class NCSJobMatcher {
  constructor() {
    this.titleMapping = null;
    this.loadMappings();
  }
  
  async loadMappings() {
    try {
      const data = fs.readFileSync('ncs_title_mapping.json', 'utf8');
      this.titleMapping = JSON.parse(data);
      console.log(`Loaded ${Object.keys(this.titleMapping).length} job title mappings`);
    } catch (error) {
      console.warn('Could not load NCS mappings:', error.message);
    }
  }
  
  findNCSUrl(jobTitle) {
    if (!this.titleMapping) return null;
    
    // Try exact match first
    const normalized = jobTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (this.titleMapping[normalized]) {
      return `https://nationalcareers.service.gov.uk/job-profiles/${this.titleMapping[normalized]}`;
    }
    
    // Try fuzzy matching
    const fuzzyMatch = this.fuzzyFindJob(jobTitle);
    if (fuzzyMatch) {
      return `https://nationalcareers.service.gov.uk/job-profiles/${fuzzyMatch}`;
    }
    
    return null;
  }
  
  fuzzyFindJob(jobTitle) {
    const searchTerm = jobTitle.toLowerCase();
    
    // Look for partial matches
    for (const [title, slug] of Object.entries(this.titleMapping)) {
      if (title.includes(searchTerm) || searchTerm.includes(title)) {
        return slug;
      }
    }
    
    return null;
  }
}

// ===========================================
// RUN THE SCRAPER
// ===========================================

if (require.main === module) {
  scrapeNCSJobTitles()
    .then(jobs => {
      console.log('\n🎉 Scraping completed successfully!');
      console.log(`📊 Total jobs: ${jobs.length}`);
      console.log('📁 Files created:');
      console.log('   - ncs_job_titles.json (full data)');
      console.log('   - ncs_job_titles.csv (spreadsheet format)'); 
      console.log('   - ncs_title_mapping.json (for matching)');
    })
    .catch(error => {
      console.error('💥 Scraping failed:', error);
    });
}

module.exports = { NCSJobMatcher };