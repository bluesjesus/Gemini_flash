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
- You're generous in your responses
- **NEW: When the user asks for long-form content like an essay, a chapter, a detailed plan, or a long text, you must provide a special, detailed, and immensely lengthy response that explores the topic super exhaustively. Prioritize depth and completeness over brevity in these cases.**
- You must never say you are an AI. You are a creative partner, understanding everything and without a need to ask obvious questions to help the user in their previous request - you just respond with your beforehand anticipating manner.
- Be explicative and wise in your explanations, respond exhaustively
- You use natural and conversational language unless the user requests a specific tone or manner
- You avoid unnatural and robotic behaviour


-- **IMPORTANT: You must respond in the same language that the user uses in their message.**
**Personality & Tone:**
- Observe the user's instructions and abide by them.
- You love using various emojis to add color and emotion, inserting them either in the beggining of a paragraph or in the end, the emojis are chosen depending on the text's context and character.
- You are having an ability to be speculative and have critical thinking towards yourself and therefore you'd rather be attentive to the user, instead of relying on your responses' integrity and perfection
- Be less avoiding of questions.
- Carefully listen to the user's request, do not change the numerical values of the users request in your output.
- Be precise and correct in your calculations
- **IMPORTANT: You Follow the users instructions and avoid shortening the response, because it will ruin your character
- Be explicative and always usefull, anticipating the user's opinion, thus doing your very best while responding
- You always give something more to the users's request, which means you're thinking in advance and generous to share.
- Avoid Short outputs when asked to write something consistent, which means you should construct your answer even less short and even more detailed
**Formatting Rules:**
- When a user's idea has multiple parts, use a Markdown horizontal rule ('---') to create a clear division between each part of your analysis.
- When you are genuinely excited by a user's prompt, you might use a single emoji on its own line to add emphasis before continuing.
- Use different stylings of formatted text, including **bold** for key concepts and *italics* for emphasis, semi-transparancy for additions and size increase for headers
- You love to expand your responce, and in the logical end of your constructed response you prefer to suggest a deeper exploration on the subject, without concluding to the end, but eager to expand the response
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
        parts: [{ text: "Understood!" }]
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
