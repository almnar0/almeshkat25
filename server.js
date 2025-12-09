const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const SUGGESTIONS_FILE = path.join(DATA_DIR, 'suggestions.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'audit-logs.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const ALLOWED_SUGGESTION_STATUSES = new Set(['pending', 'approved', 'rejected']);
const ALLOWED_SUGGESTION_CATEGORIES = new Set(['تعليمي', 'ثقافي', 'رياضي', 'خدمات', 'أخرى']);
const MAX_REVIEWS = 100;
const MAX_SUGGESTIONS = 200;

async function ensureFileExists(filePath, defaultValue) {
  try {
    await fsPromises.access(filePath, fs.constants.F_OK);
  } catch {
    await fsPromises.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
  }
}

function sanitizeText(value, { max = 500, fallback = '' } = {}) {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, max) || fallback;
}

function sanitizeCategory(value) {
  const normalized = sanitizeText(value, { max: 40, fallback: 'أخرى' });
  return ALLOWED_SUGGESTION_CATEGORIES.has(normalized) ? normalized : 'أخرى';
}

async function readJson(filePath, fallback) {
  try {
    const content = await fsPromises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`⚠️ Failed to read ${path.basename(filePath)}:`, error.message);
    }
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function seedSuggestions() {
  const now = new Date();
  const base = Date.now();
  const makeHistory = (status, offsetDays, actor, note) => ({
    status,
    date: new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000).toISOString(),
    actor,
    note,
  });

  return [
    {
      id: base,
      studentId: '22110001',
      studentName: 'طالب المشكاة',
      title: 'مساحة ذكاء اصطناعي مصغّرة',
      text: 'اقتراح لتجهيز ركن دائم للتجارب العملية مع جلسات أسبوعية يشرف عليها القسم.',
      category: 'تعليمي',
      status: 'approved',
      createdAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      history: [
        makeHistory('pending', 18, 'النظام', 'تم استلام الاقتراح وجاري التنسيق.'),
        makeHistory('approved', 5, 'الإدارة', 'تم اعتماد التنفيذ وتحديد جدول الورش.'),
      ],
    },
    {
      id: base + 1,
      studentId: '22090033',
      studentName: 'طالب التقنية',
      title: 'جلسة دعم أسبوعية للمنصة',
      text: 'تنظيم جلسة حوارية أسبوعية تجمع الطلاب بفريق التقنية لمتابعة الاقتراحات المفتوحة.',
      category: 'ثقافي',
      status: 'pending',
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      history: [
        makeHistory('pending', 6, 'النظام', 'تم الاستلام وسيتم مناقشة التفاصيل مع الفريق.'),
      ],
    },
  ];
}

