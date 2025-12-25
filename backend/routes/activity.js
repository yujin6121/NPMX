import express from 'express';
import { authenticate } from '../middleware/auth.js';
import ActivityLog from '../models/activity_log.js';

const router = express.Router();
router.use(authenticate);

// GET /api/activity/recent
router.get('/recent', async (req, res, next) => {
  try {
    const { search, action, startDate, endDate, limit = 100 } = req.query;
    
    let query = ActivityLog.query().where('user_id', req.user.id);
    
    // Filter by action
    if (action) {
      query = query.where('action', action);
    }
    
    // Search in action or details
    if (search) {
      query = query.where(function() {
        this.where('action', 'like', `%${search}%`)
          .orWhere('details', 'like', `%${search}%`)
          .orWhere('ip', 'like', `%${search}%`);
      });
    }
    
    // Date range filter
    if (startDate) {
      query = query.where('created_on', '>=', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.where('created_on', '<=', new Date(endDate).toISOString());
    }
    
    const rows = await query
      .orderBy('created_on', 'desc')
      .limit(Math.min(parseInt(limit) || 100, 1000));
      
    res.json(rows.map((r) => ({
      id: r.id,
      action: r.action,
      details: safeParse(r.details),
      ip: r.ip,
      user_agent: r.user_agent,
      created_on: r.created_on,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/activity/stats - 트래픽 통계
router.get('/stats', async (req, res, next) => {
  try {
    const { period = '24h' } = req.query;
    
    let startDate;
    const now = new Date();
    
    if (period === '1h') {
      startDate = new Date(now - 60 * 60 * 1000);
    } else if (period === '24h') {
      startDate = new Date(now - 24 * 60 * 60 * 1000);
    } else if (period === '7d') {
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }
    
    const logs = await ActivityLog.query()
      .where('user_id', req.user.id)
      .where('created_on', '>=', startDate.toISOString());
    
    const total = logs.length;
    const actions = {};
    const ips = new Set();
    const errors = logs.filter(l => {
      const details = safeParse(l.details);
      return details?.error || details?.status >= 400;
    }).length;
    
    logs.forEach(log => {
      actions[log.action] = (actions[log.action] || 0) + 1;
      if (log.ip) ips.add(log.ip);
    });
    
    const errorRate = total > 0 ? (errors / total * 100).toFixed(2) : 0;
    
    res.json({
      period,
      total,
      errors,
      errorRate,
      uniqueIPs: ips.size,
      actions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/activity/geoip-stats - GeoIP 차단 통계
router.get('/geoip-stats', async (req, res, next) => {
  try {
    const { period = '24h' } = req.query;
    let startDate;
    const now = new Date();
    
    if (period === '24h') startDate = new Date(now - 24 * 60 * 60 * 1000);
    else if (period === '7d') startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (period === '30d') startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    else startDate = new Date(0); // all time

    const logs = await ActivityLog.query()
      .where('user_id', req.user.id)
      .whereIn('action', ['geoip_block', 'bot_block_ai', 'bot_block_google', 'bot_block_search', 'bot_block_social', 'bot_block_scraper'])
      .where('created_on', '>=', startDate.toISOString())
      .orderBy('created_on', 'desc');

    const stats = {
      total: logs.length,
      byCountry: {},
      recent: logs.slice(0, 50).map(l => {
        const d = safeParse(l.details);
        return {
          id: l.id,
          country: d.country,
          ip: l.ip,
          domain: d.domains ? (Array.isArray(d.domains) ? d.domains[0] : d.domains) : 'Unknown',
          created_on: l.created_on
        };
      })
    };

    logs.forEach(l => {
      const d = safeParse(l.details);
      const c = d.country || 'UNKNOWN';
      stats.byCountry[c] = (stats.byCountry[c] || 0) + 1;
    });

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/activity/export - CSV 내보내기
router.get('/export', async (req, res, next) => {
  try {
    const { search, action, startDate, endDate } = req.query;
    
    let query = ActivityLog.query().where('user_id', req.user.id);
    
    if (action) {
      query = query.where('action', action);
    }
    
    if (search) {
      query = query.where(function() {
        this.where('action', 'like', `%${search}%`)
          .orWhere('details', 'like', `%${search}%`)
          .orWhere('ip', 'like', `%${search}%`);
      });
    }
    
    if (startDate) {
      query = query.where('created_on', '>=', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.where('created_on', '<=', new Date(endDate).toISOString());
    }
    
    const rows = await query.orderBy('created_on', 'desc').limit(10000);
    
    // CSV 헤더
    const csv = ['ID,Action,Details,IP,User Agent,Created On'];
    
    // CSV 데이터
    rows.forEach(row => {
      const details = safeParse(row.details);
      const detailsStr = typeof details === 'object' ? JSON.stringify(details).replace(/"/g, '""') : String(details).replace(/"/g, '""');
      const userAgent = (row.user_agent || '').replace(/"/g, '""');
      
      csv.push(`${row.id},"${row.action}","${detailsStr}","${row.ip || ''}","${userAgent}","${row.created_on}"`);
    });
    
    const csvContent = csv.join('\n');
    const timestamp = new Date().toISOString().split('T')[0];
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="activity-log-${timestamp}.csv"`);
    res.send('\uFEFF' + csvContent); // BOM for Excel UTF-8
  } catch (err) {
    next(err);
  }
});

function safeParse(s) {
  try { return JSON.parse(s); } catch { return s; }
}

export default router;
