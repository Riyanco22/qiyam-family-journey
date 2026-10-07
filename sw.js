/* رحلة القيم الأسرية — عمل بدون إنترنت */
const CACHE = 'qiyam-v1';
const ASSETS = [
 "./",
 "./assets/css/app.css",
 "./assets/css/fonts.css",
 "./assets/fonts/amiri-arabic-400-normal.woff2",
 "./assets/fonts/amiri-arabic-700-normal.woff2",
 "./assets/fonts/amiri-latin-400-normal.woff2",
 "./assets/fonts/amiri-latin-700-normal.woff2",
 "./assets/fonts/el-messiri-arabic-600-normal.woff2",
 "./assets/fonts/el-messiri-arabic-700-normal.woff2",
 "./assets/fonts/el-messiri-latin-600-normal.woff2",
 "./assets/fonts/el-messiri-latin-700-normal.woff2",
 "./assets/fonts/lalezar-arabic-400-normal.woff2",
 "./assets/fonts/lalezar-latin-400-normal.woff2",
 "./assets/fonts/tajawal-arabic-400-normal.woff2",
 "./assets/fonts/tajawal-arabic-500-normal.woff2",
 "./assets/fonts/tajawal-arabic-700-normal.woff2",
 "./assets/fonts/tajawal-arabic-800-normal.woff2",
 "./assets/fonts/tajawal-latin-400-normal.woff2",
 "./assets/fonts/tajawal-latin-500-normal.woff2",
 "./assets/fonts/tajawal-latin-700-normal.woff2",
 "./assets/fonts/tajawal-latin-800-normal.woff2",
 "./assets/img/fund.png",
 "./assets/img/icon-180.png",
 "./assets/img/icon-192.png",
 "./assets/img/icon-512.png",
 "./assets/img/icon.svg",
 "./assets/img/jomaih.svg",
 "./assets/img/soadaa.png",
 "./assets/js/app.js",
 "./assets/js/data.js",
 "./assets/js/icons.js",
 "./index.html",
 "./manifest.webmanifest"
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
