import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface LiveDataState<T> {
  data: T | null;
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

export function useLiveData<T>(channel: string, initialValue?: T): LiveDataState<T> {
  const [state, setState] = useState<LiveDataState<T>>({
    data: initialValue || null,
    isConnected: false,
    lastUpdate: null,
    error: null
  });
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`🔌 Connected to ${channel}`);
      setState(prev => ({ ...prev, isConnected: true, error: null }));
      socket.emit('subscribe', { channel });
    });

    socket.on('disconnect', (reason) => {
      console.warn(`⚠️ Disconnected from ${channel}:`, reason);
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (err) => {
      console.error(`❌ Connection error (${channel}):`, err.message);
      setState(prev => ({ ...prev, error: err.message }));
    });

    socket.on('data', (payload: T) => {
      setState({
        data: payload,
        isConnected: true,
        lastUpdate: new Date(),
        error: null
      });
    });

    socket.on('error', (err) => {
      console.error(`❌ ${channel} error:`, err);
      setState(prev => ({ ...prev, error: err?.message || 'Unknown error' }));
    });

    return () => {
      socket.emit('unsubscribe', { channel });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [channel]);

  return state;
}
