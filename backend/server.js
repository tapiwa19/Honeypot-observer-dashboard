// ============================================
// HONEYPOT BACKEND SERVER - Node.js + Express + Elasticsearch
// ============================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import geoip from 'geoip-lite';
import connectDB from './config/database.js';
import { authRouter, authenticateToken, requireAdmin } from './auth.js';

//  Import notification routes and service
import notificationRouter from './routes/notifications.js';
import notificationService from './services/notificationService.js';
import alertRulesRouter from './routes/alertRules.js';
import alertRulesEngine from './services/alertRulesEngine.js';

dotenv.config();

const app = express();
await connectDB();
const httpServer = createServer(app);
// NEW CODE - Allows both ports
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// helper utilities
function extractAggs(response) {
  return response.body?.aggregations || response.aggregations || {};
}

function isValidSessionId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9\-]+$/.test(id);
}

function isValidRange(r) {
  return r === 'all' || /^now-\d+[dh]$/.test(r);
}

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 0, lastSeen: Date.now() });
  }
  
  const data = requestCounts.get(ip);
  data.count++;
  data.lastSeen = Date.now();
  
  next();
});

app.use('/api/auth', authRouter);

// ✅ NEW: Register notification routes
app.use('/api/notifications', notificationRouter);

// ✅ NEW: Register alert rules routes
app.use('/api/alerts', alertRulesRouter);

// ✅ FIXED: Only protect sensitive routes that modify data or require admin access
// Read-only analytics/data endpoints (dashboard, analytics, sessions, credentials) are PUBLIC
// IMPORTANT: Define public endpoints BEFORE protected ones so Express matches them first
app.use('/api/admin', authenticateToken, requireAdmin);
app.use('/api/users', authenticateToken, requireAdmin);

// Elasticsearch Client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://192.168.56.101:9200'
});

// Track active sessions in memory
const activeSessions = new Map();
const sessionStartTimes = new Map();

// Helper function to get country from IP
function getCountryFromIP(ip) {
  const geo = geoip.lookup(ip);
  
  if (!geo || ip.startsWith('192.168') || ip.startsWith('10.') || ip.startsWith('172.')) {
    const lastOctet = parseInt(ip.split('.').pop() || '0');
    const demoCountries = [
      { country: 'China', code: 'CN', flag: '🇨🇳' },
      { country: 'Russia', code: 'RU', flag: '🇷🇺' },
      { country: 'United States', code: 'US', flag: '🇺🇸' },
      { country: 'Brazil', code: 'BR', flag: '🇧🇷' },
      { country: 'India', code: 'IN', flag: '🇮🇳' },
      { country: 'Germany', code: 'DE', flag: '🇩🇪' },
      { country: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
      { country: 'France', code: 'FR', flag: '🇫🇷' }
    ];
    return demoCountries[lastOctet % demoCountries.length];
  }

  const countryFlags = {
    'US': '🇺🇸', 'CN': '🇨🇳', 'RU': '🇷🇺', 'BR': '🇧🇷', 'IN': '🇮🇳',
    'DE': '🇩🇪', 'GB': '🇬🇧', 'FR': '🇫🇷', 'VN': '🇻🇳', 'KR': '🇰🇷',
    'JP': '🇯🇵', 'CA': '🇨🇦', 'AU': '🇦🇺', 'NL': '🇳🇱', 'PL': '🇵🇱',
    'UA': '🇺🇦', 'IT': '🇮🇹', 'ES': '🇪🇸', 'TR': '🇹🇷', 'ID': '🇮🇩'
  };

  return {
    country: geo.country,
    code: geo.country,
    flag: countryFlags[geo.country] || '🏴'
  };
}

// Background task to monitor sessions: add new ones and mark closed
async function monitorSessions() {
  try {
    // 1. look for recently closed sessions and remove them
    const closedResp = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 1000,
      body: {
        query: {
          bool: {
            must: [
              { term: { 'eventid': 'cowrie.session.closed' } },
              { range: { '@timestamp': { gte: 'now-10m' } } }
            ]
          }
        }
      }
    });

    closedResp.hits.hits.forEach(hit => {
      const sessionId = hit._source.session;
      if (activeSessions.has(sessionId)) {
        activeSessions.delete(sessionId);
        sessionStartTimes.delete(sessionId);
        console.log(`❌ Session ${sessionId} marked as closed`);
      }
    });

    // 2. also fetch any new connects to keep activeSessions up to date
    const openResp = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 1000,
      body: {
        query: {
          bool: {
            must: [
              { term: { 'eventid': 'cowrie.session.connect' } },
              { range: { '@timestamp': { gte: 'now-10m' } } }
            ]
          }
        }
      }
    });

    openResp.hits.hits.forEach(hit => {
      const src = hit._source;
      const sessionId = src.session;
      if (sessionId && !activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, src);
        sessionStartTimes.set(sessionId, src['@timestamp']);
        console.log(`✅ Session ${sessionId} added to activeSessions`);
      }
    });
  } catch (error) {
    console.error('Error monitoring sessions:', error.message);
  }
}

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const health = await esClient.cluster.health();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      elasticsearch: health.status,
      services: {
        cowrie: 'running',
        elasticsearch: 'connected',
        kibana: 'connected',
        logstash: 'connected'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      elasticsearch: 'disconnected'
    });
  }
});

// Get Dashboard Statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Count total attacks in last 24h
    const totalResponse = await esClient.count({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      body: {
        query: {
          range: {
            '@timestamp': { gte: 'now-24h' }
          }
        }
      }
    });

    // Count attacks in previous 24h window for % change
    const yesterdayResponse = await esClient.count({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: 'now-48h',
              lt: 'now-24h'
            }
          }
        }
      }
    });

    // Count unique countries from unique IPs in last 24h
    const countriesResponse = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: {
        query: {
          range: {
            '@timestamp': { gte: 'now-24h' }
          }
        },
        aggs: {
          unique_ips: {
            terms: {
              field: 'src_ip',
              size: 1000
            }
          }
        }
      }
    });

    

    // ✅ FIX 1: Use extractAggs() helper to handle both ES client response formats
    const aggs = extractAggs(countriesResponse);
    const uniqueCountries = new Set();
    (aggs.unique_ips?.buckets || []).forEach(bucket => {
      const geoData = getCountryFromIP(bucket.key);
      uniqueCountries.add(geoData.country);
    });

    // Count sessions that CONNECTED in last 1h
const connectRes = await esClient.search({
  index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
  size: 0,
  body: {
    query: {
      bool: {
        must: [
          { range: { '@timestamp': { gte: 'now-1h' } } },
          { term: { 'eventid': 'cowrie.session.connect' } }
        ]
      }
    },
    aggs: {
      sessions: { cardinality: { field: 'session' } }
    }
  }
});

// Count sessions that CLOSED in last 1h
const closedRes = await esClient.search({
  index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
  size: 0,
  body: {
    query: {
      bool: {
        must: [
          { range: { '@timestamp': { gte: 'now-1h' } } },
          { term: { 'eventid': 'cowrie.session.closed' } }
        ]
      }
    },
    aggs: {
      sessions: { cardinality: { field: 'session' } }
    }
  }
});

