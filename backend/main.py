from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import random
import json
import asyncio

app = FastAPI(title="SOC Operations API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
alerts_db = {}
notes_db = {}
status_db = {}
threat_actors_db = {}
false_positive_patterns = []
alert_groups = {}

# WebSocket connections for Live Feed
active_connections: List[WebSocket] = []

# Models
class Alert(BaseModel):
    alert_id: str
    timestamp: str
    alert_type: str
    severity: str
    source_ip: str
    dest_ip: str
    dest_port: int
    signature_name: str

class AlertPrediction(BaseModel):
    alert_id: str
    timestamp: str
    alert_type: str
    severity: str
    source_ip: str
    dest_ip: str
    dest_port: int
    signature_name: str
    risk_score: float
    confidence: float
    is_true_positive: bool
    priority_level: str
    recommended_action: str
    asset_name: str
    asset_criticality: str
    business_function: str
    regulatory_frameworks: List[str]
    status: str = "new"
    assigned_to: Optional[str] = None
    notes: List[dict] = []
    history: List[dict] = []
    # NEW: Enhanced fields
    ai_summary: Optional[str] = None
    suggested_playbook: Optional[dict] = None
    threat_actor_group: Optional[str] = None
    enrichment: Optional[dict] = None
    correlation_alerts: List[str] = []
    
class InvestigationAction(BaseModel):
    alert_id: str
    author: str
    action: str
    notes: str

class Note(BaseModel):
    note_id: str
    alert_id: str
    author: str
    note: str
    timestamp: str

# =====================================================
# FEATURE 1: CONTEXTUAL ENRICHMENT
# =====================================================
def enrich_ip(ip: str) -> dict:
    """Enrich IP with threat intelligence"""
    # Simulated threat intel data
    malicious_ips = {
        "203.0.113.45": {
            "country": "Russia",
            "city": "Moscow",
            "isp": "Sketchy Hosting Ltd",
            "reputation": "malicious",
            "blacklists": ["VirusTotal", "AbuseIPDB", "Spamhaus"],
            "previous_attacks": 47,
            "known_for": ["Ransomware", "DDoS", "Data Exfiltration"],
            "risk_score": 95
        },
        "198.51.100.23": {
            "country": "China",
            "city": "Beijing",
            "isp": "China Telecom",
            "reputation": "suspicious",
            "blacklists": ["AbuseIPDB"],
            "previous_attacks": 12,
            "known_for": ["Port Scanning", "Brute Force"],
            "risk_score": 75
        },
        "185.220.101.5": {
            "country": "Netherlands",
            "city": "Amsterdam",
            "isp": "Anonymous VPN Services",
            "reputation": "suspicious",
            "blacklists": ["VirusTotal"],
            "previous_attacks": 8,
            "known_for": ["APT Activity", "Lateral Movement"],
            "risk_score": 85
        }
    }
    
    # Check if IP is known malicious
    if ip in malicious_ips:
        return malicious_ips[ip]
    
    # Default for unknown IPs
    return {
        "country": "Unknown",
        "city": "Unknown",
        "isp": "Unknown ISP",
        "reputation": "unknown",
        "blacklists": [],
        "previous_attacks": 0,
        "known_for": [],
        "risk_score": 50
    }

# =====================================================
# FEATURE 2: AI-POWERED ALERT SUMMARIZATION
# =====================================================
def generate_ai_summary(alert: Alert, enrichment: dict) -> str:
    """Generate AI-powered alert summary"""
    summaries = {
        "malware_detection": f"🦠 Malware detected on {alert.signature_name}. Source IP {alert.source_ip} from {enrichment.get('country', 'Unknown')} attempted to compromise system. {enrichment.get('previous_attacks', 0)} previous attacks from this IP. RECOMMENDATION: Immediate isolation and forensic analysis required.",
        
        "brute_force": f"🔐 Brute force attack detected. Attacker from {alert.source_ip} ({enrichment.get('country', 'Unknown')}) attempting unauthorized access via port {alert.dest_port}. IP has {enrichment.get('previous_attacks', 0)} previous incidents. RECOMMENDATION: Enable account lockout and investigate successful logins.",
        
        "data_exfiltration": f"📤 Data exfiltration attempt detected! Large data transfer to {alert.source_ip} in {enrichment.get('country', 'Unknown')}. IP known for {', '.join(enrichment.get('known_for', ['suspicious activity']))}. CRITICAL: Check for data breach and secure sensitive files immediately.",
        
        "port_scan": f"🔍 Network reconnaissance detected. Attacker at {alert.source_ip} ({enrichment.get('isp', 'Unknown ISP')}) scanning network infrastructure. Risk score: {enrichment.get('risk_score', 50)}/100. RECOMMENDATION: Block IP and review firewall rules.",
        
        "phishing": f"🎣 Phishing attempt detected. Malicious email/link from {alert.source_ip}. Sender known for {', '.join(enrichment.get('known_for', ['phishing campaigns']))}. RECOMMENDATION: Block sender, notify affected users, and scan for similar emails.",
        
        "ddos_attack": f"⚡ DDoS attack in progress! Massive traffic from {alert.source_ip} ({enrichment.get('country', 'Unknown')}). {enrichment.get('previous_attacks', 0)} previous DDoS incidents. URGENT: Enable DDoS mitigation and contact ISP.",
        
        "lateral_movement": f"↔️ Lateral movement detected! Attacker moving from {alert.source_ip} to {alert.dest_ip}. Pattern indicates {enrichment.get('known_for', ['advanced persistent threat'])[0] if enrichment.get('known_for') else 'suspicious activity'}. CRITICAL: Isolate affected systems and hunt for compromised credentials.",
        
        "insider_threat": f"👤 Insider threat activity detected. Unusual behavior from internal user accessing {alert.dest_ip}. Pattern: {alert.signature_name}. RECOMMENDATION: Review access logs and user behavior analytics.",
    }
    
    return summaries.get(alert.alert_type, f"⚠️ Security alert: {alert.signature_name} detected from {alert.source_ip}. Requires immediate investigation.")

# =====================================================
# FEATURE 3: AUTOMATED PLAYBOOK SUGGESTIONS
# =====================================================
def suggest_playbook(alert: Alert) -> dict:
    """Suggest investigation playbook based on alert type"""
    playbooks = {
        "malware_detection": {
            "name": "Malware Incident Response",
            "confidence": 95,
            "steps": [
                "🔒 Isolate affected system immediately",
                "💾 Capture memory dump for analysis",
                "🔍 Run full antivirus scan",
                "📊 Analyze malware sample in sandbox",
                "🔎 Check for lateral movement indicators",
                "🛡️ Update signatures and IOCs",
                "📝 Document findings and timeline"
            ],
            "estimated_time": "45-60 minutes",
            "severity": "high",
            "automation_available": True
        },
        "brute_force": {
            "name": "Brute Force Attack Response",
            "confidence": 92,
            "steps": [
                "🔐 Check account lockout policy",
                "📊 Review failed login attempts",
                "✅ Verify if any logins succeeded",
                "🚫 Block source IP at firewall",
                "🔄 Force password reset for targeted accounts",
                "📧 Notify affected users",
                "🔍 Check for credential stuffing patterns"
            ],
            "estimated_time": "30-45 minutes",
            "severity": "medium",
            "automation_available": True
        },
        "data_exfiltration": {
            "name": "Data Breach Response",
            "confidence": 98,
            "steps": [
                "🚨 ESCALATE TO TIER 2 IMMEDIATELY",
                "🔒 Block outbound connections to IP",
                "📊 Identify what data was accessed",
                "🔍 Review logs for timeline of events",
                "💼 Notify legal/compliance team",
                "📝 Preserve evidence for forensics",
                "🛡️ Implement DLP controls"
            ],
            "estimated_time": "2-4 hours",
            "severity": "critical",
            "automation_available": False
        },
        "port_scan": {
            "name": "Network Reconnaissance Response",
            "confidence": 88,
            "steps": [
                "🚫 Block source IP at perimeter",
                "🔍 Check if scan was internal or external",
                "📊 Identify systems that were scanned",
                "🛡️ Review firewall rules",
                "🔎 Check for follow-up attacks",
                "📝 Document scan pattern",
                "⚠️ Monitor for 24 hours"
            ],
            "estimated_time": "20-30 minutes",
            "severity": "low",
            "automation_available": True
        },
        "phishing": {
            "name": "Phishing Investigation",
            "confidence": 94,
            "steps": [
                "📧 Quarantine malicious email",
                "🔍 Analyze email headers and links",
                "👥 Identify all recipients",
                "🚫 Block sender domain",
                "🔎 Check if links were clicked",
                "📊 Scan for similar emails",
                "📣 Send security awareness alert"
            ],
            "estimated_time": "30-40 minutes",
            "severity": "medium",
            "automation_available": True
        }
    }
    
    default_playbook = {
        "name": "Standard Investigation",
        "confidence": 70,
        "steps": [
            "🔍 Gather all available evidence",
            "📊 Analyze alert context",
            "🔎 Check related alerts",
            "📝 Document findings",
            "⚠️ Escalate if needed"
        ],
        "estimated_time": "30 minutes",
        "severity": "medium",
        "automation_available": False
    }
    
    return playbooks.get(alert.alert_type, default_playbook)

# =====================================================
# FEATURE 4: THREAT ACTOR PROFILING
# =====================================================
def identify_threat_actor(source_ip: str, alert_type: str) -> str:
    """Group alerts by threat actor patterns"""
    # Track threat actor patterns
    for actor_id, actor_data in threat_actors_db.items():
        if source_ip in actor_data.get("ips", []):
            return actor_id
    
    # Create new threat actor group
    actor_id = f"TA-{len(threat_actors_db) + 1:03d}"
    
    # Classify based on behavior
    if alert_type in ["malware_detection", "lateral_movement", "data_exfiltration"]:
        classification = "Advanced Persistent Threat"
        risk = "CRITICAL"
    elif alert_type in ["ddos_attack", "brute_force"]:
        classification = "Cybercriminal Group"
        risk = "HIGH"
    elif alert_type in ["port_scan", "suspicious_process"]:
        classification = "Script Kiddie"
        risk = "LOW"
    else:
        classification = "Unknown Actor"
        risk = "MEDIUM"
    
    threat_actors_db[actor_id] = {
        "ips": [source_ip],
        "classification": classification,
        "risk": risk,
        "first_seen": datetime.utcnow().isoformat(),
        "alert_count": 1,
        "attack_types": [alert_type]
    }
    
    return actor_id

# =====================================================
# FEATURE 5: ALERT CORRELATION
# =====================================================
def correlate_alerts(alert: Alert) -> List[str]:
    """Find related alerts (attack chain detection)"""
    correlated = []
    
    for alert_id, stored_alert in alerts_db.items():
        if alert_id == alert.alert_id:
            continue
            
        # Same source IP within 1 hour
        alert_time = datetime.fromisoformat(alert.timestamp.replace('Z', '+00:00'))
        stored_time = datetime.fromisoformat(stored_alert.timestamp.replace('Z', '+00:00'))
        time_diff = abs((alert_time - stored_time).total_seconds())
        
        if stored_alert.source_ip == alert.source_ip and time_diff < 3600:
            correlated.append(alert_id)
            
        # Related attack chain patterns
        attack_chains = {
            "port_scan": ["brute_force", "malware_detection"],
            "brute_force": ["lateral_movement", "data_exfiltration"],
            "malware_detection": ["lateral_movement", "data_exfiltration"]
        }
        
        if stored_alert.alert_type in attack_chains.get(alert.alert_type, []):
            if time_diff < 7200:  # 2 hours
                correlated.append(alert_id)
    
    return correlated[:10]  # Limit to 10 related alerts

# =====================================================
# FEATURE 6: SMART ALERT GROUPING
# =====================================================
def group_similar_alerts(alert: Alert) -> Optional[str]:
    """Group similar alerts together"""
    group_key = f"{alert.alert_type}_{alert.source_ip}_{alert.dest_port}"
    
    if group_key in alert_groups:
        alert_groups[group_key]["count"] += 1
        alert_groups[group_key]["alert_ids"].append(alert.alert_id)
        return group_key
    
    alert_groups[group_key] = {
        "count": 1,
        "alert_ids": [alert.alert_id],
        "type": alert.alert_type,
        "source_ip": alert.source_ip,
        "first_seen": alert.timestamp
    }
    
    return group_key if alert_groups[group_key]["count"] > 1 else None

# Continue in next part...

# =====================================================
# CORE PREDICTION FUNCTION (Enhanced)
# =====================================================
def mock_predict(alert: Alert) -> AlertPrediction:
    """Enhanced prediction with all new features"""
    
    # Asset mapping
    asset_map = {
        "10.0.1.50": {"name": "Payment Server", "criticality": "critical", "function": "finance", "regulatory": ["pci_dss", "sox"]},
        "10.0.1.51": {"name": "Customer DB", "criticality": "critical", "function": "customer_data", "regulatory": ["gdpr", "hipaa"]},
        "10.0.1.52": {"name": "Employee DB", "criticality": "critical", "function": "hr", "regulatory": ["gdpr"]},
        "10.0.2.100": {"name": "CRM System", "criticality": "high", "function": "operations", "regulatory": ["gdpr"]},
        "10.0.2.101": {"name": "Email Server", "criticality": "high", "function": "communications", "regulatory": []},
        "10.0.2.102": {"name": "Web Server", "criticality": "high", "function": "public_facing", "regulatory": []},
        "10.0.3.20": {"name": "HR System", "criticality": "high", "function": "hr", "regulatory": ["sox"]},
        "10.0.3.21": {"name": "Payroll System", "criticality": "high", "function": "finance", "regulatory": ["sox"]},
        "10.0.3.22": {"name": "File Server", "criticality": "medium", "function": "storage", "regulatory": []},
        "10.0.10.50": {"name": "Dev Server", "criticality": "medium", "function": "development", "regulatory": []},
        "10.0.10.51": {"name": "Test Server", "criticality": "low", "function": "testing", "regulatory": []},
        "10.0.10.52": {"name": "Staging Server", "criticality": "medium", "function": "staging", "regulatory": []},
        "10.0.20.10": {"name": "VPN Gateway", "criticality": "critical", "function": "security", "regulatory": []},
        "10.0.20.11": {"name": "Firewall", "criticality": "critical", "function": "security", "regulatory": []},
        "10.0.30.5": {"name": "Workstation-001", "criticality": "low", "function": "endpoint", "regulatory": []},
        "10.0.30.6": {"name": "Workstation-002", "criticality": "low", "function": "endpoint", "regulatory": []},
    }
    
    asset_info = asset_map.get(alert.dest_ip, {
        "name": "Unknown Asset",
        "criticality": "medium",
        "function": "unknown",
        "regulatory": []
    })
    
    # Calculate risk score
    severity_scores = {"critical": 90, "high": 70, "medium": 50, "low": 30}
    asset_scores = {"critical": 30, "high": 20, "medium": 10, "low": 5}
    
    base_score = severity_scores.get(alert.severity, 50)
    asset_score = asset_scores.get(asset_info["criticality"], 10)
    risk_score = min(base_score + asset_score, 100)
    
    # Determine if true positive
    is_true_positive = random.random() > 0.15
    confidence = random.uniform(0.75, 0.95) if is_true_positive else random.uniform(0.3, 0.6)
    
    # Priority determination
    if risk_score >= 80:
        priority = "immediate"
    elif risk_score >= 60:
        priority = "high"
    elif risk_score >= 40:
        priority = "medium"
    elif is_true_positive:
        priority = "low"
    else:
        priority = "potential_false_positive"
    
    # NEW FEATURES
    enrichment = enrich_ip(alert.source_ip)
    ai_summary = generate_ai_summary(alert, enrichment)
    suggested_playbook = suggest_playbook(alert)
    threat_actor = identify_threat_actor(alert.source_ip, alert.alert_type)
    correlated_alerts = correlate_alerts(alert)
    group_id = group_similar_alerts(alert)
    
    # Recommended action
    if priority == "immediate":
        action = f"URGENT: Isolate {asset_info['name']} immediately and escalate to senior analyst"
    elif priority == "high":
        action = f"Investigate {asset_info['name']} and apply recommended playbook"
    elif priority == "potential_false_positive":
        action = f"Review and mark as false positive if confirmed benign"
    else:
        action = f"Standard investigation required for {asset_info['name']}"
    
    return AlertPrediction(
        alert_id=alert.alert_id,
        timestamp=alert.timestamp,
        alert_type=alert.alert_type,
        severity=alert.severity,
        source_ip=alert.source_ip,
        dest_ip=alert.dest_ip,
        dest_port=alert.dest_port,
        signature_name=alert.signature_name,
        risk_score=risk_score,
        confidence=confidence,
        is_true_positive=is_true_positive,
        priority_level=priority,
        recommended_action=action,
        asset_name=asset_info["name"],
        asset_criticality=asset_info["criticality"],
        business_function=asset_info["function"],
        regulatory_frameworks=asset_info["regulatory"],
        status="new",
        assigned_to=None,
        notes=[],
        history=[],
        # Enhanced fields
        ai_summary=ai_summary,
        suggested_playbook=suggested_playbook,
        threat_actor_group=threat_actor,
        enrichment=enrichment,
        correlation_alerts=correlated_alerts
    )

# =====================================================
# API ENDPOINTS
# =====================================================

@app.get("/api/demo/alerts")
async def get_demo_alerts():
    """Generate 75 realistic demo alerts with all enhancements"""
    
    # Only generate if database is empty
    if len(alerts_db) > 0:
        return list(alerts_db.values())
    
    alert_templates = [
        {
            "type": "malware_detection",
            "severities": ["critical", "high"],
            "signatures": [
                "Trojan.Generic.KD.12345",
                "Backdoor.Win32.Agent",
                "Ransomware.Wannacry.Variant",
                "Spyware.Keylogger.Modified",
                "Rootkit.Boot.Persistence"
            ],
            "ports": [443, 8080, 4444, 5555],
        },
        {
            "type": "brute_force",
            "severities": ["high", "medium"],
            "signatures": [
                "SSH Brute Force Attempt",
                "RDP Login Failure Pattern",
                "FTP Authentication Spam",
                "HTTP Login Brute Force",
                "VPN Authentication Flood"
            ],
            "ports": [22, 3389, 21, 80, 443],
        },
        {
            "type": "port_scan",
            "severities": ["medium", "low"],
            "signatures": [
                "Network Port Scanning",
                "TCP SYN Scan Detected",
                "UDP Port Enumeration",
                "Service Discovery Probe",
                "Network Reconnaissance"
            ],
            "ports": [80, 443, 8080, 3306, 5432],
        },
        {
            "type": "data_exfiltration",
            "severities": ["critical", "high"],
            "signatures": [
                "Large Data Transfer Outbound",
                "Database Dump Detected",
                "Suspicious File Upload",
                "Encrypted Data Exfil",
                "Cloud Storage Upload Anomaly"
            ],
            "ports": [443, 22, 21, 445],
        },
        {
            "type": "phishing",
            "severities": ["high", "medium"],
            "signatures": [
                "Phishing Email Detected",
                "Credential Harvesting Site",
                "Malicious Link Clicked",
                "Fake Login Page Access",
                "Social Engineering Attempt"
            ],
            "ports": [80, 443, 8080],
        },
        {
            "type": "ddos_attack",
            "severities": ["critical", "high"],
            "signatures": [
                "Distributed Denial of Service",
                "SYN Flood Attack",
                "HTTP Flood Pattern",
                "UDP Amplification Attack",
                "Slowloris Attack Detected"
            ],
            "ports": [80, 443, 53],
        },
        {
            "type": "suspicious_process",
            "severities": ["medium", "low"],
            "signatures": [
                "Unusual Process Execution",
                "PowerShell Script Suspicious",
                "CMD.exe Anomaly Detected",
                "Memory Injection Attempt",
                "Privilege Escalation Try"
            ],
            "ports": [445, 135, 139],
        },
        {
            "type": "insider_threat",
            "severities": ["high", "medium"],
            "signatures": [
                "After-Hours File Access",
                "Bulk Download Detected",
                "Unusual Data Access Pattern",
                "Unauthorized System Change",
                "Policy Violation Detected"
            ],
            "ports": [445, 3389, 22],
        },
        {
            "type": "lateral_movement",
            "severities": ["critical", "high"],
            "signatures": [
                "Pass-the-Hash Detected",
                "SMB Enumeration Activity",
                "Remote Service Creation",
                "Credential Dumping Attempt",
                "Admin Share Access"
            ],
            "ports": [445, 139, 135],
        },
        {
            "type": "web_attack",
            "severities": ["high", "medium"],
            "signatures": [
                "SQL Injection Attempt",
                "XSS Attack Detected",
                "Directory Traversal Try",
                "Command Injection Pattern",
                "CSRF Token Manipulation"
            ],
            "ports": [80, 443, 8080, 8443],
        },
    ]
    
    assets = [
        {"ip": "10.0.1.50", "name": "Payment Server"},
        {"ip": "10.0.1.51", "name": "Customer DB"},
        {"ip": "10.0.1.52", "name": "Employee DB"},
        {"ip": "10.0.2.100", "name": "CRM System"},
        {"ip": "10.0.2.101", "name": "Email Server"},
        {"ip": "10.0.2.102", "name": "Web Server"},
        {"ip": "10.0.3.20", "name": "HR System"},
        {"ip": "10.0.3.21", "name": "Payroll System"},
        {"ip": "10.0.3.22", "name": "File Server"},
        {"ip": "10.0.10.50", "name": "Dev Server"},
        {"ip": "10.0.10.51", "name": "Test Server"},
        {"ip": "10.0.10.52", "name": "Staging Server"},
        {"ip": "10.0.20.10", "name": "VPN Gateway"},
        {"ip": "10.0.20.11", "name": "Firewall"},
        {"ip": "10.0.30.5", "name": "Workstation-001"},
        {"ip": "10.0.30.6", "name": "Workstation-002"},
    ]
    
    attacker_ips = [
        "203.0.113.45", "198.51.100.23", "192.0.2.100", "185.220.101.5",
        "91.189.88.152", "123.45.67.89", "45.67.89.123", "167.248.133.45",
        "194.58.56.177", "89.248.165.92", "103.216.221.19", "217.182.143.207",
        "46.166.139.111", "178.73.215.171", "195.123.237.184", "62.210.37.82"
    ]
    
    sample_alerts = []
    now = datetime.utcnow()
    
    for i in range(75):
        template = random.choice(alert_templates)
        asset = random.choice(assets)
        hours_ago = random.randint(0, 168)
        timestamp = (now - timedelta(hours=hours_ago)).isoformat() + "Z"
        
        alert = Alert(
            alert_id=f"alert_{str(i+1).zfill(3)}",
            timestamp=timestamp,
            alert_type=template["type"],
            severity=random.choice(template["severities"]),
            source_ip=random.choice(attacker_ips),
            dest_ip=asset["ip"],
            dest_port=random.choice(template["ports"]),
            signature_name=random.choice(template["signatures"])
        )
        
        sample_alerts.append(alert)
    
    predictions = []
    for idx, alert in enumerate(sample_alerts):
        prediction = mock_predict(alert)
        
        if idx < 15:
            rand = random.random()
            if rand < 0.2:
                prediction.status = "investigating"
                prediction.assigned_to = random.choice(["John Doe", "Jane Smith", "Mike Johnson"])
            elif rand < 0.3:
                prediction.status = "resolved"
                prediction.assigned_to = random.choice(["John Doe", "Jane Smith", "Mike Johnson"])
            elif rand < 0.4:
                prediction.status = "false_positive"
                prediction.assigned_to = random.choice(["John Doe", "Jane Smith", "Mike Johnson"])
        
        alerts_db[alert.alert_id] = prediction
        predictions.append(prediction)
    
    return predictions

# Continue with other endpoints...

@app.get("/api/alerts")
async def get_alerts(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None
):
    """Get filtered alerts"""
    filtered = list(alerts_db.values())
    
    if status and status != "all":
        filtered = [a for a in filtered if a.status == status]
    
    if priority and priority != "all":
        filtered = [a for a in filtered if a.priority_level == priority]
    
    if search:
        search_lower = search.lower()
        filtered = [a for a in filtered if 
            search_lower in a.alert_id.lower() or
            search_lower in a.alert_type.lower() or
            search_lower in a.asset_name.lower()]
    
    return filtered

@app.get("/api/stats")
async def get_stats():
    """Get dashboard statistics"""
    total = len(alerts_db)
    investigating = len([a for a in alerts_db.values() if a.status == "investigating"])
    resolved = len([a for a in alerts_db.values() if a.status == "resolved"])
    false_positives = len([a for a in alerts_db.values() if a.status == "false_positive"])
    
    return {
        "total_alerts_processed": total if total > 0 else 15847,
        "alerts_investigating": investigating,
        "alerts_resolved": resolved,
        "false_positives_filtered": false_positives,
        "time_saved_hours": false_positives * 0.25,
        "average_confidence": 0.847,
        "model_accuracy": 0.89,
        "uptime": "99.7%"
    }

# =====================================================
# NEW API: SHIFT HANDOVER REPORT
# =====================================================
@app.get("/api/shift-report")
async def generate_shift_report():
    """Generate shift handover report"""
    all_alerts = list(alerts_db.values())
    
    # Calculate shift stats
    new_alerts = [a for a in all_alerts if a.status == "new"]
    investigating = [a for a in all_alerts if a.status == "investigating"]
    resolved = [a for a in all_alerts if a.status == "resolved"]
    false_positives = [a for a in all_alerts if a.status == "false_positive"]
    escalated = [a for a in all_alerts if a.status == "escalated"]
    
    # Critical items
    critical_items = [a for a in all_alerts if a.priority_level == "immediate" and a.status not in ["resolved", "false_positive"]]
    
    # Threat actors
    active_threat_actors = len(threat_actors_db)
    
    # Top threats
    threat_types = {}
    for alert in all_alerts:
        threat_types[alert.alert_type] = threat_types.get(alert.alert_type, 0) + 1
    
    top_threats = sorted(threat_types.items(), key=lambda x: x[1], reverse=True)[:5]
    
    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "shift_summary": {
            "total_alerts": len(all_alerts),
            "new": len(new_alerts),
            "investigating": len(investigating),
            "resolved": len(resolved),
            "false_positives": len(false_positives),
            "escalated": len(escalated)
        },
        "critical_items": [
            {
                "alert_id": a.alert_id,
                "type": a.alert_type,
                "asset": a.asset_name,
                "summary": a.ai_summary[:100] + "..." if a.ai_summary else ""
            } for a in critical_items[:10]
        ],
        "outstanding_items": [
            {
                "alert_id": a.alert_id,
                "type": a.alert_type,
                "assigned_to": a.assigned_to,
                "status": a.status,
                "priority": a.priority_level
            } for a in investigating[:10]
        ],
        "threat_intelligence": {
            "active_threat_actors": active_threat_actors,
            "top_threats": [{"type": t[0], "count": t[1]} for t in top_threats]
        },
        "recommendations": [
            "⚠️ Monitor critical alerts in outstanding items",
            "🔍 Review false positive patterns for automation",
            "📊 Check threat actor groups for patterns",
            "🛡️ Update firewall rules based on today's attacks"
        ]
    }
    
    return report

