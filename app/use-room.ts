"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLIENT_MESSAGES, SERVER_MESSAGES, decode, encode } from "./net-protocol.js";

export interface RoomMember {
  playerId: string;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface RoomSummary {
  code: string;
  hostId: string | null;
  started: boolean;
  maxPlayers: number;
  members: RoomMember[];
}

export type ConnectionStatus = "idle" | "connecting" | "open" | "closed" | "error";

const IDENTITY_KEY = "mars_frontier_identity";

// A stable per-device id, so a reload or a dropped connection returns to the
// same seat instead of taking a new one.
function getIdentity(): string {
  if (typeof localStorage === "undefined") return "";
  let id = localStorage.getItem(IDENTITY_KEY);
  if (!id) {
    id = `p-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(IDENTITY_KEY, id);
  }
  return id;
}

export function useRoom() {
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number>(0);
  const manualCloseRef = useRef(false);
  const joinRef = useRef<{ code: string; name: string } | null>(null);

  // Reading localStorage during render would make the server and client
  // disagree, so the id stays empty until a connection is opened — which only
  // ever happens from a click, well after hydration.
  const [playerId, setPlayerId] = useState("");

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [view, setView] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    socketRef.current?.close();
    socketRef.current = null;
    setStatus("idle");
    setRoom(null);
    setView(null);
    joinRef.current = null;
  }, []);

  // The close handler reconnects by calling connect again, which cannot
  // reference itself inside its own definition; go through a ref.
  const connectRef = useRef<(code: string, name: string) => void>(() => {});

  const connect = useCallback((code: string, name: string) => {
    manualCloseRef.current = false;
    joinRef.current = { code, name };
    setError(null);
    setStatus("connecting");

    const playerId = getIdentity();
    setPlayerId(playerId);
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    const url =
      `${scheme}://${location.host}/api/room/${encodeURIComponent(code)}/ws` +
      `?playerId=${encodeURIComponent(playerId)}&name=${encodeURIComponent(name)}`;

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      retryRef.current = 0;
      setStatus("open");
      socket.send(encode({ type: CLIENT_MESSAGES.JOIN }));
    });

    socket.addEventListener("message", event => {
      const message = decode(String(event.data)) as Record<string, unknown> | null;
      if (!message) return;
      if (message.type === SERVER_MESSAGES.ROOM) setRoom(message.room as RoomSummary);
      else if (message.type === SERVER_MESSAGES.VIEW) setView(message.view as Record<string, unknown>);
      else if (message.type === SERVER_MESSAGES.ERROR) setError(String(message.reason));
    });

    socket.addEventListener("error", () => setStatus("error"));

    socket.addEventListener("close", () => {
      socketRef.current = null;
      if (manualCloseRef.current) return;
      setStatus("closed");
      // Reconnect with backoff. The server keeps the seat, so play resumes where
      // it left off.
      const attempt = Math.min(retryRef.current++, 5);
      const delay = Math.min(1000 * 2 ** attempt, 15000);
      setTimeout(() => {
        const pending = joinRef.current;
        if (pending && !manualCloseRef.current) connectRef.current(pending.code, pending.name);
      }, delay);
    });
  }, []);

  // Keep the reconnect entry point current without touching a ref during render.
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const send = useCallback((message: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("サーバに接続していません。");
      return false;
    }
    socket.send(encode(message));
    return true;
  }, []);

  const startGame = useCallback(
    (options: { turmoil: boolean; colonies: boolean; prelude?: boolean; venus?: boolean; promo?: boolean; board?: string; draft?: boolean }) =>
      send({ type: CLIENT_MESSAGES.START, options }),
    [send]
  );

  const sendAction = useCallback(
    (action: string, payload: Record<string, unknown> = {}) =>
      send({ type: CLIENT_MESSAGES.ACTION, action, payload }),
    [send]
  );

  useEffect(() => {
    return () => {
      manualCloseRef.current = true;
      socketRef.current?.close();
    };
  }, []);

  return {
    status,
    room,
    view,
    error,
    playerId,
    connect,
    disconnect,
    startGame,
    sendAction,
    clearError: () => setError(null)
  };
}
