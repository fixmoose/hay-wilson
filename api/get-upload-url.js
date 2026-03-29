const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { token, filename } = req.body;
        if (!token || !filename) return res.status(400).json({ error: 'Missing token or filename' });

        const supabase = createClient(
            process.env.SUPABASE_URL || 'https://mxxabikquupnwvlspzyz.supabase.co',
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Validate upload token
        const { data: tokenRow, error: tokenError } = await supabase
            .from('hw_upload_tokens')
            .select('job_id, expires_at')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (tokenError || !tokenRow) {
            return res.status(401).json({ error: 'Invalid or expired link' });
        }

        const folder = tokenRow.job_id || '_unassigned';
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = folder + '/' + Date.now() + '_' + safeName;

        // Create a signed URL that allows uploading directly to Supabase Storage
        const { data, error } = await supabase.storage
            .from('hw-receipts')
            .createSignedUploadUrl(filePath);

        if (error) throw error;

        return res.status(200).json({
            signedUrl: data.signedUrl,
            path: data.path,
            token: data.token
        });

    } catch (err) {
        console.error('get-upload-url error:', err);
        return res.status(500).json({ error: err.message });
    }
};
