// ============================================
// FILE: backend/server.js (Fixed for ES 8.x)
// ============================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { Client } from '@elastic/elasticsearch';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  // Force ES 8.x compatibility
  headers: {
    'Accept': 'application/vnd.elasticsearch+json; compatible-with=8',
    'Content-Type': 'application/vnd.elasticsearch+json; compatible-with=8'
  }
});

let esConnected = false;

async function testConnection() {
  try {
    const health = await esClient.cluster.health();
    console.log('✅ Elasticsearch connected:', health.cluster_name);
    esConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Elasticsearch connection failed:', error.message);
    esConnected = false;
    return false;
  }
}

// ============================================
// API ROUTES
// ============================================

app.get('/api/health', async (req, res) => {
  const connected = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    elasticsearch: connected ? 'connected' : 'disconnected',
    services: {
      cowrie: 'running',
      elasticsearch: connected ? 'connected' : 'disconnected',
      kibana: 'connected',
      logstash: 'connected'
    }
  });
});

// Get Dashboard Statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...');
    
    // Simple total count - no date filter
    const totalResponse = await esClient.count({
      index: process.env.ELASTICSEARCH_INDEX || 'cowrie-*'
    });
    
    console.log('✅ Total count:', totalResponse.count);

    // Get a sample document to see structure
    const sampleResponse = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || 'cowrie-*',
      size: 1
    });
    
    if (sampleResponse.hits.hits.length > 0) {
      console.log('📄 Sample document fields:', Object.keys(sampleResponse.hits.hits[0]._source));
    }

    res.json({
      totalAttacks: totalResponse.count || 0,
      activeSessions: 0,
      threatLevel: 'MEDIUM',
      countriesDetected: 0
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error.message);
    console.error('📋 Full error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics',
      details: error.message 
    });
  }
});

// Get Recent Attacks - NO BODY!
app.get('/api/dashboard/attacks', async (req, res) => {
  try {
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || 'cowrie-*',
      size: 20,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        match_all: {}
      }
    });

    const attacks = response.hits.hits.map((hit, index) => ({
      id: index + 1,
      ip: hit._source.src_ip || 'Unknown',
      country: getCountryFromIP(hit._source.src_ip) || '🌍 Unknown',
      type: formatEventId(hit._source.eventid) || 'SSH Activity',
      severity: determineSeverity(hit._source),
      time: formatTimeAgo(hit._source['@timestamp'])
    }));

    res.json(attacks);

  } catch (error) {
    console.error('Error fetching attacks:', error.message);
    res.status(500).json({ error: 'Failed to fetch attacks' });
  }
});

// Get Live Sessions - NO BODY!
app.get('/api/sessions/live', async (req, res) => {
  try {
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || 'cowrie-*',
      size: 0,
      query: {
        bool: {
          must: [
            { exists: { field: 'session' } },
            { range: { '@timestamp': { gte: 'now-1h' } } }
          ]
        }
      },
      aggs: {
        sessions: {
          terms: {
            field: 'session.keyword',
            size: 20,
            order: { latest_time: 'desc' }
          },
          aggs: {
            latest_time: {
              max: {
                field: '@timestamp'
              }
            },
            latest: {
              top_hits: {
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' } }]
              }
            },
            command_count: {
              filter: {
                term: { 'eventid.keyword': 'cowrie.command.input' }
              }
            },
            start_time: {
              min: {
                field: '@timestamp'
              }
            }
          }
        }
      }
    });

    const sessions = response.aggregations?.sessions?.buckets.map((bucket, index) => {
      const latest = bucket.latest.hits.hits[0]._source;
      const startTime = new Date(bucket.start_time.value);
      const endTime = new Date(bucket.latest_time.value);
      const duration = Math.floor((endTime - startTime) / 1000);

      return {
        id: index + 1,
        sessionId: bucket.key,
        ip: latest.src_ip || 'Unknown',
        country: getCountryFlag(getCountryFromIP(latest.src_ip)),
        duration: duration,
        commands: bucket.command_count.doc_count || 0,
        risk: calculateRiskScore(latest, bucket.command_count.doc_count),
        timestamp: latest['@timestamp']
      };
    }) || [];

    res.json(sessions);

  } catch (error) {
    console.error('Error fetching sessions:', error.message);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get Analytics Timeline - NO BODY!
app.get('/api/analytics/timeline', async (req, res) => {
  try {
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || 'cowrie-*',
      size: 0,
      query: {
        range: {
          '@timestamp': {
            gte: 'now-24h'
          }
        }
      },
      aggs: {
        attacks_over_time: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '4h'
          }
        }
      }
    });

    const timeline = response.aggregations?.attacks_over_time?.buckets.map(bucket => ({
      time: new Date(bucket.key).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      attacks: bucket.doc_count
    })) || [];

    res.json(timeline);

  } catch (error) {
    console.error('Error fetching analytics:', error.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get Top IPs (Countries) - NO BODY!
app.get('/api/analytics/countries', async (req, res) => {
  try {
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || 'cowrie-*',
      size: 0,
      query: {
        range: {
          '@timestamp': {
            gte: 'now-7d'
          }
        }
      },
      aggs: {
        top_ips: {
          terms: {
            field: 'src_ip.keyword',
            size: 10
          }
        }
      }
    });

    const total = response.hits.total.value;
    const countries = response.aggregations?.top_ips?.buckets.map(bucket => {
      const country = getCountryFromIP(bucket.key);
      return {
        country: country,
        code: country.substring(0, 2),
        flag: getCountryFlag(country),
        attacks: bucket.doc_count,
        percentage: Math.round((bucket.doc_count / total) * 100)
      };
    }) || [];

    res.json(countries);

  } catch (error) {
    console.error('Error fetching countries:', error.message);
    res.status(500).json({ error: 'Failed to fetch countries data' });
  }
});

