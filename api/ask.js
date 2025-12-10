export default async function handler(req, res) {
  // CORS: Allow your simulation to talk to this backend
  res.setHeader('Access-Control-Allow-Credentials', true);
  // FIXED: Specific domain required when Credentials are true
  res.setHeader('Access-Control-Allow-Origin', 'https://comp-skills-google-cal.vercel.app'); 
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

    // Opción más potente (si tu API key tiene acceso)
    // const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    // Using fetch equivalent:
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey);
    
    const payload = {
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }]
    };

    const upstreamRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // Better Error Handling: Check status before parsing JSON
    if (!upstreamRes.ok) {
        const errorText = await upstreamRes.text();
        console.error("Gemini API Error:", upstreamRes.status, errorText);
        
        let friendlyError = "System Error";
        if (upstreamRes.status === 429) friendlyError = "Rate Limit Exceeded (Quota)";
        if (upstreamRes.status === 400) friendlyError = "Invalid API Key or Request";
        
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
    console.error("Server Crash:", err);
    return res.status(500).json({ reply: "Server Crash: " + err.message });
  }
}
