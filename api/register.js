/* ==========================================================
   رحلة القيم الأسرية — دالة سحابية Serverless Function (Vercel / Netlify)
   ========================================================== */
const mongoose = require('mongoose');

let cachedDb = null;

async function connectToDatabase(uri) {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  const db = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  cachedDb = db;
  return db;
}

const familySchema = new mongoose.Schema({
  familyName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, index: true },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Family = mongoose.models.Family || mongoose.model('Family', familySchema);

function normalizeSaudiPhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[\s\-\(\)]/g, '').trim();
  if (/^(\+?966|00966)5\d{8}$/.test(p)) return '05' + p.slice(-8);
  if (/^05\d{8}$/.test(p)) return p;
  if (/^5\d{8}$/.test(p)) return '0' + p;
  return null;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { familyName, phone } = req.body || {};

    if (!familyName || typeof familyName !== 'string' || familyName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال اسم العائلة بشكل صحيح (حرفين على الأقل).' });
    }

    const cleanPhone = normalizeSaudiPhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال رقم جوال سعودي صحيح (مثال: 05xxxxxxxx).' });
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      // In serverless without URI, return accepted with local flag
      return res.json({
        success: true,
        message: 'تم استقبال البيانات محلياً (يرجى إضافة MONGODB_URI في متغيرات البيئة).',
        id: 'tmp-' + Date.now(),
        dbStatus: 'pending_uri'
      });
    }

    await connectToDatabase(uri);

    const docData = {
      familyName: familyName.trim(),
      phone: cleanPhone,
      ip: req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      registeredAt: new Date()
    };

    const doc = await Family.findOneAndUpdate(
      { phone: cleanPhone },
      { $set: docData },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'تم تسجيل العائلة بنجاح في قاعدة بيانات رحلة القيم!',
      id: doc._id,
      dbStatus: 'mongodb'
    });
  } catch (error) {
    console.error('Serverless error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
};