// Get Credentials - NO BODY!
app.get('/api/credentials', async (req, res) => {
  try {
    const response = await esClient.search({
      index: process.env.ELASTICSEARCH_INDEX || 'cowrie-*',
      size: 100,
      query: {
        term: { 'eventid.keyword': 'cowrie.login.failed' }
      },
      sort: [{ '@timestamp': { order: 'desc' } }]
    });

    const credentials = response.hits.hits.map(hit => ({
      username: hit._source.username || 'unknown',
      password: hit._source.password || 'unknown',
      attempts: 1,
      timestamp: hit._source['@timestamp'],
      ip: hit._source.src_ip
    }));

    res.json(credentials);

  } catch (error) {
    console.error('Error fetching credentials:', error.message);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// ============================================
// WEBSOCKET FOR REAL-TIME UPDATES
// ============================================

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  const attackInterval = setInterval(async () => {
    try {
      const response = await esClient.search({
        index: process.env.ELASTICSEARCH_INDEX || 'cowrie-*',
        size: 1,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          range: {
            '@timestamp': {
              gte: 'now-10s'
            }
          }
        }
      });

      if (response.hits.hits.length > 0) {
        const attack = response.hits.hits[0]._source;
        socket.emit('new-attack', {
          ip: attack.src_ip,
          country: getCountryFromIP(attack.src_ip),
          type: formatEventId(attack.eventid),
          timestamp: attack['@timestamp']
        });
      }
    } catch (error) {
      console.error('WebSocket error:', error.message);
    }
  }, 10000);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    clearInterval(attackInterval);
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function determineSeverity(source) {
  if (source.eventid?.includes('login.failed')) return 'high';
  if (source.eventid?.includes('command.input')) return 'critical';
  if (source.eventid?.includes('session.connect')) return 'medium';
  if (source.eventid?.includes('client.version')) return 'low';
  return 'medium';
}

function calculateRiskScore(source, commandCount) {
  let score = 3;
  if (source.eventid?.includes('command.input')) score += 3;
  if (commandCount > 10) score += 2;
  if (commandCount > 20) score += 2;
  return Math.min(score, 10);
}

function formatEventId(eventid) {
  if (!eventid) return 'SSH Activity';
  const types = {
    'cowrie.login.success': 'Login Success',
    'cowrie.login.failed': 'Login Failed',
    'cowrie.command.input': 'Command Execution',
    'cowrie.session.connect': 'Session Started',
    'cowrie.session.closed': 'Session Closed',
    'cowrie.client.version': 'Client Info',
    'cowrie.direct-tcpip.request': 'Port Forward',
    'cowrie.direct-tcpip.data': 'Data Transfer'
  };
  return types[eventid] || eventid.replace('cowrie.', '').replace('.', ' ').toUpperCase();
}

function getCountryFromIP(ip) {
  if (!ip) return 'Unknown';
  // Simple IP-based country detection (replace with real GeoIP later)
  if (ip.startsWith('192.168') || ip.startsWith('10.') || ip.startsWith('172.')) return 'Local Network';
  if (ip.startsWith('1.') || ip.startsWith('2.')) return 'China';
  if (ip.startsWith('5.')) return 'Russia';
  if (ip.startsWith('8.8')) return 'USA';
  return 'Unknown';
}

function getCountryFlag(country) {
  const flags = {
    'China': '🇨🇳',
    'Russia': '🇷🇺',
    'USA': '🇺🇸',
    'Brazil': '🇧🇷',
    'India': '🇮🇳',
    'Local Network': '🏠',
    'Unknown': '🌍'
  };
  return flags[country] || '🌍';
}

function formatTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, async () => {
  console.log('\n🚀 Honeypot Backend Server Started!');
  console.log(`📡 API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`\n🔍 Testing Elasticsearch connection...`);
  
  const connected = await testConnection();
  if (connected) {
    console.log('✅ All systems operational!\n');
  } else {
    console.log('⚠️  Warning: Elasticsearch not connected\n');
  }
});