# دليل النشر والتثبيت - Deployment Guide
## نظام إدارة الصيانة والأجهزة

---

## 🎯 نظرة عامة

هذا الدليل يشرح كيفية نشر نظام إدارة الصيانة والأجهزة في بيئات مختلفة:
- بيئة التطوير (Development)
- بيئة الاختبار (Staging)
- بيئة الإنتاج (Production)

---

## 📋 المتطلبات الأساسية

### لجميع البيئات
- Node.js >= 14.0.0
- npm >= 6.0.0
- متصفح حديث (Chrome, Firefox, Safari, Edge)

### لبيئة الإنتاج إضافياً
- قاعدة بيانات (PostgreSQL أو MySQL أو MongoDB)
- خادم ويب (Nginx أو Apache)
- شهادة SSL (Let's Encrypt مجانية)
- خدمة تخزين سحابي للملفات (AWS S3, Cloudinary)
- خدمة إرسال بريد إلكتروني (SendGrid, AWS SES)

---

## 🔧 التثبيت - بيئة التطوير

### 1. استنساخ المشروع
```bash
git clone https://github.com/almnar0/almeshkat25.git
cd almeshkat25
```

### 2. تثبيت التبعيات
```bash
npm install
```

### 3. إنشاء ملف البيئة (اختياري)
```bash
cp .env.example .env
```

عدّل ملف `.env` حسب الحاجة:
```env
PORT=3000
NODE_ENV=development

# AI Assistant (اختياري)
OPENAI_API_KEY=your-openai-key
OPENROUTER_API_KEY=your-openrouter-key
```

### 4. تشغيل الخادم
```bash
npm start
```

### 5. الوصول للنظام
افتح المتصفح وانتقل إلى:
```
http://localhost:3000/maintenance/
```

---

## 🌐 النشر - بيئة الإنتاج

### الطريقة 1: استضافة تقليدية (VPS)

#### 1. تجهيز الخادم
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت PM2 لإدارة العمليات
sudo npm install -g pm2

# تثبيت Nginx
sudo apt install -y nginx
```

#### 2. رفع الملفات
```bash
# من جهازك المحلي
scp -r almeshkat25 user@your-server:/var/www/
```

أو استخدم Git:
```bash
# على الخادم
cd /var/www
git clone https://github.com/almnar0/almeshkat25.git
cd almeshkat25
npm install --production
```

#### 3. إعداد PM2
```bash
# في مجلد المشروع
pm2 start server.js --name maintenance-system

# حفظ التكوين
pm2 save

# تشغيل تلقائي عند بدء التشغيل
pm2 startup
```

#### 4. إعداد Nginx
أنشئ ملف `/etc/nginx/sites-available/maintenance`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

فعّل الموقع:
```bash
sudo ln -s /etc/nginx/sites-available/maintenance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. إعداد SSL مع Let's Encrypt
```bash
# تثبيت Certbot
sudo apt install -y certbot python3-certbot-nginx

# الحصول على شهادة
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# التجديد التلقائي
sudo certbot renew --dry-run
```

---

### الطريقة 2: Vercel (للواجهة الأمامية فقط)

#### 1. تثبيت Vercel CLI
```bash
npm install -g vercel
```

#### 2. نشر الواجهة
```bash
vercel --prod
```

---

### الطريقة 3: Heroku (نشر كامل)

#### 1. إنشاء ملف `Procfile`
```
web: node server.js
```

#### 2. إنشاء تطبيق Heroku
```bash
heroku create maintenance-system-mishkat

# إضافة قاعدة بيانات PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# نشر
git push heroku main
```

---

### الطريقة 4: Docker

#### 1. إنشاء `Dockerfile`
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 2. إنشاء `docker-compose.yml`
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./data:/app/data
    restart: unless-stopped
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

#### 3. بناء وتشغيل
```bash
docker-compose up -d
```

---

## 🔒 الأمان - بيئة الإنتاج

### 1. تحديث قاعدة البيانات
استبدل localStorage بقاعدة بيانات حقيقية:

#### PostgreSQL مثال
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
```

### 2. تشفير كلمات المرور
```bash
npm install bcrypt
```

```javascript
const bcrypt = require('bcrypt');

// عند التسجيل
const hashedPassword = await bcrypt.hash(password, 10);

// عند تسجيل الدخول
const match = await bcrypt.compare(password, user.password);
```

### 3. JWT للمصادقة
```bash
npm install jsonwebtoken
```

```javascript
const jwt = require('jsonwebtoken');

// إنشاء token
const token = jwt.sign(
  { userId: user.id, userType: user.userType },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// التحقق من token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

### 4. متغيرات البيئة
لا تكشف المتغيرات الحساسة في الكود. استخدم `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maintenance_db
DB_USER=db_user
DB_PASSWORD=strong_password

# JWT
JWT_SECRET=very_secure_random_string

# File Storage
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your_bucket

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 5. Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100 // حد أقصى 100 طلب
});

app.use('/api/', limiter);
```

### 6. Helmet للأمان
```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## 📊 المراقبة والصيانة

### 1. مراقبة السجلات
```bash
# عرض سجلات PM2
pm2 logs maintenance-system

# عرض آخر 100 سطر
pm2 logs maintenance-system --lines 100

# متابعة السجلات مباشرة
pm2 logs maintenance-system --raw
```

### 2. مراقبة الأداء
```bash
# عرض حالة العمليات
pm2 status

# عرض معلومات مفصلة
pm2 show maintenance-system

# عرض استخدام الموارد
pm2 monit
```

### 3. النسخ الاحتياطي

#### نسخ احتياطي يومي للبيانات
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/maintenance"

mkdir -p $BACKUP_DIR

# نسخ مجلد البيانات
tar -czf $BACKUP_DIR/data_$DATE.tar.gz /var/www/almeshkat25/data

# حذف النسخ القديمة (أكثر من 30 يوم)
find $BACKUP_DIR -name "data_*.tar.gz" -mtime +30 -delete
```

أضف إلى crontab:
```bash
crontab -e
```
```
0 2 * * * /path/to/backup.sh
```

### 4. تحديثات الأمان
```bash
# تحديث التبعيات
npm audit
npm audit fix

# تحديث النظام
sudo apt update && sudo apt upgrade -y

# إعادة تشغيل التطبيق
pm2 restart maintenance-system
```

---

## 🔄 التحديثات

### تحديث التطبيق
```bash
cd /var/www/almeshkat25

# سحب آخر التحديثات
git pull origin main

# تثبيت التبعيات الجديدة
npm install --production

# إعادة تشغيل
pm2 restart maintenance-system
```

---

## ⚙️ التكوين المتقدم

### 1. تحسين الأداء

#### Nginx Caching
```nginx
# في ملف nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 60m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
}
```

#### Node.js Clustering
```javascript
// cluster.js
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`Master process starting ${numCPUs} workers...`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, starting a new one...`);
    cluster.fork();
  });
} else {
  require('./server.js');
}
```

### 2. CDN للملفات الثابتة
استخدم Cloudflare أو AWS CloudFront لتقديم الملفات الثابتة بشكل أسرع.

---

## 🐛 استكشاف الأخطاء

### المشكلة: التطبيق لا يعمل بعد النشر
```bash
# تحقق من السجلات
pm2 logs maintenance-system --lines 100