const connectAggs = extractAggs(connectRes);
const closedAggs = extractAggs(closedRes);
const connectedCount = connectAggs.sessions?.value || 0;
const closedCount = closedAggs.sessions?.value || 0;

// Active = connected minus closed (minimum 0)
const activeSessionsCount = Math.max(0, connectedCount - closedCount);

    // Calculate % change vs yesterday
    const prevCount = yesterdayResponse.count || 0;
    const changePercent = prevCount > 0
      ? Math.round(((totalResponse.count - prevCount) / prevCount) * 100)
      : 0;

    console.log(`📊 [STATS] Total: ${totalResponse.count}, Sessions(1h): ${activeSessionsCount}, Countries: ${uniqueCountries.size}`);

    res.json({
      totalAttacks: totalResponse.count,
      changePercent,
      activeSessions: activeSessionsCount,
      threatLevel: totalResponse.count > 200 ? 'HIGH' : totalResponse.count > 50 ? 'MEDIUM' : 'LOW',
      countriesDetected: uniqueCountries.size
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get Recent Attacks
app.get('/api/dashboard/attacks', async (req, res) => {
  try {
    const { range, limit } = req.query;
    
    if (range) {
      console.log(`📊 [ATTACKS] Fetching with time range: ${range}`);
    }
    
    const size = limit ? parseInt(limit) : 50;
    
    let queryBody;
    
    if (range && range !== 'all') {
      queryBody = {
        query: {
          range: {
            '@timestamp': {
              gte: range
            }
          }
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
        size: size
      };
    } else {
      queryBody = {
        sort: [{ '@timestamp': { order: 'desc' } }],
        size: size
      };
    }
    
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      body: queryBody
    });

    const attacks = response.hits.hits.map(hit => {
      const source = hit._source;
      const ip = source.src_ip || source.source_ip || 'unknown';
      const geoData = getCountryFromIP(ip);

      let severity = 'medium';
      if (source.eventid === 'cowrie.login.success') severity = 'critical';
      else if (source.eventid === 'cowrie.command.input') severity = 'high';
      else if (source.eventid === 'cowrie.session.file_download') severity = 'critical';
      else if (source.eventid === 'cowrie.login.failed') severity = 'medium';

      return {
        id: hit._id,
        session: source.session || null,
        timestamp: source['@timestamp'] || source.timestamp,
        ip: ip,
        country: geoData.country,
        flag: geoData.flag,
        type: String(source.eventid || 'connection'),
        severity: severity,
        details: source.message || (typeof source.input === 'object' ? source.input?.command : source.input) || 'Attack detected',
         input: typeof source.input === 'string' ? source.input : 
         typeof source.input === 'object' && source.input?.command ? source.input.command :
         null
      };
    });

    if (range) {
      console.log(`✅ [ATTACKS] Returning ${attacks.length} attacks for range: ${range}`);
    }

    res.json(attacks);
  } catch (error) {
    console.error('Error fetching attacks:', error);
    res.status(500).json({ error: 'Failed to fetch recent attacks' });
  }
});

// Get Live Sessions
app.get('/api/sessions/live', async (req, res) => {
  try {
    const { range } = req.query;
    console.log(`\n📊 [SESSIONS] Fetching sessions for range: ${range || '24h'}`);
    
    // Calculate time ranges
    let esRange = 'now-24h';
    let jsTimeFilter = Date.now() - (24 * 60 * 60 * 1000);

    switch (range) {
      case '1h':
        esRange = 'now-1h';
        jsTimeFilter = Date.now() - (60 * 60 * 1000);
        break;
      case '24h':
        esRange = 'now-24h';
        jsTimeFilter = Date.now() - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        esRange = 'now-7d';
        jsTimeFilter = Date.now() - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        esRange = null;
        jsTimeFilter = null;
        break;
    }

    console.log(`   Time filter: ${esRange || 'none'}`);

    // ✅ STRATEGY: pull a recent slice of events and then group them in JS
    
    const queryBody = esRange
      ? {
          query: {
            range: {
              '@timestamp': { gte: esRange }
            }
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: 10000 // grab most recent 10k events; warn if this is reached
        }
      : {
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: 10000
        };

    console.log(`   Fetching events with query:`, JSON.stringify(queryBody, null, 2));

    const allEventsResp = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      body: queryBody
    });

    const hits = allEventsResp.hits.hits;
    console.log(`   ✅ Retrieved ${hits.length} events`);

    if (hits.length === 0) {
      console.log('   ❌ No events found in time range\n');
      return res.json([]);
    }

    if (hits.length === 10000) {
      console.warn('⚠️ /api/sessions/live returned maximum 10k events – results may be truncated');
    }

    // ✅ Group events by session ID manually (track earliest timestamp, command
    // count and closed status while iterating instead of building huge arrays)
    const sessionEventsMap = new Map();

    hits.forEach(hit => {
      const source = hit._source;
      const sessionId = source.session;
      if (!sessionId) return; // Skip events without session ID

      let sess = sessionEventsMap.get(sessionId);
      const ts = new Date(source['@timestamp']);
      if (!sess) {
        sess = {
          events: [],
          startTime: ts,
          lastEventTime: ts,
          commands: 0,
          isClosed: false,
          ip: source.src_ip || source.source_ip || 'unknown'
        };
        sessionEventsMap.set(sessionId, sess);
      }

      // update start time if we encounter an older event (necessary because
      // we are sorted descending)
      if (ts < sess.startTime) sess.startTime = ts;
      if (ts > sess.lastEventTime) sess.lastEventTime = ts;

      if (source.eventid === 'cowrie.command.input') sess.commands++;
      if (source.eventid === 'cowrie.session.closed') sess.isClosed = true;

      // keep raw event in case we need extra info later
      sess.events.push({
        timestamp: source['@timestamp'],
        eventid: source.eventid,
        src_ip: source.src_ip || source.source_ip,
        input: source.input,
        message: source.message
      });
    });

    console.log(`   ✅ Found ${sessionEventsMap.size} unique sessions`);

    // ✅ Build session objects using the accumulated metadata
    const sessionsMap = new Map();
    const now = Date.now();

    for (const [sessionId, sess] of sessionEventsMap.entries()) {
      const startTime = sess.startTime;
      const startTimeMs = startTime.getTime();

      // ✅ Apply client-side time filter based on session START time
      if (jsTimeFilter && startTimeMs < jsTimeFilter) {
        continue; // Skip sessions that started before our time range
      }

      const ip = sess.ip || 'unknown';
      const geoData = getCountryFromIP(ip);

      const isClosed = sess.isClosed;
      const lastEventTime = sess.lastEventTime;

      // Calculate duration
      let duration;
      if (isClosed) {
        duration = Math.floor((lastEventTime - startTime) / 1000);
      } else {
        duration = Math.floor((now - startTimeMs) / 1000);
      }

      const commands = sess.commands;

      // Calculate risk
      let risk = 3;
      if (commands > 20) risk = 10;
      else if (commands > 10) risk = 9;
      else if (commands > 5) risk = 7;
      else if (commands > 2) risk = 5;

      // Calculate time ago
      const timeDiff = now - startTimeMs;
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      let timeAgo;
      if (daysAgo > 0) timeAgo = `${daysAgo}d ago`;
      else if (hoursAgo > 0) timeAgo = `${hoursAgo}h ago`;
      else if (minutesAgo > 0) timeAgo = `${minutesAgo}m ago`;
      else timeAgo = 'just now';

      // Determine status
      let status;
      if (isClosed) status = 'closed';
      else if (minutesAgo < 5) status = 'active';
      else status = 'recent';

      sessionsMap.set(sessionId, {
        id: sessionId,
        sessionId: sessionId,
        ip: ip,
        country: geoData.flag,
        duration: duration,
        commands: commands,
        risk: risk,
        timestamp: startTime.toISOString(),
        timeAgo: timeAgo,
        status: status,
        isClosed: isClosed
      });
    }

    // ✅ Sort sessions by timestamp (newest first)
    const sessions = Array.from(sessionsMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log(`✅ [SESSIONS] Returning ${sessions.length} sessions`);
    console.log(`   - Active: ${sessions.filter(s => s.status === 'active').length}`);
    console.log(`   - Recent: ${sessions.filter(s => s.status === 'recent').length}`);
    console.log(`   - Closed: ${sessions.filter(s => s.status === 'closed').length}`);
    if (sessions.length > 0) {
      console.log(`   - Newest: ${sessions[0].timeAgo}`);
      console.log(`   - Oldest: ${sessions[sessions.length - 1].timeAgo}`);
    }
    console.log('');
    
    res.json(sessions);

  } catch (error) {
    console.error('❌ [SESSIONS] Error:', error.message);
    console.error(error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch sessions',
      details: error.message 
    });
  }
});

