'use client';

import { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Bell } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface LiveAlert {
  alert_id: string;
  timestamp: string;
  alert_type: string;
  severity: string;
  asset_name: string;
  source_ip: string;
}

interface LiveFeedProps {
  apiUrl: string;
  darkMode: boolean;
  onAlertClick: (alertId: string) => void;
}

export default function LiveFeed({ apiUrl, darkMode, onAlertClick }: LiveFeedProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<LiveAlert[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const wsUrl = apiUrl.replace('http', 'ws');
    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('new_alert', (alert: LiveAlert) => {
      console.log('New alert received:', alert);
      
      // Add to recent alerts (keep last 10)
      setRecentAlerts(prev => [alert, ...prev].slice(0, 10));
      
      // Increment total
      setTotalToday(prev => prev + 1);
      
      // Show desktop notification for critical alerts
      if (alert.severity === 'critical' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 Critical Alert', {
          body: `${alert.alert_type} on ${alert.asset_name}`,
          icon: '/favicon.ico'
        });
      }
    });

    newSocket.on('alert_update', (data: { alert_id: string; status: string }) => {
      console.log('Alert updated:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [apiUrl]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getTimeSince = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            LIVE FEED
          </h3>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-500 font-medium">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-500 font-medium">Disconnected</span>
              </>
            )}
          </div>
        </div>
        
        <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
          {totalToday} alerts today
        </div>
      </div>

      {/* Alert Feed */}
      <div className="flex-1 overflow-y-auto">
        {recentAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Bell className={`w-12 h-12 mb-3 ${darkMode ? 'text-slate-600' : 'text-gray-300'}`} />
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              No recent alerts
            </p>
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-400'} mt-1`}>
              New alerts will appear here automatically
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {recentAlerts.map((alert, idx) => (
              <div
                key={`${alert.alert_id}-${idx}`}
                onClick={() => onAlertClick(alert.alert_id)}
                className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  idx === 0 ? 'animate-pulse-once' : ''
                } ${
                  darkMode ? 'bg-slate-700 hover:bg-slate-600 border-slate-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                } border`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {idx === 0 && <span className="text-red-500 mr-1">NEW:</span>}
                      {alert.alert_type.replace(/_/g, ' ')}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {alert.asset_name}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(alert.severity)} text-white`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {getTimeSince(alert.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`p-3 border-t text-xs text-center ${
        darkMode ? 'border-slate-700 text-slate-400' : 'border-gray-200 text-gray-500'
      }`}>
        Real-time updates via WebSocket
      </div>

      {/* Custom animation */}
      <style jsx>{`
        @keyframes pulse-once {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-once {
          animation: pulse-once 1s ease-in-out 1;
        }
      `}</style>
    </div>
  );
}