# تحقق من حالة العملية
pm2 status

# تحقق من البورت
sudo netstat -tulpn | grep :3000
```

### المشكلة: قاعدة البيانات لا تعمل
```bash
# تحقق من اتصال PostgreSQL
psql -h localhost -U db_user -d maintenance_db

# تحقق من وجود الجداول
\dt
```

### المشكلة: SSL لا يعمل
```bash
# تحقق من شهادة SSL
sudo certbot certificates

# تجديد يدوي
sudo certbot renew
```

---

## 📝 قائمة المراجعة قبل النشر

- [ ] تحديث جميع التبعيات
- [ ] اختبار جميع الوظائف
- [ ] إعداد قاعدة البيانات
- [ ] تشفير كلمات المرور
- [ ] إعداد JWT
- [ ] إعداد HTTPS/SSL
- [ ] إعداد النسخ الاحتياطي
- [ ] إعداد المراقبة
- [ ] إعداد Rate Limiting
- [ ] إعداد Helmet
- [ ] اختبار الأداء
- [ ] مراجعة الأمان
- [ ] توثيق API
- [ ] تدريب المستخدمين

---

## 📚 موارد إضافية

- [توثيق Node.js](https://nodejs.org/docs/)
- [توثيق Express](https://expressjs.com/)
- [توثيق PM2](https://pm2.keymetrics.io/)
- [توثيق Nginx](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [PostgreSQL](https://www.postgresql.org/docs/)

---

## 🆘 الدعم

للحصول على المساعدة:
- 📧 البريد الإلكتروني: admin@mishkat.edu.sa
- 🌐 GitHub Issues: https://github.com/almnar0/almeshkat25/issues
- 📚 التوثيق: راجع API_DOCUMENTATION.md و COMPREHENSIVE_README.md

---

**آخر تحديث:** ديسمبر 9, 2025  
**الإصدار:** 1.0.0
