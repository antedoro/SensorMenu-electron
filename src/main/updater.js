const https = require('https');
const { dialog } = require('electron');
const { shell } = require('electron');
const settings = require('electron-settings');

class UpdateChecker {
  constructor() {
    this.currentVersion = require('../../package.json').version;
    this.githubRepo = 'antedoro/SensorMenu-electron';
    this.apiUrl = `https://api.github.com/repos/${this.githubRepo}/releases/latest`;
    this.releasesUrl = `https://github.com/${this.githubRepo}/releases`;
    this.checkInterval = null;
  }

  /**
   * Compare two semantic versions
   * @param {string} current - Current version (e.g., "1.0.0")
   * @param {string} latest - Latest version (e.g., "1.1.0")
   * @returns {boolean} - True if latest is newer than current
   */
  isNewerVersion(current, latest) {
    const currentParts = current.replace(/^v/, '').split('.').map(Number);
    const latestParts = latest.replace(/^v/, '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    return false;
  }

  /**
   * Fetch latest release information from GitHub
   * @returns {Promise<Object>} - Release information or null if error
   */
  async fetchLatestRelease() {
    return new Promise((resolve) => {
      const request = https.get(this.apiUrl, {
        headers: {
          'User-Agent': 'SensorMenu-Electron-App'
        }
      }, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode === 200) {
              const releaseInfo = JSON.parse(data);
              resolve({
                success: true,
                version: releaseInfo.tag_name,
                name: releaseInfo.name,
                publishedAt: releaseInfo.published_at,
                htmlUrl: releaseInfo.html_url,
                body: releaseInfo.body
              });
            } else {
              console.error('GitHub API error:', response.statusCode);
              resolve({ success: false, error: `HTTP ${response.statusCode}` });
            }
          } catch (error) {
            console.error('Error parsing GitHub response:', error);
            resolve({ success: false, error: 'Invalid response format' });
          }
        });
      });
      
      request.on('error', (error) => {
        console.error('Network error checking for updates:', error);
        resolve({ success: false, error: 'Network error' });
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });
    });
  }

  /**
   * Check for updates and return result
   * @param {boolean} silent - If true, don't show dialogs for "no updates"
   * @returns {Promise<Object>} - Update check result
   */
  async checkForUpdates(silent = false) {
    console.log('Checking for updates...');
    
    const releaseInfo = await this.fetchLatestRelease();
    
    if (!releaseInfo.success) {
      if (!silent) {
        dialog.showMessageBox({
          type: 'error',
          title: 'Update Check Failed',
          message: 'Unable to check for updates',
          detail: `Error: ${releaseInfo.error}\n\nPlease check your internet connection and try again.`,
          buttons: ['OK']
        });
      }
      return { success: false, error: releaseInfo.error };
    }

    const hasUpdate = this.isNewerVersion(this.currentVersion, releaseInfo.version);
    
    // Update last check timestamp
    await settings.set('app.lastUpdateCheck', new Date().toISOString());
    
    if (hasUpdate) {
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version of SensorMenu is available!`,
        detail: `Current version: ${this.currentVersion}\nLatest version: ${releaseInfo.version}\n\nWould you like to download the update?`,
        buttons: ['Download Update', 'View Release Notes', 'Later'],
        defaultId: 0,
        cancelId: 2
      });
      
      if (result.response === 0) {
        // Download update - open releases page
        shell.openExternal(this.releasesUrl);
      } else if (result.response === 1) {
        // View release notes
        shell.openExternal(releaseInfo.htmlUrl);
      }
      
      return { 
        success: true, 
        hasUpdate: true, 
        currentVersion: this.currentVersion,
        latestVersion: releaseInfo.version,
        releaseInfo 
      };
    } else {
      if (!silent) {
        dialog.showMessageBox({
          type: 'info',
          title: 'No Updates Available',
          message: 'You are running the latest version of SensorMenu.',
          detail: `Current version: ${this.currentVersion}`,
          buttons: ['OK']
        });
      }
      
      return { 
        success: true, 
        hasUpdate: false, 
        currentVersion: this.currentVersion,
        latestVersion: releaseInfo.version 
      };
    }
  }

  /**
   * Start automatic update checking based on user settings
   */
  async startAutomaticChecks() {
    const appSettings = await settings.get('app');
    
    if (!appSettings.checkForUpdates || appSettings.updateFrequency === 'never') {
      this.stopAutomaticChecks();
      return;
    }
    
    // Clear existing interval
    this.stopAutomaticChecks();
    
    const frequency = appSettings.updateFrequency || 'weekly';
    let intervalMs;
    
    switch (frequency) {
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      default:
        return; // No automatic checks
    }
    
    // Check if we need to check now
    const lastCheck = appSettings.lastUpdateCheck;
    const now = new Date();
    
    if (!lastCheck || (now - new Date(lastCheck)) >= intervalMs) {
      // Perform initial check after a short delay
      setTimeout(() => this.checkForUpdates(true), 5000);
    }
    
    // Set up recurring checks
    this.checkInterval = setInterval(() => {
      this.checkForUpdates(true);
    }, intervalMs);
    
    console.log(`Automatic update checks started (${frequency})`);
  }

  /**
   * Stop automatic update checking
   */
  stopAutomaticChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Automatic update checks stopped');
    }
  }
}

module.exports = UpdateChecker;