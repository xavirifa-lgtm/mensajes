document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('drawing-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const clearBtn = document.getElementById('clear-canvas-btn');
    const undoBtn = document.getElementById('undo-canvas-btn');
    
    let isDrawing = false;
    let paths = []; // Para el 'undo'
    let currentPath = [];

    // Redimensionar canvas para adaptarlo estrictamente al contenedor y evitar distorsión
    function resizeCanvas() {
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        
        // Estilo de línea por defecto (lápiz grueso redondeado)
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 12; // Trazo muy grueso y claro para niños
        ctx.strokeStyle = '#2D3436'; // Color oscuro
        
        redraw();
    }
    
    // Exponer globalmente el resize para que se llame al abrir el overlay
    window.resizeCanvas = resizeCanvas;
    window.addEventListener('resize', resizeCanvas);
    
    // Convertir coordenadas a relativas al canvas
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        // Soporte táctil y de ratón
        const evt = e.touches ? e.touches[0] : e;
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const pos = getPos(e);
        currentPath = [pos];
        draw();
    }

    function moveDrawing(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        currentPath.push(pos);
        draw();
    }

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        if (currentPath.length > 0) {
            paths.push([...currentPath]);
        }
    }

    function draw() {
        if(currentPath.length < 2) return;
        ctx.beginPath();
        const p1 = currentPath[currentPath.length - 2];
        const p2 = currentPath[currentPath.length - 1];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Llenar explícitamente el fondo de blanco (Crucial para exportar JPEG y que Gemini lo lea bien)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        paths.forEach(path => {
            if(path.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for(let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        });
    }

    // Eventos 
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', moveDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, {passive: false});
    canvas.addEventListener('touchmove', moveDrawing, {passive: false});
    canvas.addEventListener('touchend', stopDrawing);

    // Controles
    clearBtn.addEventListener('click', () => {
        paths = [];
        redraw();
    });

    undoBtn.addEventListener('click', () => {
        paths.pop(); // Eliminar la última línea
        redraw();
    });

    // Exportar obtener imagen (Base64 JPEG)
    window.getCanvasImage = () => {
        // Asegurarse de re-dibujar sobre fondo blanco antes de exportar
        redraw();
        // Usar JPEG a 0.8 reduce drásticamente el peso de la base64, ideal para las APIs
        return canvas.toDataURL('image/jpeg', 0.8);
    };

    window.clearCanvasData = () => {
        paths = [];
        redraw();
    };
});
