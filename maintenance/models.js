// Data Models for Maintenance Management System
// This provides a file-based storage solution compatible with the PostgreSQL schema

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Generic file operations
async function readData(filename) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function writeData(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ==========================================
// User Model
// ==========================================
class User {
    static async create({ userType, name, email, password, phone }) {
        const users = await readData('users.json');
        
        // Check if email exists
        if (users.find(u => u.email === email)) {
            throw new Error('Email already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        const user = {
            id: uuidv4(),
            userType,
            name,
            email,
            passwordHash,
            phone: phone || null,
            avatarUrl: null,
            rating: 0.00,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        users.push(user);
        await writeData('users.json', users);
        
        // Return user without password
        const { passwordHash: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    static async findByEmail(email) {
        const users = await readData('users.json');
        return users.find(u => u.email === email);
    }

    static async findById(id) {
        const users = await readData('users.json');
        return users.find(u => u.id === id);
    }

    static async findAll(filters = {}) {
        let users = await readData('users.json');
        
        if (filters.userType) {
            users = users.filter(u => u.userType === filters.userType);
        }
        
        if (filters.isActive !== undefined) {
            users = users.filter(u => u.isActive === filters.isActive);
        }

        // Remove password hashes
        return users.map(({ passwordHash: _pw, ...user }) => user);
    }

    static async verifyPassword(email, password) {
        const user = await this.findByEmail(email);
        if (!user) return null;
        
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        const { passwordHash: _pwd, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    static async update(id, updates) {
        const users = await readData('users.json');
        const index = users.findIndex(u => u.id === id);
        
        if (index === -1) {
            throw new Error('User not found');
        }

        // Handle password update
        if (updates.password) {
            updates.passwordHash = await bcrypt.hash(updates.password, 10);
            delete updates.password;
        }

        users[index] = {
            ...users[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await writeData('users.json', users);
        
        const { passwordHash: _pass, ...userWithoutPassword } = users[index];
        return userWithoutPassword;
    }
}

// ==========================================
// Device Model
// ==========================================
class Device {
    static async create(deviceData) {
        const devices = await readData('devices.json');
        
        const device = {
            id: uuidv4(),
            deviceType: deviceData.deviceType,
            model: deviceData.model || null,
            serialNumber: deviceData.serialNumber || null,
            location: deviceData.location || null,
            status: deviceData.status || 'working',
            lastServiceDate: deviceData.lastServiceDate || null,
            purchaseDate: deviceData.purchaseDate || null,
            warrantyExpiry: deviceData.warrantyExpiry || null,
            notes: deviceData.notes || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        devices.push(device);
        await writeData('devices.json', devices);
        return device;
    }

    static async findById(id) {
        const devices = await readData('devices.json');
        return devices.find(d => d.id === id);
    }

    static async findAll(filters = {}) {
        let devices = await readData('devices.json');
        
        if (filters.deviceType) {
            devices = devices.filter(d => d.deviceType === filters.deviceType);
        }
        
        if (filters.status) {
            devices = devices.filter(d => d.status === filters.status);
        }

        if (filters.location) {
            devices = devices.filter(d => d.location && d.location.includes(filters.location));
        }

        return devices;
    }

    static async update(id, updates) {
        const devices = await readData('devices.json');
        const index = devices.findIndex(d => d.id === id);
        
        if (index === -1) {
            throw new Error('Device not found');
        }

        devices[index] = {
            ...devices[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await writeData('devices.json', devices);
        return devices[index];
    }

    static async delete(id) {
        const devices = await readData('devices.json');
        const filtered = devices.filter(d => d.id !== id);
        
        if (filtered.length === devices.length) {
            throw new Error('Device not found');
        }

        await writeData('devices.json', filtered);
        return { success: true };
    }
}

// ==========================================
// Ticket Model
// ==========================================
class Ticket {
    static generateTicketNumber() {
        const year = new Date().getFullYear().toString().slice(-2);
        const timestamp = Date.now().toString().slice(-5);
        return `TKT-${year}-${timestamp}`;
    }

    static async create(ticketData) {
        const tickets = await readData('tickets.json');
        
        const ticket = {
            id: uuidv4(),
            ticketNumber: this.generateTicketNumber(),
            clientId: ticketData.clientId,
            technicianId: ticketData.technicianId || null,
            deviceId: ticketData.deviceId || null,
            serviceType: ticketData.serviceType,
            title: ticketData.title,
            description: ticketData.description,
            location: ticketData.location,
            priority: ticketData.priority || 'normal',
            status: 'pending',
            contactPhone: ticketData.contactPhone || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedAt: null,
            startedAt: null,
            completedAt: null,
            rating: null,
            feedback: null
        };

        tickets.push(ticket);
        await writeData('tickets.json', tickets);

        // Log creation
        await TicketHistory.create({
            ticketId: ticket.id,
            userId: ticketData.clientId,
            action: 'created',
            notes: 'تم إنشاء البلاغ'
        });

        return ticket;
    }

    static async findById(id) {
        const tickets = await readData('tickets.json');
        return tickets.find(t => t.id === id);
    }

    static async findAll(filters = {}) {
        let tickets = await readData('tickets.json');
        
        if (filters.clientId) {
            tickets = tickets.filter(t => t.clientId === filters.clientId);
        }
        
        if (filters.technicianId) {
            tickets = tickets.filter(t => t.technicianId === filters.technicianId);
        }
        
        if (filters.status) {
            tickets = tickets.filter(t => t.status === filters.status);
        }

        if (filters.priority) {
            tickets = tickets.filter(t => t.priority === filters.priority);
        }

        if (filters.serviceType) {
            tickets = tickets.filter(t => t.serviceType === filters.serviceType);
        }

        // Sort by creation date (newest first)
        tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return tickets;
    }

    static async update(id, updates, userId) {
        const tickets = await readData('tickets.json');
        const index = tickets.findIndex(t => t.id === id);
        
        if (index === -1) {
            throw new Error('Ticket not found');
        }

        const oldTicket = { ...tickets[index] };
        
        // Track specific status changes
        if (updates.status && updates.status !== oldTicket.status) {
            if (updates.status === 'assigned') {
                updates.assignedAt = new Date().toISOString();
            } else if (updates.status === 'in_progress') {
                updates.startedAt = new Date().toISOString();
            } else if (updates.status === 'completed') {
                updates.completedAt = new Date().toISOString();
            }
        }

        tickets[index] = {
            ...oldTicket,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await writeData('tickets.json', tickets);

        // Log the update
        if (updates.status) {
            await TicketHistory.create({
                ticketId: id,
                userId: userId,
                action: 'status_changed',
                oldValue: oldTicket.status,
                newValue: updates.status,
                notes: updates.notes || `تم تغيير الحالة من ${oldTicket.status} إلى ${updates.status}`
            });
        }

        return tickets[index];
    }

    static async delete(id) {
        const tickets = await readData('tickets.json');
        const filtered = tickets.filter(t => t.id !== id);
        
        if (filtered.length === tickets.length) {
            throw new Error('Ticket not found');
        }

        await writeData('tickets.json', filtered);
        return { success: true };
    }
}

// ==========================================
// Ticket History Model
// ==========================================
class TicketHistory {
    static async create(historyData) {
        const history = await readData('ticket_history.json');
        
        const record = {
            id: uuidv4(),
            ticketId: historyData.ticketId,
            userId: historyData.userId || null,
            action: historyData.action,
            oldValue: historyData.oldValue || null,
            newValue: historyData.newValue || null,
            notes: historyData.notes || null,
            isInternal: historyData.isInternal || false,
            createdAt: new Date().toISOString()
        };

        history.push(record);
        await writeData('ticket_history.json', history);
        return record;
    }

    static async findByTicketId(ticketId) {
        const history = await readData('ticket_history.json');
        return history
            .filter(h => h.ticketId === ticketId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
}

// ==========================================
// Notification Model
// ==========================================
class Notification {
    static async create(notificationData) {
        const notifications = await readData('notifications.json');
        
        const notification = {
            id: uuidv4(),
            userId: notificationData.userId,
            ticketId: notificationData.ticketId || null,
            notificationType: notificationData.notificationType,
            title: notificationData.title,
            message: notificationData.message,
            isRead: false,
            createdAt: new Date().toISOString()
        };

        notifications.push(notification);
        await writeData('notifications.json', notifications);
        return notification;
    }

    static async findByUserId(userId, unreadOnly = false) {
        const notifications = await readData('notifications.json');
        let userNotifications = notifications.filter(n => n.userId === userId);
        
        if (unreadOnly) {
            userNotifications = userNotifications.filter(n => !n.isRead);
        }

        return userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    static async markAsRead(id) {
        const notifications = await readData('notifications.json');
        const index = notifications.findIndex(n => n.id === id);
        
        if (index !== -1) {
            notifications[index].isRead = true;
            await writeData('notifications.json', notifications);
        }
    }

    static async markAllAsRead(userId) {
        const notifications = await readData('notifications.json');
        const updated = notifications.map(n => {
            if (n.userId === userId && !n.isRead) {
                return { ...n, isRead: true };
            }
            return n;
        });
        await writeData('notifications.json', updated);
    }
}

// ==========================================
// Activity Log Model
// ==========================================
class ActivityLog {
    static async create(logData) {
        const logs = await readData('activity_logs.json');
        
        const log = {
            id: uuidv4(),
            userId: logData.userId || null,
            action: logData.action,
            entityType: logData.entityType || null,
            entityId: logData.entityId || null,
            details: logData.details || {},
            ipAddress: logData.ipAddress || null,
            createdAt: new Date().toISOString()
        };

        logs.push(log);
        
        // Keep only last 1000 logs
        const trimmedLogs = logs.slice(-1000);
        await writeData('activity_logs.json', trimmedLogs);
        
        return log;
    }

    static async findAll(filters = {}, limit = 100) {
        let logs = await readData('activity_logs.json');
        
        if (filters.userId) {
            logs = logs.filter(l => l.userId === filters.userId);
        }
        
        if (filters.entityType) {
            logs = logs.filter(l => l.entityType === filters.entityType);
        }

        if (filters.entityId) {
            logs = logs.filter(l => l.entityId === filters.entityId);
        }

        return logs
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }
}

// Initialize data files
async function initializeDataFiles() {
    await ensureDataDir();
    
    const files = [
        'users.json',
        'devices.json',
        'tickets.json',
        'ticket_history.json',
        'notifications.json',
        'activity_logs.json'
    ];

    for (const file of files) {
        try {
            await readData(file);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await writeData(file, []);
            }
        }
    }

    // Create default admin if not exists
    const users = await readData('users.json');
    const adminExists = users.some(u => u.email === 'admin@mishkat.edu.sa');
    
    if (!adminExists) {
        await User.create({
            userType: 'admin',
            name: 'مدير النظام',
            email: 'admin@mishkat.edu.sa',
            password: 'admin123'
        });
        console.log('✓ Default admin user created');
    }
}

module.exports = {
    User,
    Device,
    Ticket,
    TicketHistory,
    Notification,
    ActivityLog,
    initializeDataFiles
};
