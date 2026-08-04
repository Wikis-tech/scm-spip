import React, { useEffect, useState, useRef } from 'react';
import { Bell, BellRing, Info, AlertTriangle, CheckCircle, Wifi, ShieldAlert } from 'lucide-react';
import { Meeting } from '../types';
import { getRuntimeEnvironment } from '../services/pushService';

interface MeetingReminderManagerProps {
  meetings: Meeting[];
}

export const MeetingReminderManager: React.FC<MeetingReminderManagerProps> = ({ meetings }) => {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [prefEnabled, setPrefEnabled] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // For showing standard fallbacks (in-app toasts) if the iframe blocks native alerts
  const [toasts, setToasts] = useState<Array<{
    id: string;
    title: string;
    message: string;
    meetingName: string;
    timeLabel: string;
    officer: string;
    timestamp: number;
  }>>([]);

  // Check state and preferences on load
  useEffect(() => {
    let activeState: NotificationPermission = 'default';
    
    if (getRuntimeEnvironment() === 'android-app') {
      activeState = 'granted';
    } else if ('Notification' in window) {
      const nativePermission = Notification.permission;
      
      // If the native permission is explicitly granted, use it.
      if (nativePermission === 'granted') {
        activeState = 'granted';
      } 
      // If the native permission is explicitly denied, we respect it.
      else if (nativePermission === 'denied') {
        activeState = 'denied';
      } 
      // If native is default, check our persistent override
      else {
        const persistedOverride = localStorage.getItem('SCM_NOTIFICATION_PERMISSION_OVERRIDE') as NotificationPermission | null;
        if (persistedOverride) {
          activeState = persistedOverride;
        }
      }
    } else {
      // No native Notification support (e.g. WebView/iOS/etc)
      const persistedOverride = localStorage.getItem('SCM_NOTIFICATION_PERMISSION_OVERRIDE') as NotificationPermission | null;
      if (persistedOverride) {
        activeState = persistedOverride;
      }
    }

    setPermissionState(activeState);

    const savedPref = localStorage.getItem('SCM_BROWSER_NOTIFS_ENABLED');
    if (savedPref !== null) {
      setPrefEnabled(savedPref === 'true');
    } else {
      localStorage.setItem('SCM_BROWSER_NOTIFS_ENABLED', 'true');
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Trigger instant check for missed reminders upon reconnecting
      checkReminders(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support native notifications. Activating in-app reminders fallback.');
      setPermissionState('granted');
      localStorage.setItem('SCM_NOTIFICATION_PERMISSION_OVERRIDE', 'granted');
      localStorage.setItem('SCM_BROWSER_NOTIFS_ENABLED', 'true');
      setPrefEnabled(true);
      triggerSystemAlert(
        "Reminders Activated (In-App Fallback)",
        "SCM Capital system reminders are active. Since native notifications are disabled or unsupported in this browser environment, we will use in-app alerts.",
        "Now",
        "Test Reminder Status",
        "System Account"
      );
      return;
    }

    try {
      // Wrap requestPermission in a 1000ms timeout Promise to prevent hanging inside Android WebView/iframes
      const requestResult = await new Promise<NotificationPermission>((resolve) => {
        let resolved = false;
        
        const done = (val: NotificationPermission) => {
          if (!resolved) {
            resolved = true;
            resolve(val);
          }
        };

        // 1000ms timeout fallback
        const timeoutId = setTimeout(() => {
          done('default'); // Default fallback if no answer from system WebView
        }, 1000);

        try {
          const res = Notification.requestPermission((p) => {
            clearTimeout(timeoutId);
            done(p);
          });
          if (res && typeof res.then === 'function') {
            res.then((p) => {
              clearTimeout(timeoutId);
              done(p);
            }).catch(() => {
              clearTimeout(timeoutId);
              done('default');
            });
          }
        } catch (err) {
          clearTimeout(timeoutId);
          done('default');
        }
      });

      setPermissionState(requestResult);
      if (requestResult === 'granted') {
        localStorage.setItem('SCM_NOTIFICATION_PERMISSION_OVERRIDE', 'granted');
        localStorage.setItem('SCM_BROWSER_NOTIFS_ENABLED', 'true');
        setPrefEnabled(true);
        triggerSystemAlert(
          "Reminders Activated",
          "Success: Browser notifications for corporate briefings are now active.",
          "N/A",
          "Test Reminder Status",
          "System Account"
        );
      } else if (requestResult === 'denied') {
        localStorage.setItem('SCM_NOTIFICATION_PERMISSION_OVERRIDE', 'denied');
        localStorage.setItem('SCM_BROWSER_NOTIFS_ENABLED', 'false');
        setPrefEnabled(false);
      } else {
        // If they close or dismiss without choosing (default), gracefully fall back to in-app alerts and mark override
        setPermissionState('granted');
        localStorage.setItem('SCM_NOTIFICATION_PERMISSION_OVERRIDE', 'granted');
        localStorage.setItem('SCM_BROWSER_NOTIFS_ENABLED', 'true');
        setPrefEnabled(true);
        triggerSystemAlert(
          "Reminders Activated (In-App Fallback)",
          "Briefing alerts are enabled via high-fidelity in-app system notifications.",
          "N/A",
          "Test Reminder Status",
          "System Account"
        );
      }
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      // Graceful fallback on any exception
      setPermissionState('granted');
      localStorage.setItem('SCM_NOTIFICATION_PERMISSION_OVERRIDE', 'granted');
      localStorage.setItem('SCM_BROWSER_NOTIFS_ENABLED', 'true');
      setPrefEnabled(true);
    }
  };

  const triggerSystemAlert = (
    title: string, 
    bodyMessage: string, 
    startsIn: string, 
    meetingName: string, 
    officer: string
  ) => {
    // 1. Attempt Native Browser Notification
    let nativeFired = false;
    if ('Notification' in window && Notification.permission === 'granted' && prefEnabled) {
      try {
        const payloadText = `Meeting:\n${meetingName}\n\nStarts in:\n${startsIn}\n\nLocation:\nVirtual Meeting Room\n\nAssigned Officer:\n${officer}`;
        const notif = new Notification(title, {
          body: payloadText,
          icon: 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png',
          requireInteraction: true,
          tag: `${meetingName}-${startsIn}`
        });
        
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        nativeFired = true;
      } catch (err) {
        console.warn('Native notification blocked or failed due to iframe/security policy. Utilizing in-app persistent reminders fallback.', err);
      }
    }

    // 2. Fallbacks: Always add an in-app visual toast if native fails, or as a secondary assurance
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [
      ...prev,
      {
        id: toastId,
        title,
        message: bodyMessage,
        meetingName,
        timeLabel: startsIn,
        officer,
        timestamp: Date.now()
      }
    ]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Main reminder evaluation engine
  const checkReminders = (isReconnecting: boolean = false) => {
    if (meetings.length === 0) return;
    const now = Date.now();
    const storedFiredStr = localStorage.getItem('SCM_FIRED_REMINDERS');
    const firedReminders: Record<string, boolean> = storedFiredStr ? JSON.parse(storedFiredStr) : {};
    let updated = false;

    // We automatically evaluate the 4 triggers for each meeting:
    // 1. 24 Hours Before (1440 mins)
    // 2. 1 Hour Before (60 mins)
    // 3. 10 Minutes Before (10 mins)
    // 4. Meeting Start Time (0 mins)
    meetings.forEach((m) => {
      if (!m.date || !m.time) return;
      
      const meetingStartTime = new Date(`${m.date}T${m.time}`).getTime();
      if (isNaN(meetingStartTime)) return;

      const triggers = [
        { key: '24h', minutesBefore: 1440, label: '24 Hours' },
        { key: '1h', minutesBefore: 60, label: '1 Hour' },
        { key: '10m', minutesBefore: 10, label: '10 Minutes' },
        { key: 'start', minutesBefore: 0, label: 'Immediate' }
      ];

      triggers.forEach((trigger) => {
        const triggerTime = meetingStartTime - (trigger.minutesBefore * 60 * 1000);
        const uniqueKey = `fire-${m.id}-${trigger.key}`;

        // Check if already fired
        if (firedReminders[uniqueKey]) return;

        // Is it time to fire the reminder?
        const isTime = now >= triggerTime;
        
        if (isTime) {
          // If the meeting has ended long ago (e.g. older than 2 hours), do not spam retrospectively
          const isTooOld = (now - meetingStartTime) > (2 * 60 * 60 * 1000);
          
          if (isTooOld) {
            // Quietly mark it as processed so it doesn't try again
            firedReminders[uniqueKey] = true;
            updated = true;
            return;
          }

          // Triggering event!
          firedReminders[uniqueKey] = true;
          updated = true;

          // Detect offline/missed state
          // Missed if trigger is in the past by more than 40 seconds (suggesting we were offline or asleep/not focused)
          const isMissed = (now - triggerTime) > (40 * 1000);
          
          let startsInText = trigger.label;
          if (trigger.key === 'start') {
            startsInText = 'Now';
          }

          const title = isMissed 
            ? `[Missed Reminder] Meeting Alert` 
            : `Meeting Reminder`;
          
          const message = isMissed
            ? `Your briefing with "${m.prospectName}" was scheduled to start soon (offline catchup alert).`
            : `Your briefing with "${m.prospectName}" starts in ${startsInText}.`;

          triggerSystemAlert(
            title,
            message,
            startsInText,
            m.prospectName || 'Corporate Client',
            m.officerName || 'Julian Draxler'
          );
        }
      });
    });

    if (updated) {
      localStorage.setItem('SCM_FIRED_REMINDERS', JSON.stringify(firedReminders));
    }
  };

  // Run the checks on mount, meetings update, and at intervals
  useEffect(() => {
    checkReminders();
    
    // Scan every 15 seconds for active events
    const timerId = setInterval(() => {
      checkReminders();
    }, 15000);

    return () => clearInterval(timerId);
  }, [meetings, prefEnabled]);

  const hasContent = !isOnline || permissionState === 'default' || permissionState === 'denied' || toasts.length > 0;
  if (!hasContent) {
    return null;
  }

  return (
    <>
      {/* Absolute overlay of active browser notification status and inline permissions */}
      <div id="reminder-system" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
        
        {/* Offline notice bar (Transient, appears if connection is lost) */}
        {!isOnline && (
          <div className="p-3 bg-red-600 text-white rounded-xl border border-red-700 shadow-xl flex items-center gap-2 animate-bounce">
            <Wifi className="w-4 h-4 shrink-0 animate-pulse text-red-150" />
            <div className="text-[10px] uppercase font-bold tracking-wider">
              Offline Protection Mode Active
            </div>
          </div>
        )}

        {/* If permissions are default or blocked, offer setting hint politely */}
        {permissionState === 'default' && (
          <div className="bg-white border border-slate-200 p-4 shadow-2xl rounded-2xl flex items-start gap-3 relative max-w-xs animate-fade-in border-l-4 border-l-[#b1191f]">
            <div className="p-2 bg-red-50 text-[#b1191f] rounded-lg mt-0.5 shrink-0">
              <BellRing className="w-4.5 h-4.5 animate-swing" />
            </div>
            <div className="space-y-1 text-left grow">
              <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-800 block">
                Enable Briefing Reminders
              </span>
              <p className="text-[10px] text-slate-500 leading-normal font-medium">
                Receive browser alerts 24h, 1h, 10m before and at start of corporate briefings.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  requestPermission();
                }}
                className="mt-2.5 px-4 py-2.5 bg-[#b1191f] hover:bg-red-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wide cursor-pointer transition-colors w-full text-center block shadow-sm"
              >
                Allow Alerts
              </button>
            </div>
          </div>
        )}

        {/* If permissions are denied, offer polite instructions on how to enable them */}
        {permissionState === 'denied' && (
          <div className="bg-white border border-slate-200 p-4 shadow-2xl rounded-2xl flex items-start gap-3 relative max-w-xs animate-fade-in border-l-4 border-l-amber-500">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg mt-0.5 shrink-0">
              <ShieldAlert className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="space-y-1 text-left grow">
              <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-800 block">
                Notifications Disabled
              </span>
              <p className="text-[10px] text-slate-500 leading-normal font-medium">
                To receive critical briefing alerts, please allow notifications for SPIP in your device settings under <strong className="text-slate-700">Settings &gt; Apps &gt; SPIP &gt; Notifications</strong>.
              </p>
              <button
                onClick={() => {
                  // Re-trigger a fresh check in case they enabled it in the background
                  if ('Notification' in window) {
                    const currentNative = Notification.permission;
                    if (currentNative === 'granted') {
                      setPermissionState('granted');
                      localStorage.setItem('SCM_NOTIFICATION_PERMISSION_OVERRIDE', 'granted');
                    } else if (currentNative === 'default') {
                      setPermissionState('default');
                    }
                  }
                }}
                className="mt-2.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[9px] uppercase tracking-wide cursor-pointer transition-colors w-full text-center block border border-slate-200"
              >
                Check System Settings
              </button>
            </div>
          </div>
        )}

        {/* Browser notification fallback persistent toasts inside application workspace */}
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className="bg-white border-2 border-[#b1191f] p-4 shadow-2xl rounded-2xl flex flex-col text-left relative max-w-sm animate-fade-in-up"
            style={{ minWidth: '300px' }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
              <span className="text-[10px] font-extrabold uppercase text-[#b1191f] tracking-widest flex items-center gap-1">
                <BellRing className="w-3.5 h-3.5 animate-bounce" /> {toast.title}
              </span>
              <button 
                onClick={() => dismissToast(toast.id)}
                className="text-[9px] font-extrabold uppercase text-slate-405 hover:text-black cursor-pointer bg-slate-100 rounded px-1.5 py-0.5"
              >
                Dismiss
              </button>
            </div>

            <div className="space-y-2 text-xs leading-normal">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Meeting / Corporate Target</span>
                <span className="font-bold text-slate-900">{toast.meetingName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Starts in</span>
                  <span className="font-semibold text-rose-700">{toast.timeLabel}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Location</span>
                  <span className="font-mono text-slate-650">Virtual Boardroom</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-450 uppercase">
                <span>Advisor: {toast.officer}</span>
                <span>Active Protection</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
