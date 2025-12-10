export default async function handler(req, res) {
  
  // --- DYNAMIC CORS FIX ---
  // Instead of hardcoding one URL, we check who is asking and say "Yes" to them.
  const origin = req.headers.origin;
  
  // If an origin is present (e.g., GitHub, Localhost, Vercel), allow it.
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback for non-browser tools
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ reply: "Configuration Error: GEMINI_API_KEY is missing in Vercel." });
  }

  try {
    const { message, context } = req.body || {};
    
    // --- CONTEXT SWITCHING LOGIC ---
    let systemPrompt = "";

    if (context === 'hospital') {
        systemPrompt = "You are the Chief Medical Superintendent. Cynical, dramatic tone.";
    } else if (context === 'jester') {
        systemPrompt = "You are a friendly robot jester. Tell 1 short, school-safe joke about time/calendars.";
    } else if (context === 'hint') {
        systemPrompt = "You are a helpful tutor. Give a gentle hint about the user's task categorization. Don't reveal the exact answer directly.";
    } else if (context === 'quiz') {
        systemPrompt = `You are a quiz generator. Generate a JSON object with a single multiple-choice question about time management. 
        Format: {"question": "...", "options": ["A", "B", "C", "D"], "answer": 0} (where answer is the index of the correct option). 
        Do not output markdown formatting, just raw JSON.`;
    } else {
        // Default
        systemPrompt = "You are a helpful AI assistant.";
    }

    const finalPrompt = `${systemPrompt}\n\nRequest: ${message}`;

    // --- GEMINI 2.5 FLASH ---
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }]
    };

    // Retry Logic Variables
    const maxRetries = 3;
    const delays = [1000, 2000, 4000];
    let attempt = 0;

    // Retry Loop
    while (attempt <= maxRetries) {
      try {
        const upstreamRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        // Better Error Handling: Check status before parsing JSON
        if (!upstreamRes.ok) {
            const errorText = await upstreamRes.text();
            console.error(`Gemini API Error (Attempt ${attempt + 1}):`, upstreamRes.status, errorText);
            
            // If Rate Limit (429) or Server Error (5xx), we might retry
            if (upstreamRes.status === 429 || upstreamRes.status >= 500) {
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                    attempt++;
                    continue; // Try again
                }
            }

            let friendlyError = "System Error";
            if (upstreamRes.status === 429) friendlyError = "Rate Limit Exceeded (Quota)";
            if (upstreamRes.status === 400) friendlyError = "Invalid API Key or Request";
            if (upstreamRes.status === 404) friendlyError = "Model Not Found (Check Model ID)";
            
            return res.status(upstreamRes.status).json({ 
                reply: `${friendlyError} (${upstreamRes.status}): ${errorText.substring(0, 100)}...` 
            });
        }

        const data = await upstreamRes.json();
        
        // Check for API logic errors
        if (data.error) {
            console.error("Gemini Logic Error:", data.error);
            return res.status(500).json({ reply: "AI Logic Error: " + data.error.message });
        }

        let replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response text found.";

        // Clean up JSON output if needed for quiz mode
        if (context === 'quiz') {
            replyText = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return res.status(200).json({ reply: replyText });

      } catch (err) {
        console.error(`Attempt ${attempt + 1} Failed:`, err);
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delays[attempt]));
            attempt++;
        } else {
            return res.status(500).json({ reply: "Server Crash: " + err.message });
        }
      }
    }

  } catch (err) {
    console.error("Critical Error:", err);
    return res.status(500).json({ reply: "Server Crash: " + err.message });
  }
}