# =====================================================
# NEW API: THREAT ACTOR GROUPS
# =====================================================
@app.get("/api/threat-actors")
async def get_threat_actors():
    """Get threat actor groups"""
    actors = []
    for actor_id, data in threat_actors_db.items():
        actors.append({
            "id": actor_id,
            "classification": data["classification"],
            "risk": data["risk"],
            "alert_count": data["alert_count"],
            "first_seen": data["first_seen"],
            "ips": data["ips"],
            "attack_types": list(set(data["attack_types"]))
        })
    return actors

# =====================================================
# NEW API: ALERT GROUPS
# =====================================================
@app.get("/api/alert-groups")
async def get_alert_groups():
    """Get grouped alerts"""
    groups = []
    for group_id, data in alert_groups.items():
        if data["count"] > 1:  # Only return actual groups
            groups.append({
                "group_id": group_id,
                "type": data["type"],
                "source_ip": data["source_ip"],
                "count": data["count"],
                "alert_ids": data["alert_ids"],
                "first_seen": data["first_seen"]
            })
    return sorted(groups, key=lambda x: x["count"], reverse=True)

# Rest of existing endpoints...
@app.post("/api/investigation/start")
async def start_investigation(action: InvestigationAction):
    """Start or assign investigation"""
    if action.alert_id not in alerts_db:
        return {"error": "Alert not found"}
    
    alert = alerts_db[action.alert_id]
    alert.status = "investigating"
    alert.assigned_to = action.author
    alert.history.append({
        "action": action.action,
        "author": action.author,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "notes": action.notes
    })
    
    return {"message": "Investigation started", "alert": alert}

