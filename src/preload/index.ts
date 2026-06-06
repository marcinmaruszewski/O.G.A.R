import { contextBridge, ipcRenderer } from "electron";
import { IPC, type OgarApi } from "../shared/ipc.js";

const api: OgarApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC.getAppInfo),
  getSetting: (key) => ipcRenderer.invoke(IPC.getSetting, key),
  setSetting: (key, value) => ipcRenderer.invoke(IPC.setSetting, key, value),
  getSecret: (key) => ipcRenderer.invoke(IPC.getSecret, key),
  setSecret: (key, value) => ipcRenderer.invoke(IPC.setSecret, key, value),
  getMyOpenTickets: () => ipcRenderer.invoke(IPC.getMyOpenTickets),
  getActiveTicket: () => ipcRenderer.invoke(IPC.getActiveTicket),
  setActiveTicket: (ticket) => ipcRenderer.invoke(IPC.setActiveTicket, ticket),
};

// With contextIsolation on, this is the only channel between renderer and main.
contextBridge.exposeInMainWorld("ogar", api);
