'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, Activity, Search, Filter, 
  Plus, X, Send, Download, Users, TrendingUp, BarChart3, Bell, Settings,
  CheckSquare, Square, FileText, Calendar, Zap, MessageSquare, Play
} from 'lucide-react';

// NEW: Import the 3 feature components
import AttackMap from './components/AttackMap';
import PlaybookRunner from './components/PlaybookRunner';
import LiveFeed from './components/LiveFeed';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [activeView, setActiveView] = useState('alerts'); // alerts, analytics, team
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('today');
  
  // Bulk operations
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  
  // Dark Mode
  const [darkMode, setDarkMode] = useState(false);
  
  // Feature states
  const [showShiftReport, setShowShiftReport] = useState(false);
  const [showThreatActors, setShowThreatActors] = useState(false);
  const [shiftReport, setShiftReport] = useState(null);
  const [threatActors, setThreatActors] = useState([]);
  
  // NEW: 3 Features - Attack Map, Playbook, Live Feed
  const [showPlaybookRunner, setShowPlaybookRunner] = useState(false);
  const [playbookAlert, setPlaybookAlert] = useState(null);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  
  const [newNote, setNewNote] = useState('');
  const [investigator, setInvestigator] = useState('Analyst User');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [alerts, statusFilter, priorityFilter, searchTerm, dateRange]);

  useEffect(() => {
    setShowBulkActions(selectedAlerts.size > 0);
  }, [selectedAlerts]);

  const loadData = async () => {
    try {
      setLoading(true);
      await fetch(`${API_URL}/api/demo/alerts`);
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const alertsRes = await fetch(`${API_URL}/api/alerts?${params}`);
      const alertsData = await alertsRes.json();
      setAlerts(alertsData);
      
      const statsRes = await fetch(`${API_URL}/api/stats`);
      const statsData = await statsRes.json();
      setStats(statsData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...alerts];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(a => a.priority_level === priorityFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.alert_id.toLowerCase().includes(term) ||
        a.alert_type.toLowerCase().includes(term) ||
        a.asset_name.toLowerCase().includes(term)
      );
    }
    
    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(a => {
        const alertDate = new Date(a.timestamp);
        const hoursDiff = (now - alertDate) / (1000 * 60 * 60);
        
        switch(dateRange) {
          case 'today': return hoursDiff <= 24;
          case 'week': return hoursDiff <= 168;
          case 'month': return hoursDiff <= 720;
          default: return true;
        }
      });
    }
    
    setFilteredAlerts(filtered);
  };

  const toggleSelectAlert = (alertId) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const selectAllAlerts = () => {
    if (selectedAlerts.size === filteredAlerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(filteredAlerts.map(a => a.alert_id)));
    }
  };

  const bulkAssign = async () => {
    const analyst = prompt('Assign to analyst:');
    if (!analyst) return;
    
    for (const alertId of selectedAlerts) {
      try {
        await fetch(`${API_URL}/api/investigation/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert_id: alertId,
            author: analyst,
            action: 'start',
            notes: `Bulk assigned to ${analyst}`
          })
        });
      } catch (error) {
        console.error(`Error assigning ${alertId}:`, error);
      }
    }
    
    setSelectedAlerts(new Set());
    loadData();
    addNotification(`Assigned ${selectedAlerts.size} alerts to ${analyst}`);
  };

  const bulkMarkFP = async () => {
    if (!confirm(`Mark ${selectedAlerts.size} alerts as false positive?`)) return;
    
    for (const alertId of selectedAlerts) {
      try {
        await fetch(`${API_URL}/api/investigation/mark-fp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert_id: alertId,
            author: investigator,
            action: 'false_positive',
            notes: 'Bulk marked as false positive'
          })
        });
      } catch (error) {
        console.error(`Error marking ${alertId}:`, error);
      }
    }
    
    setSelectedAlerts(new Set());
    loadData();
    addNotification(`Marked ${selectedAlerts.size} alerts as false positive`);
  };

  const exportToCSV = () => {
    const data = filteredAlerts.map(a => ({
      Alert_ID: a.alert_id,
      Type: a.alert_type,
      Severity: a.severity,
      Risk_Score: a.risk_score,
      Status: a.status,
      Asset: a.asset_name,
      Priority: a.priority_level,
      Assigned_To: a.assigned_to || 'Unassigned',
      Timestamp: a.timestamp
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString()}.csv`;
    a.click();
    
    addNotification('Exported alerts to CSV');
  };

  const addNotification = (message) => {
    const notification = {
      id: Date.now(),
      message,
      timestamp: new Date().toISOString()
    };
    setNotifications([notification, ...notifications]);
  };

  // NEW: Fetch shift report
  const fetchShiftReport = async () => {
    try {
      const response = await fetch(`${API_URL}/api/shift-report`);
      const data = await response.json();
      setShiftReport(data);
      setShowShiftReport(true);
    } catch (error) {
      console.error('Error fetching shift report:', error);
      addNotification('❌ Failed to generate shift report');
    }
  };

  // NEW: Fetch threat actors
  const fetchThreatActors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/threat-actors`);
      const data = await response.json();
      setThreatActors(data);
      setShowThreatActors(true);
    } catch (error) {
      console.error('Error fetching threat actors:', error);
      addNotification('❌ Failed to fetch threat actors');
    }
  };

  const startInvestigation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/investigation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: selectedAlert.alert_id,
          author: investigator,
          action: 'start',
          notes: 'Investigation started'
        })
      });
      
      const data = await response.json();
      setSelectedAlert(data.alert);
      setAlerts(alerts.map(a => a.alert_id === data.alert.alert_id ? data.alert : a));
      addNotification(`Started investigating ${selectedAlert.alert_id}`);
    } catch (error) {
      console.error('Error starting investigation:', error);
    }
  };

  const closeInvestigation = async (resolution) => {
    const notes = prompt(`Enter resolution notes for ${resolution}:`);
    if (!notes) return;
    
    try {
      const endpoint = resolution === 'resolved' 
        ? '/api/investigation/close'
        : '/api/investigation/mark-fp';
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: selectedAlert.alert_id,
          author: investigator,
          action: resolution,
          notes: notes
        })
      });
      
      const data = await response.json();
      setSelectedAlert(data.alert);
      setAlerts(alerts.map(a => a.alert_id === data.alert.alert_id ? data.alert : a));
      addNotification(`Alert ${resolution}: ${selectedAlert.alert_id}`);
    } catch (error) {
      console.error('Error closing investigation:', error);
    }
  };

  const escalateAlert = async () => {
    const notes = prompt('Why are you escalating this alert?');
    if (!notes) return;
    
    try {
      const response = await fetch(`${API_URL}/api/investigation/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: selectedAlert.alert_id,
          author: investigator,
          action: 'escalate',
          notes: notes
        })
      });
      
      const data = await response.json();
      setSelectedAlert(data.alert);
      setAlerts(alerts.map(a => a.alert_id === data.alert.alert_id ? data.alert : a));
      addNotification(`Escalated alert: ${selectedAlert.alert_id}`);
    } catch (error) {
      console.error('Error escalating alert:', error);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/notes/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: '',
          alert_id: selectedAlert.alert_id,
          author: investigator,
          note: newNote,
          timestamp: new Date().toISOString()
        })
      });
      
      const data = await response.json();
      const updatedAlert = { ...selectedAlert };
      updatedAlert.notes.push(data.note);
      setSelectedAlert(updatedAlert);
      
      setNewNote('');
      setShowNoteModal(false);
      addNotification('Added investigation note');
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const applyPlaybook = (playbookType) => {
    const playbooks = {
      malware: "1. Isolate affected system\n2. Capture memory dump\n3. Analyze malware sample\n4. Check for lateral movement\n5. Update signatures",
      bruteforce: "1. Check account lockout policy\n2. Review failed login attempts\n3. Verify source IP legitimacy\n4. Check for successful logins\n5. Reset compromised credentials",
      phishing: "1. Verify email headers\n2. Check links and attachments\n3. Review similar emails\n4. Block sender\n5. Notify affected users"
    };
    
    setNewNote(playbooks[playbookType] || "Standard investigation playbook");
    setShowPlaybookModal(false);
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: 'bg-blue-100 text-blue-800 border-blue-300',
      investigating: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      resolved: 'bg-green-100 text-green-800 border-green-300',
      false_positive: 'bg-gray-100 text-gray-800 border-gray-300',
      escalated: 'bg-red-100 text-red-800 border-red-300'
    };
    return badges[status] || badges.new;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      immediate: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300',
      potential_false_positive: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'immediate' || priority === 'high') {
      return <AlertTriangle className="w-5 h-5" />;
    }
    return <Shield className="w-5 h-5" />;
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SOC Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-sm border-b sticky top-0 z-40 transition-colors duration-300 ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 flex-shrink-0">
              <Shield className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  SOC Operations Center
                </h1>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Enterprise Alert Management Platform
                </p>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('alerts')}
                className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                  activeView === 'alerts' 
                    ? darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                    : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Alerts</span>
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                  activeView === 'analytics'
                    ? darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                    : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">Analytics</span>
              </button>
              <button
                onClick={() => setActiveView('team')}
                className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                  activeView === 'team'
                    ? darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                    : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Team</span>
              </button>
              
              {/* NEW: Attack Map Tab */}
              <button
                onClick={() => setActiveView('attackmap')}
                className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                  activeView === 'attackmap'
                    ? darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                    : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM6.5 9a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm7 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/>
                </svg>
                <span className="text-sm font-medium">Attack Map</span>
              </button>
              
              {/* Advanced Features */}
              <button
                onClick={fetchShiftReport}
                className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                  darkMode 
                    ? 'text-purple-400 hover:bg-purple-900/30 border-purple-700'
                    : 'text-purple-600 hover:bg-purple-50 border-purple-200'
                }`}
                title="Generate Shift Report"
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Shift Report</span>
              </button>
              <button
                onClick={fetchThreatActors}
                className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                  darkMode
                    ? 'text-red-400 hover:bg-red-900/30 border-red-700'
                    : 'text-red-600 hover:bg-red-50 border-red-200'
                }`}
                title="View Threat Actors"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Threat Intel</span>
              </button>
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                <span className="font-medium">{investigator}</span>
              </div>
              
              {/* Live Feed Toggle */}
              <button
                onClick={() => setShowLiveFeed(!showLiveFeed)}
                className={`p-2 rounded transition-all ${
                  showLiveFeed
                    ? darkMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'
                    : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-600'
                }`}
                title={showLiveFeed ? 'Hide Live Feed' : 'Show Live Feed'}
              >
                <Activity className="w-5 h-5" />
              </button>
              
              {/* Dark Mode Toggle */}
              <button
                onClick={() => {
                  setDarkMode(!darkMode);
                  toast.info(darkMode ? '☀️ Light mode activated' : '🌙 Dark mode activated', { autoClose: 2000 });
                }}
                className={`p-2 rounded transition-all ${
                  darkMode 
                    ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded transition-colors ${
                  darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button className={`p-2 rounded transition-colors ${
                darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
                <Settings className="w-5 h-5" />
              </button>
              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Live
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-4 top-16 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className="p-4 border-b hover:bg-gray-50">
                  <p className="text-sm text-gray-900">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300 ${
        showLiveFeed ? 'mr-80' : 'mr-0'
      }`}>
        {/* Alerts View */}
        {activeView === 'alerts' && (
          <>
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Total
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_alerts_processed}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-xs text-yellow-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Investigating
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.alerts_investigating}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Resolved
                  </p>
                  <p className="text-2xl font-bold text-green-600">{stats.alerts_resolved}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-xs text-gray-600">False Positives</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.false_positives_filtered}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-xs text-purple-600">Time Saved</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.time_saved_hours.toFixed(1)}h</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-xs text-blue-600">Accuracy</p>
                  <p className="text-2xl font-bold text-blue-600">{(stats.model_accuracy * 100).toFixed(0)}%</p>
                </div>
              </div>
            )}

            {/* Advanced Filters & Actions */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search alerts, assets..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="false_positive">False Positive</option>
                    <option value="escalated">Escalated</option>
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="all">All Priorities</option>
                    <option value="immediate">Immediate</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                  <button
                    onClick={loadData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
                  >
                    <Activity className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllAlerts}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
                    >
                      {selectedAlerts.size === filteredAlerts.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      Select All
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{filteredAlerts.length}</span> of{' '}
                    <span className="font-medium">{alerts.length}</span> alerts
                  </div>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {showBulkActions && (
                <div className="px-4 py-3 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
                  <div className="text-sm text-blue-900">
                    <span className="font-medium">{selectedAlerts.size}</span> alerts selected
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={bulkAssign}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Assign
                    </button>
                    <button
                      onClick={bulkMarkFP}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Mark as FP
                    </button>
                    <button
                      onClick={() => setSelectedAlerts(new Set())}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Alerts Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedAlerts.size === filteredAlerts.length && filteredAlerts.length > 0}
                          onChange={selectAllAlerts}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alert</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAlerts.map((alert) => (
                      <tr
                        key={alert.alert_id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedAlerts.has(alert.alert_id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedAlerts.has(alert.alert_id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectAlert(alert.alert_id);
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full border ${getStatusBadge(alert.status)}`}>
                            {alert.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={() => setSelectedAlert(alert)}>
                          <div className="flex items-center">
                            {getPriorityIcon(alert.priority_level)}
                            <div className="ml-2">
                              <div className="text-sm font-medium text-gray-900">{alert.alert_type}</div>
                              <div className="text-xs text-gray-500">{alert.alert_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={() => setSelectedAlert(alert)}>
                          <div className="text-sm text-gray-900">{alert.asset_name}</div>
                          <div className="text-xs text-gray-500">{alert.asset_criticality}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={() => setSelectedAlert(alert)}>
                          <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full border ${getPriorityColor(alert.priority_level)}`}>
                            {alert.priority_level.replace('_', ' ').slice(0, 3).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={() => setSelectedAlert(alert)}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{alert.risk_score}</span>
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${alert.risk_score}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500" onClick={() => setSelectedAlert(alert)}>
                          {alert.assigned_to || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlert(alert);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div className="space-y-6">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">Total Events</h3>
                  <Activity className="w-5 h-5 opacity-75" />
                </div>
                <p className="text-4xl font-bold mb-1">{alerts.length}</p>
                <div className="flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+{Math.floor(alerts.length * 0.4062)} (40.62%)</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">Critical Alerts</h3>
                  <AlertTriangle className="w-5 h-5 opacity-75" />
                </div>
                <p className="text-4xl font-bold mb-1">
                  {alerts.filter(a => a.priority_level === 'immediate' || a.severity === 'critical').length}
                </p>
                <div className="flex items-center text-sm">
                  <span>Requires immediate action</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">Resolved</h3>
                  <CheckCircle className="w-5 h-5 opacity-75" />
                </div>
                <p className="text-4xl font-bold mb-1">
                  {alerts.filter(a => a.status === 'resolved').length}
                </p>
                <div className="flex items-center text-sm">
                  <span>{alerts.length > 0 ? Math.round((alerts.filter(a => a.status === 'resolved').length / alerts.length) * 100) : 0}% completion rate</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-90">Avg Response Time</h3>
                  <Clock className="w-5 h-5 opacity-75" />
                </div>
                <p className="text-4xl font-bold mb-1">2.3h</p>
                <div className="flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
                  <span>-15% from last week</span>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alert Trend Line Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Alert Trends (Last 7 Days)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={[
                    { day: 'Mon', alerts: Math.floor(alerts.length * 0.12), critical: Math.floor(alerts.length * 0.03) },
                    { day: 'Tue', alerts: Math.floor(alerts.length * 0.15), critical: Math.floor(alerts.length * 0.04) },
                    { day: 'Wed', alerts: Math.floor(alerts.length * 0.18), critical: Math.floor(alerts.length * 0.05) },
                    { day: 'Thu', alerts: Math.floor(alerts.length * 0.14), critical: Math.floor(alerts.length * 0.04) },
                    { day: 'Fri', alerts: Math.floor(alerts.length * 0.16), critical: Math.floor(alerts.length * 0.06) },
                    { day: 'Sat', alerts: Math.floor(alerts.length * 0.13), critical: Math.floor(alerts.length * 0.03) },
                    { day: 'Sun', alerts: Math.floor(alerts.length * 0.12), critical: Math.floor(alerts.length * 0.02) }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="alerts" stroke="#3b82f6" strokeWidth={2} name="Total Alerts" />
                    <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Alert Type Distribution Pie Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Alert Type Distribution
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={(() => {
                        const typeCounts = {};
                        alerts.forEach(a => {
                          const type = a.alert_type.replace(/_/g, ' ');
                          typeCounts[type] = (typeCounts[type] || 0) + 1;
                        });
                        return Object.entries(typeCounts).slice(0, 6).map(([name, value]) => ({
                          name,
                          value
                        }));
                      })()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'
                      ].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top Source IPs Bar Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  Top Attack Source IPs
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={(() => {
                    const ipCounts = {};
                    alerts.forEach(a => {
                      ipCounts[a.source_ip] = (ipCounts[a.source_ip] || 0) + 1;
                    });
                    return Object.entries(ipCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([ip, count]) => ({ ip, count }));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="ip" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" fill="#f97316" name="Attack Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Severity Distribution Donut Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Severity Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: alerts.filter(a => a.severity === 'critical').length, fill: '#dc2626' },
                        { name: 'High', value: alerts.filter(a => a.severity === 'high').length, fill: '#f97316' },
                        { name: 'Medium', value: alerts.filter(a => a.severity === 'medium').length, fill: '#eab308' },
                        { name: 'Low', value: alerts.filter(a => a.severity === 'low').length, fill: '#22c55e' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Additional Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status Breakdown */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investigation Status</h3>
                <div className="space-y-3">
                  {[
                    { status: 'new', label: 'New', color: 'bg-blue-500' },
                    { status: 'investigating', label: 'Investigating', color: 'bg-yellow-500' },
                    { status: 'resolved', label: 'Resolved', color: 'bg-green-500' },
                    { status: 'false_positive', label: 'False Positive', color: 'bg-gray-500' }
                  ].map(({ status, label, color }) => {
                    const count = alerts.filter(a => a.status === status).length;
                    const percent = alerts.length > 0 ? (count / alerts.length * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{label}</span>
                          <span className="text-gray-900 font-semibold">{count} ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className={`h-3 rounded-full ${color}`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Targeted Assets */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Targeted Assets</h3>
                <div className="space-y-3">
                  {(() => {
                    const assetCounts = {};
                    alerts.forEach(a => {
                      assetCounts[a.asset_name] = (assetCounts[a.asset_name] || 0) + 1;
                    });
                    return Object.entries(assetCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([asset, count], idx) => (
                        <div key={asset} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{asset}</p>
                            <p className="text-xs text-gray-500">{count} attacks</p>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>

              {/* Threat Actor Summary */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Threat Actor Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="text-sm font-medium text-red-900">Active Threat Groups</p>
                      <p className="text-2xl font-bold text-red-600">
                        {new Set(alerts.map(a => a.threat_actor_group).filter(Boolean)).size}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <p className="text-sm font-medium text-orange-900">Coordinated Attacks</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {alerts.filter(a => a.correlation_alerts && a.correlation_alerts.length > 0).length}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <p className="text-sm font-medium text-purple-900">Unique Attack IPs</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {new Set(alerts.map(a => a.source_ip)).size}
                      </p>
                    </div>
                    <Shield className="w-8 h-8 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Export PDF Button */}
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  toast.info('📄 Generating PDF report...', { 
                    position: 'top-right',
                    autoClose: 2000 
                  });
                  
                  try {
                    // Dynamic import to avoid SSR issues
                    const { jsPDF } = await import('jspdf');
                    const doc = new jsPDF();
                    
                    // Title
                    doc.setFontSize(20);
                    doc.setTextColor(59, 130, 246); // Blue
                    doc.text('SOC Analytics Report', 20, 20);
                    
                    // Date
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
                    
                    // Summary Stats
                    doc.setFontSize(14);
                    doc.setTextColor(0, 0, 0);
                    doc.text('Summary Statistics', 20, 45);
                    
                    doc.setFontSize(10);
                    let yPos = 55;
                    
                    // Total Alerts
                    doc.text(`Total Alerts: ${alerts.length}`, 30, yPos);
                    yPos += 8;
                    
                    // Critical Alerts
                    const criticalCount = alerts.filter(a => 
                      a.priority_level === 'immediate' || a.severity === 'critical'
                    ).length;
                    doc.text(`Critical Alerts: ${criticalCount}`, 30, yPos);
                    yPos += 8;
                    
                    // Resolved
                    const resolvedCount = alerts.filter(a => a.status === 'resolved').length;
                    doc.text(`Resolved: ${resolvedCount}`, 30, yPos);
                    yPos += 8;
                    
                    // Resolution Rate
                    const resolutionRate = alerts.length > 0 
                      ? ((resolvedCount / alerts.length) * 100).toFixed(1) 
                      : '0';
                    doc.text(`Resolution Rate: ${resolutionRate}%`, 30, yPos);
                    yPos += 15;
                    
                    // Status Breakdown
                    doc.setFontSize(14);
                    doc.text('Status Breakdown', 20, yPos);
                    yPos += 10;
                    doc.setFontSize(10);
                    
                    const statuses = ['new', 'investigating', 'resolved', 'false_positive'];
                    statuses.forEach(status => {
                      const count = alerts.filter(a => a.status === status).length;
                      const percent = alerts.length > 0 ? ((count / alerts.length) * 100).toFixed(1) : '0';
                      doc.text(`  ${status.replace('_', ' ')}: ${count} (${percent}%)`, 30, yPos);
                      yPos += 7;
                    });
                    
                    yPos += 10;
                    
                    // Top Attack Types
                    doc.setFontSize(14);
                    doc.text('Top Attack Types', 20, yPos);
                    yPos += 10;
                    doc.setFontSize(10);
                    
                    const typeCounts = {};
                    alerts.forEach(a => {
                      typeCounts[a.alert_type] = (typeCounts[a.alert_type] || 0) + 1;
                    });
                    
                    Object.entries(typeCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .forEach(([type, count]) => {
                        doc.text(`  ${type.replace(/_/g, ' ')}: ${count}`, 30, yPos);
                        yPos += 7;
                      });
                    
                    yPos += 10;
                    
                    // Top Source IPs
                    doc.setFontSize(14);
                    doc.text('Top Attack Sources', 20, yPos);
                    yPos += 10;
                    doc.setFontSize(10);
                    
                    const ipCounts = {};
                    alerts.forEach(a => {
                      ipCounts[a.source_ip] = (ipCounts[a.source_ip] || 0) + 1;
                    });
                    
                    Object.entries(ipCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .forEach(([ip, count]) => {
                        doc.text(`  ${ip}: ${count} attacks`, 30, yPos);
                        yPos += 7;
                      });
                    
                    yPos += 10;
                    
                    // Top Targeted Assets
                    if (yPos > 250) {
                      doc.addPage();
                      yPos = 20;
                    }
                    
                    doc.setFontSize(14);
                    doc.text('Top Targeted Assets', 20, yPos);
                    yPos += 10;
                    doc.setFontSize(10);
                    
                    const assetCounts = {};
                    alerts.forEach(a => {
                      assetCounts[a.asset_name] = (assetCounts[a.asset_name] || 0) + 1;
                    });
                    
                    Object.entries(assetCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .forEach(([asset, count]) => {
                        doc.text(`  ${asset}: ${count} attacks`, 30, yPos);
                        yPos += 7;
                      });
                    
                    yPos += 15;
                    
                    // Footer
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text('SOC Operations Center - Enterprise Alert Management Platform', 20, 285);
                    
                    // Save PDF
                    doc.save(`SOC-Analytics-Report-${new Date().toISOString().split('T')[0]}.pdf`);
                    
                    toast.success('✅ PDF downloaded successfully!', {
                      position: 'top-right',
                      autoClose: 3000
                    });
                  } catch (error) {
                    console.error('PDF generation error:', error);
                    toast.error('❌ Failed to generate PDF', {
                      position: 'top-right',
                      autoClose: 3000
                    });
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center gap-2 font-medium shadow-lg"
              >
                <Download className="w-5 h-5" />
                Export Analytics to PDF
              </button>
            </div>
          </div>
        )}

        {/* Team View */}
        {activeView === 'team' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Performance
            </h2>
            <div className="space-y-4">
              {[
                { name: 'John Doe', role: 'Senior Analyst', alerts: 15, resolved: 12 },
                { name: 'Jane Smith', role: 'Analyst', alerts: 23, resolved: 18 },
                { name: 'Mike Johnson', role: 'Analyst', alerts: 19, resolved: 14 }
              ].map(analyst => (
                <div key={analyst.name} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">{analyst.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{analyst.name}</p>
                      <p className="text-sm text-gray-500">{analyst.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{analyst.alerts}</p>
                      <p className="text-xs text-gray-500">Active Alerts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{analyst.resolved}</p>
                      <p className="text-xs text-gray-500">Resolved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{((analyst.resolved/analyst.alerts)*100).toFixed(0)}%</p>
                      <p className="text-xs text-gray-500">Success Rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NEW: Attack Map View */}
        {activeView === 'attackmap' && (
          <AttackMap alerts={alerts} darkMode={darkMode} />
        )}
      </div>

      {/* Alert Detail Modal - Same as before but with playbook button */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setSelectedAlert(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start p-6 border-b">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Alert Investigation</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedAlert.alert_id}</p>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full border ${getStatusBadge(selectedAlert.status)}`}>
                      {selectedAlert.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {selectedAlert.assigned_to && (
                      <span className="ml-2 text-sm text-gray-600">
                        Assigned to: <span className="font-medium">{selectedAlert.assigned_to}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedAlert.status === 'new' && (
                    <>
                      <button onClick={startInvestigation} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Start Investigation
                      </button>
                      <button onClick={() => setShowPlaybookModal(true)} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Use Playbook
                      </button>
                    </>
                  )}
                  
                  {selectedAlert.status === 'investigating' && (
                    <>
                      <button onClick={() => closeInvestigation('resolved')} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Mark Resolved
                      </button>
                      <button onClick={() => closeInvestigation('false_positive')} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                        Mark as False Positive
                      </button>
                      <button onClick={escalateAlert} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Escalate
                      </button>
                    </>
                  )}
                  
                  {(selectedAlert.status === 'new' || selectedAlert.status === 'investigating') && (
                    <button onClick={() => setShowNoteModal(true)} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Note
                    </button>
                  )}
                </div>
              </div>

              {/* FEATURE 1: AI-POWERED SUMMARY */}
              {selectedAlert.ai_summary && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    AI-Powered Summary
                  </h4>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-4">
                    <p className="text-sm text-gray-900 leading-relaxed">{selectedAlert.ai_summary}</p>
                  </div>
                </div>
              )}

              {/* FEATURE 2: SUGGESTED PLAYBOOK */}
              {selectedAlert.suggested_playbook && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-500" />
                    Suggested Playbook ({selectedAlert.suggested_playbook.confidence}% match)
                  </h4>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="font-medium text-purple-900">{selectedAlert.suggested_playbook.name}</h5>
                      <div className="flex gap-2">
                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                          ⏱️ {selectedAlert.suggested_playbook.estimated_time}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedAlert.suggested_playbook.severity === 'critical' ? 'bg-red-200 text-red-800' :
                          selectedAlert.suggested_playbook.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {selectedAlert.suggested_playbook.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      {selectedAlert.suggested_playbook.steps?.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded border border-purple-100">
                          <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-gray-700 flex-1">{step}</span>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        const playbookText = selectedAlert.suggested_playbook.steps.join('\n\n');
                        setNewNote(`📋 PLAYBOOK: ${selectedAlert.suggested_playbook.name}\n\n${playbookText}`);
                        setShowNoteModal(true);
                      }}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Apply This Playbook to Notes
                    </button>
                  </div>
                </div>
              )}

              {/* FEATURE 8: CONTEXTUAL ENRICHMENT */}
              {selectedAlert.enrichment && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Threat Intelligence
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs text-gray-500 mb-1">🌍 Location</p>
                        <p className="text-sm font-medium">{selectedAlert.enrichment.country}, {selectedAlert.enrichment.city}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs text-gray-500 mb-1">🏢 ISP</p>
                        <p className="text-sm font-medium">{selectedAlert.enrichment.isp}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs text-gray-500 mb-1">🎯 Reputation</p>
                        <p className={`text-sm font-bold uppercase ${
                          selectedAlert.enrichment.reputation === 'malicious' ? 'text-red-600' :
                          selectedAlert.enrichment.reputation === 'suspicious' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {selectedAlert.enrichment.reputation}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs text-gray-500 mb-1">📊 Risk Score</p>
                        <p className="text-2xl font-bold text-red-600">{selectedAlert.enrichment.risk_score}/100</p>
                      </div>
                    </div>
                    
                    {selectedAlert.enrichment.blacklists && selectedAlert.enrichment.blacklists.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-xs font-semibold text-red-900 mb-2">🚫 Blacklisted On:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedAlert.enrichment.blacklists.map((bl, idx) => (
                            <span key={idx} className="text-xs bg-red-200 text-red-900 px-2 py-1 rounded font-medium">
                              {bl}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedAlert.enrichment.known_for && selectedAlert.enrichment.known_for.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-xs font-semibold text-yellow-900 mb-2">⚠️ Known For:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedAlert.enrichment.known_for.map((activity, idx) => (
                            <span key={idx} className="text-xs bg-yellow-200 text-yellow-900 px-2 py-1 rounded">
                              {activity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between bg-white p-3 rounded border">
                      <span className="text-sm text-gray-700">📈 Previous attacks from this IP:</span>
                      <span className="text-lg font-bold text-red-600">{selectedAlert.enrichment.previous_attacks}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* FEATURE 3: CORRELATED ALERTS (Attack Chain) */}
              {selectedAlert.correlation_alerts && selectedAlert.correlation_alerts.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-500" />
                    Attack Chain Detected ({selectedAlert.correlation_alerts.length} related alerts)
                  </h4>
                  <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-orange-900 font-medium">
                        ⚠️ This alert is part of a coordinated attack! Multiple related alerts detected from the same source.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {selectedAlert.correlation_alerts.slice(0, 5).map((alertId, idx) => {
                        const relatedAlert = alerts.find(a => a.alert_id === alertId);
                        return relatedAlert ? (
                          <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border border-orange-200">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-orange-600">{idx + 1}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{relatedAlert.alert_type.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-gray-500">{relatedAlert.alert_id} • {relatedAlert.asset_name}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setSelectedAlert(relatedAlert)}
                              className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                            >
                              View →
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                    {selectedAlert.correlation_alerts.length > 5 && (
                      <p className="text-xs text-orange-700 mt-3 text-center">
                        +{selectedAlert.correlation_alerts.length - 5} more related alerts
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* FEATURE 5: THREAT ACTOR */}
              {selectedAlert.threat_actor_group && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-500" />
                    Threat Actor Profile
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                          {selectedAlert.threat_actor_group.split('-')[1]}
                        </div>
                        <div>
                          <p className="font-bold text-red-900">{selectedAlert.threat_actor_group}</p>
                          <p className="text-xs text-red-700">Active Threat Actor</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded">
                        TRACKED
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      This attack is attributed to a tracked threat actor group. Multiple attacks from this actor have been detected. Review threat intelligence tab for complete profile and attack patterns.
                    </p>
                  </div>
                </div>
              )}

              {/* Rest of alert details same as before... */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Alert Information</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="text-sm font-medium">{selectedAlert.alert_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Severity</p>
                      <p className="text-sm font-medium">{selectedAlert.severity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Source IP</p>
                      <p className="text-sm font-medium">{selectedAlert.source_ip}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Destination</p>
                      <p className="text-sm font-medium">{selectedAlert.dest_ip}:{selectedAlert.dest_port}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Risk Assessment</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Risk Score</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold">{selectedAlert.risk_score}</p>
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                          <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${selectedAlert.risk_score}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ML Confidence</p>
                      <p className="text-sm font-medium">{(selectedAlert.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Classification</p>
                      <p className="text-sm font-medium">
                        {selectedAlert.is_true_positive ? '✓ True Positive' : '✗ False Positive'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Asset Context</h4>
                <div className="bg-gray-50 rounded p-4 space-y-2">
                  <p className="text-sm"><span className="font-medium">Name:</span> {selectedAlert.asset_name}</p>
                  <p className="text-sm"><span className="font-medium">Criticality:</span> {selectedAlert.asset_criticality}</p>
                  <p className="text-sm"><span className="font-medium">Function:</span> {selectedAlert.business_function}</p>
                  <p className="text-sm">
                    <span className="font-medium">Regulatory:</span>{' '}
                    {selectedAlert.regulatory_frameworks.length > 0 ? selectedAlert.regulatory_frameworks.join(', ') : 'None'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Recommended Action</h4>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-900">{selectedAlert.recommended_action}</p>
                </div>
              </div>

              {selectedAlert.notes && selectedAlert.notes.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Investigation Notes</h4>
                  <div className="space-y-3">
                    {selectedAlert.notes.map((note) => (
                      <div key={note.note_id} className="bg-gray-50 rounded p-3 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-gray-900">{note.author}</span>
                          <span className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAlert.history && selectedAlert.history.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Activity History</h4>
                  <div className="space-y-2">
                    {selectedAlert.history.map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          {idx < selectedAlert.history.length - 1 && <div className="w-0.5 flex-1 bg-gray-300 my-1"></div>}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium text-gray-900">{item.action.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">{item.author} • {new Date(item.timestamp).toLocaleString()}</p>
                          {item.notes && <p className="text-sm text-gray-700 mt-1">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* NEW: Run Playbook Button */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setPlaybookAlert(selectedAlert);
                  setShowPlaybookRunner(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center gap-2 font-medium shadow-lg"
              >
                <Play className="w-5 h-5" />
                Run Automated Playbook
              </button>
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowNoteModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Investigation Note</h3>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              rows="6"
              placeholder="Enter your investigation notes..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            ></textarea>
            <div className="flex gap-3">
              <button onClick={addNote} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Add Note
              </button>
              <button onClick={() => { setShowNoteModal(false); setNewNote(''); }} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playbook Modal */}
      {showPlaybookModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowPlaybookModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Select Investigation Playbook</h3>
            <div className="space-y-3">
              <button onClick={() => applyPlaybook('malware')} className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 text-left">
                <h4 className="font-semibold text-gray-900">Malware Analysis</h4>
                <p className="text-sm text-gray-500">Standard procedures for malware investigation</p>
              </button>
              <button onClick={() => applyPlaybook('bruteforce')} className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 text-left">
                <h4 className="font-semibold text-gray-900">Brute Force Attack</h4>
                <p className="text-sm text-gray-500">Steps for brute force incident response</p>
              </button>
              <button onClick={() => applyPlaybook('phishing')} className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 text-left">
                <h4 className="font-semibold text-gray-900">Phishing Investigation</h4>
                <p className="text-sm text-gray-500">Email threat analysis workflow</p>
              </button>
            </div>
            <button onClick={() => setShowPlaybookModal(false)} className="mt-4 w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FEATURE 4: SHIFT REPORT MODAL */}
      {showShiftReport && shiftReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setShowShiftReport(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-7 h-7" />
                    Shift Handover Report
                  </h3>
                  <p className="text-purple-100 text-sm mt-1">
                    Generated: {new Date(shiftReport.generated_at).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setShowShiftReport(false)} className="text-white hover:bg-white/20 p-2 rounded">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Shift Summary */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 text-lg mb-4">📊 Shift Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600 mb-1">Total Alerts</p>
                    <p className="text-3xl font-bold text-blue-900">{shiftReport.shift_summary.total_alerts}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-600 mb-1">New</p>
                    <p className="text-3xl font-bold text-yellow-900">{shiftReport.shift_summary.new}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-600 mb-1">Investigating</p>
                    <p className="text-3xl font-bold text-orange-900">{shiftReport.shift_summary.investigating}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600 mb-1">Resolved</p>
                    <p className="text-3xl font-bold text-green-900">{shiftReport.shift_summary.resolved}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">False Positives</p>
                    <p className="text-3xl font-bold text-gray-900">{shiftReport.shift_summary.false_positives}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600 mb-1">Escalated</p>
                    <p className="text-3xl font-bold text-red-900">{shiftReport.shift_summary.escalated}</p>
                  </div>
                </div>
              </div>

              {/* Critical Items */}
              {shiftReport.critical_items && shiftReport.critical_items.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    ⚠️ Critical Items Requiring Attention
                  </h4>
                  <div className="space-y-3">
                    {shiftReport.critical_items.map((item, idx) => (
                      <div key={idx} className="bg-red-50 border-l-4 border-red-500 rounded p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-red-900">{item.alert_id} - {item.type.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-gray-700 mt-1">{item.asset}</p>
                            <p className="text-sm text-gray-600 mt-2">{item.summary}</p>
                          </div>
                          <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">CRITICAL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outstanding Items */}
              {shiftReport.outstanding_items && shiftReport.outstanding_items.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 text-lg mb-4">📋 Outstanding Items for Next Shift</h4>
                  <div className="bg-gray-50 border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Alert ID</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Assigned To</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftReport.outstanding_items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-3 text-sm font-medium">{item.alert_id}</td>
                            <td className="px-4 py-3 text-sm">{item.type.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 text-sm">{item.assigned_to || '-'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">{item.status}</span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${
                                item.priority === 'immediate' ? 'bg-red-100 text-red-800' :
                                item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.priority}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Threat Intelligence */}
              {shiftReport.threat_intelligence && (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 text-lg mb-4">🎯 Threat Intelligence Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-purple-600 mb-2">Active Threat Actors</p>
                      <p className="text-4xl font-bold text-purple-900">{shiftReport.threat_intelligence.active_threat_actors}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-600 mb-2">Top Threats</p>
                      <div className="space-y-1">
                        {shiftReport.threat_intelligence.top_threats.slice(0, 3).map((threat, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-700">{threat.type.replace(/_/g, ' ')}</span>
                            <span className="font-bold text-blue-900">{threat.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {shiftReport.recommendations && (
                <div>
                  <h4 className="font-bold text-gray-900 text-lg mb-4">💡 Recommendations</h4>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded p-4">
                    <ul className="space-y-2">
                      {shiftReport.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600 font-bold">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-lg">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const reportText = JSON.stringify(shiftReport, null, 2);
                    const blob = new Blob([reportText], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `shift-report-${new Date().toISOString()}.json`;
                    a.click();
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download JSON
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const { jsPDF } = await import('jspdf');
                      const doc = new jsPDF();
                      
                      // Title
                      doc.setFontSize(18);
                      doc.setTextColor(147, 51, 234); // Purple
                      doc.text('Shift Handover Report', 20, 20);
                      
                      doc.setFontSize(10);
                      doc.setTextColor(100, 100, 100);
                      doc.text(`Generated: ${new Date(shiftReport.generated_at).toLocaleString()}`, 20, 28);
                      
                      let y = 40;
                      
                      // Summary
                      doc.setFontSize(14);
                      doc.setTextColor(0, 0, 0);
                      doc.text('Shift Summary', 20, y);
                      y += 10;
                      
                      doc.setFontSize(10);
                      doc.text(`Total Alerts: ${shiftReport.shift_summary.total_alerts}`, 30, y); y += 7;
                      doc.text(`New: ${shiftReport.shift_summary.new}`, 30, y); y += 7;
                      doc.text(`Investigating: ${shiftReport.shift_summary.investigating}`, 30, y); y += 7;
                      doc.text(`Resolved: ${shiftReport.shift_summary.resolved}`, 30, y); y += 7;
                      doc.text(`False Positives: ${shiftReport.shift_summary.false_positives}`, 30, y); y += 7;
                      doc.text(`Escalated: ${shiftReport.shift_summary.escalated}`, 30, y); y += 12;
                      
                      // Critical Items
                      if (shiftReport.critical_items && shiftReport.critical_items.length > 0) {
                        doc.setFontSize(14);
                        doc.text('Critical Items', 20, y);
                        y += 10;
                        doc.setFontSize(10);
                        
                        shiftReport.critical_items.slice(0, 5).forEach(item => {
                          doc.text(`• ${item.alert_id} - ${item.type}`, 30, y);
                          y += 7;
                        });
                        y += 5;
                      }
                      
                      // Outstanding Items
                      if (shiftReport.outstanding_items && shiftReport.outstanding_items.length > 0) {
                        doc.setFontSize(14);
                        doc.text('Outstanding Items', 20, y);
                        y += 10;
                        doc.setFontSize(10);
                        
                        shiftReport.outstanding_items.slice(0, 5).forEach(item => {
                          doc.text(`• ${item.alert_id} - ${item.assigned_to || 'Unassigned'}`, 30, y);
                          y += 7;
                        });
                        y += 5;
                      }
                      
                      // Recommendations
                      if (shiftReport.recommendations) {
                        if (y > 250) {
                          doc.addPage();
                          y = 20;
                        }
                        doc.setFontSize(14);
                        doc.text('Recommendations', 20, y);
                        y += 10;
                        doc.setFontSize(10);
                        
                        shiftReport.recommendations.forEach(rec => {
                          doc.text(`• ${rec}`, 30, y);
                          y += 7;
                        });
                      }
                      
                      doc.save(`Shift-Report-${new Date().toISOString().split('T')[0]}.pdf`);
                      toast.success('✅ Shift report PDF downloaded!', { autoClose: 2000 });
                    } catch (error) {
                      toast.error('❌ Failed to generate PDF', { autoClose: 2000 });
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded hover:from-red-700 hover:to-pink-700 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Download PDF
                </button>
                
                <button
                  onClick={() => setShowShiftReport(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE 5: THREAT ACTORS MODAL */}
      {showThreatActors && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setShowThreatActors(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 rounded-t-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Users className="w-7 h-7" />
                    Threat Actor Intelligence
                  </h3>
                  <p className="text-red-100 text-sm mt-1">
                    {threatActors.length} active threat actor group{threatActors.length !== 1 ? 's' : ''} detected
                  </p>
                </div>
                <button onClick={() => setShowThreatActors(false)} className="text-white hover:bg-white/20 p-2 rounded">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                {threatActors.map((actor, idx) => (
                  <div key={idx} className={`border-2 rounded-lg p-5 ${
                    actor.risk === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                    actor.risk === 'HIGH' ? 'border-orange-500 bg-orange-50' :
                    'border-yellow-500 bg-yellow-50'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                          actor.risk === 'CRITICAL' ? 'bg-red-600' :
                          actor.risk === 'HIGH' ? 'bg-orange-600' :
                          'bg-yellow-600'
                        }`}>
                          {actor.id.split('-')[1]}
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">{actor.id}</h4>
                          <p className="text-sm text-gray-600">{actor.classification}</p>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full font-bold text-sm ${
                        actor.risk === 'CRITICAL' ? 'bg-red-600 text-white' :
                        actor.risk === 'HIGH' ? 'bg-orange-600 text-white' :
                        'bg-yellow-600 text-white'
                      }`}>
                        {actor.risk}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white rounded p-3 border">
                        <p className="text-xs text-gray-500 mb-1">Total Alerts</p>
                        <p className="text-2xl font-bold text-gray-900">{actor.alert_count}</p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <p className="text-xs text-gray-500 mb-1">First Seen</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(actor.first_seen).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <p className="text-xs text-gray-500 mb-1">Known IPs</p>
                        <p className="text-2xl font-bold text-gray-900">{actor.ips.length}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">ASSOCIATED IPs:</p>
                      <div className="flex flex-wrap gap-2">
                        {actor.ips.slice(0, 5).map((ip, ipIdx) => (
                          <span key={ipIdx} className="px-2 py-1 bg-white border rounded text-xs font-mono">
                            {ip}
                          </span>
                        ))}
                        {actor.ips.length > 5 && (
                          <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                            +{actor.ips.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">ATTACK TYPES:</p>
                      <div className="flex flex-wrap gap-2">
                        {actor.attack_types.map((type, typeIdx) => (
                          <span key={typeIdx} className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-medium">
                            {type.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {threatActors.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No threat actor groups detected yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowThreatActors(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* NEW: Playbook Runner Modal */}
      {showPlaybookRunner && playbookAlert && (
        <PlaybookRunner
          alertId={playbookAlert.alert_id}
          alertType={playbookAlert.alert_type}
          darkMode={darkMode}
          onClose={() => {
            setShowPlaybookRunner(false);
            setPlaybookAlert(null);
          }}
        />
      )}

      {/* NEW: Live Feed Sidebar - Toggleable */}
      {showLiveFeed && (
        <div className={`fixed right-0 top-[4.5rem] bottom-0 w-80 shadow-2xl z-30 ${
          darkMode ? 'bg-slate-800' : 'bg-white'
        }`}>
          <LiveFeed 
            apiUrl={API_URL}
            darkMode={darkMode}
            onAlertClick={(alertId) => {
              const alert = alerts.find(a => a.alert_id === alertId);
              if (alert) setSelectedAlert(alert);
            }}
          />
        </div>
      )}
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
