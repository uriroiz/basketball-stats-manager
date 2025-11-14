// Authentication Module
// Simple password-based authentication for admin access

(function() {
  'use strict';

  // Constants
  const AUTH_STORAGE_KEY = 'basketballStatsAuth';
  const AUTH_EXPIRY_HOURS = 24; // Session expires after 24 hours
  
  // State
  let isAuthenticatedState = false;
  let authCheckCallbacks = [];

  /**
   * Check if user is currently authenticated
   */
  function isAuthenticated() {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authData) {
      isAuthenticatedState = false;
      return false;
    }

    try {
      const { timestamp, authenticated } = JSON.parse(authData);
      const now = Date.now();
      const expiryMs = AUTH_EXPIRY_HOURS * 60 * 60 * 1000;

      // Check if session expired
      if (now - timestamp > expiryMs) {
        logout();
        return false;
      }

      isAuthenticatedState = authenticated === true;
      return isAuthenticatedState;
    } catch (e) {
      console.error('Error reading auth state:', e);
      logout();
      return false;
    }
  }

  /**
   * Attempt to login with password
   * @param {string} password - The password to check
   * @returns {Promise<boolean>} - True if login successful
   */
  async function login(password) {
    if (!password) {
      return false;
    }

    try {
      // Simple password check
      // In production, this should call Supabase auth or check against environment variable
      const correctPassword = window.ADMIN_PASSWORD || 'admin123'; // Default fallback
      
      if (password === correctPassword) {
        const authData = {
          authenticated: true,
          timestamp: Date.now()
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        isAuthenticatedState = true;
        
        // Notify listeners
        notifyAuthChange(true);
        
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  }

  /**
   * Logout current user
   */
  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    isAuthenticatedState = false;
    
    // Notify listeners
    notifyAuthChange(false);
  }

  /**
   * Register callback for auth state changes
   * @param {Function} callback - Function to call when auth state changes
   */
  function onAuthChange(callback) {
    if (typeof callback === 'function') {
      authCheckCallbacks.push(callback);
    }
  }

  /**
   * Notify all registered callbacks of auth state change
   * @param {boolean} isAuth - Current auth state
   */
  function notifyAuthChange(isAuth) {
    authCheckCallbacks.forEach(callback => {
      try {
        callback(isAuth);
      } catch (e) {
        console.error('Error in auth callback:', e);
      }
    });
  }

  /**
   * Show login modal
   */
  function showLoginModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      
      // Focus on password input
      const passwordInput = document.getElementById('authPassword');
      if (passwordInput) {
        setTimeout(() => passwordInput.focus(), 100);
      }
    }
  }

  /**
   * Hide login modal
   */
  function hideLoginModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      
      // Clear password input
      const passwordInput = document.getElementById('authPassword');
      if (passwordInput) {
        passwordInput.value = '';
      }
      
      // Clear error message
      const errorMsg = document.getElementById('authError');
      if (errorMsg) {
        errorMsg.textContent = '';
        errorMsg.classList.add('hidden');
      }
    }
  }

  /**
   * Handle login form submission
   */
  async function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    
    const passwordInput = document.getElementById('authPassword');
    const errorMsg = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');
    
    if (!passwordInput) return;
    
    const password = passwordInput.value.trim();
    
    if (!password) {
      if (errorMsg) {
        errorMsg.textContent = 'נא להזין סיסמה';
        errorMsg.classList.remove('hidden');
      }
      return;
    }

    // Disable submit button during login
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'מתחבר...';
    }

    const success = await login(password);
    
    if (success) {
      hideLoginModal();
      updateUIForAuthState();
      
      // Show success message
      if (typeof showOk === 'function') {
        showOk('התחברת בהצלחה! כעת יש לך גישה לכל הכלים.');
      }
    } else {
      if (errorMsg) {
        errorMsg.textContent = 'סיסמה שגויה';
        errorMsg.classList.remove('hidden');
      }
      passwordInput.value = '';
      passwordInput.focus();
    }

    // Re-enable submit button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'התחבר';
    }
  }

  /**
   * Handle logout
   */
  function handleLogout() {
    if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
      logout();
      updateUIForAuthState();
      
      // Redirect to public tab if on private tab
      const currentTab = document.querySelector('#tabs .tab.active');
      if (currentTab) {
        const tabName = currentTab.dataset.tab;
        const privateTabs = ['ingest', 'manageTeams', 'managePlayers', 'transfers', 'tools'];
        if (privateTabs.includes(tabName)) {
          // Switch to games tab
          const gamesTab = document.querySelector('[data-tab="games"]');
          if (gamesTab) gamesTab.click();
        }
      }
      
      if (typeof showOk === 'function') {
        showOk('התנתקת בהצלחה');
      }
    }
  }

  /**
   * Update UI based on current auth state
   */
  function updateUIForAuthState() {
    const isAuth = isAuthenticated();
    
    // Update login/logout buttons
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) {
      loginBtn.style.display = isAuth ? 'none' : 'inline-flex';
    }
    
    if (logoutBtn) {
      logoutBtn.style.display = isAuth ? 'inline-flex' : 'none';
    }

    // Show/hide admin tabs
    const privateTabs = ['ingest', 'manageTeams', 'managePlayers', 'transfers', 'tools'];
    privateTabs.forEach(tabName => {
      const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
      if (tabBtn) {
        tabBtn.style.display = isAuth ? 'inline-flex' : 'none';
      }
    });

    // Show auth indicator
    const authIndicator = document.getElementById('authIndicator');
    if (authIndicator) {
      authIndicator.style.display = isAuth ? 'inline-flex' : 'none';
    }
    
    // Refresh games table to show/hide admin buttons (reload, delete)
    const currentView = document.querySelector('#view-games');
    if (currentView && !currentView.classList.contains('hidden')) {
      // Games table is visible, refresh it
      if (typeof window.App !== 'undefined' && typeof window.App.renderGamesTable === 'function') {
        window.App.renderGamesTable();
      }
    }
  }

  /**
   * Initialize authentication UI
   */
  function initAuthUI() {
    // Check initial auth state
    updateUIForAuthState();

    // Wire up login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', showLoginModal);
    }

    // Wire up logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // Wire up modal close button
    const closeModalBtn = document.getElementById('closeAuthModal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', hideLoginModal);
    }

    // Wire up form submission
    const loginForm = document.getElementById('authLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Close modal on background click
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          hideLoginModal();
        }
      });
    }

    // Handle Enter key in password field
    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleLoginSubmit(e);
        }
      });
    }
  }

  // Export functions to global scope
  window.authModule = {
    isAuthenticated,
    login,
    logout,
    onAuthChange,
    updateUIForAuthState,
    initAuthUI
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthUI);
  } else {
    initAuthUI();
  }

})();

