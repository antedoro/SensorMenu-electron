const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } = require('electron');

app.disableHardwareAcceleration();
const path = require('path');
const mqtt = require('mqtt');
const settings = require('electron-settings');
const UpdateChecker = require('./updater');

let mainWindow;
let tray = null;
let mqttClient = null;
let mqttConnected = false;
let mqttPaused = false;
let settingsWindow = null; // Declare settingsWindow
let aboutWindow = null;   // Declare aboutWindow
let updateChecker = null; // Declare updateChecker
let lastTemp = '--';
let lastHum = '--';


// Default MQTT configuration
const defaultMqttConfig = {
  brokerIp: 'localhost',
  brokerPort: 1883,
  topic: 'esp32/dht22',
};

// Default app settings
const defaultAppSettings = {
  openAtLogin: false,
  checkForUpdates: false,
  updateFrequency: 'weekly', // never, daily, weekly
  showIconInMenubar: true,
  showTemperature: true,
  showHumidity: true,
  lastUpdateCheck: null,
};





function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, '../../assets/icons/app_icon.png'), // Set window icon
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('src/renderer/index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// IPC Handlers for settings
ipcMain.on('get-settings', async (event) => {
  event.reply('settings-data', {
    ...await settings.get('app'),
    mqtt: await settings.get('mqtt'),
  });
});

ipcMain.on('set-setting', async (event, key, value) => {
  await settings.set(`app.${key}`, value);
  if (key === 'showIconInMenubar' || key === 'showTemperature' || key === 'showHumidity') {
    updateTrayTitle();
  } else if (key === 'openAtLogin') {
    app.setLoginItemSettings({
      openAtLogin: value,
      path: app.getPath('exe'),
    });
  } else if (key === 'checkForUpdates' || key === 'updateFrequency') {
    if (updateChecker) {
      updateChecker.startAutomaticChecks();
    }
  }
});

ipcMain.on('set-mqtt-setting', async (event, key, value) => {
  console.log(`Updating MQTT setting: ${key} = ${value}`);
  await settings.set(`mqtt.${key}`, value);
  
  // Reconnect MQTT with new settings
  if (mqttClient) {
    console.log('Disconnecting from current MQTT broker...');
    mqttClient.end(true); // Force close
    mqttClient = null;
  }
  
  // Update status to show reconnecting
  updateMqttStatusInSettings(false);
  if (tray) {
    tray.setTitle('Reconnecting...');
  }
  
  console.log('Reconnecting with new MQTT settings...');
  await connectMqtt();
});

ipcMain.on('restore-default-settings', async (event) => {
  await settings.set('app', defaultAppSettings);
  await settings.set('mqtt', defaultMqttConfig);
  event.reply('settings-data', {
    ...await settings.get('app'),
    mqtt: await settings.get('mqtt'),
  });
  // Reconnect MQTT after restoring defaults
  if (mqttClient) {
    mqttClient.end();
  }
  await connectMqtt();
});

ipcMain.handle('get-app-info', async () => {
  const packageJson = require('../../package.json');
  return {
    appName: packageJson.productName || packageJson.name,
    version: packageJson.version,
    author: packageJson.author,
  };
});

// Update check IPC handlers
ipcMain.handle('check-for-updates', async () => {
  if (updateChecker) {
    return await updateChecker.checkForUpdates(false);
  }
  return { success: false, error: 'Update checker not initialized' };
});

ipcMain.handle('get-last-update-check', async () => {
  const appSettings = await settings.get('app');
  return appSettings.lastUpdateCheck || null;
});

// MQTT status IPC handlers
ipcMain.on('get-mqtt-status', (event) => {
  event.reply('mqtt-connection-status', mqttConnected);
});

function updateMqttStatusInSettings(isConnected) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('mqtt-connection-status', isConnected);
  }
}

async function connectMqtt() {
  let mqttConfig = await settings.get('mqtt');
  console.log('MQTT Config after await:', mqttConfig);
  if (!mqttConfig) {
    mqttConfig = defaultMqttConfig;
    await settings.set('mqtt', defaultMqttConfig);
  } else {
    // Ensure all required fields are present, merge with defaults if missing
    mqttConfig = { ...defaultMqttConfig, ...mqttConfig };
    await settings.set('mqtt', mqttConfig);
  }
  console.log('MQTT Config before connect:', mqttConfig);
  const brokerUrl = `mqtt://${mqttConfig.brokerIp}:${mqttConfig.brokerPort}`;

  mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttConnected = true;
    updateMqttStatusInSettings(true);
    console.log('Subscribing to topic:', mqttConfig.topic);
    mqttClient.subscribe(mqttConfig.topic, (err) => {
      if (err) {
        console.error(`Failed to subscribe to topic ${mqttConfig.topic}:`, err);
      } else {
        console.log(`Subscribed to topic ${mqttConfig.topic}`);
      }
    });
  });

  mqttClient.on('message', (topic, message) => {
    console.log('MQTT message received:', topic, message.toString());
    if (!mqttPaused) {
      try {
        const data = JSON.parse(message.toString());
        lastTemp = data.temp;
        lastHum = data.hum;
        updateTrayTitle();
        if (mainWindow) {
          mainWindow.webContents.send('mqtt-data', data);
        }
      } catch (e) {
        console.error('Failed to parse MQTT message:', e);
      }
    }
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT error:', err);
    mqttConnected = false;
    updateMqttStatusInSettings(false);
    if (tray) {
      tray.setTitle('MQTT Error');
    }
  });

  mqttClient.on('close', () => {
    console.log('Disconnected from MQTT broker');
    mqttConnected = false;
    updateMqttStatusInSettings(false);
    if (tray) {
      tray.setTitle('Disconnected');
    }
  });
}

