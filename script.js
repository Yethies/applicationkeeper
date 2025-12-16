// Application data structure
let applications = [];
let statusChart = null;
let timeChart = null;
let filteredApplications = [];
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    setupEventListeners();
    setDefaultDate();
});

// Check authentication status
function checkAuthentication() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showMainApp();
    } else {
        showAuthModal();
    }
}

// Show authentication modal
function showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
    document.getElementById('mainContainer').style.display = 'none';
}

// Show main application
function showMainApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
    
    // Update user info
    const userNameEl = document.getElementById('userName');
    if (userNameEl && currentUser) {
        userNameEl.textContent = `👤 ${currentUser.name}`;
    }
    
    // Load user's applications
    loadApplications();
    filterApplications();
    
    // Update analytics if on analytics tab
    setTimeout(() => {
        if (document.getElementById('analyticsTab') && document.getElementById('analyticsTab').classList.contains('active')) {
            updateAnalytics();
        }
    }, 100);
}

// Show auth tab
function showAuthTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if ((tab === 'login' && btn.textContent.includes('Login')) ||
            (tab === 'signup' && btn.textContent.includes('Sign Up'))) {
            btn.classList.add('active');
        }
    });
    
    // Update forms
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.remove('active');
    
    if (tab === 'login') {
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.getElementById('signupForm').classList.add('active');
    }
}

// Handle Signup
function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // Check if user already exists
    const users = getUsers();
    if (users.find(u => u.email === email)) {
        alert('An account with this email already exists. Please login instead.');
        showAuthTab('login');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        name: name,
        email: email,
        password: password, // In production, this should be hashed
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Auto login
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    
    alert('Account created successfully!');
    showMainApp();
    
    // Reset form
    e.target.reset();
}

// Handle Login
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        alert('Invalid email or password');
        return;
    }
    
    // Login successful
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    showMainApp();
    
    // Reset form
    e.target.reset();
}

// Handle Logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Destroy charts
        if (statusChart) {
            statusChart.destroy();
            statusChart = null;
        }
        if (timeChart) {
            timeChart.destroy();
            timeChart = null;
        }
        
        currentUser = null;
        localStorage.removeItem('currentUser');
        showAuthModal();
        
        // Clear any sensitive data from memory
        applications = [];
        filteredApplications = [];
    }
}

// Get all users
function getUsers() {
    const stored = localStorage.getItem('users');
    return stored ? JSON.parse(stored) : [];
}

// Load applications from localStorage
function loadApplications() {
    if (!currentUser) return;
    
    const stored = localStorage.getItem('jobApplications');
    if (stored) {
        const allApplications = JSON.parse(stored);
        // Filter applications by current user
        applications = allApplications.filter(app => app.userId === currentUser.id);
        
        // Migrate old data structure if needed
        applications = applications.map(app => {
            if (!app.statusHistory) {
                app.statusHistory = [{
                    status: app.status,
                    date: app.dateApplied,
                    notes: app.notes || ''
                }];
            }
            if (!app.interviewDates) app.interviewDates = [];
            if (!app.followUpNeeded) app.followUpNeeded = false;
            if (!app.notesPerStage) app.notesPerStage = {};
            if (!app.userId) app.userId = currentUser.id; // Migrate old data
            return app;
        });
        saveApplications();
    } else {
        applications = [];
    }
    filteredApplications = [...applications];
}

// Save applications to localStorage
function saveApplications() {
    if (!currentUser) return;
    
    // Get all applications from storage
    const stored = localStorage.getItem('jobApplications');
    let allApplications = stored ? JSON.parse(stored) : [];
    
    // Remove current user's old applications
    allApplications = allApplications.filter(app => app.userId !== currentUser.id);
    
    // Add current user's applications
    allApplications = allApplications.concat(applications);
    
    // Save back to storage
    localStorage.setItem('jobApplications', JSON.stringify(allApplications));
}

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('applicationForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

// Set default date
function setDefaultDate() {
    const dateInput = document.getElementById('dateApplied');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please login to add applications');
        showAuthModal();
        return;
    }
    
    const companyName = document.getElementById('companyName').value.trim();
    const role = document.getElementById('role').value.trim();
    const dateApplied = document.getElementById('dateApplied').value;
    const status = document.getElementById('status').value;
    const interviewDate = document.getElementById('interviewDate').value;
    const notes = document.getElementById('notes').value.trim();
    const followUpNeeded = document.getElementById('followUpNeeded').checked;
    
    if (!companyName || !role || !dateApplied) {
        alert('Please fill in all required fields');
        return;
    }
    
    const newApplication = {
        id: Date.now().toString(),
        userId: currentUser.id, // Associate with current user
        companyName: companyName,
        role: role,
        dateApplied: dateApplied,
        status: status,
        notes: notes,
        followUpNeeded: followUpNeeded,
        interviewDates: interviewDate ? [interviewDate] : [],
        statusHistory: [{
            status: status,
            date: dateApplied,
            notes: notes || ''
        }],
        notesPerStage: {
            [status]: notes || ''
        },
        createdAt: new Date().toISOString()
    };
    
    applications.push(newApplication);
    saveApplications();
    filterApplications();
    updateAnalytics();
    
    // Reset form
    e.target.reset();
    setDefaultDate();
}