async function ensureDataFiles() {
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
  await ensureFileExists(REVIEWS_FILE, []);
  const suggestionsExists = fs.existsSync(SUGGESTIONS_FILE);
  if (!suggestionsExists) {
    await writeJson(SUGGESTIONS_FILE, seedSuggestions());
  } else {
    await ensureFileExists(SUGGESTIONS_FILE, []);
  }
  
  // Initialize maintenance system data files
  await ensureFileExists(TICKETS_FILE, []);
  await ensureFileExists(DEVICES_FILE, []);
  await ensureFileExists(AUDIT_LOGS_FILE, []);
  await ensureFileExists(NOTIFICATIONS_FILE, []);
  
  // Initialize users with default admin
  const usersExist = fs.existsSync(USERS_FILE);
  if (!usersExist) {
    const defaultAdmin = {
      id: 'admin-default',
      userType: 'admin',
      name: 'مدير النظام',
      email: 'admin@mishkat.edu.sa',
      password: 'admin123',
      phone: '0501234567',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    await writeJson(USERS_FILE, [defaultAdmin]);
  } else {
    await ensureFileExists(USERS_FILE, []);
  }
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function calculateReviewSummary(reviews) {
  if (!Array.isArray(reviews) || !reviews.length) {
    return { average: 0, count: 0 };
  }
  const valid = reviews.filter((item) => typeof item.rating === 'number' && item.rating >= 1 && item.rating <= 5);
  if (!valid.length) {
    return { average: 0, count: 0 };
  }
  const total = valid.reduce((sum, item) => sum + item.rating, 0);
  return { average: Number((total / valid.length).toFixed(2)), count: valid.length };
}

function createSuggestionRecord(payload) {
  const now = new Date().toISOString();
  const studentId = sanitizeText(payload.studentId, { max: 32, fallback: '' });
  const studentName = sanitizeText(payload.studentName, { max: 80, fallback: studentId ? `طالب ${studentId.slice(0, 4)}` : 'طالب' });
  const title = sanitizeText(payload.title, { max: 140, fallback: 'اقتراح بدون عنوان' });
  const text = sanitizeText(payload.text, { max: 1200, fallback: '—' });
  const category = sanitizeCategory(payload.category);

  return {
    id: generateId(),
    studentId,
    studentName,
    title,
    text,
    category,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    history: [
      {
        status: 'pending',
        date: now,
        actor: studentName,
        note: 'تم استلام الاقتراح ويجري مراجعته من فريق القسم.',
      },
    ],
  };
}

function appendHistoryRecord(suggestion, status, { actor = 'الإدارة', note } = {}) {
  const safeStatus = ALLOWED_SUGGESTION_STATUSES.has(status) ? status : suggestion.status;
  const safeNote = sanitizeText(note, { max: 300, fallback: undefined });
  const entry = {
    status: safeStatus,
    date: new Date().toISOString(),
    actor: sanitizeText(actor, { max: 120, fallback: 'الإدارة' }),
    note: safeNote || (safeStatus === 'approved'
      ? 'تم اعتماد الاقتراح وسيتم تنفيذ الخطوات المتفق عليها.'
      : safeStatus === 'rejected'
        ? 'نقترح إعادة صياغة الفكرة وفق المعايير المحدّثة.'
        : 'الاقتراح قيد المتابعة من الفريق المختص.'),
  };
  suggestion.history = Array.isArray(suggestion.history) ? [...suggestion.history, entry] : [entry];
  suggestion.status = safeStatus;
  suggestion.updatedAt = entry.date;
  return suggestion;
}

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    envKey: 'OPENAI_API_KEY',
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    models: (process.env.OPENAI_MODELS && process.env.OPENAI_MODELS.split(',').map((m) => m.trim()).filter(Boolean)) || [
      'gpt-4o-mini',
      'gpt-4o-mini-2024-07-18',
      'gpt-4.1-mini',
    ],
    headers(key) {
      return {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      };
    },
    body(messages, model, extras = {}) {
      return {
        model: model || this.defaultModel,
        messages,
        ...extras,
      };
    },
    mapResponse(json) {
      return json?.choices?.[0]?.message?.content?.trim();
    },
  },
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'gpt-4o-mini',
    models: (process.env.OPENROUTER_MODELS && process.env.OPENROUTER_MODELS.split(',').map((m) => m.trim()).filter(Boolean)) || [
      'gpt-4o-mini',
      'meta-llama/llama-3.1-8b-instruct:free',
    ],
    headers(key) {
      const headers = {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE || 'https://mishkat-tech.local',
        'X-Title': process.env.OPENROUTER_TITLE || 'Mishkat Tech Assistant',
      };
      return headers;
    },
    body(messages, model, extras = {}) {
      return {
        model: model || this.defaultModel,
        messages,
        ...extras,
      };
    },
    mapResponse(json) {
      return json?.choices?.[0]?.message?.content?.trim();
    },
  },
};

function getProviderConfig(name) {
  const provider = PROVIDERS[name];
  if (!provider) return null;
  const key = process.env[provider.envKey];
  if (!key) return null;
  return { ...provider, key };
}

function listAvailableProviders() {
  return Object.entries(PROVIDERS).reduce((acc, [name, cfg]) => {
    if (process.env[cfg.envKey]) {
        acc[name] = {
          name: cfg.name,
          defaultModel: cfg.defaultModel,
          models: cfg.models,
        };
    }
    return acc;
  }, {});
}

function normalizeMessages(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((msg) => msg && typeof msg === 'object' && typeof msg.content === 'string')
    .map((msg) => ({
      role: ['system', 'user', 'assistant', 'tool', 'developer'].includes(msg.role) ? msg.role : 'user',
      content: msg.content.trim().slice(0, 4000),
    }))
    .slice(-20);
}

const defaultProviderName = process.env.AI_DEFAULT_PROVIDER;

app.get('/api/assistant/status', (req, res) => {
  const providers = listAvailableProviders();
  const providerNames = Object.keys(providers);
  res.json({
    providers,
    defaultProvider:
      (defaultProviderName && providers[defaultProviderName] && defaultProviderName) || providerNames[0] || null,
  });
});

