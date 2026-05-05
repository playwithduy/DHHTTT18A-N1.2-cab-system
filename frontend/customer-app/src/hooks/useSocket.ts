// hooks/useSocket.ts — WebSocket hook for real-time events
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRideStore } from '@/store/rideStore';
import toast from 'react-hot-toast';
import type { SocketMessage, SocketEvent, Driver, LatLng, RideStatus } from '@cab/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';

let socketInstance: Socket | null = null;

export function useSocket(userId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const { setAssignedDriver, setDriverLocation, setStep, currentRide } = useRideStore();

  const connect = useCallback(() => {
    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const token = localStorage.getItem('cab_access_token');
    if (!token || !userId) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected:', socket.id);
      socket.emit('join', { userId, role: 'customer' });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[WS] Connection error:', err.message);
    });

    // ─── Event Handlers ──────────────────────────────────────
    socket.on('ride:driver_assigned', (msg: SocketMessage<{ driver: Driver }>) => {
      setAssignedDriver(msg.data.driver);
      setStep('driver_found');
      toast.success('Tài xế đã được phân công!', { icon: '🚗' });
    });

    socket.on('driver:location_updated', (msg: SocketMessage<{ location: LatLng }>) => {
      setDriverLocation(msg.data.location);
    });

    socket.on('ride:status_changed', (msg: SocketMessage<{ status: RideStatus }>) => {
      const { status } = msg.data;
      if (status === 'in_progress') {
        setStep('in_trip');
        toast('Chuyến đi bắt đầu!', { icon: '🏁' });
      } else if (status === 'completed') {
        setStep('completed');
      } else if (status === 'driver_arriving') {
        setStep('arriving');
        toast('Tài xế đang đến đón bạn!', { icon: '📍' });
      }
    });

    socket.on('payment:success', () => {
      toast.success('Thanh toán thành công!');
    });

    socket.on('payment:failed', () => {
      toast.error('Thanh toán thất bại. Vui lòng thử lại.');
      setStep('payment');
    });

    socketInstance = socket;
    socketRef.current = socket;
  }, [userId, setAssignedDriver, setDriverLocation, setStep]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketInstance = null;
    socketRef.current = null;
  }, []);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  useEffect(() => {
    if (userId) connect();
    return () => disconnect();
  }, [userId, connect, disconnect]);

  return { socket: socketRef.current, emit };
}

// ─── GPS Simulator (for development) ─────────────────────────
export function useGPSSimulator(active: boolean) {
  const { setDriverLocation } = useRideStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  const GPS_PATH = [
    { lat: 10.7800, lng: 106.7050 },
    { lat: 10.7785, lng: 106.7030 },
    { lat: 10.7769, lng: 106.7009 },
    { lat: 10.7755, lng: 106.6985 },
    { lat: 10.7740, lng: 106.6960 },
  ];

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      indexRef.current = 0;
      return;
    }

    intervalRef.current = setInterval(() => {
      const loc = GPS_PATH[indexRef.current % GPS_PATH.length];
      setDriverLocation(loc);
      indexRef.current++;
    }, 3000); // every 3 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, setDriverLocation]);
}
