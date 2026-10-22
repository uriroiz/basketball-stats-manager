/**
 * Basketball Stats Manager - Version Management System
 * Handles version display and build number management
 */

class VersionManager {
    constructor() {
        this.version = {
            major: 2,
            minor: 3,
            patch: 8,
            build: this.generateBuildNumber()
        };
        
        this.init();
    }

    /**
     * Generate build number based on current date and time
     * Format: YYYYMMDD.HHMM
     */
    generateBuildNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        
        return `${year}${month}${day}.${hour}${minute}`;
    }

    /**
     * Stable release version; build time remains diagnostic metadata.
     */
    getVersionString() {
        return `v${this.version.major}.${this.version.minor}.${this.version.patch}`;
    }

    /**
     * Update version display in the UI
     */
    updateVersionDisplay() {
        const versionElement = document.querySelector('.version-display');
        if (versionElement) {
            versionElement.textContent = this.getVersionString();
        }
    }

    /**
     * Increment version number
     * @param {string} type - 'major', 'minor', or 'patch'
     */
    incrementVersion(type) {
        switch (type) {
            case 'major':
                this.version.major++;
                this.version.minor = 0;
                this.version.patch = 0;
                break;
            case 'minor':
                this.version.minor++;
                this.version.patch = 0;
                break;
            case 'patch':
                this.version.patch++;
                break;
            default:
                console.warn('Invalid version increment type:', type);
                return;
        }
        
        // Generate new build number
        this.version.build = this.generateBuildNumber();
        
        // Update display
        this.updateVersionDisplay();
        
        // Log version change
        console.log(`Version updated to: ${this.getVersionString()}`);
    }

    /**
     * Get version info for debugging
     */
    getVersionInfo() {
        return {
            version: this.getVersionString(),
            build: this.version.build,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
    }

    /**
     * Initialize version manager
     */
    init() {
        // Update version display on page load
        this.updateVersionDisplay();
        
        // Add version info to console
        console.log('🏀 Basketball Stats Manager');
        console.log(`📦 Version: ${this.getVersionString()}`);
        console.log(`🕒 Build: ${this.version.build}`);
        console.log('🚀 Ready to manage basketball stats!');
        
        // Expose version manager globally for debugging
        window.versionManager = this;
    }
}

// Initialize version manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VersionManager();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VersionManager;
}

