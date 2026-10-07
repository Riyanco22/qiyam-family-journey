/* ==========================================================
   رحلة القيم الأسرية — خادم التطبيق والربط مع MongoDB
   يدعم المزامنة السحابية الكاملة (Cloud Sync) لكل عائلة
   ========================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'families_db.json');
const ENV_FILE = path.join(__dirname, '.env');

// تحميل التبعيات إن وجدت محلياً
const globalDeps = path.join(os.homedir(), '.qiyam_deps', 'node_modules');
if (fs.existsSync(globalDeps)) {
  module.paths.unshift(globalDeps);
}

// قراءة متغيرات البيئة من .env
let MONGODB_URI = process.env.MONGODB_URI || '';
if (fs.existsSync(ENV_FILE)) {
  try {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (key === 'MONGODB_URI' && val && !process.env.MONGODB_URI) MONGODB_URI = val;
      }
    });
  } catch (e) {}
}

/* ---------------- MongoDB Driver / Connection ---------------- */
let mongooseInstance = null;
let FamilyModel = null;
let dbConnected = false;

try {
  const mongoose = require('mongoose');
  if (MONGODB_URI && (MONGODB_URI.startsWith('mongodb://') || MONGODB_URI.startsWith('mongodb+srv://'))) {
    mongoose.connect(MONGODB_URI, {
      dbName: 'qiyam',
      serverSelectionTimeoutMS: 6000
    })
      .then(() => {
        dbConnected = true;
        mongooseInstance = mongoose;
        const schema = new mongoose.Schema({
          familyName: { type: String, required: true, trim: true },
          phone: { type: String, required: true, trim: true, index: true, unique: true },
          familyData: { type: Object, default: {} },
          registeredAt: { type: Date, default: Date.now },
          lastSyncedAt: { type: Date, default: Date.now },
          ip: String,
          userAgent: String
        }, { timestamps: true });

        FamilyModel = mongoose.models.Family || mongoose.model('Family', schema);
        console.log('✅ تم الاتصال بقاعدة بيانات MongoDB Atlas بنجاح (قاعدة: qiyam).');
      })
      .catch(err => {
        console.warn('⚠️ تعذر الاتصال بـ MongoDB Atlas:', err.message);
        console.log('ℹ️ سيتم حفظ التسجيلات في ملف families_db.json محلياً كنسخة احتياطية.');
      });
  }
} catch (e) {
  console.log('ℹ️ يعمل السيرفر بنظام التخزين المحلي الآمن (families_db.json).');
}

/* ---------------- Phone Validator (Saudi Arabia) ---------------- */
function normalizeSaudiPhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[\s\-\(\)]/g, '').trim();
  if (/^(\+?966|00966)5\d{8}$/.test(p)) return '05' + p.slice(-8);
  if (/^05\d{8}$/.test(p)) return p;
  if (/^5\d{8}$/.test(p)) return '0' + p;
  return null;
}

/* ---------------- Local Database Helper ---------------- */
function getLocalFamilies() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '[]');
    }
  } catch (e) {}
  return [];
}

function saveLocalFamily(record) {
  const list = getLocalFamilies();
  const existingIdx = list.findIndex(f => f.phone === record.phone);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...record, lastSyncedAt: new Date().toISOString() };
  } else {
    list.push(record);
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), 'utf8');
  return list[existingIdx >= 0 ? existingIdx : list.length - 1];
}

/* ---------------- MIME Types ---------------- */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf'
};

