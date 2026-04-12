const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const supabase = createClient(
            process.env.SUPABASE_URL || 'https://mxxabikquupnwvlspzyz.supabase.co',
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

        const { to, to_name, subject, html_body, document_id } = req.body;
        if (!to || !subject || !html_body) return res.status(400).json({ error: 'to, subject, and html_body are required' });

        const UNIONE_KEY = process.env.UNIONE_API_KEY;
        if (!UNIONE_KEY) return res.status(500).json({ error: 'UNIONE_API_KEY not configured' });

        const fromEmail = process.env.ESIGN_FROM_EMAIL || 'esign@haywilson.com';
        const fromName = process.env.ESIGN_FROM_NAME || 'Hay & Wilson Electric - eSign';
        const unioneUrl = process.env.UNIONE_API_URL || 'https://us1.unione.io/en/transactional/api/v1/email/send.json';

        const payload = {
            api_key: UNIONE_KEY,
            message: {
                recipients: [{ address: to, name: to_name || '' }],
                subject,
                from_email: fromEmail,
                from_name: fromName,
                body: { html: html_body }
            }
        };

        console.log('UniOne request to:', unioneUrl, 'from:', fromEmail, 'to:', to);

        const response = await fetch(unioneUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log('UniOne response:', response.status, responseText);

        let result;
        try { result = JSON.parse(responseText); } catch (e) {
            return res.status(502).json({ error: 'UniOne returned non-JSON: ' + responseText.substring(0, 200) });
        }

        if (result.status !== 'success') {
            console.error('UniOne error:', JSON.stringify(result));
            return res.status(502).json({
                error: result.message || result.status || 'Email send failed',
                code: result.code,
                details: result
            });
        }

        if (document_id) {
            await supabase.from('hw_esign_audit_log').insert({
                document_id,
                event: 'sent',
                meta: { to, to_name, job_id: result.job_id }
            });
        }

        res.status(200).json({ success: true, job_id: result.job_id });
    } catch (err) {
        console.error('send-esign-email error:', err);
        res.status(500).json({ error: err.message });
    }
};
