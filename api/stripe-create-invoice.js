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

        const { stripe_customer_id, amount_cents, description, due_date } = req.body;
        if (!stripe_customer_id || !amount_cents) {
            return res.status(400).json({ error: 'stripe_customer_id and amount_cents are required' });
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        // Create invoice
        const invoice = await stripe.invoices.create({
            customer: stripe_customer_id,
            collection_method: 'send_invoice',
            days_until_due: due_date ? undefined : 30,
            due_date: due_date ? Math.floor(new Date(due_date).getTime() / 1000) : undefined,
            auto_advance: false,
        });

        // Add line item
        await stripe.invoiceItems.create({
            customer: stripe_customer_id,
            invoice: invoice.id,
            amount: amount_cents,
            currency: 'usd',
            description: description || 'Electrical services',
        });

        // Fetch updated invoice to get the hosted URL
        const updated = await stripe.invoices.retrieve(invoice.id);

        res.status(200).json({
            stripe_invoice_id: updated.id,
            stripe_invoice_url: updated.hosted_invoice_url || '',
        });
    } catch (err) {
        console.error('stripe-create-invoice error:', err);
        res.status(500).json({ error: err.message });
    }
};
