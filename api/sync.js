/* ==========================================================
   رحلة القيم الأسرية — دالة سحابية Serverless Sync (Vercel / Netlify)
   ========================================================== */
const mongoose = require('mongoose');

let cachedDb = null;
async function connectToDatabase(uri) {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  const db = await mongoose.connect(uri, {
    dbName: 'qiyam',
    serverSelectionTimeoutMS: 5000,
  });
  cachedDb = db;
  return db;
}

const familySchema = new mongoose.Schema({
  familyName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, index: true, unique: true },
  familyData: { type: Object, default: {} },
  registeredAt: { type: Date, default: Date.now },
  lastSyncedAt: { type: Date, default: Date.now },
  ip: String,
  userAgent: String
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
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { phone, familyName, familyData } = req.body || {};
    const cleanPhone = normalizeSaudiPhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: 'رقم الجوال مطلوب للمزامنة.' });
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return res.status(200).json({ success: true, message: 'تم الحفظ محلياً (MONGODB_URI غير متوفر).' });
    }

    await connectToDatabase(uri);

    const updateFields = { familyData: familyData || {}, lastSyncedAt: new Date() };
    const cleanName = (familyName || (familyData && familyData.familyName) || '').trim();
    if (cleanName) updateFields.familyName = cleanName;

    const updated = await Family.findOneAndUpdate(
      { phone: cleanPhone },
      { $set: updateFields },
      { returnDocument: 'after', upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'تمت المزامنة بنجاح في MongoDB Atlas!',
      syncedAt: updated.lastSyncedAt
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
