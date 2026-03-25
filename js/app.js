document.addEventListener('DOMContentLoaded', () => {
    // --- Register Service Worker ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('SW Registrado', reg);
            })
            .catch(err => console.error('Error SW', err));

        // Refrescar automáticamente la app cuando detecte un nuevo Service Worker
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }

    // --- State & DOM Nodes ---
    const screens = {
        config: document.getElementById('config-screen'),
        role: document.getElementById('role-screen'),
        autoconnect: document.getElementById('auto-connect-screen'),
        chat: document.getElementById('chat-screen')
    };

    const overlays = {
        text: document.getElementById('compose-text-overlay'),
        canvas: document.getElementById('canvas-overlay')
    };

    function showScreen(screenId) {
        Object.values(screens).forEach(s => {
            if(s) s.classList.add('hidden');
        });
        if(screens[screenId]) screens[screenId].classList.remove('hidden');
    }

    function showOverlay(overlayKey) {
        overlays[overlayKey].classList.remove('hidden');
    }

    function hideOverlay(overlayKey) {
        overlays[overlayKey].classList.add('hidden');
    }

    // --- Sistema de Modales Custom ---
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const btnModalCancel = document.getElementById('modal-cancel-btn');
    const btnModalConfirm = document.getElementById('modal-confirm-btn');

    let currentConfirmCallback = null;

    window.showCustomModal = (title, message, showCancel, onConfirm) => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        btnModalCancel.style.display = showCancel ? 'block' : 'none';
        currentConfirmCallback = onConfirm;
        modalOverlay.classList.remove('hidden');
    };

    btnModalCancel.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        currentConfirmCallback = null;
    });

    btnModalConfirm.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        if(currentConfirmCallback) currentConfirmCallback();
        currentConfirmCallback = null;
    });

    // --- Flujo de Configuración Inicial ---
    const apiKeyInput = document.getElementById('gemini-api-key');
    const saveConfigBtn = document.getElementById('save-config-btn');

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        window.GEMINI_API_KEY = savedKey;
        checkRoleAndConnect();
    } else {
        showScreen('config');
    }

    saveConfigBtn.addEventListener('click', () => {
        const val = apiKeyInput.value.trim();
        if (val) {
            localStorage.setItem('gemini_api_key', val);
            window.GEMINI_API_KEY = val;
            checkRoleAndConnect();
        } else {
            window.showCustomModal("¡Ups!", "Por favor, introduce la llave mágica de Gemini.", false, null);
        }
    });

    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            window.showCustomModal(
                "¡Atención!",
                "¿Seguro que quieres borrar todos los mensajes de esta tablet? No se puede deshacer.",
                true,
                () => {
                    localStorage.removeItem('chat_history');
                    const chatContainer = document.getElementById('chat-messages');
                    if (chatContainer) chatContainer.innerHTML = '';
                    
                    setTimeout(() => {
                        window.showCustomModal("¡Borrados!", "El chat se ha vaciado por completo.", false, null);
                    }, 300);
                }
            );
        });
    }

    // --- Flujo de Roles Permanentes ---
    function checkRoleAndConnect() {
        const role = localStorage.getItem('tablet_role');
        if (role) {
            startAutoConnection(role);
        } else {
            showScreen('role');
        }
    }

    const btnRole1 = document.getElementById('role-1-btn');
    const btnRole2 = document.getElementById('role-2-btn');
    const btnResetRole = document.getElementById('reset-role-btn');

    if(btnRole1) btnRole1.addEventListener('click', () => {
        localStorage.setItem('tablet_role', 'Emma');
        startAutoConnection('Emma');
    });

    if(btnRole2) btnRole2.addEventListener('click', () => {
        localStorage.setItem('tablet_role', 'Abuela');
        startAutoConnection('Abuela');
    });

    if(btnResetRole) btnResetRole.addEventListener('click', () => {
        localStorage.removeItem('tablet_role');
        showScreen('role');
    });

    function startAutoConnection(role) {
        showScreen('autoconnect');
        if(window.initPermanentPeer) window.initPermanentPeer(role);
    }

    // --- Interfaz de Chat (Botones Overlays) ---
    const globalFloatingActions = document.getElementById('global-floating-actions');
    const btnOpenConfig = document.getElementById('open-config-btn');
    if (btnOpenConfig) {
        btnOpenConfig.addEventListener('click', () => {
            const savedKey = localStorage.getItem('gemini_api_key');
            if (savedKey) apiKeyInput.value = savedKey; // Cargar la que hay en memoria
            globalFloatingActions.classList.add('hidden');
            showScreen('config');
        });
    }

    document.getElementById('open-keyboard-btn').addEventListener('click', () => {
        showOverlay('text');
        document.getElementById('review-send-btn').style.display = 'flex';
        document.getElementById('close-overlay-btn').style.display = 'flex';
        const feedback = document.getElementById('correction-feedback');
        if(feedback) {
            feedback.classList.add('hidden');
            feedback.innerHTML = '';
        }
        setTimeout(() => document.getElementById('message-text-input').focus(), 100);
    });

    document.getElementById('open-canvas-btn').addEventListener('click', () => {
        showOverlay('canvas');
        document.getElementById('process-canvas-btn').style.display = 'flex';
        document.getElementById('close-overlay-btn').style.display = 'flex';
        if (window.resizeCanvas) window.resizeCanvas(); // Llamará a canvas-handler.js
    });

    document.getElementById('close-overlay-btn').addEventListener('click', () => {
        hideOverlay('text');
        hideOverlay('canvas');
        document.getElementById('review-send-btn').style.display = 'none';
        document.getElementById('process-canvas-btn').style.display = 'none';
        document.getElementById('close-overlay-btn').style.display = 'none';
        document.getElementById('review-send-btn').style.background = '#FF6B6B'; // Reset global styling
    });

    const textInput = document.getElementById('message-text-input');
    if (textInput) {
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textInput.blur(); // Cierra el teclado virtual en tablets
            }
        });
    }

    // Exponer metodos publicamente
    window.goToChatScreen = () => {
        showScreen('chat');
        globalFloatingActions.classList.remove('hidden');
    };
    window.closeCanvasAndOpenText = () => {
        hideOverlay('canvas');
        document.getElementById('process-canvas-btn').style.display = 'none';
        showOverlay('text');
        document.getElementById('review-send-btn').style.display = 'flex';
        document.getElementById('close-overlay-btn').style.display = 'flex';
    };
});