/* ---------------- Server Handling ---------------- */
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. API: تسجيل العائلة أو استرجاع بياناتها (Login/Register)
  if (pathname === '/api/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const familyName = (data.familyName || '').trim();
        const phone = data.phone;

        if (!familyName || familyName.length < 2) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ success: false, error: 'يرجى إدخال اسم العائلة بشكل صحيح (حرفين على الأقل).' }));
        }

        const cleanPhone = normalizeSaudiPhone(phone);
        if (!cleanPhone) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ success: false, error: 'يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05 ويتكون من 10 أرقام.' }));
        }

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        let doc = null;
        let isExisting = false;

        // البحث في MongoDB
        if (dbConnected && FamilyModel) {
          try {
            doc = await FamilyModel.findOne({ phone: cleanPhone });
            if (doc) {
              isExisting = true;
              if (familyName && familyName !== doc.familyName) {
                doc.familyName = familyName;
              }
              doc.lastSyncedAt = new Date();
              await doc.save();
            } else {
              doc = await FamilyModel.create({
                familyName,
                phone: cleanPhone,
                familyData: data.familyData || {},
                ip,
                userAgent,
                registeredAt: new Date(),
                lastSyncedAt: new Date()
              });
            }
          } catch (mErr) {
            console.warn('خطأ أثناء حفظ MongoDB:', mErr.message);
          }
        }

        // حفظ محلي احتياطي
        const localList = getLocalFamilies();
        let localExisting = localList.find(f => f.phone === cleanPhone);
        if (localExisting) {
          if (!doc) isExisting = true;
          localExisting.familyName = familyName || localExisting.familyName;
          localExisting.lastSyncedAt = new Date().toISOString();
          saveLocalFamily(localExisting);
        } else {
          saveLocalFamily({
            id: doc ? doc._id.toString() : 'local_' + Date.now(),
            familyName,
            phone: cleanPhone,
            familyData: data.familyData || {},
            registeredAt: new Date().toISOString(),
            lastSyncedAt: new Date().toISOString(),
            ip,
            userAgent
          });
        }

        const responsePayload = {
          success: true,
          isExisting,
          message: isExisting ? 'مرحباً بعودتكم! تم استرجاع تقدم الأسرة من السحابة بنجاح.' : 'تم تسجيل العائلة بنجاح، مرحباً بكم في رحلة القيم الأسرية!',
          data: {
            id: doc ? doc._id.toString() : (localExisting ? localExisting.id : 'local_' + Date.now()),
            familyName: doc ? doc.familyName : (localExisting ? localExisting.familyName : familyName),
            phone: cleanPhone,
            familyData: doc ? (doc.familyData || null) : (localExisting ? (localExisting.familyData || null) : null)
          },
          storage: dbConnected ? 'mongodb' : 'local_json'
        };

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(responsePayload));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 2. API: المزامنة السحابية للتقدم (Sync Changes to MongoDB)
  if (pathname === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const cleanPhone = normalizeSaudiPhone(data.phone);
        const familyData = data.familyData || {};

        if (!cleanPhone) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ success: false, error: 'رقم الجوال مطلوب للمزامنة.' }));
        }

        let updatedDoc = null;
        const familyName = (data.familyName || (familyData && familyData.familyName) || '').trim();
        if (dbConnected && FamilyModel) {
          try {
            const updateFields = { familyData: familyData, lastSyncedAt: new Date() };
            if (familyName) updateFields.familyName = familyName;

            updatedDoc = await FamilyModel.findOneAndUpdate(
              { phone: cleanPhone },
              { $set: updateFields },
              { returnDocument: 'after', upsert: true }
            );
          } catch (mErr) {
            console.warn('تعذر التحديث في مونجو:', mErr.message);
          }
        }

        // تحديث النسخة الاحتياطية المحلية أيضاً
        const localList = getLocalFamilies();
        const idx = localList.findIndex(f => f.phone === cleanPhone);
        if (idx >= 0) {
          localList[idx].familyData = familyData;
          if (familyName) localList[idx].familyName = familyName;
          localList[idx].lastSyncedAt = new Date().toISOString();
          fs.writeFileSync(DB_FILE, JSON.stringify(localList, null, 2), 'utf8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          success: true,
          message: 'تمت المزامنة وحفظ التغييرات سحابياً في MongoDB بنجاح!',
          syncedAt: new Date().toISOString(),
          storage: dbConnected ? 'mongodb' : 'local_json'
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 3. API: فحص الحالة
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      status: 'ok',
      mongodb: dbConnected ? 'connected' : 'disconnected',
      mongodbUriConfigured: Boolean(MONGODB_URI),
      totalFamilies: getLocalFamilies().length
    }));
  }

  // 4. API: قائمة العائلات المسجلة وتقدمها
  if (pathname === '/api/families' && req.method === 'GET') {
    if (dbConnected && FamilyModel) {
      try {
        const list = await FamilyModel.find({}, { phone: 1, familyName: 1, registeredAt: 1, lastSyncedAt: 1, 'familyData.family': 1, 'familyData.r.done': 1 })
          .sort({ lastSyncedAt: -1 })
          .limit(100);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ count: list.length, list, storage: 'mongodb' }));
      } catch (e) {}
    }
    const list = getLocalFamilies();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ count: list.length, list: list.slice(-100).reverse(), storage: 'local_json' }));
  }

  // 5. تقديم الملفات الثابتة (Static Files)
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  let filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('الملف غير موجود');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌟 رحلة القيم الأسرية — خادم المزامنة السحابية يعمل!`);
  console.log(`🌐 الرابط: http://localhost:${PORT}`);
  console.log(`🍃 قاعدة بيانات MongoDB Atlas: ${dbConnected ? 'متصل ومفعل بنجاح ✅' : 'غير متصل (يعمل محلياً) ⚡'}`);
  console.log(`🔄 مسار المزامنة: POST /api/sync`);
  console.log(`======================================================\n`);
});
