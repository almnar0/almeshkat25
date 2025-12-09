// API Integration for Maintenance System
// This file provides helper functions to interact with the backend API

const API_BASE_URL = 'http://localhost:3000/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API call failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Users API
const UsersAPI = {
    async register(userData) {
        return apiCall('/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },
    
    async login(email, password) {
        return apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },
    
    async getAll() {
        return apiCall('/users');
    },
};

// Tickets API
const TicketsAPI = {
    async getAll(filters = {}) {
        const params = new URLSearchParams(filters);
        return apiCall(`/tickets?${params}`);
    },
    
    async getById(id) {
        return apiCall(`/tickets/${id}`);
    },
    
    async create(ticketData) {
        return apiCall('/tickets', {
            method: 'POST',
            body: JSON.stringify(ticketData),
        });
    },
    
    async update(id, updates) {
        return apiCall(`/tickets/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    },
    
    async delete(id) {
        return apiCall(`/tickets/${id}`, {
            method: 'DELETE',
        });
    },
};

// Devices API
const DevicesAPI = {
    async getAll(filters = {}) {
        const params = new URLSearchParams(filters);
        return apiCall(`/devices?${params}`);
    },
    
    async getById(id) {
        return apiCall(`/devices/${id}`);
    },
    
    async create(deviceData) {
        return apiCall('/devices', {
            method: 'POST',
            body: JSON.stringify(deviceData),
        });
    },
    
    async update(id, updates) {
        return apiCall(`/devices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    },
    
    async delete(id, userId, userName) {
        return apiCall(`/devices/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ userId, userName }),
        });
    },
};

// Notifications API
const NotificationsAPI = {
    async getByUserId(userId) {
        return apiCall(`/notifications/${userId}`);
    },
    
    async markAsRead(id) {
        return apiCall(`/notifications/${id}/read`, {
            method: 'PATCH',
        });
    },
};

// Stats API
const StatsAPI = {
    async getDashboardStats() {
        return apiCall('/stats');
    },
    
    async getAuditLogs(filters = {}) {
        const params = new URLSearchParams(filters);
        return apiCall(`/audit-logs?${params}`);
    },
};

// Utility functions
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--purple-500)'};
        color: white;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
}

// Image handling
function resizeImage(file, maxWidth = 800, maxHeight = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleImageUpload(fileInput, maxImages = 5) {
    const files = Array.from(fileInput.files);
    if (files.length > maxImages) {
        showNotification(`الحد الأقصى ${maxImages} صور`, 'error');
        return [];
    }
    
    const images = [];
    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            showNotification(`حجم الملف ${file.name} كبير جداً (الحد الأقصى 5MB)`, 'error');
            continue;
        }
        
        try {
            const resized = await resizeImage(file);
            images.push(resized);
        } catch (error) {
            console.error('Failed to process image:', error);
            showNotification(`فشل معالجة الصورة ${file.name}`, 'error');
        }
    }
    
    return images;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UsersAPI,
        TicketsAPI,
        DevicesAPI,
        NotificationsAPI,
        StatsAPI,
        showNotification,
        formatDate,
        formatTime,
        formatDateTime,
        handleImageUpload,
    };
}
