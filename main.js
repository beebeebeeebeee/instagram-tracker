const { app, BrowserWindow } = require("electron");
// Enable live reload for all the files inside your project directory
require('electron-reload')(__dirname, {
    // Note that the path to electron may vary according to the main file
    electron: require(`${__dirname}/node_modules/electron`)
});
const path = require("path");
const url = require("url");
require('./ipclistener/ipcmain')

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    app.quit();
});

app.on("activate", () => {
  if (win === null) {
    createWindow();
  }
});

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 400,
    height: 800,
    webPreferences: {
        //enable client side .js can use require node.js
        nodeIntegration: true,
      },
      resizable: true,
  });

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, "src/index.html"),
      protocol: "file:",
      slashes: true,
    })
  );

  // Open DevTools.
  // win.webContents.openDevTools()

  // When Window Close.
  win.on("closed", () => {
    win = null;
  });
}
