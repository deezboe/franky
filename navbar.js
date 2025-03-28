// navbar.js
function loadNavbar() {
  fetch('navbar.html')
    .then(response => response.text())
    .then(html => {
      const container = document.getElementById('navbar-container');
      if (container) {
        container.innerHTML = html;
        initializeNavbar();
      }
    })
    .catch(error => console.error('Error loading navbar:', error));
}

function initializeNavbar() {
  // Date/time functionality
  function updateDateTime() {
    const now = new Date();
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    document.getElementById('day-of-week').textContent = daysOfWeek[now.getDay()];
    document.getElementById('month-day-year').textContent = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    document.getElementById('time').textContent = now.toLocaleTimeString();
  }
  
  // Menu toggle functionality
  const menuToggle = document.getElementById('menu-toggle');
  const toolbar = document.getElementById('toolbar');
  if (menuToggle && toolbar) {
    menuToggle.addEventListener('click', () => toolbar.classList.toggle('active'));
  }

  // Search functionality
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  if (searchInput && searchResults) {
    searchInput.addEventListener('input', function() {
      const query = this.value.trim();
      if (query.length > 0) {
        const dummyResults = [
          "Super Adventure Game", "Puzzle Challenge", 
          "Racing Extreme", "Space Explorer"
        ].filter(item => item.toLowerCase().includes(query.toLowerCase()));
        
        searchResults.innerHTML = dummyResults.length > 0 
          ? dummyResults.map(result => `<div class="search-result-item">${result}</div>`).join('')
          : '<div class="search-result-item">No results found</div>';
        searchResults.style.display = 'block';
      } else {
        searchResults.style.display = 'none';
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container') && e.target !== searchInput) {
        searchResults.style.display = 'none';
      }
    });
  }

  // Start date/time updates
  updateDateTime();
  setInterval(updateDateTime, 1000);
}

// Load navbar when DOM is ready
document.addEventListener('DOMContentLoaded', loadNavbar);