// Tab Navigation
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tabElement = document.getElementById(tabName + 'Tab');
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback if event is not available
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.textContent.includes(tabName === 'analytics' ? 'Analytics' : 'Applications')) {
                btn.classList.add('active');
            }
        });
    }
    
    if (tabName === 'analytics') {
        setTimeout(() => updateAnalytics(), 100);
    }
}

// Filter and Search Applications
function filterApplications() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    const showFollowUpOnly = document.getElementById('showFollowUpOnly').checked;
    
    filteredApplications = applications.filter(app => {
        const matchesSearch = !searchTerm || 
            app.companyName.toLowerCase().includes(searchTerm) ||
            app.role.toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        const matchesFollowUp = !showFollowUpOnly || app.followUpNeeded;
        
        return matchesSearch && matchesStatus && matchesFollowUp;
    });
    
    // Sort applications
    filteredApplications.sort((a, b) => {
        switch(sortBy) {
            case 'date-desc':
                return new Date(b.dateApplied) - new Date(a.dateApplied);
            case 'date-asc':
                return new Date(a.dateApplied) - new Date(b.dateApplied);
            case 'company-asc':
                return a.companyName.localeCompare(b.companyName);
            case 'company-desc':
                return b.companyName.localeCompare(a.companyName);
            case 'status':
                return a.status.localeCompare(b.status);
            default:
                return 0;
        }
    });
    
    renderApplications();
}

