# Supabase Setup Instructions for Hay & Wilson Contact Form

This guide will help you set up the Supabase backend for your Hay & Wilson website contact form using your existing FixMoose project.

## Step 1: Log into Your Existing Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Log in with the same account you use for FixMoose
3. Select your **FixMoose project** (the one you're already using)

## Step 2: Create the HW Contact Messages Table

1. In your Supabase project dashboard, click on the **SQL Editor** in the left sidebar
2. Click "New Query"
3. Copy and paste this SQL code:

```sql
-- Create the contact messages table for Hay & Wilson
CREATE TABLE hw_contact_messages (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    service TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Add an index for faster queries
CREATE INDEX idx_hw_messages_created_at ON hw_contact_messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE hw_contact_messages ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anonymous inserts (for the contact form)
CREATE POLICY "Allow anonymous inserts" ON hw_contact_messages
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Create a policy that allows authenticated users to read (for you to view messages)
CREATE POLICY "Allow authenticated reads" ON hw_contact_messages
    FOR SELECT
    TO authenticated
    USING (true);
```

4. Click "Run" or press `Ctrl+Enter` / `Cmd+Enter`
5. You should see "Success. No rows returned" - this means the table was created!

## Step 3: Get Your API Credentials (from FixMoose Project)

1. In the left sidebar, click on **Project Settings** (gear icon at bottom)
2. Click on **API** in the settings menu
3. You'll see the same credentials you use for FixMoose:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

## Step 4: Update Your Website Configuration

1. Open the file `supabase-config.js` in your website folder
2. Replace the placeholder values with your **FixMoose project credentials**:

```javascript
const HW_SUPABASE_CONFIG = {
    url: 'https://your-project-id.supabase.co', // Same URL as FixMoose
    anonKey: 'eyJhbGc...'  // Same anon key as FixMoose
};
```

3. Save the file

**Note**: You're using the same Supabase project for both FixMoose and Hay & Wilson - the tables are separated by the HW prefix.

## Step 5: Test Your Contact Form

1. Upload all files to your website server:
   - `index.html` (updated)
   - `script.js` (updated)
   - `supabase-config.js` (with your credentials)
2. Visit your website and test the contact form
3. Submit a test message

## Step 6: Set Up Email Notifications (Get Notified of New Messages)

To receive an email whenever someone submits the contact form, you'll use Supabase Database Webhooks with a free email service.

### Option A: Use Supabase Edge Function with Resend (Recommended)

1. **Sign up for Resend** (free tier: 100 emails/day)
   - Go to [resend.com](https://resend.com)
   - Sign up for free account
   - Get your API key from the dashboard

2. **Create Edge Function in Supabase**
   - In your Supabase dashboard, go to **Edge Functions**
   - Click "Create a new function"
   - Name it `notify-hw-message`
   - Paste this code:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = 'YOUR_RESEND_API_KEY'

serve(async (req) => {
  const { record } = await req.json()

  // Send email via Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'notifications@yourdomain.com',
      to: 'info@haywilson.com',
      subject: `New Contact Form: ${record.name}`,
      html: `
        <h2>New Contact Form Submission - Hay & Wilson</h2>
        <p><strong>Name:</strong> ${record.name}</p>
        <p><strong>Email:</strong> ${record.email}</p>
        <p><strong>Phone:</strong> ${record.phone || 'Not provided'}</p>
        <p><strong>Service:</strong> ${record.service || 'Not specified'}</p>
        <p><strong>Message:</strong></p>
        <p>${record.message}</p>
        <hr>
        <p><small>Submitted at: ${record.created_at}</small></p>
      `
    })
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

3. **Deploy the function**

4. **Create Database Trigger**
   - Go to **Database** → **Triggers** in Supabase
   - Click "Create a new trigger"
   - Configure:
     - Name: `notify_hw_message`
     - Table: `hw_contact_messages`
     - Events: `Insert`
     - Type: `after`
     - Function: Select your `notify-hw-message` edge function

### Option B: Use Make.com - Easiest, No Code (RECOMMENDED)

1. **Sign up for Make.com** (free tier: 1,000 operations/month)
   - Go to [make.com](https://make.com)
   - Create free account

2. **Create a new scenario**
   - Click "Scenarios" in the left sidebar
   - Click "Create a new scenario"
   - Click the big **"+"** button in the center

3. **Add Supabase module**
   - Search for **"Supabase"**
   - Select **"Search Records"** (NOT "Watch Events" - that only catches NEW events)
   - Click "Create a connection"
   - Enter your Supabase credentials:
     - **Supabase URL**: `https://mxxabikquupnwvlspzyz.supabase.co`
     - **Supabase Key**: Your anon key from supabase-config.js
   - Click "Save"
   - Configure the module:
     - **Table**: Select `hw_contact_messages`
     - **Maximum number of returned records**: 10
     - Leave other fields as default
   - Click "OK"

4. **Test the Supabase module**
   - IMPORTANT: Before continuing, add a test message in your Supabase table so Make.com has data to work with
   - Right-click the Supabase module
   - Click "Run this module only"
   - You should see your test data appear - this confirms it's working!

5. **Add Email module**
   - Hover over the **RIGHT edge** of the Supabase module
   - Click the small **"+"** button that appears
   - Search for **"Email"**
   - Select **"Send an Email"**
   - Configure:
     - **To**: `info@haywilson.com`
     - **Subject**: Type `New Contact from Hay & Wilson: ` then click in the field and select `1. name` from the Supabase data
     - **Content** (click the three dots to switch to HTML mode if needed):
     ```
     New contact form submission from Hay & Wilson Electric:

     Name: [click and select: 1. name]
     Email: [click and select: 1. email]
     Phone: [click and select: 1. phone]
     Service Interested In: [click and select: 1. service]

     Message:
     [click and select: 1. message]

     ---
     Submitted: [click and select: 1. created_at]
     ```
   - Click "OK"

6. **Set up scheduling**
   - Click the **clock icon** at the bottom of the first module (Supabase Search Records)
   - Choose how often to check: **Every 15 minutes** (recommended for free tier)
   - Click "OK"

7. **Save and activate**
   - Click "Save" (bottom left)
   - Give it a name like "HW Contact Form Notifications"
   - Toggle the switch to **ON** (bottom left)

**That's it!** Now every 15 minutes, Make.com will:
- Check your Supabase table for new messages
- Send you an email for each new message

**Note**: The customer gets an in-browser alert when they submit (no email to them). If you want to send customers a confirmation email too, we can set that up as a second scenario.

### Option C: Simple Email via Supabase Postgres Function (Free, Built-in)

The easiest option is to use Supabase's built-in email functionality:

1. **Go to SQL Editor** in Supabase
2. **Run this SQL**:

```sql
-- Create a function to notify on new messages
CREATE OR REPLACE FUNCTION notify_hw_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://api.mailgun.net/v3/YOUR_DOMAIN/messages',
    headers := jsonb_build_object(
      'Authorization', 'Basic ' || encode('api:YOUR_MAILGUN_API_KEY'::bytea, 'base64')
    ),
    body := jsonb_build_object(
      'from', 'notifications@haywilson.com',
      'to', 'info@haywilson.com',
      'subject', 'New Contact: ' || NEW.name,
      'text', 'Name: ' || NEW.name || E'\nEmail: ' || NEW.email || E'\nPhone: ' || COALESCE(NEW.phone, 'Not provided') || E'\nService: ' || COALESCE(NEW.service, 'Not specified') || E'\nMessage: ' || NEW.message
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_hw_message_insert
  AFTER INSERT ON hw_contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_hw_message();
```

**Note**: You'll need a Mailgun account (free tier: 5,000 emails/month)

## Step 7: View Submitted Messages

You can always view all messages in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Click on **Table Editor** in the left sidebar
3. Select the `hw_contact_messages` table
4. You'll see all submitted messages in a spreadsheet-like view
5. You can export them as CSV if needed

## Important Security Notes

✅ **Safe to commit**: The `anonKey` is safe to expose in your public website code
✅ **Protected by RLS**: Row Level Security policies ensure that:
   - Anyone can submit messages (insert only)
   - Only authenticated Supabase users (you) can read messages

❌ **Never expose**: Don't expose your `service_role` key (it has admin access)

## Cost & Efficiency

Since you're using your existing FixMoose Supabase project:
- ✅ **No additional charges** - all tables share the same project
- ✅ **No separate project needed** - keeps everything organized in one place
- ✅ **HW prefix keeps data separated** - `hw_contact_messages` won't conflict with FixMoose or AB tables
- ✅ **Same credentials** - use your existing FixMoose project URL and anon key

## Troubleshooting

### Form not submitting?
1. Check browser console (F12) for errors
2. Verify your credentials in `supabase-config.js`
3. Make sure all files are uploaded to your server

### Can't see messages?
1. Make sure you ran the SQL to create the table
2. Check the Table Editor in Supabase dashboard
3. Verify the table name is `hw_contact_messages`

### Still having issues?
Check the browser console for specific error messages and verify:
- Supabase JS library is loading (check Network tab)
- Your project URL and anon key are correct
- The table was created successfully

## Next Steps (Optional Enhancements)

Want to take it further? Here are some ideas:

1. **Email Notifications**: Set up email notifications when new messages arrive
2. **Admin Dashboard**: Create a simple dashboard to manage messages
3. **Auto-response**: Send automatic confirmation emails to customers
4. **Spam Protection**: Add reCAPTCHA or honeypot fields

Let me know if you'd like help implementing any of these!

---

**Questions?** Feel free to reach out if you need help with any step of the setup process.
