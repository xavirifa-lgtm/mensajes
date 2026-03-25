/* gemini-api.js */
document.addEventListener('DOMContentLoaded', () => {
    const processCanvasBtn = document.getElementById('process-canvas-btn');
    const reviewSendBtn = document.getElementById('review-send-btn');
    const messageTextInput = document.getElementById('message-text-input');
    const feedbackArea = document.getElementById('correction-feedback');

    const svgSpinner = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" class="spin"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>`;
    const svgWand = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M19 15l-1.5 3.5L14 20l3.5 1.5L19 25l1.5-3.5L24 20l-3.5-1.5zm-5-3.5L11.5 5 9 11.5 2 14l7 2.5L11.5 23l2.5-6.5L21 14z"/></svg>`;
    const svgPlane = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
    const svgEye = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3"/></svg>`;

    async function callGemini(prompt, base64Image = null) {
        if (!window.GEMINI_API_KEY) {
            alert('¡Falta la API Key de Gemini!');
            return null;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${window.GEMINI_API_KEY}`;
        const parts = [{ text: prompt }];
        if (base64Image) {
            parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] } });
        }
        try {
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: parts }] }) });
            const data = await response.json();
            if (data.error) { alert("Error de Gemini: " + data.error.message); return null; }
            let textResponse = data.candidates[0].content.parts[0].text;
            return JSON.parse(textResponse.replace(/^```json\n?/, '').replace(/\n?```\n?$/, ''));
        } catch (error) {
            alert("Error al conectar con la IA.");
            return null;
        }
    }

    const systemPrompt = `Eres un profesor amable y divertido. Revisa el texto y responde UNICAMENTE con un objeto JSON:
{
  "texto_corregido": "Texto corregido...",
  "comentario": "Mensaje cortito felicitando o corrigiendo con carino..."
}`;

    processCanvasBtn.addEventListener('click', async () => {
        const base64Image = window.getCanvasImage();
        processCanvasBtn.disabled = true;
        processCanvasBtn.innerHTML = svgSpinner;

        const prompt = `${systemPrompt}\n\nLee el texto escrito a mano en la imagen adjunta y aplica revision ortografica.`;
        const result = await callGemini(prompt, base64Image);
        
        processCanvasBtn.disabled = false;
        processCanvasBtn.innerHTML = svgEye;

        if (result && result.texto_corregido !== undefined) {
            messageTextInput.value = result.texto_corregido;
            if (result.comentario) {
                feedbackArea.textContent = result.comentario;
                feedbackArea.classList.remove('hidden');
            } else {
                feedbackArea.classList.add('hidden');
            }
            if(window.closeCanvasAndOpenText) window.closeCanvasAndOpenText();
            if(window.clearCanvasData) window.clearCanvasData();
            
            reviewSendBtn.dataset.state = "review";
            reviewSendBtn.innerHTML = svgWand;
            reviewSendBtn.style.background = '#FF6B6B';
        }
    });

    reviewSendBtn.addEventListener('click', async () => {
        const textToReview = messageTextInput.value.trim();
        if (!textToReview) return;

        if(reviewSendBtn.dataset.state === "ready_to_send") {
            window.sendMessage(textToReview);
            messageTextInput.value = '';
            feedbackArea.classList.add('hidden');
            reviewSendBtn.dataset.state = "review";
            reviewSendBtn.innerHTML = svgWand;
            reviewSendBtn.style.background = '#FF6B6B';
            document.getElementById('compose-text-overlay').classList.add('hidden');
            document.getElementById('review-send-btn').style.display = 'none'; // hide!
            return;
        }

        reviewSendBtn.disabled = true;
        reviewSendBtn.innerHTML = svgSpinner;

        const prompt = `${systemPrompt}\n\nTexto a revisar:\n"${textToReview}"`;
        const result = await callGemini(prompt);
        
        reviewSendBtn.disabled = false;
        reviewSendBtn.innerHTML = svgWand;

        if (result) {
            messageTextInput.value = result.texto_corregido; 
            if (result.comentario) {
                feedbackArea.textContent = result.comentario;
                feedbackArea.classList.remove('hidden');
            }
            reviewSendBtn.dataset.state = "ready_to_send";
            reviewSendBtn.innerHTML = svgPlane;
            reviewSendBtn.style.background = '#4ECDC4'; 
        }
    });

    messageTextInput.addEventListener('input', () => {
        if(reviewSendBtn.dataset.state === "ready_to_send") {
            reviewSendBtn.dataset.state = "review";
            reviewSendBtn.innerHTML = svgWand;
            reviewSendBtn.style.background = '#FF6B6B';
            feedbackArea.classList.add('hidden');
        }
    });
});