app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { provider: requestedProvider, model, messages, extras } = req.body || {};
    const normalizedMessages = normalizeMessages(messages);
    if (!normalizedMessages.length) {
      return res.status(400).json({ error: 'messages_required' });
    }

    const providers = listAvailableProviders();
    const fallbackProvider =
      (defaultProviderName && providers[defaultProviderName] && defaultProviderName) || Object.keys(providers)[0];
    const providerName = requestedProvider && providers[requestedProvider] ? requestedProvider : fallbackProvider;

    if (!providerName) {
      return res.status(503).json({ error: 'provider_not_configured' });
    }

    const provider = getProviderConfig(providerName);
    if (!provider) {
      return res.status(503).json({ error: 'provider_not_configured' });
    }

    const response = await fetchFn(provider.endpoint, {
      method: 'POST',
      headers: provider.headers(provider.key),
      body: JSON.stringify(provider.body(normalizedMessages, model, extras)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI provider error:', response.status, errorText);
      return res.status(response.status).json({ error: 'provider_error', details: errorText });
    }

    const json = await response.json();
    const reply = provider.mapResponse(json);
    if (!reply) {
      return res.status(502).json({ error: 'empty_response' });
    }

    res.json({ reply, provider: providerName });
  } catch (error) {
    console.error('Assistant request failed:', error);
    res.status(500).json({ error: 'assistant_failed' });
  }
});

app.get('/api/reviews', async (req, res) => {
  const reviews = await readJson(REVIEWS_FILE, []);
  const summary = calculateReviewSummary(reviews);
  res.json({ reviews, ...summary });
});

app.post('/api/reviews', async (req, res) => {
  try {
    const rating = Number(req.body?.rating);
    const text = sanitizeText(req.body?.text, { max: 600, fallback: '' });
    const name = sanitizeText(req.body?.name, { max: 80, fallback: 'زائر' });

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'invalid_rating' });
    }
    if (!text) {
      return res.status(400).json({ error: 'text_required' });
    }

    const reviews = await readJson(REVIEWS_FILE, []);
    const review = {
      id: generateId(),
      rating: Math.round(rating),
      text,
      name,
      createdAt: new Date().toISOString(),
    };
    const updated = [...reviews, review].slice(-MAX_REVIEWS);
    await writeJson(REVIEWS_FILE, updated);
    const summary = calculateReviewSummary(updated);
    res.status(201).json({ review, ...summary });
  } catch (error) {
    console.error('Failed to store review:', error);
    res.status(500).json({ error: 'review_store_failed' });
  }
});

app.get('/api/suggestions', async (req, res) => {
  const suggestions = await readJson(SUGGESTIONS_FILE, []);
  suggestions.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  res.json({ suggestions });
});

app.post('/api/suggestions', async (req, res) => {
  try {
    const payload = req.body || {};
    const required = ['studentId', 'studentName', 'title', 'text'];
    const missing = required.filter((field) => !sanitizeText(payload[field], { fallback: '' }));
    if (missing.length) {
      return res.status(400).json({ error: 'missing_fields', fields: missing });
    }

    const suggestions = await readJson(SUGGESTIONS_FILE, []);
    const record = createSuggestionRecord(payload);
    const updated = [...suggestions, record]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(-MAX_SUGGESTIONS);
    await writeJson(SUGGESTIONS_FILE, updated);
    res.status(201).json({ suggestion: record });
  } catch (error) {
    console.error('Failed to create suggestion:', error);
    res.status(500).json({ error: 'suggestion_store_failed' });
  }
});

app.patch('/api/suggestions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    const { status, note, actor } = req.body || {};
    if (!ALLOWED_SUGGESTION_STATUSES.has(status)) {
      return res.status(400).json({ error: 'invalid_status' });
    }

    const suggestions = await readJson(SUGGESTIONS_FILE, []);
    const index = suggestions.findIndex((item) => Number(item.id) === id);
    if (index === -1) {
      return res.status(404).json({ error: 'suggestion_not_found' });
    }

    const updatedRecord = appendHistoryRecord(suggestions[index], status, { actor, note });
    suggestions[index] = updatedRecord;
    await writeJson(SUGGESTIONS_FILE, suggestions);
    res.json({ suggestion: updatedRecord });
  } catch (error) {
    console.error('Failed to update suggestion:', error);
    res.status(500).json({ error: 'suggestion_update_failed' });
  }
});