async function updateTrayTitle() {
  if (tray) {
    const appSettings = await settings.get('app');
    let title = '';
    let icon;

    if (appSettings && appSettings.showIconInMenubar) {
      const iconPath = path.join(__dirname, '../../assets/icons/menubar_icon_16.png');
      icon = nativeImage.createFromPath(iconPath);
    } else {
      icon = nativeImage.createEmpty();
    }

    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }
    tray.setImage(icon);

    if (appSettings && appSettings.showTemperature && lastTemp !== null) {
      title += `${lastTemp}°C`;
    }
    if (appSettings && appSettings.showHumidity && lastHum !== null) {
      if (title) title += ' - ';
      title += `${lastHum}%`;
    }
    
    tray.setTitle(title);
  }
}

function createTray() {
  console.log('Creating tray...');
  const iconPath = path.join(__dirname, '../../assets/icons/menubar_icon_16.png');
  const icon = nativeImage.createFromPath(iconPath);
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true); // Make it a template image for macOS color matching
  }
  tray = new Tray(icon);
  console.log('Tray created:', !!tray);
  updateTrayMenu();
  tray.setToolTip('Sensor Menu App');
  tray.setTitle('Connecting...');
}

function updateTrayMenu() {
  console.log('Updating tray menu...');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: mqttPaused ? 'Activate' : 'Pause',
      type: 'normal',
      click: () => {
        mqttPaused = !mqttPaused;
        updateTrayMenu(); // Update menu label
        if (!mqttPaused && !mqttConnected) {
          connectMqtt(); // Reconnect if activated and not connected
        }
      }
    },
    { label: 'Check for updates...', type: 'normal', click: async () => {
      if (updateChecker) {
        await updateChecker.checkForUpdates(false);
      }
    }},
    { label: 'Data', type: 'normal', click: () => {
      if (mainWindow) {
        mainWindow.focus();
        return;
      }
      createWindow(); // Recreate main window if it was closed
    }},
    { label: 'Settings', type: 'normal', click: () => {
      if (settingsWindow) {
        settingsWindow.focus();
        return;
      }
      settingsWindow = new BrowserWindow({
        width: 680,
        height: 480,
        maximizable: false, // Disable maximize button
        resizable: false,   // Disable resizing
        webPreferences: {
          preload: path.join(__dirname, '../preload/preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        }
      });
      settingsWindow.loadFile('src/renderer/settings.html');
      settingsWindow.on('closed', () => {
        settingsWindow = null;
      });
    }},
    { label: 'About', type: 'normal', click: () => {
      if (aboutWindow) {
        aboutWindow.focus();
        return;
      }
      aboutWindow = new BrowserWindow({
        width: 325,
        height: 325,
        maximizable: false, // Disable maximize button
        minimizable: false, // Disable minimize button
        resizable: false,   // Disable resizing
        webPreferences: {
          preload: path.join(__dirname, '../preload/preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        }
      });
      aboutWindow.loadFile('src/renderer/about.html');
      aboutWindow.on('closed', () => {
        aboutWindow = null;
      });
    }},
    { type: 'separator' },
    { label: 'Quit', type: 'normal', click: () => app.quit() }
  ]);
  if (tray) {
    tray.setContextMenu(contextMenu);
    console.log('Tray context menu set.');
  }
}

app.whenReady().then(async () => {
  // Initialize settings with defaults if they don't exist
  if (!(await settings.has('app'))) {
    await settings.set('app', defaultAppSettings);
  } else {
    // Ensure all required fields are present, merge with defaults if missing
    const currentAppSettings = await settings.get('app');
    const mergedAppSettings = { ...defaultAppSettings, ...currentAppSettings };
    await settings.set('app', mergedAppSettings);
  }
  if (!(await settings.has('mqtt'))) await settings.set('mqtt', defaultMqttConfig);

  // Initialize update checker
  updateChecker = new UpdateChecker();
  await updateChecker.startAutomaticChecks();

  createTray();
  await connectMqtt();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clean up tray icon before quitting
  if (tray) {
    tray.destroy();
  }
});