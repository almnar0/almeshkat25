// Authentication redirect script
// Redirects already logged-in users to their appropriate dashboard
(function() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (currentUser && currentUser.userType) {
            // User is already logged in, redirect to their dashboard
            if (currentUser.userType === 'client') {
                window.location.href = 'client-dashboard.html';
            } else if (currentUser.userType === 'technician') {
                window.location.href = 'tech-dashboard.html';
            } else if (currentUser.userType === 'admin') {
                window.location.href = 'admin-dashboard.html';
            }
        }
    } catch (error) {
        // If localStorage is corrupted or inaccessible, just continue to show the page
        console.error('Error checking authentication status:', error);
    }
})();
