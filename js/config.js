// Configuration Module
// Manages app configuration and environment variables

(function() {
  'use strict';

  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const runtimeOverrides = window.IBBA_CONFIG || {};
  let selectionStorage;
  try { selectionStorage = window.localStorage; } catch (_) { /* storage may be disabled */ }
  const selectedSeason = window.IBBASeasons?.getSeason(
    window.IBBASeasons.resolveInitialSeason(window.location, selectionStorage));

  // Get configuration from environment or window object
  const config = {
    // Supabase configuration - fallback to hardcoded values for production
    supabaseUrl: window.SUPABASE_URL || 'https://ruzfbkxiqusfbiyxyegb.supabase.co',
    supabaseKey: window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1emZia3hpcXVzZmJpeXh5ZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTkyNDEsImV4cCI6MjA3ODY5NTI0MX0.UjzpGJ9Xx_T-74FBamNF9T7pQWyEFgcSYf_TkQs3E38',
    
    // App configuration
    appName: 'Basketball Stats Manager',
    version: '1.0.0',
    
    // Environment detection
    isProduction: !isDevelopment,
    isDevelopment,

    // League configuration. Override window.IBBA_CONFIG before loading this file
    // when a new season starts; consumers should not hard-code these values.
    seasonKey: selectedSeason?.key || '2025-26',
    seasonLabel: selectedSeason?.label || '2025/26',
    leagueId: selectedSeason?.leagueId || Number(runtimeOverrides.leagueId || 119474),
    seasonId: selectedSeason?.seasonId || Number(runtimeOverrides.seasonId || 119472),
    playersPageUrl: selectedSeason?.playersPageUrl || runtimeOverrides.playersPageUrl || 'https://ibasketball.co.il/league/2025-2/',
    seasonMonths: selectedSeason?.seasonMonths || runtimeOverrides.seasonMonths || [
      '2025-10', '2025-11', '2025-12',
      '2026-01', '2026-02', '2026-03',
      '2026-04', '2026-05', '2026-06'
    ],
    ibbaProxyUrl: runtimeOverrides.proxyUrl || '/api/ibba',
    
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
      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
          persistSession: false,
          detectSessionInUrl: false
        }
      });
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
    SUPABASE_ANON_KEY: config.supabaseKey
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
