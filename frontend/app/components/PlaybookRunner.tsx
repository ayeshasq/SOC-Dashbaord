'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, CheckCircle, Loader } from 'lucide-react';

interface PlaybookStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration: number;
}

interface Playbook {
  name: string;
  description: string;
  estimatedTime: number;
  steps: PlaybookStep[];
}

interface PlaybookRunnerProps {
  alertId: string;
  alertType: string;
  darkMode: boolean;
  onClose: () => void;
}

export default function PlaybookRunner({ alertId, alertType, darkMode, onClose }: PlaybookRunnerProps) {
  const [selectedPlaybook, setSelectedPlaybook] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<PlaybookStep[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Available playbooks
  const playbooks: Record<string, Playbook> = {
    'malware': {
      name: 'Malware Response',
      description: 'Comprehensive malware investigation and remediation',
      estimatedTime: 30,
      steps: [
        { id: '1', description: 'Isolate affected host from network', status: 'pending', duration: 2 },
        { id: '2', description: 'Block malicious IP at firewall', status: 'pending', duration: 1 },
        { id: '3', description: 'Notify security team via Slack', status: 'pending', duration: 1 },
        { id: '4', description: 'Collect memory dump for analysis', status: 'pending', duration: 15 },
        { id: '5', description: 'Scan network for lateral movement', status: 'pending', duration: 30 },
        { id: '6', description: 'Generate incident report', status: 'pending', duration: 5 }
      ]
    },
    'brute_force': {
      name: 'Brute Force Mitigation',
      description: 'Stop brute force attacks and secure credentials',
      estimatedTime: 20,
      steps: [
        { id: '1', description: 'Block source IP address', status: 'pending', duration: 1 },
        { id: '2', description: 'Reset affected user credentials', status: 'pending', duration: 2 },
        { id: '3', description: 'Enable MFA for user account', status: 'pending', duration: 3 },
        { id: '4', description: 'Review access logs', status: 'pending', duration: 10 },
        { id: '5', description: 'Notify user of suspicious activity', status: 'pending', duration: 2 }
      ]
    },
    'data_exfiltration': {
      name: 'Data Exfiltration Response',
      description: 'Investigate and contain data exfiltration attempts',
      estimatedTime: 45,
      steps: [
        { id: '1', description: 'Block outbound connection', status: 'pending', duration: 1 },
        { id: '2', description: 'Isolate affected systems', status: 'pending', duration: 2 },
        { id: '3', description: 'Analyze exfiltrated data volume', status: 'pending', duration: 10 },
        { id: '4', description: 'Check for data encryption', status: 'pending', duration: 5 },
        { id: '5', description: 'Review file access logs', status: 'pending', duration: 15 },
        { id: '6', description: 'Identify data classification', status: 'pending', duration: 8 },
        { id: '7', description: 'Notify legal and compliance', status: 'pending', duration: 2 },
        { id: '8', description: 'Generate forensic report', status: 'pending', duration: 10 }
      ]
    },
    'port_scan': {
      name: 'Port Scan Investigation',
      description: 'Investigate reconnaissance activity',
      estimatedTime: 15,
      steps: [
        { id: '1', description: 'Log scanning activity', status: 'pending', duration: 1 },
        { id: '2', description: 'Block source IP', status: 'pending', duration: 1 },
        { id: '3', description: 'Check for open ports on target', status: 'pending', duration: 5 },
        { id: '4', description: 'Review firewall rules', status: 'pending', duration: 8 }
      ]
    },
    'phishing': {
      name: 'Phishing Response',
      description: 'Respond to phishing attempts',
      estimatedTime: 25,
      steps: [
        { id: '1', description: 'Quarantine malicious email', status: 'pending', duration: 1 },
        { id: '2', description: 'Block sender domain', status: 'pending', duration: 2 },
        { id: '3', description: 'Search for similar emails', status: 'pending', duration: 10 },
        { id: '4', description: 'Notify affected users', status: 'pending', duration: 5 },
        { id: '5', description: 'Update email filters', status: 'pending', duration: 7 }
      ]
    },
    'ddos': {
      name: 'DDoS Mitigation',
      description: 'Mitigate distributed denial of service',
      estimatedTime: 30,
      steps: [
        { id: '1', description: 'Activate DDoS protection', status: 'pending', duration: 2 },
        { id: '2', description: 'Analyze traffic patterns', status: 'pending', duration: 10 },
        { id: '3', description: 'Block attacking IPs', status: 'pending', duration: 5 },
        { id: '4', description: 'Scale infrastructure', status: 'pending', duration: 15 },
        { id: '5', description: 'Monitor mitigation effectiveness', status: 'pending', duration: 20 },
        { id: '6', description: 'Document attack patterns', status: 'pending', duration: 8 }
      ]
    }
  };

  // Auto-select recommended playbook based on alert type
  useEffect(() => {
    const type = alertType.toLowerCase().replace(/_/g, ' ');
    if (type.includes('malware') || type.includes('ransomware')) {
      setSelectedPlaybook('malware');
    } else if (type.includes('brute') || type.includes('force')) {
      setSelectedPlaybook('brute_force');
    } else if (type.includes('exfil')) {
      setSelectedPlaybook('data_exfiltration');
    } else if (type.includes('scan')) {
      setSelectedPlaybook('port_scan');
    } else if (type.includes('phish')) {
      setSelectedPlaybook('phishing');
    } else if (type.includes('ddos') || type.includes('dos')) {
      setSelectedPlaybook('ddos');
    } else {
      setSelectedPlaybook('malware'); // default
    }
  }, [alertType]);

  useEffect(() => {
    if (selectedPlaybook) {
      setSteps(playbooks[selectedPlaybook].steps.map(s => ({ ...s })));
    }
  }, [selectedPlaybook]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused, startTime]);

  const executePlaybook = async () => {
    setIsRunning(true);
    setStartTime(Date.now());
    setCurrentStepIndex(0);

    for (let i = 0; i < steps.length; i++) {
      if (isPaused) break;
      
      setCurrentStepIndex(i);
      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'running' } : s
      ));

      await new Promise(resolve => setTimeout(resolve, steps[i].duration * 1000));

      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'completed' } : s
      ));
    }

    setIsRunning(false);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const stopPlaybook = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStepIndex(0);
    setSteps(playbooks[selectedPlaybook].steps.map(s => ({ ...s, status: 'pending' })));
  };

  const progress = steps.length > 0 ? (steps.filter(s => s.status === 'completed').length / steps.length) * 100 : 0;
  const timeSaved = Math.max(0, 1800 - elapsedTime / 1000); // Assume 30 min manual vs automated

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
        darkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className={`sticky top-0 p-6 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-2xl font-bold mb-2">🤖 Automated Investigation Playbook</h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Alert: {alertId} - {alertType}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Playbook Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Playbook:</label>
            <div className="space-y-2">
              {Object.entries(playbooks).map(([key, pb]) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPlaybook === key
                      ? darkMode ? 'bg-blue-900 border-blue-500' : 'bg-blue-50 border-blue-300'
                      : darkMode ? 'bg-slate-700 hover:bg-slate-600 border-slate-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  } border`}
                >
                  <input
                    type="radio"
                    name="playbook"
                    value={key}
                    checked={selectedPlaybook === key}
                    onChange={(e) => setSelectedPlaybook(e.target.value)}
                    disabled={isRunning}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{pb.name}</div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {pb.description} • ~{pb.estimatedTime}s
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress: {Math.round(progress)}%</span>
                <span>{Math.round(elapsedTime / 1000)}s elapsed</span>
              </div>
              <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`p-3 rounded-lg flex items-start gap-3 ${
                  step.status === 'completed' ? darkMode ? 'bg-green-900/30' : 'bg-green-50'
                  : step.status === 'running' ? darkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                  : darkMode ? 'bg-slate-700' : 'bg-gray-50'
                }`}
              >
                <div className="mt-0.5">
                  {step.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {step.status === 'running' && <Loader className="w-5 h-5 text-blue-500 animate-spin" />}
                  {step.status === 'pending' && <Clock className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-600' : ''
                  }`}>
                    {step.description}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Duration: {step.duration}s
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Time Saved */}
          {isRunning && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'} border`}>
              <div className="text-sm font-medium">⚡ Time Saved</div>
              <div className="text-2xl font-bold text-purple-600">
                ~{Math.round(timeSaved / 60)} minutes
              </div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                vs manual investigation (~30 mins)
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={executePlaybook}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 flex items-center justify-center gap-2 font-medium"
              >
                <Play className="w-5 h-5" />
                Execute Playbook
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${
                    darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={stopPlaybook}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-medium"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className={`px-4 py-3 rounded-lg border ${
                darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