@app.post("/api/investigation/close")
async def close_investigation(action: InvestigationAction):
    """Close investigation as resolved"""
    if action.alert_id not in alerts_db:
        return {"error": "Alert not found"}
    
    alert = alerts_db[action.alert_id]
    alert.status = "resolved"
    alert.history.append({
        "action": "resolved",
        "author": action.author,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "notes": action.notes
    })
    
    return {"message": "Investigation closed", "alert": alert}

@app.post("/api/investigation/mark-fp")
async def mark_false_positive(action: InvestigationAction):
    """Mark as false positive"""
    if action.alert_id not in alerts_db:
        return {"error": "Alert not found"}
    
    alert = alerts_db[action.alert_id]
    alert.status = "false_positive"
    alert.history.append({
        "action": "false_positive",
        "author": action.author,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "notes": action.notes
    })
    
    # Learn from false positive
    pattern = {
        "source_ip": alert.source_ip,
        "alert_type": alert.alert_type,
        "dest_port": alert.dest_port
    }
    if pattern not in false_positive_patterns:
        false_positive_patterns.append(pattern)
    
    return {"message": "Marked as false positive", "alert": alert}

@app.post("/api/investigation/escalate")
async def escalate_alert(action: InvestigationAction):
    """Escalate alert"""
    if action.alert_id not in alerts_db:
        return {"error": "Alert not found"}
    
    alert = alerts_db[action.alert_id]
    alert.status = "escalated"
    alert.history.append({
        "action": "escalated",
        "author": action.author,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "notes": action.notes
    })
    
    return {"message": "Alert escalated", "alert": alert}

