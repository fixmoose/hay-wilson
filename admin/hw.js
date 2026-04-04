// ==================== H&W Admin - Shared Module ====================
const HW_SUPABASE_URL = 'https://mxxabikquupnwvlspzyz.supabase.co';
const HW_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eGFiaWtxdXVwbnd2bHNwenl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDMwNTgsImV4cCI6MjA3NzIxOTA1OH0.WC_mupqYMneJnYmr9vmDZd0vXroBnaLwZlYX44J_HFQ';

let supabase;

function initSupabase() {
    if (!window.supabase) {
        throw new Error('Supabase CDN failed to load. Check your internet connection.');
    }
    supabase = window.supabase.createClient(HW_SUPABASE_URL, HW_SUPABASE_ANON_KEY);
    return supabase;
}

// ==================== Auth Guard ====================
async function requireAuth() {
    if (!supabase) initSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/admin/login.html';
        return null;
    }
    return session;
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login.html';
}

// ==================== Sidebar Navigation ====================
function renderSidebar(activePage) {
    const pages = [
        { id: 'dashboard', label: 'Dashboard', href: '/admin/', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
        { id: 'jobs', label: 'Jobs', href: '/admin/jobs.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
        { id: 'clients', label: 'Clients', href: '/admin/clients.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' },
        { id: 'customers', label: 'Clients', href: '/admin/clients.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' },
        { id: 'invoices', label: 'Invoices', href: '/admin/invoices.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
        { id: 'documents', label: 'Documents', href: '/admin/documents.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' },
        { id: 'receipts', label: 'Receipts', href: '/admin/receipts.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>' },
        { id: 'accounting', label: 'Accounting', href: '/admin/accounting.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
        { id: 'payment-methods', label: 'Payment Methods', href: '/admin/payment-methods.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' },
        { id: 'messages', label: 'Messages', href: '/admin/messages.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' },
    ];

    // 'customers' is an alias for 'clients' — filter duplicates
    const seen = new Set();
    const filtered = pages.filter(p => {
        if (p.id === activePage) { seen.add(p.label); return true; }
        if (seen.has(p.label)) return false;
        seen.add(p.label);
        return true;
    });

    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
        <ul class="admin-nav">
            ${filtered.map(p => `
                <li>
                    <a href="${p.href}" class="${p.id === activePage ? 'active' : ''}">
                        ${p.icon}
                        ${p.label}
                    </a>
                </li>
            `).join('')}
            <li><div class="nav-divider"></div></li>
            <li>
                <a href="/" target="_blank">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    View Site
                </a>
            </li>
        </ul>
    `;

    // Mobile sidebar toggle
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
        toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target))
                sidebar.classList.remove('open');
        });
    }
}

// ==================== Toast Notifications ====================
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== Utility Functions ====================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatCurrency(amount) {
    return '$' + (parseFloat(amount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function confirmAction(message) {
    return window.confirm(message);
}

// ==================== API Helper for Stripe Functions ====================
async function callApi(endpoint, body) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    let response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(body)
        });
    } catch (err) {
        throw new Error('Network error - check your connection');
    }

    let result;
    try {
        result = await response.json();
    } catch (err) {
        throw new Error('Server error (' + response.status + ')');
    }

    if (!response.ok) throw new Error(result.error || 'API request failed');
    return result;
}

// ==================== Init Admin Page ====================
async function initAdminPage(pageName) {
    initSupabase();
    const session = await requireAuth();
    if (!session) return null;

    renderSidebar(pageName);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const userEl = document.getElementById('adminUser');
    if (userEl) userEl.textContent = session.user.email;

    return session;
}
