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

    const toggleVoiceBtn = document.getElementById('toggle-voice-btn');
    if (toggleVoiceBtn) {
        const updateVoiceBtnUI = (isEnabled) => {
            if(isEnabled) {
                toggleVoiceBtn.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
                toggleVoiceBtn.style.background = '#4ECDC4';
                toggleVoiceBtn.style.color = 'white';
                toggleVoiceBtn.title = "Voz Activada";
            } else {
                toggleVoiceBtn.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
                toggleVoiceBtn.style.background = '#DFE4EA';
                toggleVoiceBtn.style.color = '#2F3542';
                toggleVoiceBtn.title = "Voz Silenciada";
            }
        };

        const isVoiceEnabled = localStorage.getItem('voice_enabled') !== 'false';
        updateVoiceBtnUI(isVoiceEnabled);

        toggleVoiceBtn.addEventListener('click', () => {
            const current = localStorage.getItem('voice_enabled') !== 'false';
            const nextState = !current;
            localStorage.setItem('voice_enabled', nextState.toString());
            updateVoiceBtnUI(nextState);
            if (!nextState && 'speechSynthesis' in window) window.speechSynthesis.cancel();
        });
    }

    document.getElementById('open-keyboard-btn').addEventListener('click', () => {
        showOverlay('text');
        document.getElementById('review-send-btn').style.display = 'flex';
        document.getElementById('close-overlay-btn').style.display = 'flex';
        const feedback = document.getElementById('correction-feedback');
        const feedbackText = document.getElementById('correction-text');
        if(feedback) {
            feedback.classList.add('hidden');
            if(feedbackText) feedbackText.innerHTML = '';
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
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
