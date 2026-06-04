/// <reference types="vite/client" />
import type { OgarApi } from "../../shared/ipc";

declare global {
  interface Window {
    ogar: OgarApi;
  }
}