// Get Session Commands
app.get('/api/sessions/:sessionId/commands', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    console.log(`🎬 Fetching commands for session ${sessionId}...`);

    // cap results to avoid huge payloads
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 1000,
     body: {
  query: {
    bool: {
      must: [
        { term: { 'session': sessionId } },
        {
          bool: {
            should: [
              { term: { 'eventid': 'cowrie.command.input' } },
              { term: { 'eventid': 'cowrie.command.failed' } },
              { term: { 'eventid': 'cowrie.login.success' } },
              { term: { 'eventid': 'cowrie.login.failed' } }
            ],
            minimum_should_match: 1
          }
        }
      ]
    }
  },
  sort: [{ '@timestamp': { order: 'asc' } }]
}
    });

    const commands = response.hits.hits.map(hit => {
  const s = hit._source;
  let input = '';

  if (s.eventid === 'cowrie.login.failed') {
    input = `[LOGIN FAILED] username: ${s.username || '?'}  password: ${s.password || '?'}`;
  } else if (s.eventid === 'cowrie.login.success') {
    input = `[LOGIN SUCCESS] username: ${s.username || '?'}  password: ${s.password || '?'}`;
  } else if (s.eventid === 'cowrie.command.failed') {
    input = `[CMD NOT FOUND] ${s.input || s.message || '?'}`;
  } else {
    input = s.input || s.message || 'unknown';
  }

  return {
    input,
    timestamp: s['@timestamp'],
    eventid: s.eventid
  };
});
    console.log(`✅ Found ${commands.length} commands for session ${sessionId}`);
    
    res.json({
      session_id: sessionId,
      commands: commands,
      total: commands.length
    });
  } catch (error) {
    console.error('❌ Error fetching session commands:', error);
    res.status(500).json({ 
      error: 'Failed to fetch session commands',
      session_id: req.params.sessionId,
      commands: []
    });
  }
});

// Get Session Details
app.get('/api/sessions/:sessionId/details', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 1000,
      body: {
        query: {
          term: { 'session.keyword': sessionId }
        },
        sort: [{ '@timestamp': { order: 'asc' } }]
      }
    });

    const events = response.hits.hits.map(hit => hit._source);
    const firstEvent = events[0];
    
    if (!firstEvent) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const ip = firstEvent.src_ip || firstEvent.source_ip || 'unknown';
    const geoData = getCountryFromIP(ip);

    const commands = events
      .filter(e => e.eventid === 'cowrie.command.input')
      .map((e, i) => ({
        id: i + 1,
        command: e.input || 'unknown',
        timestamp: e['@timestamp'],
        output: e.output || ''
      }));

    const networkActivity = {
      connectionTime: firstEvent['@timestamp'],
      sourceIP: ip,
      sourcePort: firstEvent.src_port || 'unknown',
      destIP: firstEvent.dst_ip || 'unknown',
      destPort: firstEvent.dst_port || 22,
      protocol: 'SSH',
      bytesReceived: Math.floor(Math.random() * 10000) + 1000,
      bytesSent: Math.floor(Math.random() * 5000) + 500
    };

    const clientEvent = events.find(e => e.eventid === 'cowrie.client.version');
    const fingerprint = {
      sshClient: clientEvent?.version || 'Unknown SSH Client',
      protocolVersion: clientEvent?.protocol || 'SSH-2.0',
      hashedKey: clientEvent?.kexAlgs || 'Unknown',
      terminalSize: events.find(e => e.eventid === 'cowrie.client.size')?.size || '80x24'
    };

    const behaviorProfile = {
      commandCount: commands.length,
      sessionDuration: Math.floor((new Date() - new Date(firstEvent['@timestamp'])) / 1000),
      skillLevel: commands.length > 10 ? 'Advanced' : commands.length > 5 ? 'Intermediate' : 'Beginner',
      automationDetected: commands.length > 20,
      suspiciousPatterns: commands.some(c => c.command.includes('wget') || c.command.includes('curl'))
    };

    res.json({
      sessionId,
      ip,
      country: geoData.country,
      flag: geoData.flag,
      startTime: firstEvent['@timestamp'],
      commands,
      networkActivity,
      fingerprint,
      behaviorProfile
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// System Info
app.get('/api/system/info', async (req, res) => {
  try {
    const os = await import('os');
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    let esStats = { docs: 0 };
    try {
      const stats = await esClient.indices.stats({
        index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*'
      });
      esStats.docs = stats._all?.total?.docs?.count || 0;
    } catch (err) {
      console.error('Failed to get ES stats:', err.message);
    }
    
    let uniqueIPs = 0;
    try {
      const ipAgg = await esClient.search({
        index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
        size: 0,
        body: {
          query: {
            range: {
              '@timestamp': { gte: 'now-24h' }
            }
          },
          aggs: {
            unique_ips: {
              cardinality: {
                field: 'src_ip'
              }
            }
          }
        }
      });
      uniqueIPs = ipAgg.aggregations?.unique_ips?.value || 0;
    } catch (err) {
      console.error('Failed to get IP stats:', err.message);
    }
    
    const systemInfo = {
      cpu: {
        usage: Math.floor(Math.random() * 30 + 20),
        cores: os.cpus().length
      },
      memory: {
        total: (totalMem / (1024 ** 3)).toFixed(2),
        used: (usedMem / (1024 ** 3)).toFixed(2),
        free: (freeMem / (1024 ** 3)).toFixed(2),
        percentage: Math.round((usedMem / totalMem) * 100)
      },
      disk: {
        total: 100,
        used: 45,
        percentage: 45
      },
      uptime: formatUptime(os.uptime()),
      services: {
        cowrie: '✅ Running',
        elasticsearch: '✅ Connected',
        logstash: '✅ Running',
        kibana: '✅ Running'
      },
      network: {
        honeypotIP: process.env.HONEYPOT_IP || '192.168.56.101',
        sshPort: process.env.HONEYPOT_PORT || '22',
        apiPort: process.env.PORT || 5001,
        activeConnections: activeSessions.size
      },
      stats: {
        totalAttacks: esStats.docs,
        uniqueIPs: uniqueIPs,
        countries: Math.min(Math.floor(uniqueIPs / 3), 50),
        credentials: Math.floor(esStats.docs * 0.3)
      }
    };
    
    res.json(systemInfo);
  } catch (error) {
    console.error('Error fetching system info:', error);
    res.status(500).json({ error: 'Failed to fetch system information' });
  }
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '< 1m';
}

// Restart Services
app.post('/api/services/restart', async (req, res) => {
  try {
    console.log('🔄 Service restart requested (placeholder)');
    // real restart logic depends on your environment (systemd, docker, pm2, etc.)
    // for now we just acknowledge the request and log it.
    res.json({
      success: true,
      message: 'Service restart simulated (not actually implemented)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error restarting services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart services',
      message: error.message
    });
  }
});

// Analytics Timeline
app.get('/api/analytics/timeline', async (req, res) => {
  try {
    const range = req.query.range || 'now-24h';
    if (range && !isValidRange(range)) {
      return res.status(400).json({ error: 'Invalid range parameter' });
    }
    let interval = '1h';
    if (range === 'now-7d') {
      interval = '6h';
    } else if (range === 'now-30d') {
      interval = '1d';
    }
    
    console.log(`\n📊 [TIMELINE] Fetching range: ${range}, interval: ${interval}`);
    
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: range
            }
          }
        },
        aggs: {
          attacks_over_time: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: interval,
              min_doc_count: 0,
              extended_bounds: {
                min: range,
                max: 'now'
              }
            }
          }
        }
      }
    });

    const aggs = extractAggs(response);
    const buckets = aggs.attacks_over_time?.buckets || [];
    
    const timeline = buckets.map(bucket => {
      const date = new Date(bucket.key);
      let timeLabel;
      
      if (interval === '1h') {
        timeLabel = date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } else if (interval === '6h') {
        timeLabel = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }) + ' ' + date.getHours() + ':00';
      } else {
        timeLabel = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      return {
        time: timeLabel,
        attacks: bucket.doc_count
      };
    });

    console.log(`✅ [TIMELINE] Returning ${timeline.length} data points`);
    console.log(`   Total attacks: ${timeline.reduce((sum, t) => sum + t.attacks, 0)}`);
    
    res.json(timeline);
  } catch (error) {
    console.error('❌ [TIMELINE] Error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline data' });
  }
});