// Render all applications
function renderApplications() {
    const tableBody = document.getElementById('applicationsTableBody');
    const table = document.getElementById('applicationsTable');
    const emptyState = document.getElementById('emptyState');
    const countBadge = document.getElementById('applicationCount');
    
    if (!tableBody || !table || !emptyState || !countBadge) return;
    
    // Update count
    const count = filteredApplications.length;
    countBadge.textContent = `${count} ${count === 1 ? 'application' : 'applications'}`;
    
    // Clear table body
    tableBody.innerHTML = '';
    
    if (filteredApplications.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    filteredApplications.forEach(app => {
        const row = createApplicationRow(app);
        tableBody.appendChild(row);
    });
}

// Create a table row for an application
function createApplicationRow(app) {
    const row = document.createElement('tr');
    
    // Format date
    const formattedDate = new Date(app.dateApplied).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // Check if application is old (more than 7 days)
    const daysSinceApplied = Math.floor((new Date() - new Date(app.dateApplied)) / (1000 * 60 * 60 * 24));
    const isOld = daysSinceApplied > 7;
    
    // Add highlight classes
    if (app.followUpNeeded) {
        row.classList.add('follow-up-needed');
    }
    if (isOld && app.status === 'Applied') {
        row.classList.add('old-application');
    }
    
    // Follow-up indicator
    const followUpIndicator = app.followUpNeeded 
        ? '<span class="follow-up-badge">⚠️ Follow-up</span>' 
        : '-';
    
    // Interview date indicator
    const interviewInfo = app.interviewDates && app.interviewDates.length > 0
        ? `<span class="interview-badge">📅 ${app.interviewDates.length} interview${app.interviewDates.length > 1 ? 's' : ''}</span>`
        : '-';
    
    row.innerHTML = `
        <td data-label="Company">${escapeHtml(app.companyName)}</td>
        <td data-label="Role">${escapeHtml(app.role)}</td>
        <td data-label="Date Applied">${formattedDate} ${isOld && app.status === 'Applied' ? '<span style="color: #dc3545;">⚠️</span>' : ''}</td>
        <td data-label="Status">
            <span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span>
        </td>
        <td data-label="Follow-up">${followUpIndicator}</td>
        <td data-label="Actions">
            <div class="action-buttons">
                <button class="btn-small btn-view-timeline" onclick="viewTimeline('${app.id}')">Timeline</button>
                <button class="btn-small btn-edit" onclick="editApplication('${app.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteApplication('${app.id}')">Delete</button>
            </div>
        </td>
    `;
    
    return row;
}

// View Timeline
function viewTimeline(id) {
    if (!currentUser) {
        alert('Please login to view timeline');
        return;
    }
    
    const app = applications.find(a => a.id === id && a.userId === currentUser.id);
    if (!app) {
        alert('Application not found or access denied');
        return;
    }
    
    const modal = document.getElementById('timelineModal');
    const modalTitle = document.getElementById('modalCompanyName');
    const timelineContent = document.getElementById('timelineContent');
    
    modalTitle.textContent = `${app.companyName} - ${app.role} Timeline`;
    
    let timelineHTML = '<div class="timeline">';
    
    // Show status history
    if (app.statusHistory && app.statusHistory.length > 0) {
        app.statusHistory.forEach((entry, index) => {
            const date = new Date(entry.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            timelineHTML += `
                <div class="timeline-item">
                    <h4>Status: ${entry.status}</h4>
                    <div class="timeline-date">${date}</div>
                    ${entry.notes ? `<div class="timeline-notes">${escapeHtml(entry.notes)}</div>` : ''}
                </div>
            `;
        });
    }
    
    // Show interview dates
    if (app.interviewDates && app.interviewDates.length > 0) {
        app.interviewDates.forEach(interviewDate => {
            const date = new Date(interviewDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            timelineHTML += `
                <div class="timeline-item">
                    <h4>📅 Interview Scheduled</h4>
                    <div class="timeline-date">${date}</div>
                    ${app.notesPerStage && app.notesPerStage['Interview'] 
                        ? `<div class="timeline-notes">${escapeHtml(app.notesPerStage['Interview'])}</div>` 
                        : ''}
                </div>
            `;
        });
    }
    
    timelineHTML += '</div>';
    timelineContent.innerHTML = timelineHTML;
    
    modal.style.display = 'block';
}

// Close Timeline Modal
function closeTimelineModal() {
    document.getElementById('timelineModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('timelineModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Edit application
function editApplication(id) {
    if (!currentUser) {
        alert('Please login to edit applications');
        return;
    }
    
    const app = applications.find(a => a.id === id && a.userId === currentUser.id);
    if (!app) {
        alert('Application not found or access denied');
        return;
    }
    
    // Create edit form
    const row = event.target.closest('tr');
    const statusCell = row.querySelector('td[data-label="Status"]');
    const followUpCell = row.querySelector('td[data-label="Follow-up"]');
    const actionsCell = row.querySelector('td[data-label="Actions"]');
    
    // Store original values
    row.dataset.originalStatus = app.status;
    row.dataset.originalFollowUp = app.followUpNeeded;
    
    // Create status dropdown
    const statusSelect = document.createElement('select');
    statusSelect.className = 'status-select';
    statusSelect.id = `status-${app.id}`;
    statusSelect.innerHTML = `
        <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
        <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Interview</option>
        <option value="Selected" ${app.status === 'Selected' ? 'selected' : ''}>Selected</option>
        <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
    `;
    
    // Create follow-up checkbox
    const followUpCheckbox = document.createElement('input');
    followUpCheckbox.type = 'checkbox';
    followUpCheckbox.id = `followup-${app.id}`;
    followUpCheckbox.checked = app.followUpNeeded;
    const followUpLabel = document.createElement('label');
    followUpLabel.htmlFor = `followup-${app.id}`;
    followUpLabel.innerHTML = '<span class="follow-up-badge">⚠️ Follow-up</span>';
    const followUpContainer = document.createElement('div');
    followUpContainer.appendChild(followUpCheckbox);
    followUpContainer.appendChild(followUpLabel);
    
    // Replace status cell
    statusCell.innerHTML = '';
    statusCell.appendChild(statusSelect);
    
    // Replace follow-up cell
    followUpCell.innerHTML = '';
    followUpCell.appendChild(followUpContainer);
    
    // Replace actions with save/cancel buttons
    actionsCell.innerHTML = `
        <div class="action-buttons">
            <button class="btn-small btn-save" onclick="saveApplicationEdit('${app.id}')">Save</button>
            <button class="btn-small btn-cancel" onclick="cancelEdit('${app.id}')">Cancel</button>
        </div>
    `;
}

// Save application edit
function saveApplicationEdit(id) {
    if (!currentUser) {
        alert('Please login to save changes');
        return;
    }
    
    const app = applications.find(a => a.id === id && a.userId === currentUser.id);
    if (!app) {
        alert('Application not found or access denied');
        return;
    }
    
    const row = event.target.closest('tr');
    const statusSelect = row.querySelector('.status-select');
    const followUpCheckbox = row.querySelector(`#followup-${id}`);
    
    if (statusSelect) {
        const newStatus = statusSelect.value;
        const oldStatus = app.status;
        
        // If status changed, add to history
        if (newStatus !== oldStatus) {
            if (!app.statusHistory) app.statusHistory = [];
            app.statusHistory.push({
                status: newStatus,
                date: new Date().toISOString().split('T')[0],
                notes: app.notesPerStage && app.notesPerStage[newStatus] ? app.notesPerStage[newStatus] : ''
            });
        }
        
        app.status = newStatus;
    }
    
    // Update follow-up flag
    if (followUpCheckbox) {
        app.followUpNeeded = followUpCheckbox.checked;
    }
    
    saveApplications();
    filterApplications();
    updateAnalytics();
}

// Cancel edit
function cancelEdit(id) {
    // Just re-render to restore original state
    filterApplications();
}

// Toggle follow-up
function toggleFollowUp(id) {
    const app = applications.find(a => a.id === id);
    if (app) {
        app.followUpNeeded = !app.followUpNeeded;
        saveApplications();
        filterApplications();
    }
}

// Delete application
function deleteApplication(id) {
    if (!currentUser) {
        alert('Please login to delete applications');
        return;
    }
    
    const app = applications.find(a => a.id === id && a.userId === currentUser.id);
    if (!app) {
        alert('Application not found or access denied');
        return;
    }
    
    if (confirm('Are you sure you want to delete this application?')) {
        applications = applications.filter(a => a.id !== id && a.userId === currentUser.id);
        saveApplications();
        filterApplications();
        updateAnalytics();
    }
}

// Update Analytics
function updateAnalytics() {
    if (!document.getElementById('analyticsTab') || !document.getElementById('analyticsTab').classList.contains('active')) {
        return;
    }
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    const total = applications.length;
    const interviews = applications.filter(a => a.status === 'Interview' || a.status === 'Selected').length;
    const selected = applications.filter(a => a.status === 'Selected').length;
    const successRate = total > 0 ? ((selected / total) * 100).toFixed(1) : 0;
    
    // Calculate applications this week
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = applications.filter(a => new Date(a.dateApplied) >= weekAgo).length;
    
    // Update stat cards
    const totalEl = document.getElementById('totalApplications');
    const interviewsEl = document.getElementById('totalInterviews');
    const successRateEl = document.getElementById('successRate');
    const thisWeekEl = document.getElementById('applicationsThisWeek');
    
    if (totalEl) totalEl.textContent = total;
    if (interviewsEl) interviewsEl.textContent = interviews;
    if (successRateEl) successRateEl.textContent = successRate + '%';
    if (thisWeekEl) thisWeekEl.textContent = thisWeek;
    
    // Update charts
    updateStatusChart();
    updateTimeChart();
}

// Update Status Chart
function updateStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    const statusCounts = {
        'Applied': applications.filter(a => a.status === 'Applied').length,
        'Interview': applications.filter(a => a.status === 'Interview').length,
        'Selected': applications.filter(a => a.status === 'Selected').length,
        'Rejected': applications.filter(a => a.status === 'Rejected').length
    };
    
    if (statusChart) {
        statusChart.destroy();
    }
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#1976d2',
                    '#f57c00',
                    '#388e3c',
                    '#d32f2f'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update Time Chart
function updateTimeChart() {
    const ctx = document.getElementById('timeChart');
    if (!ctx) return;
    
    // Get last 8 weeks
    const weeks = [];
    const weekCounts = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        weeks.push(weekLabel);
        
        const count = applications.filter(a => {
            const appDate = new Date(a.dateApplied);
            return appDate >= weekStart && appDate < weekEnd;
        }).length;
        
        weekCounts.push(count);
    }
    
    if (timeChart) {
        timeChart.destroy();
    }
    
    timeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [{
                label: 'Applications',
                data: weekCounts,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
