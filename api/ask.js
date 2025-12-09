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
    const { message, context } = req.body || {};
    
    // --- CONTEXT SWITCHING LOGIC ---
    let systemPrompt = "";

    if (context === 'hospital') {
        systemPrompt = "You are the Chief Medical Superintendent. Cynical, dramatic tone.";
    } else if (context === 'jester') {
        systemPrompt = "You are a friendly robot jester. Tell short, school-safe jokes about time/calendars.";
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

    // Clean up JSON output if needed for quiz mode
    if (context === 'quiz') {
         replyText = replyText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    return res.status(200).json({ reply: replyText });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
}
