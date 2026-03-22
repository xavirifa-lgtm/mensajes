let peer = null;
let conn = null;
let isHost = false;

document.addEventListener('DOMContentLoaded', () => {
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const myCodeDisplay = document.getElementById('my-code-display');
    const joinCodeInput = document.getElementById('join-code-input');
    const connectionStatus = document.getElementById('connection-status');
    const chatMessages = document.getElementById('chat-messages');

    function generateShortCode() {
        return Math.random().toString(36).substring(2, 7).toUpperCase();
    }

    function initPeer(id) {
        // Usa el servidor por defecto de PeerJS en la nube
        peer = new Peer(id, {
            debug: 2
        });

        peer.on('open', (id) => {
            console.log('Mi ID de PeerJS es: ' + id);
            if(isHost) {
                myCodeDisplay.textContent = id;
                myCodeDisplay.classList.remove('hidden');
                connectionStatus.textContent = 'Esperando a que la otra tablet introduzca el código... 👀';
            }
        });

        peer.on('connection', (connection) => {
            // Alguien se conecta a mí (si soy Host)
            conn = connection;
            setupConnection();
        });

        peer.on('error', (err) => {
            console.error('PeerJS Error:', err);
            connectionStatus.textContent = 'Error: ' + err.type;
        });
    }

    function setupConnection() {
        conn.on('open', () => {
            console.log('Conexión establecida!');
            window.goToChatScreen(); // Cambia de pantalla (desde app.js)
            addSystemMessage('¡La otra tablet se ha conectado! 🎉');
        });

        conn.on('data', (data) => {
            console.log('Mensaje recibido:', data);
            // Mostrar mensaje en UI
            window.addMessageToUI(data.text, 'received');
        });

        conn.on('close', () => {
            addSystemMessage('La otra tablet se ha desconectado. 😢');
            const statusBadge = document.getElementById('peer-status');
            if(statusBadge) {
                statusBadge.className = 'badge red';
                statusBadge.innerHTML = '<i class="fa-solid fa-wifi-slash"></i> Desconectado';
            }
        });
    }

    createRoomBtn.addEventListener('click', () => {
        isHost = true;
        createRoomBtn.disabled = true;
        const myId = "MECA-" + generateShortCode();
        initPeer(myId);
    });

    joinRoomBtn.addEventListener('click', () => {
        let code = joinCodeInput.value.trim().toUpperCase();
        if (!code) {
            alert('Introduce un código');
            return;
        }
        
        // Si el codigo no tiene el prefijo MECA-, ponéselo para evitar confusiones de niños
        const destId = code.startsWith("MECA-") ? code : "MECA-" + code;

        isHost = false;
        joinRoomBtn.disabled = true;
        connectionStatus.textContent = 'Conectando... 🚀';

        // Inicializamos nuestro propio peer sin ID fijo (aleatorio largo)
        peer = new Peer({ debug: 2 });
        
        peer.on('open', () => {
            conn = peer.connect(destId);
            setupConnection();
        });

        peer.on('error', (err) => {
            console.error(err);
            connectionStatus.textContent = 'Oh oh. ¿Estás seguro de que has copiado el código bien? 🤔';
            joinRoomBtn.disabled = false;
        });
    });

    // Función global para enviar mensaje (llamada desde otros scripts)
    window.sendMessage = (text) => {
        if (conn && conn.open) {
            conn.send({ text: text });
            window.addMessageToUI(text, 'sent');
        } else {
            alert("¡Ups! Parece que no hay conexión con la otra tablet de momento. 🔌");
        }
    };

    function addSystemMessage(text) {
        const el = document.createElement('div');
        el.className = 'message system';
        el.textContent = text;
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Exportar función global para renderizar mensajes
    window.addMessageToUI = (text, type) => {
        const el = document.createElement('div');
        el.className = `message ${type}`;
        
        if (typeof marked !== 'undefined') {
            // Sanitiza levemente o usa marcado para bold, etc
            el.innerHTML = marked.parse(text);
        } else {
            el.textContent = text;
        }
        
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };
});
