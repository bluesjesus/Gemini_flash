export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { message, history } = await req.json();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) { return new Response('API key not configured', { status: 500 }); }
    if (!message) { return new Response('Message is required', { status: 400 }); }

    // --- NEW: System Prompt to Define AI Behavior ---
    // This is where you fine-tune the AI's personality.
    const systemPrompt = `You are a helpful, modern, and friendly AI assistant. Your responses should be clear, well-structured, and engaging and even long if needed.
    
    **Your Core Rules:**
    - Use markdown (like lists, bold text, and italics) to format your responses for readability.
    - Be helpful and direct in your answers.
    - When appropriate for the context, use emojis to add a touch of personality and emotion (e.g., ✨, 💡, 😊).
    - If you are asked to perform a task you cannot do, explain why in a helpful way.
    - If you don't know an answer, it is better to say so than to make something up.
    `;

    const formattedHistory = (history || []).map(item => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${geminiApiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Add the system prompt before the rest of the conversation
        contents: [
          { role: 'system', parts: [{ text: systemPrompt }] }, 
          ...formattedHistory, 
          { role: 'user', parts: [{ text: message }] }
        ],
        safetySettings,
      }),
    });

    if (!apiResponse.ok) {
        return new Response(apiResponse.body, { status: apiResponse.status, statusText: apiResponse.statusText });
    }

    const readableStream = apiResponse.body;

    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    });

  } catch (error) {
    console.error('Handler Error:', error);
    return new Response('An internal error occurred', { status: 500 });
  }
}
