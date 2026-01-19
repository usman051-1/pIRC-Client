const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    title: 'pIRC - pwedIRC',
    backgroundColor: '#808080',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Connect', accelerator: 'Ctrl+K', click: () => {} },
        { label: 'Disconnect', accelerator: 'Ctrl+D', click: () => {} },
        { type: 'separator' },
        { label: 'Options', accelerator: 'Ctrl+O', click: () => {} },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { 
          label: 'About pIRC',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About pIRC',
              message: 'pIRC v1.0.0\npwedIRC - A nostalgic IRC client',
              detail: 'Built with Electron\nInspired by the classic mIRC'
            });
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/public/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
