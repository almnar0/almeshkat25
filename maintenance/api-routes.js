// API Routes for Maintenance Management System
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const {
    User,
    Device,
    Ticket,
    TicketHistory,
    Notification,
    ActivityLog
} = require('./models');

const router = express.Router();

// JWT Secret (في الإنتاج، استخدم متغير بيئي آمن)
const JWT_SECRET = process.env.JWT_SECRET || 'mishkat-maintenance-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts, please try again later'
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

// File upload configuration
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../data/uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only images and documents allowed.'));
    }
});

// ==========================================
// Middleware - Authentication
// ==========================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Role-based authorization
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.userType)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

// ==========================================
// Authentication Routes
// ==========================================

// Register
router.post('/auth/register', authLimiter, [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('userType').isIn(['client', 'technician']),
    body('phone').optional().matches(/^05\d{8}$/)
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, userType, phone } = req.body;

        const user = await User.create({ name, email, password, userType, phone });

        // Log activity
        await ActivityLog.create({
            userId: user.id,
            action: 'user_registered',
            entityType: 'user',
            entityId: user.id,
            details: { userType }
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, userType: user.userType },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.message === 'Email already exists') {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/auth/login', authLimiter, [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await User.verifyPassword(email, password);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        // Log activity
        await ActivityLog.create({
            userId: user.id,
            action: 'user_login',
            entityType: 'user',
            entityId: user.id,
            ipAddress: req.ip
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, userType: user.userType },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        res.json({
            message: 'Login successful',
            user,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// ==========================================
// User Routes
// ==========================================

// Get all users (Admin only)
router.get('/users', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { userType, isActive } = req.query;
        const filters = {};
        
        if (userType) filters.userType = userType;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const users = await User.findAll(filters);
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user
router.patch('/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Users can only update their own profile, unless admin
        if (req.user.userType !== 'admin' && req.user.id !== id) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const updates = req.body;
        
        // Prevent changing userType unless admin
        if (updates.userType && req.user.userType !== 'admin') {
            delete updates.userType;
        }

        const user = await User.update(id, updates);

        await ActivityLog.create({
            userId: req.user.id,
            action: 'user_updated',
            entityType: 'user',
            entityId: id,
            details: updates
        });

        res.json({ user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// ==========================================
// Device Routes
// ==========================================

// Get all devices
router.get('/devices', authenticateToken, apiLimiter, async (req, res) => {
    try {
        const { deviceType, status, location } = req.query;
        const filters = {};
        
        if (deviceType) filters.deviceType = deviceType;
        if (status) filters.status = status;
        if (location) filters.location = location;

        const devices = await Device.findAll(filters);
        res.json({ devices });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// Get single device
router.get('/devices/:id', authenticateToken, async (req, res) => {
    try {
        const device = await Device.findById(req.params.id);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json({ device });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch device' });
    }
});

// Create device (Admin/Technician only)
router.post('/devices', authenticateToken, authorize('admin', 'technician'), [
    body('deviceType').trim().notEmpty(),
    body('location').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const device = await Device.create(req.body);

        await ActivityLog.create({
            userId: req.user.id,
            action: 'device_created',
            entityType: 'device',
            entityId: device.id,
            details: req.body
        });

        res.status(201).json({ device });
    } catch (error) {
        console.error('Create device error:', error);
        res.status(500).json({ error: 'Failed to create device' });
    }
});

// Update device (Admin/Technician only)
router.patch('/devices/:id', authenticateToken, authorize('admin', 'technician'), async (req, res) => {
    try {
        const device = await Device.update(req.params.id, req.body);

        await ActivityLog.create({
            userId: req.user.id,
            action: 'device_updated',
            entityType: 'device',
            entityId: req.params.id,
            details: req.body
        });

        res.json({ device });
    } catch (error) {
        console.error('Update device error:', error);
        if (error.message === 'Device not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update device' });
    }
});

// Delete device (Admin only)
router.delete('/devices/:id', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        await Device.delete(req.params.id);

        await ActivityLog.create({
            userId: req.user.id,
            action: 'device_deleted',
            entityType: 'device',
            entityId: req.params.id
        });

        res.json({ message: 'Device deleted successfully' });
    } catch (error) {
        if (error.message === 'Device not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

// ==========================================
// Ticket Routes
// ==========================================

// Get all tickets
router.get('/tickets', authenticateToken, apiLimiter, async (req, res) => {
    try {
        const { status, priority, serviceType } = req.query;
        const filters = {};
        
        // Clients can only see their own tickets
        if (req.user.userType === 'client') {
            filters.clientId = req.user.id;
        }
        
        // Technicians can see assigned tickets or all pending
        if (req.user.userType === 'technician') {
            if (req.query.assigned === 'true') {
                filters.technicianId = req.user.id;
            }
        }
        
        if (status) filters.status = status;
        if (priority) filters.priority = priority;
        if (serviceType) filters.serviceType = serviceType;

        const tickets = await Ticket.findAll(filters);

        res.json({ tickets });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Get single ticket
router.get('/tickets/:id', authenticateToken, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Authorization check
        if (req.user.userType === 'client' && ticket.clientId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get ticket history
        const history = await TicketHistory.findByTicketId(ticket.id);

        res.json({ ticket, history });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

// Create ticket
router.post('/tickets', authenticateToken, [
    body('serviceType').trim().notEmpty(),
    body('title').trim().isLength({ min: 5, max: 255 }),
    body('description').trim().isLength({ min: 10 }),
    body('location').trim().notEmpty(),
    body('priority').optional().isIn(['normal', 'urgent', 'critical'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const ticketData = {
            ...req.body,
            clientId: req.user.id
        };

        const ticket = await Ticket.create(ticketData);

        // Create notification for admins
        const admins = await User.findAll({ userType: 'admin' });
        for (const admin of admins) {
            await Notification.create({
                userId: admin.id,
                ticketId: ticket.id,
                notificationType: 'new_ticket',
                title: 'بلاغ جديد',
                message: `بلاغ جديد: ${ticket.title}`
            });
        }

        await ActivityLog.create({
            userId: req.user.id,
            action: 'ticket_created',
            entityType: 'ticket',
            entityId: ticket.id,
            details: { ticketNumber: ticket.ticketNumber }
        });

        res.status(201).json({ ticket });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

// Update ticket
router.patch('/tickets/:id', authenticateToken, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Authorization check
        if (req.user.userType === 'client' && ticket.clientId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updates = req.body;

        // Clients can only cancel their own tickets
        if (req.user.userType === 'client') {
            if (updates.status && updates.status !== 'cancelled') {
                return res.status(403).json({ error: 'Clients can only cancel tickets' });
            }
        }

        const updatedTicket = await Ticket.update(req.params.id, updates, req.user.id);

        // Create notification for client when status changes
        if (updates.status && ticket.status !== updates.status) {
            await Notification.create({
                userId: ticket.clientId,
                ticketId: ticket.id,
                notificationType: 'status_changed',
                title: 'تحديث حالة البلاغ',
                message: `تم تحديث حالة البلاغ ${ticket.ticketNumber} إلى: ${updates.status}`
            });
        }

        await ActivityLog.create({
            userId: req.user.id,
            action: 'ticket_updated',
            entityType: 'ticket',
            entityId: req.params.id,
            details: updates
        });

        res.json({ ticket: updatedTicket });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

// Assign technician to ticket (Admin only)
router.post('/tickets/:id/assign', authenticateToken, authorize('admin'), [
    body('technicianId').isUUID()
], async (req, res) => {
    try {
        const { technicianId } = req.body;

        const technician = await User.findById(technicianId);
        if (!technician || technician.userType !== 'technician') {
            return res.status(400).json({ error: 'Invalid technician' });
        }

        const ticket = await Ticket.update(req.params.id, {
            technicianId,
            status: 'assigned'
        }, req.user.id);

        // Notify technician
        await Notification.create({
            userId: technicianId,
            ticketId: ticket.id,
            notificationType: 'ticket_assigned',
            title: 'بلاغ جديد موكل إليك',
            message: `تم تعيينك على البلاغ ${ticket.ticketNumber}`
        });

        res.json({ ticket });
    } catch (error) {
        res.status(500).json({ error: 'Failed to assign technician' });
    }
});

// ==========================================
// Notification Routes
// ==========================================

// Get user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const { unreadOnly } = req.query;
        const notifications = await Notification.findByUserId(
            req.user.id,
            unreadOnly === 'true'
        );
        res.json({ notifications });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await Notification.markAsRead(req.params.id);
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all notifications as read
router.post('/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        await Notification.markAllAsRead(req.user.id);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// ==========================================
// Activity Log Routes (Admin only)
// ==========================================

router.get('/activity-logs', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { userId, entityType, limit } = req.query;
        const filters = {};
        
        if (userId) filters.userId = userId;
        if (entityType) filters.entityType = entityType;

        const logs = await ActivityLog.findAll(filters, parseInt(limit) || 100);
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

// ==========================================
// Dashboard Statistics
// ==========================================

router.get('/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const stats = {};

        if (req.user.userType === 'admin') {
            const users = await User.findAll();
            const tickets = await Ticket.findAll();
            const devices = await Device.findAll();

            stats.totalUsers = users.length;
            stats.totalClients = users.filter(u => u.userType === 'client').length;
            stats.totalTechnicians = users.filter(u => u.userType === 'technician').length;
            stats.totalTickets = tickets.length;
            stats.pendingTickets = tickets.filter(t => t.status === 'pending').length;
            stats.inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
            stats.completedTickets = tickets.filter(t => t.status === 'completed').length;
            stats.totalDevices = devices.length;
            stats.workingDevices = devices.filter(d => d.status === 'working').length;
            stats.brokenDevices = devices.filter(d => d.status === 'broken').length;
            stats.completionRate = tickets.length > 0 
                ? ((stats.completedTickets / tickets.length) * 100).toFixed(1)
                : 0;
        } else if (req.user.userType === 'technician') {
            const allTickets = await Ticket.findAll();
            const myTickets = allTickets.filter(t => t.technicianId === req.user.id);

            stats.totalAssigned = myTickets.length;
            stats.pending = myTickets.filter(t => t.status === 'assigned' || t.status === 'pending').length;
            stats.inProgress = myTickets.filter(t => t.status === 'in_progress').length;
            stats.completed = myTickets.filter(t => t.status === 'completed').length;

            const user = await User.findById(req.user.id);
            stats.rating = user.rating || 0;
        } else if (req.user.userType === 'client') {
            const tickets = await Ticket.findAll({ clientId: req.user.id });

            stats.totalTickets = tickets.length;
            stats.pending = tickets.filter(t => t.status === 'pending' || t.status === 'assigned').length;
            stats.inProgress = tickets.filter(t => t.status === 'in_progress').length;
            stats.completed = tickets.filter(t => t.status === 'completed').length;
        }

        res.json({ stats });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

module.exports = router;