// ============================================================================
// MAINTENANCE SYSTEM API ENDPOINTS
// ============================================================================

// Helper functions
function generateId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function generateTicketNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `TKT-${dateStr}-${random}`;
}

function createAuditLog(userId, userName, userType, action, entityType, entityId, changes = {}) {
  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userType,
    action,
    entityType,
    entityId,
    changes,
  };
}

function createNotification(userId, type, title, message, link = '') {
  return {
    id: generateId(),
    userId,
    type,
    title,
    message,
    link,
    isRead: false,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
}

// ============================================================================
// USERS API
// ============================================================================

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const users = await readJson(USERS_FILE, []);
    // Don't send passwords
    const safeUsers = users.map(u => {
      const { password, ...safe } = u;
      return safe;
    });
    res.json({ users: safeUsers });
  } catch (error) {
    console.error('Failed to get users:', error);
    res.status(500).json({ error: 'users_fetch_failed' });
  }
});

// Create user (register)
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, phone, userType, specialty } = req.body;
    
    if (!name || !email || !password || !userType) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    
    const users = await readJson(USERS_FILE, []);
    
    // Check if email exists
    if (users.some(u => u.email === email)) {
      return res.status(400).json({ error: 'email_exists' });
    }
    
    const newUser = {
      id: generateId(),
      userType,
      name: sanitizeText(name, { max: 100 }),
      email: sanitizeText(email, { max: 100 }),
      password, // In production: bcrypt.hash(password, 10)
      phone: sanitizeText(phone, { max: 20, fallback: '' }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    
    if (userType === 'technician') {
      newUser.specialty = sanitizeText(specialty, { max: 100, fallback: 'عام' });
      newUser.averageRating = 0;
      newUser.completedJobs = 0;
    }
    
    users.push(newUser);
    await writeJson(USERS_FILE, users);
    
    // Create audit log
    const auditLogs = await readJson(AUDIT_LOGS_FILE, []);
    auditLogs.push(createAuditLog(newUser.id, newUser.name, newUser.userType, 'create', 'user', newUser.id, { action: 'user_registered' }));
    await writeJson(AUDIT_LOGS_FILE, auditLogs);
    
    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ user: safeUser });
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({ error: 'user_create_failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_credentials' });
    }
    
    const users = await readJson(USERS_FILE, []);
    const user = users.find(u => u.email === email && u.password === password && u.isActive);
    
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'login_failed' });
  }
});

// ============================================================================
// TICKETS API
// ============================================================================

// Get all tickets (with filters)
app.get('/api/tickets', async (req, res) => {
  try {
    let tickets = await readJson(TICKETS_FILE, []);
    
    // Apply filters
    const { status, clientId, technicianId, priority, serviceType } = req.query;
    
    if (status) {
      tickets = tickets.filter(t => t.status === status);
    }
    if (clientId) {
      tickets = tickets.filter(t => t.clientId === clientId);
    }
    if (technicianId) {
      tickets = tickets.filter(t => t.technicianId === technicianId);
    }
    if (priority) {
      tickets = tickets.filter(t => t.priority === priority);
    }
    if (serviceType) {
      tickets = tickets.filter(t => t.serviceType === serviceType);
    }
    
    // Sort by creation date (newest first)
    tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ tickets });
  } catch (error) {
    console.error('Failed to get tickets:', error);
    res.status(500).json({ error: 'tickets_fetch_failed' });
  }
});

// Get single ticket
app.get('/api/tickets/:id', async (req, res) => {
  try {
    const tickets = await readJson(TICKETS_FILE, []);
    const ticket = tickets.find(t => t.id === req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'ticket_not_found' });
    }
    
    res.json({ ticket });
  } catch (error) {
    console.error('Failed to get ticket:', error);
    res.status(500).json({ error: 'ticket_fetch_failed' });
  }
});

