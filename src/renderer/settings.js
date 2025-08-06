document.addEventListener('DOMContentLoaded', () => {
  const openAtLoginCheckbox = document.getElementById('openAtLogin');
  const checkForUpdatesCheckbox = document.getElementById('checkForUpdates');
  const showIconInMenubarCheckbox = document.getElementById('showIconInMenubar');
  const showTemperatureCheckbox = document.getElementById('showTemperature');
  const showHumidityCheckbox = document.getElementById('showHumidity');
  const mqttBrokerIpInput = document.getElementById('mqttBrokerIp');
  const mqttBrokerPortInput = document.getElementById('mqttBrokerPort');
  const mqttTopicInput = document.getElementById('mqttTopic');
  const restoreDefaultsButton = document.getElementById('restoreDefaults');

  // Load settings
  window.electronAPI.send('get-settings');
  window.electronAPI.receive('settings-data', (settings) => {
    openAtLoginCheckbox.checked = settings.openAtLogin;
    checkForUpdatesCheckbox.checked = settings.checkForUpdates;
    showIconInMenubarCheckbox.checked = settings.showIconInMenubar;
    showTemperatureCheckbox.checked = settings.showTemperature;
    showHumidityCheckbox.checked = settings.showHumidity;
    mqttBrokerIpInput.value = settings.mqtt.brokerIp;
    mqttBrokerPortInput.value = settings.mqtt.brokerPort;
    mqttTopicInput.value = settings.mqtt.topic;
  });

  // Save settings on change
  openAtLoginCheckbox.addEventListener('change', () => {
    window.electronAPI.send('set-setting', 'openAtLogin', openAtLoginCheckbox.checked);
  });
  checkForUpdatesCheckbox.addEventListener('change', () => {
    window.electronAPI.send('set-setting', 'checkForUpdates', checkForUpdatesCheckbox.checked);
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
  mqttBrokerIpInput.addEventListener('change', () => {
    window.electronAPI.send('set-mqtt-setting', 'brokerIp', mqttBrokerIpInput.value);
  });
  mqttBrokerPortInput.addEventListener('change', () => {
    window.electronAPI.send('set-mqtt-setting', 'brokerPort', parseInt(mqttBrokerPortInput.value));
  });
  mqttTopicInput.addEventListener('change', () => {
    window.electronAPI.send('set-mqtt-setting', 'topic', mqttTopicInput.value);
  });

  restoreDefaultsButton.addEventListener('click', () => {
    window.electronAPI.send('restore-default-settings');
  });
});