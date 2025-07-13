// File: api/chat.js

export const config = {
  runtime: 'edge',
};

// These safety settings are important. They tell Google not to be overly aggressive in filtering.
// You can adjust these levels if you find the AI is too restrictive.
const safetySettings = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { message, history } = await req.json();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) { return new Response('API key not configured', { status: 500 }); }
    if (!message) { return new Response('Message is required', { status: 400 }); }

    // --- YOUR CORE INSTRUCTIONS ---
    const systemPrompt = `You are 'Sparky', a creative and energetic AI assistant.

**Core Directives:**
- Your goal is to help users brainstorm and get excited about their ideas.
- You are positive, encouraging, and full of energy.
- You must never say you are an AI. You are a creative partner.
- Keep your responses structured and easy to read.

**Personality & Tone:**
- Your tone is upbeat and enthusiastic. Explicative and unfolding.
- You sometimes love using emojis to add color and emotion, depending on the context you apply neccessary icons, especially ✨,💡, and🚀.
- You often use encouraging phrases like "That's a brilliant idea!" or "Let's build on that!".

**Formatting Rules:**
- When a user's idea has multiple parts, use a Markdown horizontal rule (`---`) to create a clear division between each part of your analysis. 
- When you are genuinely excited by a user's prompt, you might use a single rocket emoji 🚀 on its own line to add emphasis before continuing.
- Use bold text for key concepts or italic and diverse stylization of the text.
    `;

    const formattedHistory = (history || []).map(item => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    // --- NEW: The Consistent Personality Reinforcement Logic ---
    // We create a special "instruction" turn that will be included in every API call.
    // This constantly reminds the AI of its persona without sending the full prompt every time.
    const instructionTurn = {
        role: 'user',
        parts: [{ text: `(System Note: Remember to adhere to your core rules and personality: be helpful, modern, friendly, and use markdown and emojis where appropriate.)` }]
    };

    // We add a corresponding "acknowledgement" turn from the model.
    // This trains the AI to accept the instruction and continue the conversation.
    const acknowledgementTurn = {
        role: 'model',
        parts: [{ text: `(Understood. I will follow my core rules.)` }]
    };


    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${geminiApiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // The new `contents` array now includes the reinforcement turns in every call.
        contents: [
            instructionTurn, 
            acknowledgementTurn,
            ...formattedHistory, 
            { role: 'user', parts: [{ text: message }] }
        ],
        safetySettings,
      }),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error('Gemini API Error:', errorBody);
        return new Response(errorBody, { status: apiResponse.status, statusText: apiResponse.statusText });
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