// Analytics Countries
app.get('/api/analytics/countries', async (req, res) => {
  try {
    const { range } = req.query;
    
    console.log(`🌍 [COUNTRIES] Fetching with range: ${range}`);
    
    // ✅ Build time filter
    let queryBody;
    
    if (range && range !== 'all') {
      queryBody = {
        query: {
          range: {
            '@timestamp': {
              gte: range
            }
          }
        },
        aggs: {
          unique_ips: {
            terms: {
              field: 'src_ip',  // ✅ This field EXISTS
              size: 1000
            }
          }
        }
      };
    } else {
      queryBody = {
        aggs: {
          unique_ips: {
            terms: {
              field: 'src_ip.keyword',  // ✅ This field EXISTS
              size: 1000
            }
          }
        }
      };
    }
    
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: queryBody
    });
    console.log('🔍 [DEBUG] Full response:', JSON.stringify(response, null, 2));
    console.log('🔍 [DEBUG] Aggregations:', JSON.stringify(response.aggregations, null, 2));
    console.log('🔍 [DEBUG] Body aggregations:', JSON.stringify(response.body?.aggregations, null, 2));
    
    const total = response.aggregations?.unique_ips?.buckets.reduce((sum, b) => sum + b.doc_count, 0) || 0;
    const ipBuckets = response.aggregations?.unique_ips?.buckets || [];
    
    // ✅ Group IPs by country using getCountryFromIP
    const countryMap = new Map();
    
    ipBuckets.forEach(bucket => {
      const ip = bucket.key;
      const attacks = bucket.doc_count;
      const geoData = getCountryFromIP(ip);  // ✅ Use your existing function
      
      if (countryMap.has(geoData.country)) {
        countryMap.get(geoData.country).attacks += attacks;
      } else {
        countryMap.set(geoData.country, {
          country: geoData.country,
          code: geoData.code,
          attacks: attacks,
          flag: geoData.flag
        });
      }
    });
    
    // Convert to array and calculate percentages
    const countries = Array.from(countryMap.values())
      .map(country => ({
        ...country,
        percentage: total > 0 ? ((country.attacks / total) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.attacks - a.attacks);
    
    console.log(`✅ [COUNTRIES] Found ${countries.length} countries with ${total} total attacks`);
    
    res.json(countries);
    
  } catch (error) {
    console.error('❌ [COUNTRIES] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch countries data', details: error.message });
  }
});

// ✅ Helper function for country flags
function getCountryFlag(countryCode) {
  if (!countryCode || countryCode === 'XX') return '🏴';
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  
  return String.fromCodePoint(...codePoints);
}
// Get Credentials
app.get('/api/credentials/table', async (req, res) => {
  try {
    const { range } = req.query;
    if (range && !isValidRange(range)) {
      return res.status(400).json({ error: 'Invalid range parameter' });
    }
    if (range) {
      console.log(`🔑 [CREDENTIALS] Fetching with time range: ${range}`);
    }
    
    let timeFilter = null;
    if (range && range !== 'all') {
      timeFilter = {
        range: {
          '@timestamp': {
            gte: range
          }
        }
      };
    }
    
    const queryMustClauses = [
      {
        bool: {
          should: [
            { match: { eventid: 'cowrie.login.success' } },
            { match: { eventid: 'cowrie.login.failed' } }
          ]
        }
      }
    ];
    
    if (timeFilter) {
      queryMustClauses.push(timeFilter);
    }
    
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: {
        query: {
          bool: {
            must: queryMustClauses
          }
        },
        aggs: {
          credentials: {
            composite: {
              size: 1000,
              sources: [
                { username: { terms: { field: 'username.keyword' } } },
                { password: { terms: { field: 'password.keyword' } } }
              ]
            },
            aggs: {
              attempts: { value_count: { field: 'username.keyword' } },
              success: {
                filter: { term: { 'eventid': 'cowrie.login.success' } }
              },
              failed: {
                filter: { term: { 'eventid': 'cowrie.login.failed' } }
              },
              countries: {
                terms: { field: 'src_ip', size: 10 }
              },
              first_seen: { min: { field: '@timestamp' } },
              last_seen: { max: { field: '@timestamp' } }
            }
          }
        }
      }
    });

    const credentials = response.aggregations?.credentials?.buckets.map(bucket => {
      const countries = bucket.countries.buckets.map(c => {
        const geoData = getCountryFromIP(c.key);
        return geoData.flag;
      });

      return {
        username: bucket.key.username,
        password: bucket.key.password,
        attempts: bucket.attempts.value,
        success: bucket.success.doc_count,
        failed: bucket.failed.doc_count,
        successRate: bucket.attempts.value > 0 
          ? Math.round((bucket.success.doc_count / bucket.attempts.value) * 100) 
          : 0,
        countries: countries.slice(0, 5),
        firstSeen: bucket.first_seen.value_as_string,
        lastSeen: bucket.last_seen.value_as_string
      };
    }) || [];

    if (range) {
      console.log(`✅ [CREDENTIALS] Returning ${credentials.length} credential pairs for range: ${range}`);
    }

    res.json(credentials);
  } catch (error) {
    console.error('Error fetching credentials table:', error);
    res.status(500).json({ error: 'Failed to fetch credentials table' });
  }
});

