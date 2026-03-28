const Stripe = require('stripe');
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
        if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

        const { stripe_invoice_id } = req.body;
        if (!stripe_invoice_id) return res.status(400).json({ error: 'stripe_invoice_id is required' });

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        // Finalize and send the invoice
        await stripe.invoices.finalizeInvoice(stripe_invoice_id);
        await stripe.invoices.sendInvoice(stripe_invoice_id);

        // Get the updated invoice for the hosted URL
        const updated = await stripe.invoices.retrieve(stripe_invoice_id);

        res.status(200).json({
            success: true,
            stripe_invoice_url: updated.hosted_invoice_url || '',
        });
    } catch (err) {
        console.error('stripe-send-invoice error:', err);
        res.status(500).json({ error: err.message });
    }
};
