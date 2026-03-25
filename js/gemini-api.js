document.addEventListener('DOMContentLoaded', () => {
    const processCanvasBtn = document.getElementById('process-canvas-btn');
    const reviewSendBtn = document.getElementById('review-send-btn');
    const messageTextInput = document.getElementById('message-text-input');
    const feedbackArea = document.getElementById('correction-feedback');

    async function callGemini(prompt, base64Image = null) {
        if (!window.GEMINI_API_KEY) {
            alert('¡Falta la API Key de Gemini!');
            return null;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${window.GEMINI_API_KEY}`;
        
        const parts = [{ text: prompt }];
        
        if (base64Image) {
            const base64Data = base64Image.split(',')[1];
            parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data
                }
            });
        }

        const requestBody = {
            contents: [{ parts: parts }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            if (data.error) {
                console.error("Gemini API Error:", data.error);
                alert("Error de Gemini: " + data.error.message);
                return null;
            }

            let textResponse = data.candidates[0].content.parts[0].text;
            
            textResponse = textResponse.replace(/^```json\n?/, '').replace(/\n?```\n?$/, '');
            
            return JSON.parse(textResponse);
        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Error al conectar con la IA. Consulta la consola.");
            return null;
        }
    }

    const systemPrompt = `Eres un profesor de primaria amable, divertido y muy cariñoso. Tu tarea es revisar lo que escribe el niño.
Responde ÚNICAMENTE con un objeto JSON que tenga esta estructura exacta, sin texto adicional alrededor (ni etiquetas markdown de código):
{
  "texto_corregido": "El texto corregido con buena ortografía (intentando respetar el mensaje original del niño).",
  "comentario": "Un mensaje cortito (1 o 2 frases) felicitando al niño o explicando con mucho cariño las faltas de ortografía si las hay. Emojis son bienvenidos!"
}`;

    processCanvasBtn.addEventListener('click', async () => {
        const base64Image = window.getCanvasImage();
        
        processCanvasBtn.disabled = true;
        const originalText = processCanvasBtn.innerHTML;
        processCanvasBtn.innerHTML = '⏳ Leyendo...';

        const prompt = `${systemPrompt}\n\nLee el texto escrito a mano en la imagen adjunta y aplica la revisión ortográfica. Si no se entiende o es solo un dibujo, pon texto_corregido: "" y en el comentario dímelo con cariño.`;
        
        const result = await callGemini(prompt, base64Image);
        
        processCanvasBtn.disabled = false;
        processCanvasBtn.innerHTML = originalText;

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
            reviewSendBtn.innerHTML = '✨ Revisar y Enviar';
            reviewSendBtn.classList.replace('secondary-btn', 'primary-btn');
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
            reviewSendBtn.innerHTML = '✨ Revisar y Enviar';
            reviewSendBtn.classList.replace('secondary-btn', 'primary-btn');
            document.getElementById('compose-text-overlay').classList.add('hidden');
            return;
        }

        reviewSendBtn.disabled = true;
        const originalText = reviewSendBtn.innerHTML;
        reviewSendBtn.innerHTML = '⏳ Pensando...';

        const prompt = `${systemPrompt}\n\nTexto a revisar:\n"${textToReview}"`;
        
        const result = await callGemini(prompt);
        
        reviewSendBtn.disabled = false;
        reviewSendBtn.innerHTML = originalText;

        if (result) {
            messageTextInput.value = result.texto_corregido; 
            
            if (result.comentario) {
                feedbackArea.textContent = result.comentario;
                feedbackArea.classList.remove('hidden');
            }
            
            reviewSendBtn.dataset.state = "ready_to_send";
            reviewSendBtn.innerHTML = '🚀 ¡Enviar Definitivo!';
            reviewSendBtn.classList.replace('primary-btn', 'secondary-btn');
        }
    });

    messageTextInput.addEventListener('input', () => {
        if(reviewSendBtn.dataset.state === "ready_to_send") {
            reviewSendBtn.dataset.state = "review";
            reviewSendBtn.innerHTML = '✨ Revisar y Enviar';
            reviewSendBtn.classList.replace('secondary-btn', 'primary-btn');
            feedbackArea.classList.add('hidden');
        }
    });
});