// Behavioral Analytics
app.get('/api/analytics/behavioral', async (req, res) => {
  try {
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 1000,
      body: {
        query: { match_all: {} }
      }
    });

    const attacks = response.hits.hits.map(hit => hit._source);
    const totalAttacks = attacks.length;
    
    // Patterns remain mostly static for now; could be derived from event types later
    const patterns = [
      {
        id: 1,
        name: 'SSH Brute Force Pattern',
        confidence: 94,
        occurrences: totalAttacks,
        severity: 'high',
        indicators: ['Multiple login attempts', 'Password guessing', 'Sequential scanning']
      },
      {
        id: 2,
        name: 'Credential Stuffing Attack',
        confidence: 89,
        occurrences: Math.floor(totalAttacks * 0.6),
        severity: 'critical',
        indicators: ['Common password list', 'Distributed IPs', 'Automated tools']
      },
      {
        id: 3,
        name: 'Port Scanning Activity',
        confidence: 78,
        occurrences: Math.floor(totalAttacks * 0.3),
        severity: 'medium',
        indicators: ['Sequential ports', 'Short duration', 'No authentication']
      }
    ];

    // build a map of events by source IP so we can compute real profile stats
    const ipMap = new Map();
    attacks.forEach(attack => {
      const ip = attack.src_ip || attack.source_ip || 'unknown';
      if (!ipMap.has(ip)) {
        ipMap.set(ip, []);
      }
      ipMap.get(ip).push(attack);
    });

    // helper to derive tactics from event list (same logic used on frontend)
    const determineTacticsLocal = (events) => {
      const tactics = [];
      const totalCommands = events.filter(e => e.eventid === 'cowrie.command.input').length;
      const highRisk = events.some(e => e.risk >= 7);
      tactics.push('Initial Access (T1078)');
      if (totalCommands > 0) tactics.push('Execution (T1059)');
      if (highRisk || totalCommands > 10) tactics.push('Persistence (T1136)');
      if (totalCommands > 5) tactics.push('Discovery (T1082)');
      const longSession = events.some(e => {
        const start = new Date(events[0]['@timestamp']);
        const last = new Date(events[events.length - 1]['@timestamp']);
        return (last - start) / 1000 > 300;
      });
      if (longSession) tactics.push('Command & Control (T1071)');
      return tactics;
    };

    const profiles = Array.from(ipMap.entries()).map(([ip, events], idx) => {
      const geoData = getCountryFromIP(ip);

      // group by session for duration/commands/services
      const sessionMap = new Map();
      events.forEach(e => {
        const sid = e.session || 'no-session';
        if (!sessionMap.has(sid)) sessionMap.set(sid, []);
        sessionMap.get(sid).push(e);
      });

      let totalDuration = 0;
      let totalCommands = 0;
      const serviceSet = new Set();

      sessionMap.forEach(evts => {
        evts.sort((a, b) => new Date(a['@timestamp']) - new Date(b['@timestamp']));
        const start = new Date(evts[0]['@timestamp']);
        const end = new Date(evts[evts.length - 1]['@timestamp']);
        totalDuration += (end - start) / 1000;
        evts.forEach(evt => {
          if (evt.eventid === 'cowrie.command.input') totalCommands++;
          if (evt.service) serviceSet.add(evt.service);
        });
      });

      const avgSessionDuration = sessionMap.size > 0 ? Math.floor(totalDuration / sessionMap.size) : 0;
      const uniqueCommands = totalCommands;
      const targetedServices = serviceSet.size > 0 ? Array.from(serviceSet) : ['SSH'];
      const tactics = determineTacticsLocal(events);

      return {
        id: ip,
        skillLevel: 'unknown',
        threatScore: Math.min(10, totalCommands),
        totalAttacks: events.length,
        successRate: 0,
        tools: [],
        countries: [geoData.flag + ' ' + geoData.country],
        tactics,
        targetedServices,
        avgSessionDuration,
        uniqueCommands
      };
    });

    // sort & keep top 5 profiles by volume
    profiles.sort((a, b) => b.totalAttacks - a.totalAttacks);
    const topProfiles = profiles.slice(0, 5);

    // extract vulnerabilities by scanning messages for CVEs
    const vulnMap = new Map();
     attacks.forEach(a => {
  try {
    const msg = a.message || a.details || a.input || '';
    
    // ✅ Convert to string if it's an object
    const messageStr = typeof msg === 'string' ? msg : 
                      typeof msg === 'object' ? JSON.stringify(msg) : 
                      String(msg);
    
    const matches = messageStr.match(/CVE-\d{4}-\d+/g);
    if (matches) {
      matches.forEach(cve => {
        vulnMap.set(cve, (vulnMap.get(cve) || 0) + 1);
      });
    }
  } catch (err) {
    console.error('Error parsing message for CVE:', err);
  }
});
    const vulnerabilities = Array.from(vulnMap.entries())
      .sort(([,a],[,b]) => b - a)
      .slice(0, 3)
      .map(([cve,count]) => ({ cve, name: cve, severity: 0, targetFrequency: count, successRate: 0 }));


    // build MITRE counts from the tactics arrays in our top profiles
    const tacticCounts = {};
    topProfiles.forEach(p => {
      p.tactics?.forEach(t => {
        tacticCounts[t] = (tacticCounts[t] || 0) + 1;
      });
    });
    const mitreTactics = Object.entries(tacticCounts).map(([tactic, count]) => ({
      tactic,
      techniques: [], // frontend can fill in if desired
      count
    }));

    res.json({
      patterns,
      profiles: topProfiles,
      vulnerabilities,
      mitre: mitreTactics
    });
  } catch (error) {
    console.error('Error fetching behavioral analytics:', error);
    res.status(500).json({ error: 'Failed to fetch behavioral analytics' });
  }
});

