// Configuration Module
// Manages app configuration and environment variables

(function() {
  'use strict';

  // Get configuration from environment or window object
  const config = {
    // Supabase configuration - fallback to hardcoded values for production
    supabaseUrl: window.SUPABASE_URL || 'https://ruzfbkxiqusfbiyxyegb.supabase.co',
    supabaseKey: window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1emZia3hpcXVzZmJpeXh5ZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTkyNDEsImV4cCI6MjA3ODY5NTI0MX0.UjzpGJ9Xx_T-74FBamNF9T7pQWyEFgcSYf_TkQs3E38',
    
    // Service Role Key - ONLY for admin operations (keep secret!)
    // Leave empty if you want to use the simple policy approach
    supabaseServiceRoleKey: window.SUPABASE_SERVICE_ROLE_KEY || '',
    
    // Admin configuration
    adminPassword: window.ADMIN_PASSWORD || 'UriPixellot1982!', // Default fallback
    
    // App configuration
    appName: 'Basketball Stats Manager',
    version: '1.0.0',
    
    // Environment detection
    isProduction: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // Features
    useSupabase: false, // Will be set to true if Supabase is configured
    useIndexedDB: true, // Fallback
  };

  // Check if Supabase is configured
  if (config.supabaseUrl && config.supabaseKey) {
    config.useSupabase = true;
    console.log('✅ Supabase configuration detected');
  } else {
    console.log('ℹ️ Supabase not configured - using local IndexedDB');
  }

  // Validate configuration
  function validateConfig() {
    const warnings = [];
    
    if (!config.supabaseUrl && config.isProduction) {
      warnings.push('⚠️ Production mode without Supabase URL');
    }
    
    if (!config.supabaseKey && config.isProduction) {
      warnings.push('⚠️ Production mode without Supabase key');
    }
    
    if (config.adminPassword === 'admin123' && config.isProduction) {
      warnings.push('⚠️ Using default admin password in production!');
    }
    
    warnings.forEach(warning => console.warn(warning));
    
    return warnings.length === 0;
  }

  // Initialize Supabase if configured
  function initSupabase() {
    if (!config.useSupabase) {
      return null;
    }
    
    if (!window.supabase || !window.supabase.createClient) {
      console.error('❌ Supabase library not loaded');
      config.useSupabase = false;
      return null;
    }
    
    try {
      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      console.log('✅ Supabase client initialized');
      return client;
    } catch (error) {
      console.error('❌ Error initializing Supabase:', error);
      config.useSupabase = false;
      return null;
    }
  }

  // Export configuration
  window.appConfig = config;
  window.supabaseConfig = {
    url: config.supabaseUrl,
    key: config.supabaseKey
  };
  
  // Export as window.CONFIG for compatibility with db_adapter
  window.CONFIG = {
    SUPABASE_URL: config.supabaseUrl,
    SUPABASE_ANON_KEY: config.supabaseKey,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    ADMIN_PASSWORD: config.adminPassword
  };
  
  // Validate on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      validateConfig();
      
      // Try to initialize Supabase
      if (config.useSupabase) {
        const client = initSupabase();
        if (client) {
          window.supabaseClient = client;
        }
      }
    });
  } else {
    validateConfig();
    
    // Try to initialize Supabase
    if (config.useSupabase) {
      const client = initSupabase();
      if (client) {
        window.supabaseClient = client;
      }
    }
  }

  console.log('⚙️ Config loaded:', {
    environment: config.isProduction ? 'production' : 'development',
    supabase: config.useSupabase ? 'enabled' : 'disabled',
    indexedDB: config.useIndexedDB ? 'fallback' : 'disabled'
  });

})();

