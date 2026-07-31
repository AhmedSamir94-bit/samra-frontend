import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./auth-storage";

const API_URL =
  import.meta.env.VITE_API_URL || "https://samra-backend.vercel.app/api";

function socketBaseUrl(): string {
  return API_URL.replace(/\/api$/, "");
}

let socket: Socket | null = null;

export function connectStaffChat(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;
  if (socket?.connected) return socket;

  // Websocket only — long-polling keeps a pending HTTP request open and makes
  // the browser tab loading indicator spin forever on Vercel.
  socket = io(socketBaseUrl(), {
    auth: { token },
    transports: ["websocket"],
    reconnectionAttempts: 5,
    timeout: 8000,
  });

  return socket;
}

export function disconnectStaffChat(): void {
  socket?.disconnect();
  socket = null;
}

export function joinOrderRoom(orderId: string): void {
  socket?.emit("order:join", { orderId });
}

export function setChatViewing(orderId: string, active: boolean): void {
  socket?.emit("chat:view", { orderId, active });
}

export function getStaffSocket(): Socket | null {
  return socket;
}
