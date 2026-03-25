let peer = null;
let conn = null;

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const autoStatus = document.getElementById('auto-connection-status');
    let retryInterval = null;

    // Se expone esta función para ser llamada desde app.js cuando se sabe el rol
    window.initPermanentPeer = (myRole) => {
        // IDs fijos! Muy importante que sean únicos y distintos.
        const myId = myRole === 'Emma' ? 'MECA-KIDS-TAB-EMMA' : 'MECA-KIDS-TAB-ABUELA';
        const targetId = myRole === 'Emma' ? 'MECA-KIDS-TAB-ABUELA' : 'MECA-KIDS-TAB-EMMA';

        // Destruir peer previo si existiera (ej: tras darle al boton de cambiar tablet)
        if(peer) {
            peer.destroy();
            conn = null;
        }

        peer = new Peer(myId, { debug: 2 });

        peer.on('open', (id) => {
            console.log('Mi ID fijo es: ' + id);
            if(autoStatus) autoStatus.textContent = 'Buscando a la otra tablet... 👀';
            
            // Empezar el ciclo activo de búsqueda
            attemptConnection(targetId);
        });

        // Cuando la OTRA tablet nos encuentra a nosotros
        peer.on('connection', (connection) => {
            if(conn && conn.open) return; // ya estábamos conectados
            console.log("¡Me han encontrado!");
            setupConnection(connection);
        });

        peer.on('error', (err) => {
            console.error('PeerJS Error:', err);
            if(err.type === 'unavailable-id') {
                if(autoStatus) autoStatus.textContent = 'Error: Cierra las otras pestañas/apps que estén usando este mismo rol de Tablet.';
            }
        });
    };

    function attemptConnection(targetId) {
        if(conn && conn.open) return; 

        console.log('Intentando conectar con ' + targetId + '...');
        const newConn = peer.connect(targetId, { reliable: true });

        newConn.on('open', () => {
            console.log("¡He encontrado la tablet!");
            setupConnection(newConn);
        });

        newConn.on('error', () => {
            console.log("Aún no la encuentro...");
            // No hacemos nada, el temporizador volverá a intentarlo.
        });

        // Loop de reintento automático infinito (ping cada 3 segundos hasta que enciendan la otra tablet)
        clearTimeout(retryInterval);
        retryInterval = setTimeout(() => {
            if(!conn || !conn.open) attemptConnection(targetId);
        }, 3000);
    }

    function setupConnection(connection) {
        conn = connection;
        clearTimeout(retryInterval); // Parar el bucle de búsqueda
        
        window.goToChatScreen(); 

        const statusBadge = document.getElementById('peer-status');
        if(statusBadge) {
            statusBadge.className = 'badge green';
            statusBadge.innerHTML = '🟢 Conectado';
        }

        // Limpieza fundamental de eventos para no duplicarlos si se cae y vuelve a conectar
        conn.off('data');
        conn.off('close');
        conn.off('error');

        conn.on('data', (data) => {
            window.addMessageToUI(data.text, 'received');
        });

        conn.on('close', () => handleDisconnection());
        conn.on('error', () => handleDisconnection());
    }

    function handleDisconnection() {
        console.log("Desconectado.");
        conn = null;
        
        const statusBadge = document.getElementById('peer-status');
        if(statusBadge) {
            statusBadge.className = 'badge red';
            statusBadge.innerHTML = '🔴 Desconectado';
        }
        
        // Empezar a buscar automáticamente en silencio mientras seguimos en la pantalla de chat
        const role = localStorage.getItem('tablet_role');
        const targetId = role === 'Emma' ? 'MECA-KIDS-TAB-ABUELA' : 'MECA-KIDS-TAB-EMMA';
        attemptConnection(targetId);
    }

    // Funciones globales para exponerlas hacia la UI (Botón Enviar de Gemini)
    window.sendMessage = (text) => {
        const role = localStorage.getItem('tablet_role') || 'Yo';
        const finalMessage = `**${role}:** ${text}`;
        
        if (conn && conn.open) {
            conn.send({ text: finalMessage });
            window.addMessageToUI(finalMessage, 'sent');
        } else {
            alert("¡La otra tablet no está conectada o está apagada de momento! 🔌");
        }
    };

    function loadChatHistory() {
        const historyJSON = localStorage.getItem('chat_history');
        if (historyJSON) {
            const history = JSON.parse(historyJSON);
            if(history.length > 0) {
                const head = document.createElement('div');
                head.className = 'message system';
                head.textContent = 'Mensajes anteriores 👇';
                chatMessages.appendChild(head);
                history.forEach(msg => renderMessageElement(msg.text, msg.type));
            }
        }
    }

    function saveMessageToHistory(text, type) {
        let history = [];
        const historyJSON = localStorage.getItem('chat_history');
        if (historyJSON) {
            history = JSON.parse(historyJSON);
        }
        history.push({ text: text, type: type, timestamp: Date.now() });
        // Mantener como máximo los últimos 300 mensajes guardados en la tablet
        if (history.length > 300) history.shift();
        localStorage.setItem('chat_history', JSON.stringify(history));
    }

    function renderMessageElement(text, type) {
        const el = document.createElement('div');
        el.className = `message ${type}`;
        if (typeof marked !== 'undefined') {
            el.innerHTML = marked.parse(text);
        } else {
            el.textContent = text;
        }
        chatMessages.appendChild(el);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    window.addMessageToUI = (text, type) => {
        renderMessageElement(text, type);
        saveMessageToHistory(text, type);
    };

    // Al arrancar, mostrar los mensajes antiguos
    loadChatHistory();
});
