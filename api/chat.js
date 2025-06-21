// File: api/chat.js

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { message, history } = await req.json();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) { return new Response('API key not configured', { status: 500 }); }
    if (!message) { return new Response('Message is required', { status: 400 }); }

    const formattedHistory = (history || []).map(item => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    // The correct URL we discovered
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${geminiApiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [...formattedHistory, { role: 'user', parts: [{ text: message }] }],
      }),
    });

    if (!apiResponse.ok) {
        // Just forward Google's error response directly to the browser
        return new Response(apiResponse.body, {
            status: apiResponse.status,
            statusText: apiResponse.statusText,
        });
    }

    // This is the main change: We don't parse the stream here.
    // We just pipe the raw response from Google directly to the browser.
    const readableStream = apiResponse.body;

    return new Response(readableStream, {
      headers: { 
          'Content-Type': 'text/event-stream; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Handler Error:', error);
    return new Response('An internal error occurred', { status: 500 });
  }
}
