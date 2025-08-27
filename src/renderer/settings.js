document.addEventListener('DOMContentLoaded', () => {
  const openAtLoginCheckbox = document.getElementById('openAtLogin');
  const checkForUpdatesCheckbox = document.getElementById('checkForUpdates');
  const updateFrequencySelect = document.getElementById('updateFrequency');
  const updateFrequencyContainer = document.getElementById('updateFrequencyContainer');
  const lastUpdateCheckDiv = document.getElementById('lastUpdateCheck');
  const checkNowButton = document.getElementById('checkNowButton');
  const showIconInMenubarCheckbox = document.getElementById('showIconInMenubar');
  const showTemperatureCheckbox = document.getElementById('showTemperature');
  const showHumidityCheckbox = document.getElementById('showHumidity');
  const mqttBrokerIpInput = document.getElementById('mqttBrokerIp');
  const mqttBrokerPortInput = document.getElementById('mqttBrokerPort');
  const mqttTopicInput = document.getElementById('mqttTopic');
  const connectionStatus = document.getElementById('connectionStatus');
  const restoreDefaultsButton = document.getElementById('restoreDefaults');

  // Function to update update frequency visibility
  function updateFrequencyVisibility() {
    if (checkForUpdatesCheckbox.checked) {
      updateFrequencyContainer.style.display = 'block';
    } else {
      updateFrequencyContainer.style.display = 'none';
    }
  }

  // Function to format last update check time
  function formatLastUpdateCheck(timestamp) {
    if (!timestamp) {
      return 'Last update check: Never';
    }
    const date = new Date(timestamp);
    return `Last update check: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  // Load settings
  window.electronAPI.send('get-settings');
  window.electronAPI.receive('settings-data', (settings) => {
    openAtLoginCheckbox.checked = settings.openAtLogin;
    checkForUpdatesCheckbox.checked = settings.checkForUpdates;
    updateFrequencySelect.value = settings.updateFrequency || 'weekly';
    showIconInMenubarCheckbox.checked = settings.showIconInMenubar;
    showTemperatureCheckbox.checked = settings.showTemperature;
    showHumidityCheckbox.checked = settings.showHumidity;
    mqttBrokerIpInput.value = settings.mqtt.brokerIp;
    mqttBrokerPortInput.value = settings.mqtt.brokerPort;
    mqttTopicInput.value = settings.mqtt.topic;
    
    updateFrequencyVisibility();
    lastUpdateCheckDiv.textContent = formatLastUpdateCheck(settings.lastUpdateCheck);
  });

  // Load last update check time
  window.electronAPI.getLastUpdateCheck().then(timestamp => {
    lastUpdateCheckDiv.textContent = formatLastUpdateCheck(timestamp);
  }).catch(error => {
    console.error('Error loading last update check:', error);
    lastUpdateCheckDiv.textContent = 'Last update check: Never';
  });

  // Listen for MQTT connection status updates
  window.electronAPI.receive('mqtt-connection-status', (isConnected) => {
    connectionStatus.textContent = isConnected ? '(connected)' : '(not connected)';
    connectionStatus.className = isConnected ? 'text-xs text-green-600' : 'text-xs text-red-600';
  });

  // Request initial connection status
  window.electronAPI.send('get-mqtt-status');

  // Save settings on change
  openAtLoginCheckbox.addEventListener('change', () => {
    window.electronAPI.send('set-setting', 'openAtLogin', openAtLoginCheckbox.checked);
  });
  checkForUpdatesCheckbox.addEventListener('change', () => {
    window.electronAPI.send('set-setting', 'checkForUpdates', checkForUpdatesCheckbox.checked);
    updateFrequencyVisibility();
  });
  updateFrequencySelect.addEventListener('change', () => {
    window.electronAPI.send('set-setting', 'updateFrequency', updateFrequencySelect.value);
  });
  showIconInMenubarCheckbox.addEventListener('change', () => {
    window.electronAPI.send('set-setting', 'showIconInMenubar', showIconInMenubarCheckbox.checked);
  });
  showTemperatureCheckbox.addEventListener('change', () => {
    window.electronAPI.send('set-setting', 'showTemperature', showTemperatureCheckbox.checked);
  });
  showHumidityCheckbox.addEventListener('change', () => {
    window.electronAPI.send('set-setting', 'showHumidity', showHumidityCheckbox.checked);
  });
  // MQTT settings - save and reconnect on change
  mqttBrokerIpInput.addEventListener('change', () => {
    window.electronAPI.send('set-mqtt-setting', 'brokerIp', mqttBrokerIpInput.value);
  });
  mqttBrokerIpInput.addEventListener('blur', () => {
    window.electronAPI.send('set-mqtt-setting', 'brokerIp', mqttBrokerIpInput.value);
  });
  
  mqttBrokerPortInput.addEventListener('change', () => {
    const port = parseInt(mqttBrokerPortInput.value);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      window.electronAPI.send('set-mqtt-setting', 'brokerPort', port);
    }
  });
  mqttBrokerPortInput.addEventListener('blur', () => {
    const port = parseInt(mqttBrokerPortInput.value);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      window.electronAPI.send('set-mqtt-setting', 'brokerPort', port);
    }
  });
  
  mqttTopicInput.addEventListener('change', () => {
    window.electronAPI.send('set-mqtt-setting', 'topic', mqttTopicInput.value);
  });
  mqttTopicInput.addEventListener('blur', () => {
    window.electronAPI.send('set-mqtt-setting', 'topic', mqttTopicInput.value);
  });

  restoreDefaultsButton.addEventListener('click', () => {
    window.electronAPI.send('restore-default-settings');
  });

  // Check for updates now button
  checkNowButton.addEventListener('click', async () => {
    checkNowButton.disabled = true;
    checkNowButton.textContent = 'Checking...';
    
    try {
      await window.electronAPI.checkForUpdates();
      // Refresh last update check time
      const timestamp = await window.electronAPI.getLastUpdateCheck();
      lastUpdateCheckDiv.textContent = formatLastUpdateCheck(timestamp);
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      checkNowButton.disabled = false;
      checkNowButton.textContent = 'Check for Updates Now';
    }
  });
});