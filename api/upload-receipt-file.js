const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL || 'https://mxxabikquupnwvlspzyz.supabase.co',
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Parse multipart form data manually (Vercel doesn't parse by default)
        // We expect JSON with base64 file data for simplicity
        const { token, files } = req.body;

        if (!token) return res.status(400).json({ error: 'Missing upload token' });
        if (!files || !files.length) return res.status(400).json({ error: 'No files provided' });

        // Validate token
        const { data: tokenRow, error: tokenError } = await supabase
            .from('hw_upload_tokens')
            .select('*')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (tokenError || !tokenRow) {
            return res.status(401).json({ error: 'Invalid or expired upload link. Generate a new QR code.' });
        }

        const folder = tokenRow.job_id || '_unassigned';
        let uploaded = 0;
        const errors = [];

        for (const file of files) {
            const { name, data: base64Data, type } = file;
            if (!name || !base64Data) continue;

            const buffer = Buffer.from(base64Data, 'base64');
            const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = folder + '/' + Date.now() + '_' + safeName;

            const { error: uploadError } = await supabase.storage
                .from('hw-receipts')
                .upload(filePath, buffer, {
                    contentType: type || 'image/jpeg',
                    cacheControl: '3600'
                });

            if (uploadError) {
                errors.push(name + ': ' + uploadError.message);
            } else {
                uploaded++;
            }
        }

        // Clean up expired tokens (housekeeping)
        await supabase
            .from('hw_upload_tokens')
            .delete()
            .lt('expires_at', new Date().toISOString());

        return res.status(200).json({ uploaded, errors });

    } catch (err) {
        console.error('upload-receipt-file error:', err);
        return res.status(500).json({ error: err.message });
    }
};
