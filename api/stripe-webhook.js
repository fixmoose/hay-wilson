const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Vercel needs raw body for webhook signature verification
module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const rawBody = await getRawBody(req);
        const sig = req.headers['stripe-signature'];

        let event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).json({ error: 'Invalid signature' });
        }

        if (event.type === 'invoice.paid') {
            const invoice = event.data.object;
            const stripeInvoiceId = invoice.id;

            const supabase = createClient(
                process.env.SUPABASE_URL || 'https://mxxabikquupnwvlspzyz.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Update invoice status to paid
            const { data: invoiceRows } = await supabase
                .from('hw_invoices')
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                })
                .eq('stripe_invoice_id', stripeInvoiceId)
                .select('job_id');

            // Update job status to paid
            if (invoiceRows && invoiceRows.length > 0) {
                await supabase
                    .from('hw_jobs')
                    .update({ status: 'paid' })
                    .eq('id', invoiceRows[0].job_id);
            }

            console.log(`Invoice ${stripeInvoiceId} marked as paid`);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error('stripe-webhook error:', err);
        res.status(500).json({ error: err.message });
    }
};
