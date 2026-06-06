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
  getTransitions: (issueKey) => ipcRenderer.invoke(IPC.getTransitions, issueKey),
  applyTransition: (issueKey, transitionId) => ipcRenderer.invoke(IPC.applyTransition, issueKey, transitionId),
  createWorklogDraft: (input) => ipcRenderer.invoke(IPC.createWorklogDraft, input),
  listWorklogDrafts: (status) => ipcRenderer.invoke(IPC.listWorklogDrafts, status),
  submitWorklogDraft: (draftId) => ipcRenderer.invoke(IPC.submitWorklogDraft, draftId),
  recordWorkSession: (input) => ipcRenderer.invoke(IPC.recordWorkSession, input),
  listTodaySessions: (today) => ipcRenderer.invoke(IPC.listTodaySessions, today),
  sumTodaySeconds: (today) => ipcRenderer.invoke(IPC.sumTodaySeconds, today),
  buildWorklogDrafts: (input) => ipcRenderer.invoke(IPC.buildWorklogDrafts, input),
  getTicketActivity: (ticketKey) => ipcRenderer.invoke(IPC.getTicketActivity, ticketKey),
};

// With contextIsolation on, this is the only channel between renderer and main.
contextBridge.exposeInMainWorld("ogar", api);
