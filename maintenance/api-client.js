// Enhanced Authentication and API Client for Maintenance System

class MaintenanceAPI {
    constructor() {
        this.baseURL = '/api/maintenance';
        this.token = localStorage.getItem('authToken');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Authentication
    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        this.setToken(data.token);
        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(data.token);
        return data;
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    logout() {
        this.setToken(null);
        localStorage.removeItem('currentUser');
        window.location.href = '/maintenance/login.html';
    }

    // Users
    async getUsers(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/users?${params}`);
    }

    async updateUser(id, updates) {
        return await this.request(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    // Devices
    async getDevices(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/devices?${params}`);
    }

    async getDevice(id) {
        return await this.request(`/devices/${id}`);
    }

    async createDevice(deviceData) {
        return await this.request('/devices', {
            method: 'POST',
            body: JSON.stringify(deviceData)
        });
    }

    async updateDevice(id, updates) {
        return await this.request(`/devices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    async deleteDevice(id) {
        return await this.request(`/devices/${id}`, {
            method: 'DELETE'
        });
    }

    // Tickets
    async getTickets(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/tickets?${params}`);
    }

    async getTicket(id) {
        return await this.request(`/tickets/${id}`);
    }

    async createTicket(ticketData) {
        return await this.request('/tickets', {
            method: 'POST',
            body: JSON.stringify(ticketData)
        });
    }

    async updateTicket(id, updates) {
        return await this.request(`/tickets/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    async assignTechnician(ticketId, technicianId) {
        return await this.request(`/tickets/${ticketId}/assign`, {
            method: 'POST',
            body: JSON.stringify({ technicianId })
        });
    }

    // Notifications
    async getNotifications(unreadOnly = false) {
        const params = unreadOnly ? '?unreadOnly=true' : '';
        return await this.request(`/notifications${params}`);
    }

    async markNotificationRead(id) {
        return await this.request(`/notifications/${id}/read`, {
            method: 'PATCH'
        });
    }

    async markAllNotificationsRead() {
        return await this.request('/notifications/read-all', {
            method: 'POST'
        });
    }

    // Dashboard Stats
    async getDashboardStats() {
        return await this.request('/dashboard/stats');
    }

    // Activity Logs
    async getActivityLogs(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/activity-logs?${params}`);
    }
}

// Initialize API client
const api = new MaintenanceAPI();

// Utility functions
const utils = {
    // Format date in Arabic
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Format time
    formatTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format datetime
    formatDateTime(dateString) {
        if (!dateString) return '-';
        return `${this.formatDate(dateString)} ${this.formatTime(dateString)}`;
    },

    // Format relative time (منذ ساعة، منذ يومين، إلخ)
    formatRelativeTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;
        return this.formatDate(dateString);
    },

    // Show notification toast
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: white;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            min-width: 300px;
            border-right: 4px solid ${this.getNotificationColor(type)};
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    },

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    },

    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    },

    // Get status badge
    getStatusBadge(status) {
        const badges = {
            pending: { text: 'قيد الانتظار', color: '#f59e0b' },
            assigned: { text: 'تم التعيين', color: '#3b82f6' },
            in_progress: { text: 'قيد المعالجة', color: '#6366f1' },
            completed: { text: 'مكتمل', color: '#10b981' },
            rejected: { text: 'مرفوض', color: '#ef4444' },
            cancelled: { text: 'ملغي', color: '#6b7280' },
            working: { text: 'سليم', color: '#10b981' },
            broken: { text: 'معطل', color: '#ef4444' },
            in_maintenance: { text: 'قيد الصيانة', color: '#f59e0b' },
            out_of_service: { text: 'خارج الخدمة', color: '#6b7280' }
        };
        const badge = badges[status] || { text: status, color: '#6b7280' };
        return `<span class="status-badge" style="background: ${badge.color}20; color: ${badge.color}; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.875rem; font-weight: 600;">${badge.text}</span>`;
    },

    // Get priority badge
    getPriorityBadge(priority) {
        const badges = {
            normal: { text: 'عادي', color: '#6b7280' },
            urgent: { text: 'عاجل', color: '#f59e0b' },
            critical: { text: 'حرج', color: '#ef4444' }
        };
        const badge = badges[priority] || badges.normal;
        return `<span class="priority-badge" style="background: ${badge.color}20; color: ${badge.color}; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.875rem; font-weight: 600;">${badge.text}</span>`;
    },

    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate Saudi phone
    validatePhone(phone) {
        const re = /^05\d{8}$/;
        return re.test(phone);
    },

    // Safe text truncation
    truncate(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    },

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Add animation styles
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .notification-icon {
            font-size: 1.25rem;
        }

        .notification-message {
            font-size: 0.9375rem;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
}

// Check authentication on protected pages
function requireAuth() {
    const token = localStorage.getItem('authToken');
    if (!token && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
        window.location.href = '/maintenance/login.html';
    }
}

// Auto-redirect if already logged in
function redirectIfAuthenticated() {
    const token = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (token && currentUser) {
        const dashboardMap = {
            'client': '/maintenance/client-dashboard.html',
            'technician': '/maintenance/tech-dashboard.html',
            'admin': '/maintenance/admin-dashboard.html'
        };
        
        const targetDashboard = dashboardMap[currentUser.userType];
        if (targetDashboard && !window.location.pathname.includes('dashboard')) {
            window.location.href = targetDashboard;
        }
    }
}
