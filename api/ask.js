export default async function handler(req, res) {
  // CORS: Allow your simulation to talk to this backend
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
    const { message, mode, context } = req.body || {};
    
    // --- CONTEXT SWITCHING LOGIC ---
    let systemPrompt = "";

    if (context === 'hospital') {
        // HOSPITAL SIMULATOR PERSONA
        systemPrompt = `
        You are the Chief Medical Superintendent of a chaotic General Hospital.
        Your tone is professional but slightly cynical/dramatic (like Dr. House).
        Keep responses concise (under 2 sentences unless asked for a list).
        You are generating content for a hospital simulation game.
        `;
    } else {
        // DEFAULT / CITY BUILDER PERSONA (Fallback)
        systemPrompt = `
        You are the "City OS" AI for Chrono-City.
        Your job is to help the Mayor (student) manage their calendar city.
        Keep responses short, authoritative but friendly.
        `;
    }

    // Combine user message with system prompt
    const finalPrompt = `${systemPrompt}\n\nUser Request: ${message}`;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey);
    
    const payload = {
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }]
    };

    const upstreamRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await upstreamRes.json();
    let replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "System Error";

    return res.status(200).json({ reply: replyText });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
}
