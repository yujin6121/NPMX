import ActivityLog from '../models/activity_log.js';

export async function record(req, action, detailsObj = {}) {
  try {
    const userId = req.user?.id || null;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'] || null;
    const details = JSON.stringify(detailsObj);
    if (userId) {
      await ActivityLog.query().insert({ user_id: userId, action, details, ip, user_agent: userAgent });
    }
  } catch (err) {
    // swallow errors to not break main flow
    // eslint-disable-next-line no-console
    console.error('Failed to record activity:', err);
  }
}

export default { record };
