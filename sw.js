/* ============================================================
   Prompt Painter · Service Worker
   版本号来源：注册 URL 的 ?v=（app.js 用 APP_VERSION 拼接）。
   APP_VERSION 变 → SW 脚本 URL 变 → 浏览器装新 SW → 预缓存新外壳
   → 检测到更新 → 应用内提示 → 用户确认后接管并刷新。
   ============================================================ */
const V = (new URL(self.location.href).searchParams.get('v')) || 'dev';
const CACHE = 'prompt-painter-' + V;

/* 应用外壳：install 时以 cache:reload 强制从网络取最新 */
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 逐个缓存，单个失败不拖垮整个安装（例如图标暂时 404）
    await Promise.all(SHELL.map(async (u) => {
      try { await cache.add(new Request(u, { cache: 'reload' })); }
      catch (err) { console.error('[PP-SW] 预缓存失败:', u, String(err)); }
    }));
    const n = (await cache.keys()).length;
    console.log('[PP-SW] 预缓存完成，共', n, '项 · 版本', V);
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('prompt-painter-') && k !== CACHE)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  /* 跨域（画图/视频 API、字体、图床）一律直连，绝不缓存也不干扰 */
  if (url.origin !== self.location.origin) return;

  /* 导航请求：network-first——在线永远拿最新页面，离线回缓存 */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put('./index.html', fresh.clone());
        }
        return fresh;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html'))
            || (await cache.match('./'))
            || Response.error();
      }
    })());
    return;
  }

  /* 同源静态资源：cache-first + 后台刷新（stale-while-revalidate） */
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});

self.addEventListener('message', (e) => {
  const d = e.data;
  if (d === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (d && d.type === 'GET_VERSION') {
    /* 页面用 MessageChannel 询问，优先原路回传（waiting 态的 SW 也能应答） */
    if (e.ports && e.ports[0]) { e.ports[0].postMessage({ type: 'VERSION', v: V }); return; }
    if (e.source) { e.source.postMessage({ type: 'VERSION', v: V }); return; }
    self.clients.matchAll({ includeUncontrolled: true }).then(cs => {
      cs.forEach(c => c.postMessage({ type: 'VERSION', v: V }));
    });
  }
});
