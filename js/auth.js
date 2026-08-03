// Supabase Auth module for administrator access.
(function() {
  'use strict';

  let isAuthenticatedState = false;
  const authCheckCallbacks = [];

  function getClient() {
    return window.supabaseClient || null;
  }

  function isAdminUser(user) {
    return user?.app_metadata?.role === 'admin';
  }

  function notifyAuthChange(isAuthenticated) {
    authCheckCallbacks.forEach(callback => {
      try {
        callback(isAuthenticated);
      } catch (error) {
        console.error('Error in auth callback:', error);
      }
    });
  }

  function isAuthenticated() {
    return isAuthenticatedState;
  }

  async function refreshAuthState() {
    const client = getClient();
    if (!client) {
      isAuthenticatedState = false;
      return false;
    }

    const { data, error } = await client.auth.getUser();
    isAuthenticatedState = !error && isAdminUser(data?.user);
    notifyAuthChange(isAuthenticatedState);
    return isAuthenticatedState;
  }

  async function login(email, password) {
    const client = getClient();
    if (!client || !email || !password) return false;

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !isAdminUser(data?.user)) {
      if (data?.session) await client.auth.signOut();
      isAuthenticatedState = false;
      return false;
    }

    isAuthenticatedState = true;
    notifyAuthChange(true);
    return true;
  }

  async function logout() {
    const client = getClient();
    if (client) await client.auth.signOut();
    isAuthenticatedState = false;
    notifyAuthChange(false);
  }

  async function getAccessToken() {
    const client = getClient();
    if (!client || !isAuthenticatedState) return null;
    const { data, error } = await client.auth.getSession();
    return error ? null : data?.session?.access_token || null;
  }

  function onAuthChange(callback) {
    if (typeof callback === 'function') authCheckCallbacks.push(callback);
  }

  function showLoginModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.getElementById('authEmail')?.focus(), 100);
  }

  function hideLoginModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) passwordInput.value = '';
    const errorElement = document.getElementById('authError');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.add('hidden');
    }
  }

  function updateUIForAuthState() {
    const isAdmin = isAuthenticatedState;
    const loginButton = document.getElementById('loginBtn');
    const logoutButton = document.getElementById('logoutBtn');
    if (loginButton) loginButton.style.display = isAdmin ? 'none' : 'inline-flex';
    if (logoutButton) logoutButton.style.display = isAdmin ? 'inline-flex' : 'none';

    ['ingest', 'manageTeams', 'managePlayers', 'transfers', 'tools'].forEach(tabName => {
      const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
      if (tabButton) tabButton.style.display = isAdmin ? 'inline-flex' : 'none';
    });

    const indicator = document.getElementById('authIndicator');
    if (indicator) indicator.style.display = isAdmin ? 'inline-flex' : 'none';
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { isAuthenticated: isAdmin }
    }));
  }

  async function handleLoginSubmit(event) {
    event?.preventDefault();
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const errorElement = document.getElementById('authError');
    const submitButton = document.getElementById('authSubmitBtn');
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';

    if (!email || !password) {
      if (errorElement) {
        errorElement.textContent = 'נא להזין דוא״ל וסיסמה';
        errorElement.classList.remove('hidden');
      }
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'מתחבר...';
    }

    const success = await login(email, password);
    if (success) {
      hideLoginModal();
      updateUIForAuthState();
      if (typeof window.showOk === 'function') window.showOk('התחברת בהצלחה');
    } else if (errorElement) {
      errorElement.textContent = 'ההתחברות נכשלה או שלמשתמש אין הרשאת מנהל';
      errorElement.classList.remove('hidden');
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'התחבר';
    }
  }

  async function initAuthUI() {
    await refreshAuthState();
    updateUIForAuthState();

    getClient()?.auth.onAuthStateChange((_event, session) => {
      isAuthenticatedState = isAdminUser(session?.user);
      notifyAuthChange(isAuthenticatedState);
      updateUIForAuthState();
    });

    document.getElementById('loginBtn')?.addEventListener('click', showLoginModal);
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await logout();
      updateUIForAuthState();
    });
    document.getElementById('closeAuthModal')?.addEventListener('click', hideLoginModal);
    document.getElementById('authLoginForm')?.addEventListener('submit', handleLoginSubmit);
  }

  window.authModule = {
    isAuthenticated,
    isAdminUser,
    refreshAuthState,
    login,
    logout,
    onAuthChange,
    updateUIForAuthState,
    initAuthUI,
    getAccessToken
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthUI);
  } else {
    initAuthUI();
  }
})();
