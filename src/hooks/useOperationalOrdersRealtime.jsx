import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

import { apiClient, BACKEND_BASE_URL } from '@/api/apiClient';

const SOCKET_URL = import.meta.env.VITE_WS_URL || BACKEND_BASE_URL || 'http://localhost:3000';

function useLatestRef(value) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

export function useOperationalOrdersRealtime({
  roomType,
  enabled = true,
  asSubscriber = null,
  onOrderCreated = null,
  onOrderUpdated = null,
  onSocketUnavailable = null,
}) {
  const socketRef = useRef(null);
  const onOrderCreatedRef = useLatestRef(onOrderCreated);
  const onOrderUpdatedRef = useLatestRef(onOrderUpdated);
  const onSocketUnavailableRef = useLatestRef(onSocketUnavailable);
  const warnedUnavailableRef = useRef(false);

  useEffect(() => {
    if (!enabled || !roomType) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    const token = apiClient.auth.getToken();
    if (!token) {
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      auth: {
        token,
        asSubscriber: asSubscriber || null,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      warnedUnavailableRef.current = false;
      socket.emit(`subscribe:${roomType}`);
    });

    socket.on('order:created', (order) => {
      onOrderCreatedRef.current?.(order);
    });

    socket.on('order:updated', (order) => {
      onOrderUpdatedRef.current?.(order);
    });

    socket.on('connect_error', () => {
      if (warnedUnavailableRef.current) return;
      warnedUnavailableRef.current = true;
      onSocketUnavailableRef.current?.();
    });

    return () => {
      socket.emit(`unsubscribe:${roomType}`);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [asSubscriber, enabled, roomType, onOrderCreatedRef, onOrderUpdatedRef, onSocketUnavailableRef]);

  return socketRef.current;
}

export default useOperationalOrdersRealtime;