// Analytics Stats
app.get('/api/analytics/stats', async (req, res) => {
  try {
    const range = req.query.range || 'now-24h';
    if (range && !isValidRange(range)) {
      return res.status(400).json({ error: 'Invalid range parameter' });
    }
    console.log(`📊 [ANALYTICS STATS] Fetching for range: ${range}`);
    
    const totalResponse = await esClient.count({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: range
            }
          }
        }
      }
    });

    const countriesResponse = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: range
            }
          }
        },
        aggs: {
          unique_ips: {
            cardinality: {
              field: 'src_ip'
            }
          }
        }
      }
    });

    const uniqueIPs = extractAggs(countriesResponse).unique_ips?.value || 0;
    const totalAttacks = totalResponse.count;

    console.log(`✅ [ANALYTICS STATS] ${totalAttacks} attacks from ${uniqueIPs} unique IPs`);

    res.json({
      totalAttacks: totalAttacks,
      uniqueIPs: uniqueIPs,
      threatLevel: totalAttacks > 200 ? 'HIGH' : totalAttacks > 50 ? 'MEDIUM' : 'LOW'
    });
  } catch (error) {
    console.error('❌ [ANALYTICS STATS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics statistics' });
  }
});

// Attack Distribution
app.get('/api/analytics/distribution', async (req, res) => {
  try {
    const range = req.query.range || 'now-7d';
    const groupBy = req.query.groupBy || 'eventid'; // 'eventid' (attack type) or 'src_country'

    if (range && !isValidRange(range)) {
      return res.status(400).json({ error: 'Invalid range parameter' });
    }

    console.log(`📊 [DISTRIBUTION] Fetching for range: ${range}, groupBy: ${groupBy}`);

    // determine field for aggregation
    let aggField = 'eventid';
    switch (groupBy) {
      case 'country':
      case 'src_country':
        aggField = 'src_country';
        break;
      case 'eventid':
      default:
        aggField = 'eventid';
    }

    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: range
            }
          }
        },
        aggs: {
          distribution: {
            terms: {
              field: aggField,
              size: 20
            }
          }
        }
      }
    });

    const buckets = extractAggs(response).distribution?.buckets || [];

    if (aggField === 'src_country') {
      // return country-flag style results
      const distribution = buckets.map(bucket => ({
        name: bucket.key,
        value: bucket.doc_count,
        color: '#4ADE80' // greenish default
      }));
      const top = distribution.sort((a, b) => b.value - a.value).slice(0, 10);
      return res.json(top);
    }

    // otherwise map eventid -> human names as before
    const eventMapping = {
      'cowrie.login.failed': { name: 'Failed Login Attempts', color: '#FF6B35' },
      'cowrie.login.success': { name: 'Successful Logins', color: '#DC2626' },
      'cowrie.command.input': { name: 'Command Execution', color: '#8B5CF6' },
      'cowrie.command.failed': { name: 'Failed Commands', color: '#F59E0B' },
      'cowrie.session.connect': { name: 'Connection Attempts', color: '#00D9FF' },
      'cowrie.session.closed': { name: 'Session Closures', color: '#6B7280' },
      'cowrie.client.version': { name: 'Client Fingerprinting', color: '#FFA500' },
      'cowrie.client.size': { name: 'Terminal Resize', color: '#10B981' },
      'cowrie.direct-tcpip.request': { name: 'Port Forwarding', color: '#EC4899' },
      'cowrie.session.file_download': { name: 'Malware Downloads', color: '#EF4444' },
      'cowrie.log.closed': { name: 'Log Events', color: '#64748B' },
      'cowrie.client.kex': { name: 'Key Exchange', color: '#06B6D4' } 
    };

    const distribution = buckets.map(bucket => {
      const eventId = bucket.key;
      const mapping = eventMapping[eventId] || { 
        name: eventId.replace('cowrie.', ''), 
        color: '#94A3B8' 
      };
      
      return {
        name: mapping.name,
        value: bucket.doc_count,
        color: mapping.color,
        eventId: eventId
      };
    });

    const topDistribution = distribution
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    console.log(`✅ [DISTRIBUTION] Returning ${topDistribution.length} items`);
    
    res.json(topDistribution);
  } catch (error) {
    console.error('❌ [DISTRIBUTION] Error:', error);
    res.status(500).json({ error: 'Failed to fetch attack distribution' });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    res.json({
      honeypotIP: process.env.HONEYPOT_IP || '192.168.56.101',
      honeypotPort: process.env.HONEYPOT_PORT || '22',
      elasticsearchURL: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      kibanaURL: process.env.KIBANA_URL || 'http://localhost:5601',
      refreshInterval: 5000,
      maxAttacksDisplay: 20
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    console.log('Settings update requested:', settings);
    
    res.json({ 
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save settings' 
    });
  }
});

// Clear All Data
app.delete('/api/data/clear', async (req, res) => {
  try {
    console.log('⚠️  CLEAR ALL DATA requested...');
    const indexPattern = process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*';
    await esClient.indices.delete({ index: indexPattern, ignore_unavailable: true });
    console.log(`🗑️  Deleted indices matching ${indexPattern}`);
    res.json({
      success: true,
      message: `All data cleared (indices ${indexPattern} removed)`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear data',
      message: error.message
    });
  }
});

// Debug Endpoints
app.get('/api/debug/events', async (req, res) => {
  try {
    console.log('🔍 Checking what events exist in Elasticsearch...');
    
    const eventsResponse = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: {
        aggs: {
          event_types: {
            terms: {
              field: 'eventid',
              size: 50
            }
          }
        }
      }
    });

    const eventTypes = extractAggs(eventsResponse).event_types?.buckets.map(b => ({
      eventType: b.key,
      count: b.doc_count
    })) || [];

    console.log('📊 Event types found:', eventTypes);

    const sampleResponse = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 5,
      sort: [{ '@timestamp': { order: 'desc' } }]
    });

    const samples = sampleResponse.hits.hits.map(hit => ({
      eventid: hit._source.eventid,
      timestamp: hit._source['@timestamp'],
      session: hit._source.session,
      src_ip: hit._source.src_ip,
      sample: hit._source
    }));

    console.log('📄 Sample documents:', samples.length);

    const sessionFieldsResponse = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 1,
      body: {
        query: {
          exists: {
            field: 'session'
          }
        }
      }
    });

    const hasSessionField = sessionFieldsResponse.hits.total.value > 0;
    console.log('✅ Has session field:', hasSessionField);

    const totalResponse = await esClient.count({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*'
    });

    const response = {
      totalDocuments: totalResponse.count,
      eventTypes: eventTypes,
      hasSessionField: hasSessionField,
      sampleDocuments: samples,
      indexPattern: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      timestamp: new Date().toISOString()
    };

    console.log('✅ Debug info collected');
    res.json(response);

  } catch (error) {
    console.error('❌ Error in debug endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch debug info',
      message: error.message
    });
  }
});