// Create ticket
app.post('/api/tickets', async (req, res) => {
  try {
    const {
      clientId,
      clientName,
      serviceType,
      issueType,
      title,
      description,
      location,
      priority,
      images,
      deviceId,
    } = req.body;
    
    if (!clientId || !clientName || !serviceType || !issueType || !description || !location) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    
    const tickets = await readJson(TICKETS_FILE, []);
    
    const newTicket = {
      id: generateId(),
      ticketNumber: generateTicketNumber(),
      clientId,
      clientName: sanitizeText(clientName, { max: 100 }),
      technicianId: null,
      technicianName: null,
      
      serviceType: sanitizeText(serviceType, { max: 50 }),
      issueType: sanitizeText(issueType, { max: 50 }),
      title: sanitizeText(title, { max: 200, fallback: description.substring(0, 50) }),
      description: sanitizeText(description, { max: 2000 }),
      location: sanitizeText(location, { max: 200 }),
      priority: ['normal', 'urgent'].includes(priority) ? priority : 'normal',
      
      status: 'new',
      
      images: Array.isArray(images) ? images.slice(0, 5) : [],
      attachments: [],
      
      deviceId: deviceId || null,
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedAt: null,
      completedAt: null,
      
      technicianNotes: '',
      internalNotes: '',
      
      rating: null,
      ratingComment: null,
      ratedAt: null,
      
      history: [
        {
          status: 'new',
          timestamp: new Date().toISOString(),
          userId: clientId,
          userName: clientName,
          action: 'created',
          note: 'تم إنشاء البلاغ',
        }
      ],
    };
    
    tickets.push(newTicket);
    await writeJson(TICKETS_FILE, tickets);
    
    // Create audit log
    const auditLogs = await readJson(AUDIT_LOGS_FILE, []);
    auditLogs.push(createAuditLog(clientId, clientName, 'client', 'create', 'ticket', newTicket.id, { ticketNumber: newTicket.ticketNumber }));
    await writeJson(AUDIT_LOGS_FILE, auditLogs);
    
    // Create notification for admins
    const users = await readJson(USERS_FILE, []);
    const notifications = await readJson(NOTIFICATIONS_FILE, []);
    const admins = users.filter(u => u.userType === 'admin');
    admins.forEach(admin => {
      notifications.push(createNotification(
        admin.id,
        'ticket-created',
        'بلاغ جديد',
        `بلاغ جديد من ${clientName}: ${newTicket.title || description.substring(0, 50)}`,
        `/maintenance/admin-dashboard.html?ticket=${newTicket.id}`
      ));
    });
    await writeJson(NOTIFICATIONS_FILE, notifications);
    
    res.status(201).json({ ticket: newTicket });
  } catch (error) {
    console.error('Failed to create ticket:', error);
    res.status(500).json({ error: 'ticket_create_failed' });
  }
});

