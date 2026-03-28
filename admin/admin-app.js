// ==================== H&W Admin - Shared Application Module ====================

const HW_SUPABASE_URL = 'https://mxxabikquupnwvlspzyz.supabase.co';
const HW_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eGFiaWtxdXVwbnd2bHNwenl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDMwNTgsImV4cCI6MjA3NzIxOTA1OH0.WC_mupqYMneJnYmr9vmDZd0vXroBnaLwZlYX44J_HFQ';

let supabase;

function initSupabase() {
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
        { id: 'dashboard', label: 'Dashboard', href: '/admin/', icon: 'home' },
        { id: 'customers', label: 'Customers', href: '/admin/customers.html', icon: 'users' },
        { id: 'jobs', label: 'Jobs', href: '/admin/jobs.html', icon: 'briefcase' },
        { id: 'messages', label: 'Messages', href: '/admin/messages.html', icon: 'mail' },
    ];

    const icons = {
        home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
        mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    };

    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
        <ul class="admin-nav">
            ${pages.map(p => `
                <li>
                    <a href="${p.href}" class="${p.id === activePage ? 'active' : ''}">
                        ${icons[p.icon]}
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
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) &&
                !toggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
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
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== Utility Functions ====================
function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateInput(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
}

function daysBetween(dateStr) {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function statusBadge(status) {
    return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}

function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==================== Confirm Dialog ====================
function confirmAction(message) {
    return window.confirm(message);
}

// ==================== API Helper for Stripe Functions ====================
async function callApi(endpoint, body) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'API request failed');
    return result;
}

// ==================== Init Admin Page ====================
async function initAdminPage(pageName) {
    initSupabase();
    const session = await requireAuth();
    if (!session) return null;

    renderSidebar(pageName);

    // Setup logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Show email in topbar
    const userEl = document.getElementById('adminUser');
    if (userEl) userEl.textContent = session.user.email;

    return session;
}
