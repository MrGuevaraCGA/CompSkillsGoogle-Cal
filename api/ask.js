// api.ask.js
export default async function handler(req, res) {
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
    
    // System Persona: Future City Planner
    const systemPrompt = `
You are the "City OS" AI for Chrono-City.
Your job is to help the Mayor (student) manage their calendar city.
Keep responses short, authoritative but friendly, and use city/building metaphors.

Modes:
- "tip": Give a short tip on time management (e.g. "Building a routine is like laying a strong foundation.").
- "joke": Tell a joke about construction, time, or calendars.
- "generate": Create 5-8 random tasks. Format STRICTLY as: "Task Name|type" per line. Types: work, personal, urgent. NO extra text.
`;

    let userInstruction = message;
    if (mode === "generate") {
        userInstruction = "Generate 8 random funny student tasks for a 'storm' event. Format: Name|type";
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
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "System Error";

    return res.status(200).json({ reply: replyText });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
}
