const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } = require('electron');

app.disableHardwareAcceleration();
const path = require('path');
const mqtt = require('mqtt');
const settings = require('electron-settings');

let mainWindow;
let tray = null;
let mqttClient = null;
let mqttConnected = false;
let mqttPaused = false;

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
  showIconInMenubar: true,
  showTemperature: true,
  showHumidity: true,
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

ipcMain.on('set-setting', (event, key, value) => {
  settings.set(`app.${key}`, value);
  // if (key === 'openAtLogin') {
  //   app.setLoginItemSettings({
  //     openAtLogin: value,
  //     path: app.getPath('exe'),
  //   });
  // }
  // Reconnect MQTT if relevant settings changed
  if (key === 'showTemperature' || key === 'showHumidity') {
    // Update tray title immediately if these change
    // This requires current temp/hum data, which we don't have here.
    // For now, just update the menu, and the title will update on next MQTT message.
    updateTrayMenu();
  }
});

ipcMain.on('set-mqtt-setting', async (event, key, value) => {
  await settings.set(`mqtt.${key}`, value);
  // Reconnect MQTT if broker IP, port or topic changes
  if (mqttClient) {
    mqttClient.end();
  }
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

async function connectMqtt() {
  let mqttConfig = await settings.get('mqtt');
  console.log('MQTT Config after await:', mqttConfig);
  if (!mqttConfig) {
    mqttConfig = defaultMqttConfig;
    settings.set('mqtt', defaultMqttConfig);
  }
  console.log('MQTT Config before connect:', mqttConfig);
  const brokerUrl = `mqtt://${mqttConfig.brokerIp}:${mqttConfig.brokerPort}`;

  mqttClient = mqtt.connect(brokerUrl);

  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttConnected = true;
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
        updateTrayTitle(data.temp, data.hum);
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
    if (tray) {
      tray.setTitle('MQTT Error');
    }
  });

  mqttClient.on('close', () => {
    console.log('Disconnected from MQTT broker');
    mqttConnected = false;
    if (tray) {
      tray.setTitle('Disconnected');
    }
  });
}

async function updateTrayTitle(temp, hum) {
  if (tray && process.platform === 'darwin') {
    const appSettings = await settings.get('app');
    let title = '';

    if (appSettings.showTemperature) {
      title += `${temp}°C`;
    }
    if (appSettings.showHumidity) {
      if (title) title += ' - ';
      title += `${hum}%`;
    }
    if (!title) {
      title = 'Sensor Data';
    }
    tray.setTitle(`${title}`); // Set title without icon
    console.log('Updating tray title with:', title);
  }
}

function createTray() {
  if (process.platform === 'darwin') {
    console.log('Creating tray...');
    const iconPath = path.join(__dirname, '../../assets/icons/menubar_icon_16.png');
    const icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true); // Make it a template image for macOS color matching
    tray = new Tray(icon);
    console.log('Tray created:', !!tray);
    updateTrayMenu();
    tray.setToolTip('Sensor Menu App');
    tray.setTitle('Connecting...');
  }
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
    { label: 'Check for updates...', type: 'normal' },
    { label: 'Settings', type: 'normal', click: () => {
      let settingsWindow = new BrowserWindow({
        width: 640,
        height: 320,
        webPreferences: {
          preload: path.join(__dirname, '../preload/preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        }
      });
      settingsWindow.loadFile('src/renderer/setting.html');
    }},
    { label: 'About', type: 'normal', click: () => {
      let aboutWindow = new BrowserWindow({
        width: 325,
        height: 325,
        webPreferences: {
          preload: path.join(__dirname, '../preload/preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        }
      });
      aboutWindow.loadFile('src/renderer/about.html');
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
  if (!(await settings.has('app'))) await settings.set('app', defaultAppSettings);
  if (!(await settings.has('mqtt'))) await settings.set('mqtt', defaultMqttConfig);

  createWindow();
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