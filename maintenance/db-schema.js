// Database schema and structure for the maintenance management system
// This defines the structure of data stored in localStorage (for development)
// In production, this would be used to create actual database tables

const SCHEMA = {
  users: {
    // User accounts with different roles
    fields: {
      id: 'string (UUID)',
      userType: 'string (client|technician|admin)',
      name: 'string',
      email: 'string (unique)',
      password: 'string (bcrypt hash in production)',
      phone: 'string',
      createdAt: 'ISO timestamp',
      updatedAt: 'ISO timestamp',
      isActive: 'boolean',
      // Technician specific fields
      specialty: 'string (for technicians)',
      averageRating: 'number (for technicians)',
      completedJobs: 'number (for technicians)',
    }
  },

  tickets: {
    // Maintenance tickets/requests with full tracking
    fields: {
      id: 'string (UUID)',
      ticketNumber: 'string (formatted: TKT-YYYYMMDD-XXXX)',
      clientId: 'string (user.id)',
      clientName: 'string',
      technicianId: 'string (user.id) nullable',
      technicianName: 'string nullable',
      
      // Service details
      serviceType: 'string (repair|installation|keyboard-mouse|other)',
      issueType: 'string (electrical|plumbing|carpentry|it|ac|other)',
      title: 'string',
      description: 'string',
      location: 'string',
      priority: 'string (normal|urgent)',
      
      // Status tracking
      status: 'string (new|assigned|in-progress|on-hold|completed|rejected|cancelled)',
      
      // Attachments
      images: 'array of base64 strings or URLs',
      attachments: 'array of file objects',
      
      // Related device (optional)
      deviceId: 'string nullable',
      
      // Timestamps
      createdAt: 'ISO timestamp',
      updatedAt: 'ISO timestamp',
      assignedAt: 'ISO timestamp nullable',
      completedAt: 'ISO timestamp nullable',
      
      // Notes and feedback
      technicianNotes: 'string',
      internalNotes: 'string (admin only)',
      
      // Rating
      rating: 'number (1-5) nullable',
      ratingComment: 'string nullable',
      ratedAt: 'ISO timestamp nullable',
      
      // Audit trail
      history: 'array of history entries',
    }
  },

  devices: {
    // Inventory of devices/equipment
    fields: {
      id: 'string (UUID)',
      name: 'string',
      type: 'string (computer|keyboard|mouse|printer|ac|other)',
      model: 'string',
      serialNumber: 'string',
      location: 'string',
      
      // Status
      status: 'string (operational|faulty|under-maintenance|out-of-service)',
      
      // Service tracking
      lastServiceDate: 'ISO timestamp nullable',
      nextServiceDate: 'ISO timestamp nullable',
      serviceInterval: 'number (days)',
      
      // Additional info
      purchaseDate: 'ISO timestamp nullable',
      warrantyExpiry: 'ISO timestamp nullable',
      notes: 'string',
      
      // Timestamps
      createdAt: 'ISO timestamp',
      updatedAt: 'ISO timestamp',
      
      // Relations
      assignedTo: 'string (location/department)',
      relatedTickets: 'array of ticket IDs',
    }
  },

  auditLogs: {
    // System-wide audit trail
    fields: {
      id: 'string (UUID)',
      timestamp: 'ISO timestamp',
      userId: 'string',
      userName: 'string',
      userType: 'string',
      action: 'string (create|update|delete|assign|complete)',
      entityType: 'string (ticket|device|user)',
      entityId: 'string',
      changes: 'object (old and new values)',
      ipAddress: 'string',
      userAgent: 'string',
    }
  },

  notifications: {
    // In-app notifications
    fields: {
      id: 'string (UUID)',
      userId: 'string',
      type: 'string (ticket-created|ticket-assigned|status-changed|rating-received)',
      title: 'string',
      message: 'string',
      link: 'string (URL to relevant page)',
      isRead: 'boolean',
      createdAt: 'ISO timestamp',
      readAt: 'ISO timestamp nullable',
    }
  },

  reports: {
    // Saved reports and analytics
    fields: {
      id: 'string (UUID)',
      name: 'string',
      type: 'string (tickets|technicians|devices|performance)',
      parameters: 'object (date ranges, filters)',
      generatedBy: 'string (user.id)',
      generatedAt: 'ISO timestamp',
      data: 'object (report results)',
      format: 'string (json|csv|pdf)',
    }
  }
};

// Default data for system initialization
const DEFAULT_DATA = {
  users: [
    {
      id: 'admin-default',
      userType: 'admin',
      name: 'مدير النظام',
      email: 'admin@mishkat.edu.sa',
      password: 'admin123', // In production: bcrypt hash
      phone: '0501234567',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    }
  ],
  tickets: [],
  devices: [],
  auditLogs: [],
  notifications: [],
  reports: [],
};

// Helper functions for data initialization
function generateId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function generateTicketNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `TKT-${dateStr}-${random}`;
}

function initializeDatabase() {
  // Initialize all collections if they don't exist
  Object.keys(DEFAULT_DATA).forEach(collection => {
    if (!localStorage.getItem(collection)) {
      localStorage.setItem(collection, JSON.stringify(DEFAULT_DATA[collection]));
    }
  });
  
  // Ensure admin exists
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const adminExists = users.some(u => u.userType === 'admin');
  if (!adminExists) {
    users.push(DEFAULT_DATA.users[0]);
    localStorage.setItem('users', JSON.stringify(users));
  }
}

// Data access layer
const DB = {
  // Get all items from a collection
  getAll(collection) {
    return JSON.parse(localStorage.getItem(collection) || '[]');
  },
  
  // Get one item by ID
  getById(collection, id) {
    const items = this.getAll(collection);
    return items.find(item => item.id === id);
  },
  
  // Create new item
  create(collection, item) {
    const items = this.getAll(collection);
    const newItem = {
      ...item,
      id: item.id || generateId(),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(newItem);
    localStorage.setItem(collection, JSON.stringify(items));
    return newItem;
  },
  
  // Update item
  update(collection, id, updates) {
    const items = this.getAll(collection);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(collection, JSON.stringify(items));
    return items[index];
  },
  
  // Delete item
  delete(collection, id) {
    const items = this.getAll(collection);
    const filtered = items.filter(item => item.id !== id);
    localStorage.setItem(collection, JSON.stringify(filtered));
    return filtered.length < items.length;
  },
  
  // Query with filters
  query(collection, filters = {}) {
    let items = this.getAll(collection);
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        items = items.filter(item => {
          if (Array.isArray(value)) {
            return value.includes(item[key]);
          }
          return item[key] === value;
        });
      }
    });
    
    return items;
  },
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCHEMA, DEFAULT_DATA, DB, generateId, generateTicketNumber, initializeDatabase };
}
