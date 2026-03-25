const CACHE_NAME = 'meca-mensajes-v2.6';
const STATIC_ASSETS = [
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/peer-conn.js',
    './js/canvas-handler.js',
    './js/gemini-api.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/pencil.png',
    './icons/keyboard.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // NUNCA cachear la API de Gemini (dejar que el navegador se encargue siempre en directo)
    if (e.request.url.includes('generativelanguage')) {
        return; 
    }

    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then((res) => {
            if (res) return res; // Usar memoria si ya existe

            return fetch(e.request).then(response => {
                // Prevenir cacheo de errores o respuestas incorrectas
                if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
                    // Solo cacheamos opaque opcionalmente pero evitémoslo por defecto para ser más robustos
                    if(response.type !== 'opaque') return response;
                }
                
                // Cachear de forma "fantasma" cualquier CSS, JS o Fuente solicitada por internet (Ej: FontAwesome, PeerJS)
                if (e.request.url.startsWith('https://')) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(e.request, responseClone);
                    });
                }

                return response;
            }).catch(err => {
                // Silencio en modo offline
                console.warn('Recurso no disponible offline:', e.request.url);
            });
        })
    );
});
