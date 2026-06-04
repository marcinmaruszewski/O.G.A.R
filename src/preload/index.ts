import { contextBridge, ipcRenderer } from "electron";
import { IPC, type OgarApi } from "../shared/ipc.js";

const api: OgarApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC.getAppInfo),
};

// With contextIsolation on, this is the only channel between renderer and main.
contextBridge.exposeInMainWorld("ogar", api);
