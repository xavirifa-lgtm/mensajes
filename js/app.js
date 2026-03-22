document.addEventListener('DOMContentLoaded', () => {
    // --- Register Service Worker ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registrado', reg))
            .catch(err => console.error('Error SW', err));
    }

    // --- State & DOM Nodes ---
    const screens = {
        config: document.getElementById('config-screen'),
        connect: document.getElementById('connect-screen'),
        chat: document.getElementById('chat-screen')
    };

    const overlays = {
        text: document.getElementById('compose-text-overlay'),
        canvas: document.getElementById('canvas-overlay')
    };

    function showScreen(screenId) {
        Object.values(screens).forEach(s => s.classList.add('hidden'));
        screens[screenId].classList.remove('hidden');
    }

    function showOverlay(overlayKey) {
        overlays[overlayKey].classList.remove('hidden');
    }

    function hideOverlay(overlayKey) {
        overlays[overlayKey].classList.add('hidden');
    }

    // --- Configuración Inicial ---
    const apiKeyInput = document.getElementById('gemini-api-key');
    const saveConfigBtn = document.getElementById('save-config-btn');

    // Comprobar si hay API Key guardada
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        window.GEMINI_API_KEY = savedKey;
        // Si ya hay key, ir a pantalla de conexión
        showScreen('connect');
    } else {
        showScreen('config');
    }

    saveConfigBtn.addEventListener('click', () => {
        const val = apiKeyInput.value.trim();
        if (val) {
            localStorage.setItem('gemini_api_key', val);
            window.GEMINI_API_KEY = val;
            showScreen('connect');
        } else {
            alert("Por favor, introduce la API Key.");
        }
    });

    // --- Interfaz de Chat (Botones Overlays) ---
    document.getElementById('open-keyboard-btn').addEventListener('click', () => {
        showOverlay('text');
        // Limpiamos estados al abrir
        document.getElementById('correction-feedback').classList.add('hidden');
        document.getElementById('correction-feedback').innerHTML = '';
        setTimeout(() => document.getElementById('message-text-input').focus(), 100);
    });

    document.getElementById('open-canvas-btn').addEventListener('click', () => {
        showOverlay('canvas');
        if (window.resizeCanvas) window.resizeCanvas(); // Llamará a canvas-handler.js
    });

    document.getElementById('close-text-btn').addEventListener('click', () => {
        hideOverlay('text');
    });

    document.getElementById('close-canvas-btn').addEventListener('click', () => {
        hideOverlay('canvas');
    });

    // Exponer metodos publicamente para transiciones 
    window.goToChatScreen = () => {
        showScreen('chat');
    };
    
    window.closeCanvasAndOpenText = () => {
        hideOverlay('canvas');
        showOverlay('text');
    }
});