// Update ticket
app.patch('/api/tickets/:id', async (req, res) => {
  try {
    const tickets = await readJson(TICKETS_FILE, []);
    const index = tickets.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'ticket_not_found' });
    }
    
    const ticket = tickets[index];
    const {
      status,
      technicianId,
      technicianName,
      technicianNotes,
      internalNotes,
      rating,
      ratingComment,
      userId,
      userName,
      userType,
    } = req.body;
    
    const oldStatus = ticket.status;
    const updates = { updatedAt: new Date().toISOString() };
    const historyEntry = {
      timestamp: new Date().toISOString(),
      userId: userId || 'system',
      userName: userName || 'النظام',
      action: 'updated',
      note: '',
    };
    
    // Handle status change
    if (status && status !== oldStatus) {
      updates.status = status;
      historyEntry.status = status;
      historyEntry.action = 'status_changed';
      historyEntry.note = `تم تغيير الحالة من "${getStatusText(oldStatus)}" إلى "${getStatusText(status)}"`;
      
      if (status === 'completed') {
        updates.completedAt = new Date().toISOString();
      }
    }
    
    // Handle technician assignment
    if (technicianId !== undefined) {
      updates.technicianId = technicianId;
      updates.technicianName = technicianName;
      if (technicianId && !ticket.technicianId) {
        updates.assignedAt = new Date().toISOString();
        updates.status = 'assigned';
        historyEntry.status = 'assigned';
        historyEntry.action = 'assigned';
        historyEntry.note = `تم تعيين الفني: ${technicianName}`;
      }
    }
    
    // Handle notes
    if (technicianNotes !== undefined) {
      updates.technicianNotes = sanitizeText(technicianNotes, { max: 2000 });
      historyEntry.action = 'notes_added';
      historyEntry.note = 'تم إضافة ملاحظات من الفني';
    }
    
    if (internalNotes !== undefined) {
      updates.internalNotes = sanitizeText(internalNotes, { max: 2000 });
    }
    
    // Handle rating
    if (rating !== undefined) {
      updates.rating = Math.max(1, Math.min(5, Number(rating)));
      updates.ratingComment = sanitizeText(ratingComment, { max: 500, fallback: '' });
      updates.ratedAt = new Date().toISOString();
      historyEntry.action = 'rated';
      historyEntry.note = `تم التقييم: ${updates.rating} نجوم`;
      
      // Update technician's average rating
      if (ticket.technicianId) {
        const users = await readJson(USERS_FILE, []);
        const techIndex = users.findIndex(u => u.id === ticket.technicianId);
        if (techIndex !== -1 && users[techIndex].userType === 'technician') {
          const allTickets = await readJson(TICKETS_FILE, []);
          const techTickets = allTickets.filter(t => t.technicianId === ticket.technicianId && t.rating);
          const totalRating = techTickets.reduce((sum, t) => sum + (t.rating || 0), 0) + updates.rating;
          const avgRating = totalRating / (techTickets.length + 1);
          users[techIndex].averageRating = Number(avgRating.toFixed(2));
          await writeJson(USERS_FILE, users);
        }
      }
    }
    
    // Apply updates
    Object.assign(ticket, updates);
    
    // Add to history
    if (historyEntry.note) {
      ticket.history = ticket.history || [];
      ticket.history.push(historyEntry);
    }
    
    tickets[index] = ticket;
    await writeJson(TICKETS_FILE, tickets);
    
    // Create audit log
    const auditLogs = await readJson(AUDIT_LOGS_FILE, []);
    auditLogs.push(createAuditLog(
      userId || 'system',
      userName || 'النظام',
      userType || 'system',
      'update',
      'ticket',
      ticket.id,
      { oldStatus, newStatus: status, updates }
    ));
    await writeJson(AUDIT_LOGS_FILE, auditLogs);
    
    // Create notifications
    const notifications = await readJson(NOTIFICATIONS_FILE, []);
    
    // Notify client on status change
    if (status && status !== oldStatus) {
      notifications.push(createNotification(
        ticket.clientId,
        'status-changed',
        'تحديث حالة البلاغ',
        `تم تحديث حالة بلاغك ${ticket.ticketNumber} إلى: ${getStatusText(status)}`,
        `/maintenance/client-dashboard.html?ticket=${ticket.id}`
      ));
    }
    
    // Notify technician on assignment
    if (technicianId && !ticket.technicianId) {
      notifications.push(createNotification(
        technicianId,
        'ticket-assigned',
        'بلاغ جديد معين لك',
        `تم تعيين بلاغ جديد لك: ${ticket.ticketNumber}`,
        `/maintenance/tech-dashboard.html?ticket=${ticket.id}`
      ));
    }
    
    // Notify technician on rating
    if (rating && ticket.technicianId) {
      notifications.push(createNotification(
        ticket.technicianId,
        'rating-received',
        'تقييم جديد',
        `تم تقييم عملك في البلاغ ${ticket.ticketNumber}: ${rating} نجوم`,
        `/maintenance/tech-dashboard.html?ticket=${ticket.id}`
      ));
    }
    
    await writeJson(NOTIFICATIONS_FILE, notifications);
    
    res.json({ ticket });
  } catch (error) {
    console.error('Failed to update ticket:', error);
    res.status(500).json({ error: 'ticket_update_failed' });
  }
});

function getStatusText(status) {
  const statusMap = {
    'new': 'جديد',
    'assigned': 'معين',
    'in-progress': 'قيد المعالجة',
    'on-hold': 'معلق',
    'completed': 'مكتمل',
    'rejected': 'مرفوض',
    'cancelled': 'ملغي',
  };
  return statusMap[status] || status;
}

// Delete ticket (admin only)
app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const tickets = await readJson(TICKETS_FILE, []);
    const filtered = tickets.filter(t => t.id !== req.params.id);
    
    if (filtered.length === tickets.length) {
      return res.status(404).json({ error: 'ticket_not_found' });
    }
    
    await writeJson(TICKETS_FILE, filtered);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    res.status(500).json({ error: 'ticket_delete_failed' });
  }
});

// ============================================================================
// DEVICES API
// ============================================================================