@app.post("/api/notes/add")
async def add_note(note: Note):
    """Add investigation note"""
    if note.alert_id not in alerts_db:
        return {"error": "Alert not found"}
    
    note_id = f"note_{len(notes_db) + 1}"
    note.note_id = note_id
    
    alert = alerts_db[note.alert_id]
    alert.notes.append(note.dict())
    notes_db[note_id] = note
    
    return {"message": "Note added", "note": note}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": "Connected to SOC Dashboard Live Feed"
        })
        
        # Keep connection alive with heartbeat
        while True:
            try:
                # Wait for messages from client (or timeout after 30s)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except:
                    break
            except:
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)


# Helper function to broadcast alerts to all connected clients
async def broadcast_new_alert(alert_data):
    """Broadcast new alert to all WebSocket connections"""
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json({
                "type": "new_alert",
                "alert": alert_data
            })
        except Exception:
            disconnected.append(connection)
    
    # Remove disconnected clients
    for conn in disconnected:
        if conn in active_connections:
            active_connections.remove(conn)


# Test endpoint to simulate new alerts
@app.post("/api/alerts/simulate")
async def simulate_alert():
    """Simulate a new alert for testing Live Feed"""
    alert_types = ["malware_detection", "brute_force", "port_scan", "data_exfiltration", "phishing"]
    severities = ["critical", "high", "medium", "low"]
    assets = ["Payment Server", "Web Server", "Database Server", "VPN Gateway", "Email Server"]
    
    new_alert = {
        "alert_id": f"alert_{random.randint(1000, 9999)}",
        "timestamp": datetime.now().isoformat(),
        "alert_type": random.choice(alert_types),
        "severity": random.choice(severities),
        "source_ip": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
        "dest_ip": "192.168.1.100",
        "asset_name": random.choice(assets),
        "signature_name": "Simulated Alert for Testing",
        "status": "new",
        "priority_level": "immediate" if random.choice([True, False]) else "normal"
    }
    
    # Broadcast to all connected WebSocket clients
    await broadcast_new_alert(new_alert)
    
    # Also add to alerts_db so it appears in main alerts list
    alerts_db[new_alert["alert_id"]] = new_alert
    
    return {"status": "success", "message": "Alert simulated and broadcasted", "alert": new_alert}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
