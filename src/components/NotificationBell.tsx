import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Loader2, RotateCw, CheckCheck } from 'lucide-react';
import Cookies from 'js-cookie';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem
} from '../pages/api/notifications';

// Helper to extract a clean message string without raw JSON Data payloads
const getCleanMessage = (text?: string) => {
  if (!text) return '';
  const dataKey = 'Data:';
  const dataIndex = text.indexOf(dataKey);
  if (dataIndex !== -1) {
    return text.substring(0, dataIndex).trim();
  }
  return text;
};

interface NotificationBellProps {
  badgeColor?: string;
}

// Subtle Audio chime synthesized via the Web Audio API (no external file dependencies)
const playNotificationChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Play a gentle, subtle double tone chime
    const playTone = (time: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.06, time + 0.04); // low, subtle volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;
    playTone(now, 587.33, 0.35); // D5 tone
    playTone(now + 0.12, 880, 0.45); // A5 tone (harmonious fifth)
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

// HTML5 Desktop Notification trigger
const triggerSystemNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.png' // App Logo
      });
    } catch (e) {
      console.error('Error triggering system notification:', e);
    }
  }
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  badgeColor = 'bg-[#EC3237]'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeToast, setActiveToast] = useState<{
    id: number;
    title: string;
    message: string;
    notif: NotificationItem;
  } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track open state using a ref to prevent closure capture in SSE callbacks
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const startToastTimerRef = useRef<() => void>(() => { });
  const pauseToastTimerRef = useRef<() => void>(() => { });

  startToastTimerRef.current = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 10000);
  };

  pauseToastTimerRef.current = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  // Fetch notifications history
  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getNotifications(1, 10);
      if (res.success && res.data) {
        setNotifications(res.data);

        // Count unread count from the backend response isRead flags
        const unreads = res.data.filter(n => !n.isRead).length;
        setUnreadCount(unreads);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // SSE Stream Subscription
  useEffect(() => {
    // Initial fetch on mount
    fetchNotifications(true);

    let isMounted = true;
    let controller: AbortController | null = null;

    const handleNewSSEPayload = (dataStr: string) => {
      try {
        console.log('SSE raw data received:', dataStr);
        const newNotif = JSON.parse(dataStr);
        if (newNotif && newNotif.id) {
          const mappedNotif: NotificationItem = {
            ...newNotif,
            event_name: newNotif.title || newNotif.event_name || 'System Alert',
            what_occurs: newNotif.message || newNotif.what_occurs || '',
            message: newNotif.message || newNotif.what_occurs || '',
            created_by_name: newNotif.created_by_name || 'System',
            created_by_role: newNotif.created_by_role || 'System',
          };

          // Update notifications list state
          setNotifications(prev => {
            if (prev.some(n => n.id === mappedNotif.id)) return prev;
            return [mappedNotif, ...prev].slice(0, 10);
          });

          // Increment unread badge if not open
          if (!isOpenRef.current) {
            setUnreadCount(c => c + 1);
          }

          // Trigger sound and system push alert
          // Trigger sound and system push alert
          playNotificationChime();
          triggerSystemNotification(
            mappedNotif.title || formatEventName(mappedNotif.event_name),
            mappedNotif.message || mappedNotif.what_occurs
          );

          // Trigger UI Toast Popup
          setActiveToast({
            id: mappedNotif.id,
            title: mappedNotif.title || formatEventName(mappedNotif.event_name),
            message: getCleanMessage(mappedNotif.message || mappedNotif.what_occurs),
            notif: mappedNotif
          });
          startToastTimerRef.current();
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };

    const connectSSE = async () => {
      if (!isMounted) return;

      const token = sessionStorage.getItem('token') || localStorage.getItem('token') || Cookies.get('token');
      if (!token) return;

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.215:5173/v1';
      const cleanedBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      const sseUrl = `${cleanedBase}/notifications/stream`;

      console.log('Establishing SSE stream via fetch with Authorization headers to:', sseUrl);
      controller = new AbortController();

      try {
        const response = await fetch(sseUrl, {
          headers: {
            'Authorization': token,
            'Accept': 'text/event-stream'
          },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream not supported on response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (isMounted) {
          const { value, done } = await reader.read();
          if (done) {
            console.log('SSE connection closed by server.');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Keep the last line in the buffer in case it is incomplete
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.substring(5).trim();
              if (jsonStr) {
                handleNewSSEPayload(jsonStr);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('SSE stream fetch aborted.');
          return;
        }
        console.warn('SSE stream error, reconnecting in 5 seconds...', err);
        // Attempt reconnection after 5 seconds
        setTimeout(() => {
          if (isMounted) {
            connectSSE();
          }
        }, 5000);
      }
    };

    connectSSE();

    // Request system notification permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { });
    }

    return () => {
      isMounted = false;
      console.log('Closing Notification SSE connection');
      if (controller) {
        controller.abort();
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Handle dropdown toggle
  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen) {
      // Dispatch event to close all other dropdowns
      window.dispatchEvent(new CustomEvent('close-dropdowns', { detail: { except: 'notification' } }));

      // Request permission on user gesture
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => { });
      }
    }
  };

  // Close dropdown on click outside & listen to close-dropdowns events
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleClose = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.except !== 'notification') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('close-dropdowns', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('close-dropdowns', handleClose);
    };
  }, []);

  // Format event name helper
  const formatEventName = (name: string) => {
    if (!name) return 'System Event';
    return name
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  // Format relative time helper
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();

      if (isNaN(date.getTime())) return '';

      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  // Get dynamic route prefix based on role in URL
  const getRolePrefix = (pathname: string) => {
    if (pathname.startsWith('/admin')) return '/admin';
    if (pathname.startsWith('/broker')) return '/broker';
    if (pathname.startsWith('/receptionist')) return '/receptionist';
    if (pathname.startsWith('/sales')) return '/sales';
    if (pathname.startsWith('/calling')) return '/calling';
    return '';
  };

  // Click single notification
  const handleNotificationClick = async (notif: NotificationItem) => {
    setIsOpen(false);

    if (!notif.isRead) {
      try {
        await markNotificationAsRead(notif.id);

        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(c => Math.max(0, c - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Instantly set the event name in localStorage before navigation to prevent breadcrumb flicker
    localStorage.setItem('selectedNotificationEvent', notif.title || formatEventName(notif.event_name));

    const prefix = getRolePrefix(location.pathname);
    navigate(`${prefix}/notifications/${notif.id}`);
  };

  // Mark all as read
  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Swipe gesture detection refs
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchEndXRef.current = touch.clientX;
    touchEndYRef.current = touch.clientY;
  };

  const handleTouchEnd = () => {
    if (
      touchStartXRef.current === null ||
      touchStartYRef.current === null ||
      touchEndXRef.current === null ||
      touchEndYRef.current === null
    ) {
      return;
    }

    const diffX = touchEndXRef.current - touchStartXRef.current;
    const diffY = touchEndYRef.current - touchStartYRef.current;

    // Swipe threshold of 50 pixels in any direction to close
    if (Math.abs(diffX) > 50 || Math.abs(diffY) > 50) {
      setActiveToast(null);
    }

    // Reset coordinates
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        className="p-2 bg-blue-900/50 hover:bg-blue-800/60 border border-blue-800/40 lg:bg-slate-50 lg:hover:bg-slate-100 lg:border-slate-200/50 transition cursor-pointer relative rounded-xl text-blue-200 lg:text-slate-400 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white lg:ring-slate-100 ${badgeColor} shadow-sm`}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-slate-100 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden z-50 animate-fade-in text-left">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Notifications</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark all as read</span>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchNotifications(true);
                }}
                disabled={loading}
                className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer flex items-center justify-center rounded-lg disabled:opacity-50"
                title="Refresh notifications"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              // Empty State
              <div className="py-8 px-4 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2.5 stroke-1" />
                <p className="text-slate-400 text-xs font-medium">No notifications yet</p>
              </div>
            ) : (
              // Notification Items
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full px-4 py-3.5 hover:bg-slate-50/50 active:bg-slate-100/50 flex gap-3 items-start transition duration-150 border-none outline-none text-left cursor-pointer ${notif.isRead ? 'opacity-85' : 'bg-slate-50/40 font-semibold'
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 shadow-sm transition ${notif.isRead ? 'bg-transparent' : 'bg-indigo-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-semibold text-xs text-slate-800 truncate">
                        {notif.title || formatEventName(notif.event_name)}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2 shrink-0">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2 pr-1 font-medium">
                      {getCleanMessage(notif.message || notif.what_occurs)}
                    </p>
                    <span className="text-[9px] text-indigo-500/80 font-bold uppercase tracking-wider block mt-1.5">
                      by {notif.created_by_name || 'System'} {notif.created_by_role ? `(${notif.created_by_role.toLowerCase()})` : ''}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Premium Notification Popup (Top-Right) */}
      {activeToast && createPortal(
        <>
          <style>{`
            @keyframes toastSlideIn {
              from {
                transform: translateY(-120%) scale(0.9);
                opacity: 0;
              }
              to {
                transform: translateY(0) scale(1);
                opacity: 1;
              }
            }
          `}</style>
          <div
            className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-[99999] w-auto sm:w-full sm:max-w-sm bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-4 flex gap-3.5 items-start cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(15,23,42,0.18)] group"
            style={{
              boxShadow: '0 20px 50px rgba(15,23,42,0.12)',
              animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={pauseToastTimerRef.current}
            onMouseLeave={startToastTimerRef.current}
            onClick={() => {
              handleNotificationClick(activeToast.notif);
              setActiveToast(null);
            }}
          >
            {/* Accent icon */}
            <div className="p-2.5 bg-gradient-to-br from-[#1A56DB] to-[#10B981] rounded-xl text-white shadow-md shadow-blue-500/10 shrink-0 group-hover:scale-105 transition-transform">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-2 text-left">
              <h4 className="text-xs font-bold text-slate-800 leading-tight">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium leading-normal mt-1 line-clamp-2">
                {activeToast.message}
              </p>
              <span className="text-[9px] text-[#1A56DB]/85 font-bold uppercase tracking-wider block mt-1.5">
                Click to view details
              </span>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full border border-slate-100 transition shrink-0 cursor-pointer flex items-center justify-center shadow-sm"
              title="Close notification"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
