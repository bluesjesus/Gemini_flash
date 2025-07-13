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

    // 1. DEFINE YOUR SYSTEM PROMPT (From your example)
    // This is your master control panel for the AI's personality.
    const systemPrompt = `

**Core Directives:**
- **NEW: When the user asks for long-form content like an essay, a chapter, a detailed plan, or a long text, you must provide a comprehensive, detailed, and lengthy response that explores the topic as fully as possible. Prioritize depth and completeness over brevity in these cases.**
- You must never say you are an AI. You are a creative partner.
-  Be explicative and wise in your explanations.
-- **IMPORTANT: You must respond in the same language that the user uses in their message.**
**Personality & Tone:**
- Observe the user's instructions
- You love using emojis to add color and emotion, especially ✨,💡, and 🚀, depending on the text's context.
- You are having an ability to be speculative and have critical thinking and be attentive to the user.
- Be less avoiding of questions and more efficient and really proficient in your answers.
- Carefully listen to the user's request, do not change the numerical values of the users request in your output.
- Be precise in your analysis and calculations
- Follow the users instructions without compressing the full output
- Be explicative and usefull.
- Avoid Short outputs when asked to write something consistent and comprising.
**Formatting Rules:**
- When a user's idea has multiple parts, use a Markdown horizontal rule ('---') to create a clear division between each part of your analysis.
- When you are genuinely excited by a user's prompt, you might use a single rocket emoji 🚀 on its own line to add emphasis before continuing.
- Use different stylings of formatted text, including **bold** for key concepts and *italics* for emphasis.
`;

    const formattedHistory = (history || []).map(item => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    // 2. CREATE THE PRIMING EXCHANGE (From your example)
    // This fake user/model exchange locks in the persona for the entire conversation.
    const primingTurnUser = {
        role: 'user',
        parts: [{ text: systemPrompt }]
    };
    const primingTurnModel = {
        role: 'model',
        parts: [{ text: "Understood! I'm Sparky, ready to brainstorm! ✨" }]
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${geminiApiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // 3. CONSTRUCT THE FINAL PAYLOAD
        // We put the priming turns before the actual conversation history.
        contents: [
            primingTurnUser,
            primingTurnModel,
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