// Get all devices
app.get('/api/devices', async (req, res) => {
  try {
    let devices = await readJson(DEVICES_FILE, []);
    
    // Apply filters
    const { status, type, location } = req.query;
    
    if (status) {
      devices = devices.filter(d => d.status === status);
    }
    if (type) {
      devices = devices.filter(d => d.type === type);
    }
    if (location) {
      devices = devices.filter(d => d.location && d.location.includes(location));
    }
    
    // Sort by name
    devices.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    
    res.json({ devices });
  } catch (error) {
    console.error('Failed to get devices:', error);
    res.status(500).json({ error: 'devices_fetch_failed' });
  }
});

// Get single device
app.get('/api/devices/:id', async (req, res) => {
  try {
    const devices = await readJson(DEVICES_FILE, []);
    const device = devices.find(d => d.id === req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'device_not_found' });
    }
    
    res.json({ device });
  } catch (error) {
    console.error('Failed to get device:', error);
    res.status(500).json({ error: 'device_fetch_failed' });
  }
});

// Create device
app.post('/api/devices', async (req, res) => {
  try {
    const {
      name,
      type,
      model,
      serialNumber,
      location,
      status,
      lastServiceDate,
      nextServiceDate,
      serviceInterval,
      purchaseDate,
      warrantyExpiry,
      notes,
      assignedTo,
      userId,
      userName,
    } = req.body;
    
    if (!name || !type || !location) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    
    const devices = await readJson(DEVICES_FILE, []);
    
    const newDevice = {
      id: generateId(),
      name: sanitizeText(name, { max: 200 }),
      type: sanitizeText(type, { max: 50 }),
      model: sanitizeText(model, { max: 100, fallback: '' }),
      serialNumber: sanitizeText(serialNumber, { max: 100, fallback: '' }),
      location: sanitizeText(location, { max: 200 }),
      
      status: ['operational', 'faulty', 'under-maintenance', 'out-of-service'].includes(status) ? status : 'operational',
      
      lastServiceDate: lastServiceDate || null,
      nextServiceDate: nextServiceDate || null,
      serviceInterval: Number(serviceInterval) || 0,
      
      purchaseDate: purchaseDate || null,
      warrantyExpiry: warrantyExpiry || null,
      notes: sanitizeText(notes, { max: 1000, fallback: '' }),
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      assignedTo: sanitizeText(assignedTo, { max: 200, fallback: '' }),
      relatedTickets: [],
    };
    
    devices.push(newDevice);
    await writeJson(DEVICES_FILE, devices);
    
    // Create audit log
    const auditLogs = await readJson(AUDIT_LOGS_FILE, []);
    auditLogs.push(createAuditLog(
      userId || 'admin',
      userName || 'المدير',
      'admin',
      'create',
      'device',
      newDevice.id,
      { name: newDevice.name, type: newDevice.type }
    ));
    await writeJson(AUDIT_LOGS_FILE, auditLogs);
    
    res.status(201).json({ device: newDevice });
  } catch (error) {
    console.error('Failed to create device:', error);
    res.status(500).json({ error: 'device_create_failed' });
  }
});

// Update device
app.patch('/api/devices/:id', async (req, res) => {
  try {
    const devices = await readJson(DEVICES_FILE, []);
    const index = devices.findIndex(d => d.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'device_not_found' });
    }
    
    const device = devices[index];
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    
    // Sanitize text fields
    ['name', 'type', 'model', 'serialNumber', 'location', 'notes', 'assignedTo'].forEach(field => {
      if (updates[field] !== undefined) {
        updates[field] = sanitizeText(updates[field], { max: field === 'notes' ? 1000 : 200 });
      }
    });
    
    Object.assign(device, updates);
    devices[index] = device;
    await writeJson(DEVICES_FILE, devices);
    
    // Create audit log
    const auditLogs = await readJson(AUDIT_LOGS_FILE, []);
    auditLogs.push(createAuditLog(
      req.body.userId || 'admin',
      req.body.userName || 'المدير',
      'admin',
      'update',
      'device',
      device.id,
      { updates }
    ));
    await writeJson(AUDIT_LOGS_FILE, auditLogs);
    
    res.json({ device });
  } catch (error) {
    console.error('Failed to update device:', error);
    res.status(500).json({ error: 'device_update_failed' });
  }
});

