(function() {
  'use strict';

  const loginPanel = document.getElementById('loginPanel');
  const responsesPanel = document.getElementById('responsesPanel');
  const loginForm = document.getElementById('adminLoginForm');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');
  const loginMessage = document.getElementById('loginMessage');
  const adminMessage = document.getElementById('adminMessage');
  const tableBody = document.getElementById('responsesTableBody');
  const searchInput = document.getElementById('searchResponses');
  const refreshBtn = document.getElementById('refreshResponsesBtn');
  const exportBtn = document.getElementById('exportCsvBtn');
  const logoutBtn = document.getElementById('logoutAdminBtn');
  const totalResponses = document.getElementById('totalResponses');

  let responses = [];
  let filteredResponses = [];

  function showMessage(element, type, text) {
    element.className = `rounded p-3 text-sm ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`;
    element.textContent = text;
    element.classList.remove('hidden');
  }

  function hideMessage(element) {
    element.classList.add('hidden');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  function asList(value) {
    return Array.isArray(value) ? value : [];
  }

  async function loadResponses() {
    hideMessage(adminMessage);
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">טוען תשובות...</td></tr>';

    if (!window.supabaseClient) {
      throw new Error('החיבור ל-Supabase לא נטען. נסה לרענן את העמוד.');
    }

    const { data, error } = await window.supabaseClient
      .from('broadcaster_feedback')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Feedback RPC error:', error);
      throw new Error(error.message || 'טעינת התשובות נכשלה');
    }

    responses = data || [];
    applyFilter();
  }

  function renderTable() {
    totalResponses.textContent = String(responses.length);

    if (!filteredResponses.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">אין תשובות להצגה.</td></tr>';
      return;
    }

    tableBody.innerHTML = filteredResponses.map(row => `
      <tr>
        <td>${escapeHtml(formatDate(row.submitted_at))}</td>
        <td class="font-semibold">${escapeHtml(row.full_name)}</td>
        <td>${escapeHtml(row.frequency)}</td>
        <td>${escapeHtml(row.help_rating)}</td>
        <td>${escapeHtml(asList(row.used_sections).join(', '))}</td>
        <td class="whitespace-normal min-w-[260px]">${escapeHtml(row.most_useful)}</td>
        <td class="whitespace-normal min-w-[260px]">${escapeHtml(row.blockers)}</td>
        <td class="whitespace-normal min-w-[320px]">${escapeHtml(row.ideas)}</td>
      </tr>
    `).join('');
  }

  function applyFilter() {
    const query = (searchInput.value || '').trim().toLowerCase();
    filteredResponses = responses.filter(row => {
      if (!query) return true;
      return [
        row.full_name,
        row.frequency,
        row.most_useful,
        row.blockers,
        row.ideas,
        asList(row.used_sections).join(' ')
      ].join(' ').toLowerCase().includes(query);
    });
    renderTable();
  }

  function csvEscape(value) {
    const cell = String(value || '');
    const safeCell = /^[=+\-@]/.test(cell.trimStart()) ? `'${cell}` : cell;
    return `"${safeCell.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const headers = [
      'תאריך',
      'שם מלא',
      'תדירות שימוש',
      'דירוג עזרה',
      'חלקים בשימוש',
      'הכי שימושי',
      'מה האט',
      'רעיונות נוספים'
    ];

    const rows = filteredResponses.map(row => [
      formatDate(row.submitted_at),
      row.full_name,
      row.frequency,
      row.help_rating,
      asList(row.used_sections).join('; '),
      row.most_useful,
      row.blockers,
      row.ideas
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(csvEscape).join(','))
      .join('\r\n');

    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `משוב-שדרים-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage(loginMessage);

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      showMessage(loginMessage, 'error', 'נא להזין דוא״ל וסיסמה.');
      return;
    }

    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      if (error || data?.user?.app_metadata?.role !== 'admin') {
        if (data?.session) await window.supabaseClient.auth.signOut();
        throw new Error('ההתחברות נכשלה או שלמשתמש אין הרשאת מנהל');
      }
      await loadResponses();
      loginPanel.classList.add('hidden');
      responsesPanel.classList.remove('hidden');
    } catch (error) {
      console.error(error);
      showMessage(loginMessage, 'error', error.message);
    }
  });

  refreshBtn.addEventListener('click', async () => {
    try {
      await loadResponses();
      showMessage(adminMessage, 'success', 'התשובות עודכנו.');
    } catch (error) {
      console.error(error);
      showMessage(adminMessage, 'error', error.message);
    }
  });

  searchInput.addEventListener('input', applyFilter);
  exportBtn.addEventListener('click', exportCsv);
  logoutBtn.addEventListener('click', async () => {
    await window.supabaseClient?.auth.signOut();
    responsesPanel.classList.add('hidden');
    loginPanel.classList.remove('hidden');
    passwordInput.value = '';
  });

  async function restoreAdminSession() {
    if (!window.supabaseClient) return;
    const { data, error } = await window.supabaseClient.auth.getUser();
    if (!error && data?.user?.app_metadata?.role === 'admin') {
      await loadResponses();
      loginPanel.classList.add('hidden');
      responsesPanel.classList.remove('hidden');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      restoreAdminSession().catch(error => console.error('Session restore failed:', error));
    });
  } else {
    restoreAdminSession().catch(error => console.error('Session restore failed:', error));
  }
})();