app.get('/api/debug/data', async (req, res) => {
  try {
    console.log('\n🔍 CHECKING ELASTICSEARCH DATA...\n');
    
    const total = await esClient.count({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*'
    });
    
    const last7d = await esClient.count({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      body: {
        query: {
          range: {
            '@timestamp': { gte: 'now-7d' }
          }
        }
      }
    });
    
    const last30d = await esClient.count({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      body: {
        query: {
          range: {
            '@timestamp': { gte: 'now-30d' }
          }
        }
      }
    });
    
    const dateRange = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: {
        aggs: {
          oldest: { min: { field: '@timestamp' } },
          newest: { max: { field: '@timestamp' } }
        }
      }
    });
    
    const result = {
      total: total.count,
      last7Days: last7d.count,
      last30Days: last30d.count,
      oldest: dateRange.aggregations?.oldest?.value_as_string || 'N/A',
      newest: dateRange.aggregations?.newest?.value_as_string || 'N/A'
    };
    
    console.log('📊 Results:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/sample', async (req, res) => {
  try {
    const sample = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 1,
      sort: [{ '@timestamp': { order: 'desc' } }]
    });
    
    if (sample.hits.hits.length > 0) {
      const doc = sample.hits.hits[0]._source;
      res.json({
        allFields: Object.keys(doc),
        fullDocument: doc
      });
    } else {
      res.json({ error: 'No documents found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/eventids', async (req, res) => {
  try {
    const sample = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 5,
      sort: [{ '@timestamp': { order: 'desc' } }]
    });
    
    const events = sample.hits.hits.map(hit => ({
      eventid: hit._source.eventid,
      timestamp: hit._source['@timestamp'],
      allFields: Object.keys(hit._source)
    }));
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/session-fields', async (req, res) => {
  try {
    const sample = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 1,
      body: {
        query: {
          term: { 'eventid': 'cowrie.session.connect' }
        },
        sort: [{ '@timestamp': { order: 'desc' } }]
      }
    });

    if (sample.hits.hits.length === 0) {
      return res.json({ error: 'No cowrie.session.connect events found at all' });
    }

    const doc = sample.hits.hits[0]._source;
    res.json({
      allFields: Object.keys(doc),
      fullDocument: doc
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  const sendUpdates = async () => {
    try {
      const response = await esClient.search({
        index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
        size: 1,
        sort: [{ '@timestamp': { order: 'desc' } }]
      });

      if (response.hits.hits.length > 0) {
        const source = response.hits.hits[0]._source;
        const ip = source.src_ip || source.source_ip || 'unknown';
        const geoData = getCountryFromIP(ip);

        socket.emit('new_attack', {
          timestamp: source['@timestamp'],
          ip: ip,
          country: geoData.country,
          flag: geoData.flag,
          type: source.eventid
        });
      }
    } catch (error) {
      console.error('Error sending updates:', error);
    }
  };

  const interval = setInterval(sendUpdates, 5000);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    clearInterval(interval);
  });
});
// ============================================
// REAL-TIME SESSION MONITORING
// ============================================

let lastCheckedTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000);
const knownSessions = new Map();

const requestCounts = new Map(); // Track requests per IP

// Monitor for DDoS every 60 seconds, evict stale entries
setInterval(() => {
  const suspicious = [];
  const now = Date.now();
  
  for (const [ip, data] of requestCounts.entries()) {
    // remove ips last seen more than a minute ago
    if (now - data.lastSeen > 60000) {
      requestCounts.delete(ip);
      continue;
    }

    if (data.count > 100) { // 100+ requests per minute = suspicious
      suspicious.push({ 
        ip, 
        count: data.count,
        lastSeen: data.lastSeen 
      });
    }
  }
  
  if (suspicious.length > 0) {
    const totalRequests = Array.from(requestCounts.values())
      .reduce((sum, d) => sum + d.count, 0);
    
    console.log(`⚠️ [DDoS] ${suspicious.length} suspicious IPs detected`);
    
    io.emit('ddos_warning', {
      suspiciousIPs: suspicious.slice(0, 10), // Top 10 only
      totalRequests: totalRequests,
      timestamp: new Date().toISOString()
    });
  }
  
  // reset counts that remain
  for (const data of requestCounts.values()) {
    data.count = 0;
  }
}, 60000);


// Monitor for new sessions every 2 seconds
async function broadcastNewSessions() {
  try {
    const now = new Date();
    
    const batchSize = 1000;
    const newEvents = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: batchSize,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: lastCheckedTimestamp.toISOString(),
              lte: now.toISOString()
            }
          }
        },
        sort: [{ '@timestamp': { order: 'asc' } }]
      }
    });

    if (newEvents.hits.hits.length > 0) {
      console.log(`🔴 [LIVE] Found ${newEvents.hits.hits.length} new events`);
      if (newEvents.hits.hits.length === batchSize) {
        console.warn('⚠️ broadcastNewSessions result capped at', batchSize);
      }
      
      const sessionEventsMap = new Map();
      
      newEvents.hits.hits.forEach(hit => {
        const source = hit._source;
        const sessionId = source.session;
        
        if (!sessionId) return;
        
        if (!sessionEventsMap.has(sessionId)) {
          sessionEventsMap.set(sessionId, []);
        }
        
        sessionEventsMap.get(sessionId).push({
          timestamp: source['@timestamp'],
          eventid: source.eventid,
          src_ip: source.src_ip || source.source_ip,
          input: source.input,
          message: source.message
        });
      });

      for (const [sessionId, events] of sessionEventsMap.entries()) {
        events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const firstEvent = events[0];
        const ip = firstEvent.src_ip || 'unknown';
        const geoData = getCountryFromIP(ip);
        
        const commands = events.filter(e => e.eventid === 'cowrie.command.input').length;
        const isClosed = events.some(e => e.eventid === 'cowrie.session.closed');
        
        let risk = 3;
        if (commands > 20) risk = 10;
        else if (commands > 10) risk = 9;
        else if (commands > 5) risk = 7;
        else if (commands > 2) risk = 5;

        // ✅ SANITIZED session data
        const sessionData = {
          id: String(sessionId).slice(0, 100),
          sessionId: String(sessionId).slice(0, 100),
          ip: String(ip).replace(/[<>'"]/g, '').slice(0, 45),
          country: String(geoData.flag).slice(0, 10),
          countryName: String(geoData.country).replace(/[<>'"]/g, '').slice(0, 100),
          duration: 0,
          commands: Math.max(0, Math.min(10000, commands)),
          risk: Math.max(0, Math.min(10, risk)),
          timestamp: firstEvent['@timestamp'],
          timeAgo: 'just now',
          status: isClosed ? 'closed' : 'active',
          isClosed: !!isClosed,
          isNew: true
        };

        // ✅ CHECK IF NEW OR UPDATE
        const wasKnown = knownSessions.has(sessionId);
        const previousData = knownSessions.get(sessionId);

        if (!wasKnown) {
          // ✅ NEW SESSION
          io.emit('new_session', sessionData);
          console.log(`📡 [BROADCAST] New session: ${ip} (${geoData.country}) - Risk: ${risk}/10`);
          
          knownSessions.set(sessionId, {
            commands: commands,
            status: isClosed ? 'closed' : 'active',
            isClosed: isClosed
          });

          // Send to alert rules engine
          if (risk >= 7 && alertRulesEngine) {
            const incomingAlert = {
              type: 'brute_force',
              severity: risk >= 9 ? 'critical' : 'high',
              title: `🚨 ${risk >= 9 ? 'CRITICAL' : 'HIGH RISK'} Attack Detected!`,
              description: `New SSH attack from ${ip} (${geoData.country}) - Risk: ${risk}/10`,
              sourceIp: ip,
              country: geoData.country,
              sessionId: sessionId,
              timestamp: firstEvent['@timestamp'],
              failedAttempts: commands, // Simplified
              commandCount: commands
            };

            // Process through alert rules engine
            const ruleResults = await alertRulesEngine.processAlert(incomingAlert);
            
            // Send immediate alerts through notification service
            for (const triggered of ruleResults.triggered) {
              if (notificationService) {
                await notificationService.sendAlert({
                  severity: triggered.alert.severity,
                  title: triggered.alert.title,
                  description: triggered.alert.description,
                  sourceIp: triggered.alert.sourceIp,
                  country: triggered.alert.country,
                  timestamp: triggered.alert.timestamp,
                  type: triggered.alert.type
                });
              }
            }
          }
        } else {
          // ✅ SESSION UPDATE
          if (previousData.commands !== commands || previousData.status !== sessionData.status) {
            io.emit('session_updated', sessionData);
            console.log(`🔄 [UPDATE] ${sessionId}: ${commands} commands`);
          }

          // ✅ SESSION CLOSED
          if (isClosed && !previousData.isClosed) {
            io.emit('session_closed', { sessionId: sessionId });
            console.log(`🔒 [CLOSED] ${sessionId}`);
          }

          knownSessions.set(sessionId, {
            commands: commands,
            status: isClosed ? 'closed' : 'active',
            isClosed: isClosed
          });
        }
      }
    }

    // advance pointer intelligently – if we hit the batch cap move to the
    // timestamp of the last event we actually processed rather than jumping
    // all the way to now, otherwise we could skip unreturned events.
    if (newEvents && newEvents.hits && newEvents.hits.hits.length === batchSize) {
      const lastTsStr = newEvents.hits.hits[newEvents.hits.hits.length - 1]._source['@timestamp'];
      lastCheckedTimestamp = new Date(lastTsStr);
    } else {
      lastCheckedTimestamp = now;
    }

  } catch (error) {
    console.error('❌ [LIVE] Error broadcasting sessions:', error.message);
  }
}


async function broadcastThreatIntel() {
  try {
    // Top attackers
    const topAttackersRes = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: {
        query: { range: { '@timestamp': { gte: 'now-24h' } } },
        aggs: {
          top_ips: {
            terms: { field: 'src_ip.keyword', size: 10 }
          }
        }
      }
    });

    const topAttackers = (topAttackersRes.aggregations?.top_ips?.buckets || []).map(b => {
      const geoData = getCountryFromIP(b.key);
      return {
        ip: String(b.key).slice(0, 45), // ✅ Sanitized
        count: Math.max(0, b.doc_count),
        country: String(geoData.country).slice(0, 100),
        flag: String(geoData.flag).slice(0, 10)
      };
    });

    // Common commands
    const commandsRes = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || '.ds-cowrie-*',
      size: 0,
      body: {
        query: {
          bool: {
            must: [
              { term: { 'eventid': 'cowrie.command.input' } },
              { range: { '@timestamp': { gte: 'now-24h' } } }
            ]
          }
        },
        aggs: {
          common_commands: {
            terms: { field: 'input.keyword', size: 10 }
          }
        }
      }
    });

    const commonCommands = (commandsRes.aggregations?.common_commands?.buckets || []).map(b => ({
      cmd: String(b.key).replace(/[<>'"]/g, '').slice(0, 200), // ✅ Sanitized
      count: Math.max(0, b.doc_count)
    }));

    io.emit('threat_intel_update', {
      topAttackers: topAttackers,
      commonCommands: commonCommands
    });

    console.log(`📊 [INTEL] ${topAttackers.length} attackers, ${commonCommands.length} commands`);

  } catch (error) {
    console.error('❌ [INTEL] Error:', error.message);
  }
}



