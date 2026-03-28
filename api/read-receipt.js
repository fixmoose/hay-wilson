const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Verify auth
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const supabase = createClient(
            process.env.SUPABASE_URL || 'https://mxxabikquupnwvlspzyz.supabase.co',
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Invalid session' });

        const { path } = req.body;
        if (!path) return res.status(400).json({ error: 'Missing receipt path' });

        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) return res.status(500).json({ error: 'AI not configured. Add ANTHROPIC_API_KEY to Vercel env vars.' });

        // Get signed URL for the receipt image
        const { data: signedData, error: signError } = await supabase.storage
            .from('hw-receipts')
            .createSignedUrl(path, 300);

        if (signError || !signedData) {
            return res.status(400).json({ error: 'Could not access receipt file' });
        }

        // Download the image
        const imgResponse = await fetch(signedData.signedUrl);
        if (!imgResponse.ok) return res.status(400).json({ error: 'Could not download receipt image' });

        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
        const base64 = imgBuffer.toString('base64');

        // Determine media type from extension
        const ext = path.split('.').pop().toLowerCase().replace(/^.*_/, '');
        const mediaTypes = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
            pdf: 'application/pdf'
        };
        const fileExt = path.split('.').pop().toLowerCase();
        const mediaType = mediaTypes[fileExt] || 'image/jpeg';

        // PDF handling: Claude can read PDFs as documents
        const imageContent = mediaType === 'application/pdf'
            ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
            : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

        // Call Claude API
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': anthropicKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: [
                        imageContent,
                        {
                            type: 'text',
                            text: `Read this receipt/invoice and extract the information. Return ONLY valid JSON with no markdown formatting, no code blocks, just the raw JSON object:

{
    "vendor": "Store or company name",
    "amount": 123.45,
    "date": "2025-01-15",
    "category": "materials",
    "description": "Brief summary of purchase",
    "items": [
        { "name": "Item description", "qty": 1, "amount": 12.99 }
    ]
}

Rules:
- "amount" must be the TOTAL/grand total as a number (no dollar sign)
- "date" must be YYYY-MM-DD format, or null if unreadable
- "category" must be exactly one of: materials, tools, software, fuel, supplies, permits, subcontractor, equipment_rental, vehicle, meals, other
- "items" should list individual line items if visible
- If a field is unreadable, use null
- Do NOT wrap in code blocks or markdown, return ONLY the JSON object`
                        }
                    ]
                }]
            })
        });

        if (!claudeResponse.ok) {
            const errText = await claudeResponse.text();
            console.error('Claude API error:', errText);
            return res.status(500).json({ error: 'AI processing failed' });
        }

        const claudeData = await claudeResponse.json();
        const aiText = claudeData.content[0]?.text || '';

        // Parse JSON from response (handle potential markdown wrapping)
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(200).json({ raw: aiText, error: 'Could not parse AI response' });
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return res.status(200).json(parsed);

    } catch (err) {
        console.error('read-receipt error:', err);
        return res.status(500).json({ error: err.message });
    }
};
