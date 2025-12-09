# Maintenance Management System - API Documentation

نظام إدارة الصيانة - توثيق واجهة برمجة التطبيقات

## Base URL
```
http://localhost:3000/api
```

## Response Format
جميع الاستجابات بصيغة JSON.

### Success Response
```json
{
  "data": { ... },
  "status": "success"
}
```

### Error Response
```json
{
  "error": "error_code",
  "message": "Human readable error message"
}
```

---

## Authentication & Users

### POST /auth/login
تسجيل دخول المستخدم

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "userType": "client|technician|admin",
    "name": "اسم المستخدم",
    "email": "user@example.com",
    "phone": "0501234567",
    "isActive": true
  }
}
```

### POST /users
تسجيل مستخدم جديد

**Request Body:**
```json
{
  "name": "اسم المستخدم",
  "email": "user@example.com",
  "password": "password123",
  "phone": "0501234567",
  "userType": "client|technician|admin",
  "specialty": "تخصص الفني (للفنيين فقط)"
}
```

**Response:**
```json
{
  "user": { ... }
}
```

### GET /users
الحصول على قائمة جميع المستخدمين (للمديرين فقط)

**Response:**
```json
{
  "users": [
    {
      "id": "user-id",
      "userType": "client",
      "name": "اسم المستخدم",
      "email": "user@example.com",
      "phone": "0501234567",
      "isActive": true
    }
  ]
}
```

---

## Tickets (البلاغات)

### GET /tickets
الحصول على قائمة البلاغات

**Query Parameters:**
- `status` - تصفية حسب الحالة (new|assigned|in-progress|on-hold|completed|rejected|cancelled)
- `clientId` - تصفية حسب معرف العميل
- `technicianId` - تصفية حسب معرف الفني
- `priority` - تصفية حسب الأولوية (normal|urgent)
- `serviceType` - تصفية حسب نوع الخدمة

**Response:**
```json
{
  "tickets": [
    {
      "id": "ticket-id",
      "ticketNumber": "TKT-20251209-0001",
      "clientId": "client-id",
      "clientName": "اسم العميل",
      "technicianId": "tech-id",
      "technicianName": "اسم الفني",
      "serviceType": "repair|installation|keyboard-mouse|other",
      "issueType": "electrical|plumbing|carpentry|it|ac|other",
      "title": "عنوان البلاغ",
      "description": "وصف المشكلة",
      "location": "موقع المشكلة",
      "priority": "normal|urgent",
      "status": "new",
      "images": ["base64-image-data"],
      "deviceId": "device-id",
      "createdAt": "2025-12-09T19:00:00.000Z",
      "updatedAt": "2025-12-09T19:00:00.000Z",
      "history": [
        {
          "status": "new",
          "timestamp": "2025-12-09T19:00:00.000Z",
          "userId": "user-id",
          "userName": "اسم المستخدم",
          "action": "created",
          "note": "تم إنشاء البلاغ"
        }
      ]
    }
  ]
}
```

### GET /tickets/:id
الحصول على بلاغ محدد

**Response:**
```json
{
  "ticket": { ... }
}
```

### POST /tickets
إنشاء بلاغ جديد

**Request Body:**
```json
{
  "clientId": "client-id",
  "clientName": "اسم العميل",
  "serviceType": "repair",
  "issueType": "electrical",
  "title": "عنوان البلاغ",
  "description": "وصف المشكلة",
  "location": "الموقع",
  "priority": "normal|urgent",
  "images": ["base64-image-data"],
  "deviceId": "device-id (اختياري)"
}
```

**Response:**
```json
{
  "ticket": { ... }
}
```

### PATCH /tickets/:id
تحديث بلاغ

**Request Body:**
```json
{
  "status": "in-progress",
  "technicianId": "tech-id",
  "technicianName": "اسم الفني",
  "technicianNotes": "ملاحظات الفني",
  "internalNotes": "ملاحظات داخلية",
  "rating": 5,
  "ratingComment": "تعليق التقييم",
  "userId": "user-id",
  "userName": "اسم المستخدم",
  "userType": "admin"
}
```

**Response:**
```json
{
  "ticket": { ... }
}
```

### DELETE /tickets/:id
حذف بلاغ (للمديرين فقط)

**Response:**
```json
{
  "success": true
}
```

---

## Devices (الأجهزة)

### GET /devices
الحصول على قائمة الأجهزة

**Query Parameters:**
- `status` - تصفية حسب الحالة (operational|faulty|under-maintenance|out-of-service)
- `type` - تصفية حسب النوع (computer|keyboard|mouse|printer|ac|other)
- `location` - تصفية حسب الموقع

**Response:**
```json
{
  "devices": [
    {
      "id": "device-id",
      "name": "اسم الجهاز",
      "type": "computer",
      "model": "HP EliteBook",
      "serialNumber": "SN123456",
      "location": "مكتب المدير",
      "status": "operational",
      "lastServiceDate": "2025-12-01T00:00:00.000Z",
      "nextServiceDate": "2026-06-01T00:00:00.000Z",
      "serviceInterval": 180,
      "purchaseDate": "2024-01-01T00:00:00.000Z",
      "warrantyExpiry": "2027-01-01T00:00:00.000Z",
      "notes": "ملاحظات",
      "createdAt": "2025-12-09T19:00:00.000Z",
      "updatedAt": "2025-12-09T19:00:00.000Z",
      "assignedTo": "قسم التقنية",
      "relatedTickets": ["ticket-id1", "ticket-id2"]
    }
  ]
}
```

### GET /devices/:id
الحصول على جهاز محدد

**Response:**
```json
{
  "device": { ... }
}
```

### POST /devices
إضافة جهاز جديد

**Request Body:**
```json
{
  "name": "اسم الجهاز",
  "type": "computer",
  "model": "HP EliteBook",
  "serialNumber": "SN123456",
  "location": "مكتب المدير",
  "status": "operational",
  "lastServiceDate": "2025-12-01T00:00:00.000Z",
  "purchaseDate": "2024-01-01T00:00:00.000Z",
  "notes": "ملاحظات",
  "userId": "user-id",
  "userName": "اسم المستخدم"
}
```

**Response:**
```json
{
  "device": { ... }
}
```

### PATCH /devices/:id
تحديث جهاز

**Request Body:**
```json
{
  "name": "اسم الجهاز المحدث",
  "status": "under-maintenance",
  "lastServiceDate": "2025-12-09T00:00:00.000Z",
  "notes": "ملاحظات محدثة",
  "userId": "user-id",
  "userName": "اسم المستخدم"
}
```

**Response:**
```json
{
  "device": { ... }
}
```

### DELETE /devices/:id
حذف جهاز

**Request Body:**
```json
{
  "userId": "user-id",
  "userName": "اسم المستخدم"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Notifications (الإشعارات)

### GET /notifications/:userId
الحصول على إشعارات مستخدم

**Response:**
```json
{
  "notifications": [
    {
      "id": "notification-id",
      "userId": "user-id",
      "type": "ticket-created|ticket-assigned|status-changed|rating-received",
      "title": "عنوان الإشعار",
      "message": "محتوى الإشعار",
      "link": "/maintenance/client-dashboard.html?ticket=ticket-id",
      "isRead": false,
      "createdAt": "2025-12-09T19:00:00.000Z",
      "readAt": null
    }
  ]
}
```

### PATCH /notifications/:id/read
تعليم إشعار كمقروء

**Response:**
```json
{
  "notification": { ... }
}
```

---

## Statistics & Reports

### GET /stats
الحصول على إحصائيات لوحة التحكم

**Response:**
```json
{
  "stats": {
    "tickets": {
      "total": 100,
      "new": 10,
      "assigned": 20,
      "inProgress": 30,
      "completed": 40,
      "completionRate": "40.0"
    },
    "devices": {
      "total": 50,
      "operational": 40,
      "faulty": 5,
      "underMaintenance": 3,
      "outOfService": 2
    },
    "users": {
      "total": 30,
      "clients": 20,
      "technicians": 8,
      "admins": 2
    },
    "technicians": [
      {
        "id": "tech-id",
        "name": "اسم الفني",
        "averageRating": 4.5,
        "completedJobs": 25,
        "activeJobs": 5
      }
    ]
  }
}
```

### GET /audit-logs
الحصول على سجل النشاط

**Query Parameters:**
- `entityType` - تصفية حسب نوع الكيان (ticket|device|user)
- `entityId` - تصفية حسب معرف الكيان
- `userId` - تصفية حسب معرف المستخدم
- `action` - تصفية حسب نوع الإجراء (create|update|delete|assign|complete)
- `limit` - الحد الأقصى لعدد النتائج

**Response:**
```json
{
  "logs": [
    {
      "id": "log-id",
      "timestamp": "2025-12-09T19:00:00.000Z",
      "userId": "user-id",
      "userName": "اسم المستخدم",
      "userType": "admin",
      "action": "create",
      "entityType": "ticket",
      "entityId": "ticket-id",
      "changes": { ... }
    }
  ]
}
```

---

## Error Codes

### Common Errors
- `missing_fields` - حقول مطلوبة مفقودة
- `invalid_credentials` - بيانات تسجيل الدخول غير صحيحة
- `email_exists` - البريد الإلكتروني مسجل مسبقاً
- `not_found` - العنصر غير موجود
- `unauthorized` - غير مصرح
- `forbidden` - ممنوع

### Entity Specific Errors
- `ticket_not_found` - البلاغ غير موجود
- `device_not_found` - الجهاز غير موجود
- `user_not_found` - المستخدم غير موجود
- `notification_not_found` - الإشعار غير موجود

---

## Data Models

### User Types
- `client` - عميل
- `technician` - فني
- `admin` - مدير

### Ticket Status
- `new` - جديد
- `assigned` - معين
- `in-progress` - قيد المعالجة
- `on-hold` - معلق
- `completed` - مكتمل
- `rejected` - مرفوض
- `cancelled` - ملغي

### Device Status
- `operational` - سليم
- `faulty` - معطل
- `under-maintenance` - قيد الصيانة
- `out-of-service` - خارج الخدمة

### Service Types
- `repair` - تصليح
- `installation` - تركيب
- `keyboard-mouse` - تركيب ماوس/كيبورد
- `other` - أخرى

### Issue Types
- `electrical` - كهرباء
- `plumbing` - سباكة
- `carpentry` - نجارة
- `it` - تقنية معلومات
- `ac` - تكييف
- `other` - أخرى

---

## Authentication Notes

⚠️ **Important Security Note**

This is a development/educational system. In production:

1. **Passwords**: Use bcrypt or Argon2 for hashing
2. **Authentication**: Implement JWT or session-based auth
3. **Authorization**: Add role-based access control (RBAC)
4. **HTTPS**: Always use SSL/TLS in production
5. **Rate Limiting**: Implement rate limiting to prevent abuse
6. **Input Validation**: Validate and sanitize all inputs
7. **CORS**: Configure CORS properly for your domain

---

## Example Usage

### Create a Ticket
```javascript
const response = await fetch('http://localhost:3000/api/tickets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    clientId: 'user-123',
    clientName: 'أحمد محمد',
    serviceType: 'repair',
    issueType: 'it',
    title: 'مشكلة في الحاسوب',
    description: 'الحاسوب لا يعمل بشكل صحيح',
    location: 'الفصل 201',
    priority: 'urgent'
  })
});

const data = await response.json();
console.log(data.ticket);
```

### Update Ticket Status
```javascript
const response = await fetch('http://localhost:3000/api/tickets/ticket-123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'in-progress',
    technicianNotes: 'جاري العمل على حل المشكلة',
    userId: 'tech-456',
    userName: 'محمد الفني',
    userType: 'technician'
  })
});

const data = await response.json();
console.log(data.ticket);
```

---

## Support

للاستفسارات والدعم، يرجى التواصل عبر:
- البريد الإلكتروني: admin@mishkat.edu.sa
- GitHub: https://github.com/almnar0/almeshkat25

---

**Version:** 1.0.0
**Last Updated:** December 9, 2025
