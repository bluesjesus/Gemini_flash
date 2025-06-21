// File: api/chat.js

// We need to use the Edge runtime for streaming responses with Vercel, which is faster.
export const config = {
  runtime: 'edge',
};

// Main function handler
export default async function handler(req) {
  // 1. We only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // 2. Extract the message and history from the request body
    const { message, history } = await req.json();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
        return new Response(JSON.stringify({ error: 'API key not configured on Vercel' }), { status: 500 });
    }
      
    if (!message) {
        return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400 });
    }

    // 3. Format the history for the Gemini API
    // The Gemini API expects roles of 'user' and 'model'
    const formattedHistory = (history || []).map(item => ({
      role: item.role, // 'user' or 'model'
      parts: [{ text: item.text }],
    }));

    // 4. Call the Gemini API using the streaming endpoint
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-:GenerateContent?key=${geminiApiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [...formattedHistory, { role: 'user', parts: [{ text: message }] }],
      }),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error("Gemini API Error:", errorBody);
        return new Response(JSON.stringify({ error: 'Failed to fetch from Gemini API', details: errorBody }), { status: apiResponse.status });
    }

    // 5. Create a new ReadableStream to pipe the Gemini response back to your frontend
    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = apiResponse.body.getReader();
        const decoder = new TextDecoder();

        function push() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            // The streamed response from Gemini is a series of JSON-like chunks.
            // We need to decode them and parse out the actual text content.
            const chunk = decoder.decode(value, { stream: true });
            
            // Clean up the chunk to extract valid JSON parts
            const jsonParts = chunk
              .replace(/^data: /gm, '')
              .split('\n')
              .filter(s => s.trim().startsWith('{'))
              .map(s => s.trim());

            for (const part of jsonParts) {
              try {
                const parsed = JSON.parse(part);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  // Send just the text content to the browser
                  controller.enqueue(new TextEncoder().encode(text));
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
            
            push();
          }).catch(err => {
            console.error('Stream reading error:', err);
            controller.error(err);
          });
        }
        
        push();
      },
    });

    // 6. Return the stream to the client
    return new Response(readableStream, {
      headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff', // Security header
      },
    });

  } catch (error) {
    console.error('Handler Error:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), { status: 500 });
  }
}
