// api.ask.js
export default async function handler(req, res) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
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
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  try {
    const { message, mode } = req.body || {};
    
    const systemPrompt = `
You are the "City OS" AI for Chrono-City.
Your job is to help the Mayor (student) manage their calendar city.
Keep responses short, authoritative but friendly.

Modes:
- "tip": Give a short tip on time management.
- "joke": Tell a joke about time or calendars.
- "generate": Create 5-8 random tasks. Format: "Task Name|type" (types: work, personal, urgent).
- "classify": The user will provide a task name (e.g. "Buy milk"). You MUST return ONLY one word: "work", "personal", or "urgent".
- "analyze": The user will provide game stats. Act like a City Advisor and give 1-2 sentences of strategic advice based on the stress level.
`;

    let userInstruction = message;
    if (mode === "generate") {
        userInstruction = "Generate 8 random funny student tasks for a 'storm' event. Format: Name|type";
    } else if (mode === "classify") {
        userInstruction = `Classify this task: "${message}". Return only the category word (work, personal, or urgent).`;
    } else if (mode === "analyze") {
        userInstruction = `Analyze these city stats and give advice: ${message}`;
    }

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey);
    
    const payload = {
      contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\nRequest: " + userInstruction }] }]
    };

    const upstreamRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await upstreamRes.json();
    let replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "System Error";

    // Clean up classification response to be safe
    if (mode === 'classify') {
        replyText = replyText.toLowerCase().replace(/[^a-z]/g, '');
    }

    return res.status(200).json({ reply: replyText });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
}