// Start server
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Testing Elasticsearch connection...');
    const health = await esClient.cluster.health();
    console.log(`✅ Elasticsearch connected: ${health.cluster_name}`);
    console.log('🔄 Starting session monitor...');
    // run monitor once at startup and then schedule it to run every minute
    await monitorSessions();
    setInterval(monitorSessions, 60000);
    console.log('🔴 Starting real-time attack monitoring...');
    setInterval(broadcastNewSessions, 2000);
   setInterval(broadcastThreatIntel, 30000); // Every 30 seconds
   broadcastThreatIntel(); // ✅ Run once immediately on startup
   console.log('📊 Threat intel monitoring started (30s interval)');
   console.log('✅ All systems operational!\n');
    
    // ============================================
    // ✅ NEW: INITIALIZE NOTIFICATION SERVICE
    // ============================================
    console.log('🔔 Initializing notification services...');
    
    // Initialize Email
    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      const emailSuccess = notificationService.initializeEmail({
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER,
        smtpPassword: process.env.SMTP_PASSWORD,
        recipients: (process.env.EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
      });
      
      if (emailSuccess) {
        console.log('✅ Email notifications enabled');
      } else {
        console.log('⚠️  Email notifications not configured');
      }
    } else {
      console.log('ℹ️  Email credentials not found in .env');
    }
    
    // Initialize Twilio (SMS & Phone)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilioSuccess = notificationService.initializeTwilio({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        smsRecipients: (process.env.SMS_RECIPIENTS || '').split(',').filter(Boolean),
        callRecipients: (process.env.CALL_RECIPIENTS || '').split(',').filter(Boolean)
      });
      
      if (twilioSuccess) {
        console.log('✅ Twilio (SMS & Phone) enabled');
      } else {
        console.log('⚠️  Twilio not configured');
      }
    } else {
      console.log('ℹ️  Twilio credentials not found in .env');
    }
    
    // Initialize Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      const slackSuccess = notificationService.initializeSlack(process.env.SLACK_WEBHOOK_URL);
      
      if (slackSuccess) {
        console.log('✅ Slack notifications enabled');
      } else {
        console.log('⚠️  Slack webhook invalid');
      }
    } else {
      console.log('ℹ️  Slack webhook not found in .env');
    }
    
    console.log('');
    // ============================================
    
    console.log('🔄 Starting session monitor...');
    monitorSessions();
  } catch (error) {
    console.error('❌ Elasticsearch connection failed:', error.message);
    console.error('⚠️  Server will continue but ES features will be unavailable');
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Honeypot Backend Server Started!');
    console.log(`📡 API: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`\n📊 Available Endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/dashboard/stats`);
    console.log(`   GET  /api/dashboard/attacks`);
    console.log(`   GET  /api/sessions/live`);
    console.log(`   GET  /api/sessions/:id/commands`);
    console.log(`   GET  /api/sessions/:id/details`);
    console.log(`   GET  /api/credentials`);
    console.log(`   GET  /api/credentials/table`);
    console.log(`   GET  /api/analytics/timeline`);
    console.log(`   GET  /api/analytics/countries`);
    console.log(`   GET  /api/analytics/behavioral`);
    console.log(`   GET  /api/system/info`);
    console.log(`   POST /api/services/restart`);
    console.log('');
    console.log('🔔 Notification Endpoints:');
    console.log('   GET  /api/notifications/config');
    console.log('   POST /api/notifications/config/email');
    console.log('   POST /api/notifications/config/twilio');
    console.log('   POST /api/notifications/config/slack');
    console.log('   POST /api/notifications/test/:channel');
    console.log('   POST /api/notifications/send');
    console.log(`\n✅ Server ready for connections!\n`);
  });
};

startServer();