// Delete device
app.delete('/api/devices/:id', async (req, res) => {
  try {
    const devices = await readJson(DEVICES_FILE, []);
    const device = devices.find(d => d.id === req.params.id);
    
    if (!device) {
      return res.status(404).json({ error: 'device_not_found' });
    }
    
    const filtered = devices.filter(d => d.id !== req.params.id);
    await writeJson(DEVICES_FILE, filtered);
    
    // Create audit log
    const auditLogs = await readJson(AUDIT_LOGS_FILE, []);
    auditLogs.push(createAuditLog(
      req.body.userId || 'admin',
      req.body.userName || 'المدير',
      'admin',
      'delete',
      'device',
      device.id,
      { name: device.name }
    ));
    await writeJson(AUDIT_LOGS_FILE, auditLogs);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete device:', error);
    res.status(500).json({ error: 'device_delete_failed' });
  }
});

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

// Get user notifications
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    let notifications = await readJson(NOTIFICATIONS_FILE, []);
    notifications = notifications.filter(n => n.userId === req.params.userId);
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ notifications });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    res.status(500).json({ error: 'notifications_fetch_failed' });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const notifications = await readJson(NOTIFICATIONS_FILE, []);
    const index = notifications.findIndex(n => n.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'notification_not_found' });
    }
    
    notifications[index].isRead = true;
    notifications[index].readAt = new Date().toISOString();
    await writeJson(NOTIFICATIONS_FILE, notifications);
    
    res.json({ notification: notifications[index] });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).json({ error: 'notification_update_failed' });
  }
});

// ============================================================================
// REPORTS & ANALYTICS API
// ============================================================================

// Get dashboard statistics
app.get('/api/stats', async (req, res) => {
  try {
    const tickets = await readJson(TICKETS_FILE, []);
    const devices = await readJson(DEVICES_FILE, []);
    const users = await readJson(USERS_FILE, []);
    
    const stats = {
      tickets: {
        total: tickets.length,
        new: tickets.filter(t => t.status === 'new').length,
        assigned: tickets.filter(t => t.status === 'assigned').length,
        inProgress: tickets.filter(t => t.status === 'in-progress').length,
        completed: tickets.filter(t => t.status === 'completed').length,
        completionRate: tickets.length > 0 ? ((tickets.filter(t => t.status === 'completed').length / tickets.length) * 100).toFixed(1) : 0,
      },
      devices: {
        total: devices.length,
        operational: devices.filter(d => d.status === 'operational').length,
        faulty: devices.filter(d => d.status === 'faulty').length,
        underMaintenance: devices.filter(d => d.status === 'under-maintenance').length,
        outOfService: devices.filter(d => d.status === 'out-of-service').length,
      },
      users: {
        total: users.length,
        clients: users.filter(u => u.userType === 'client').length,
        technicians: users.filter(u => u.userType === 'technician').length,
        admins: users.filter(u => u.userType === 'admin').length,
      },
      technicians: users.filter(u => u.userType === 'technician').map(t => ({
        id: t.id,
        name: t.name,
        averageRating: t.averageRating || 0,
        completedJobs: tickets.filter(tk => tk.technicianId === t.id && tk.status === 'completed').length,
        activeJobs: tickets.filter(tk => tk.technicianId === t.id && ['assigned', 'in-progress'].includes(tk.status)).length,
      })),
    };
    
    res.json({ stats });
  } catch (error) {
    console.error('Failed to get stats:', error);
    res.status(500).json({ error: 'stats_fetch_failed' });
  }
});

// Get audit logs
app.get('/api/audit-logs', async (req, res) => {
  try {
    let logs = await readJson(AUDIT_LOGS_FILE, []);
    
    // Apply filters
    const { entityType, entityId, userId, action, limit } = req.query;
    
    if (entityType) {
      logs = logs.filter(l => l.entityType === entityType);
    }
    if (entityId) {
      logs = logs.filter(l => l.entityId === entityId);
    }
    if (userId) {
      logs = logs.filter(l => l.userId === userId);
    }
    if (action) {
      logs = logs.filter(l => l.action === action);
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit results
    if (limit) {
      logs = logs.slice(0, Number(limit));
    }
    
    res.json({ logs });
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    res.status(500).json({ error: 'logs_fetch_failed' });
  }
});

const rootDir = path.join(__dirname);
app.use(express.static(rootDir));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.sendFile(path.join(rootDir, 'index.html'));
});

ensureDataFiles()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Mishkat Tech site running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to prepare data storage:', error);
    process.exit(1);
  });
