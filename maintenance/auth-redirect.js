// Authentication redirect script
// Redirects already logged-in users to their appropriate dashboard
(function() {
    // Configuration mapping user types to their dashboard URLs
    const DASHBOARD_URLS = {
        'client': 'client-dashboard.html',
        'technician': 'tech-dashboard.html',
        'admin': 'admin-dashboard.html'
    };

    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        // Validate that currentUser is an object with a userType property
        if (currentUser && 
            typeof currentUser === 'object' && 
            typeof currentUser.userType === 'string' &&
            DASHBOARD_URLS[currentUser.userType]) {
            // User is already logged in, redirect to their dashboard
            window.location.href = DASHBOARD_URLS[currentUser.userType];
        }
    } catch (error) {
        // If localStorage is corrupted or inaccessible, just continue to show the page
        console.error('Error checking authentication status:', error);
    }
})();
