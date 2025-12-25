import express from 'express';
import fs from 'fs';
import path from 'path';
import Setting from '../models/setting.js';
import { authenticate } from '../middleware/auth.js';
import internalNginx from '../internal/nginx.js';

const router = express.Router();

const PATH_BLOCK_FILE = process.env.NGINX_SECURITY_PATH_FILE || '/data/nginx/security_path_block.conf';
const WAF_RULES_FILE = process.env.NGINX_SECURITY_WAF_FILE || '/data/nginx/security_waf_rules.conf';
const BOT_FILTER_FILE = process.env.NGINX_SECURITY_BOT_FILE || '/data/nginx/security_bot_filter.conf';
const DEFAULT_PROVIDER = (process.env.CAPTCHA_PROVIDER || 'recaptcha').toLowerCase();
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY || '';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || '';
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '';
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || '';
const HCAPTCHA_SITE_KEY = process.env.HCAPTCHA_SITE_KEY || '';
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '';

const DEFAULT_STATE = {
    vulnerabilities: [],
    pathBlocks: [],
    captchaProvider: DEFAULT_PROVIDER,
    wafRules: {
        sqli: true,
        xss: true,
        lfi: true,
        rce: true,
        php: true,
        java: true,
        nodejs: true,
        shell: true
    },
    botRules: {
        block_ai_bots: true,
        block_google_bot: false,
        block_other_search_bots: false,
        block_social_bots: false,
        block_scrapers: true
    }
};

function ensurePathFile() {
    const dir = path.dirname(PATH_BLOCK_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(PATH_BLOCK_FILE)) {
        fs.writeFileSync(PATH_BLOCK_FILE, '# security path block rules\n');
    }
    if (!fs.existsSync(WAF_RULES_FILE)) {
        fs.writeFileSync(WAF_RULES_FILE, '# global waf rules\n');
    }
    if (!fs.existsSync(BOT_FILTER_FILE)) {
        fs.writeFileSync(BOT_FILTER_FILE, '# global bot filter rules\n');
    }
}

ensurePathFile();
// Initialize path block file from DB state on startup (best effort)
loadSecurityState()
    .then((state) => {
        writePathBlocks(state.pathBlocks);
        writeWafRules(state.wafRules);
        writeBotRules(state.botRules);
    })
    .catch(() => {});

function writePathBlocks(pathBlocks = []) {
    ensurePathFile();
    const enabled = pathBlocks.filter((p) => p.enabled);
    const lines = enabled.map((p) => `location ~* ${p.pattern} { return 403; }`);
    const content = lines.length ? lines.join('\n\n') + '\n' : '# no rules\n';
    fs.writeFileSync(PATH_BLOCK_FILE, content, 'utf8');
}

function writeWafRules(rules = {}) {
    ensurePathFile();
    const lines = [];
    
    // If protection is DISABLED (false), we remove the corresponding tags
    if (rules.sqli === false) lines.push('SecRuleRemoveByTag "attack-sqli"');
    if (rules.xss === false) lines.push('SecRuleRemoveByTag "attack-xss"');
    if (rules.lfi === false) lines.push('SecRuleRemoveByTag "attack-lfi"');
    if (rules.rce === false) lines.push('SecRuleRemoveByTag "attack-rce"');
    if (rules.php === false) lines.push('SecRuleRemoveByTag "language-php"');
    if (rules.java === false) lines.push('SecRuleRemoveByTag "language-java"');
    if (rules.nodejs === false) lines.push('SecRuleRemoveByTag "language-nodejs"');
    if (rules.shell === false) lines.push('SecRuleRemoveByTag "language-shell"');

    const content = lines.length ? lines.join('\n') + '\n' : '# All protections enabled\n';
    fs.writeFileSync(WAF_RULES_FILE, content, 'utf8');
}

function writeBotRules(rules = {}) {
    ensurePathFile();
    const lines = [];

    // Regex Definitions
    const REGEX_AI = "(gptbot|claudebot|bytespider|perplexity|seekrbot|anthropic-ai|duckassist|chatgpt)";
    const REGEX_GOOGLE = "(googlebot)";
    const REGEX_SEARCH = "(bingbot|yandex|naver|daum|baidu|duckduckgo|yahoo! slurp)";
    const REGEX_SOCIAL = "(facebookexternalhit|facebot|twitterbot|discordbot|slackbot|telegrambot)";
    const REGEX_SCRAPER = "(mj12bot|ahrefsbot|semrush|dotbot|screaming frog|megaindex|censys|nessus|nikto|acunetix|python-requests|curl|wget|libwww-perl)";

    // Helper to add rule
    const addRule = (block, regex) => {
        if (block) {
            lines.push(`if ($http_user_agent ~* "${regex}") { set $bot_bad 1; }`);
        } else {
            lines.push(`if ($http_user_agent ~* "${regex}") { set $bot_good 1; }`);
        }
    };

    // Apply rules based on settings (Default to DEFAULT_STATE if undefined)
    const r = { ...DEFAULT_STATE.botRules, ...rules };

    addRule(r.block_ai_bots, REGEX_AI);
    addRule(r.block_google_bot, REGEX_GOOGLE);
    addRule(r.block_other_search_bots, REGEX_SEARCH);
    addRule(r.block_social_bots, REGEX_SOCIAL);
    addRule(r.block_scrapers, REGEX_SCRAPER);

    const content = lines.join('\n') + '\n';
    fs.writeFileSync(BOT_FILTER_FILE, content, 'utf8');
}

async function loadSecurityState() {
    const setting = await Setting.query()
        .where('is_deleted', 0)
        .andWhere('name', 'security-center')
        .first();

    if (!setting) return DEFAULT_STATE;
    const meta = setting.meta || {};
    return {
        vulnerabilities: Array.isArray(meta.vulnerabilities) ? meta.vulnerabilities : [],
        pathBlocks: Array.isArray(meta.pathBlocks) ? meta.pathBlocks : [],
        captchaProvider: meta.captchaProvider || DEFAULT_PROVIDER,
        wafRules: { ...DEFAULT_STATE.wafRules, ...(meta.wafRules || {}) },
        botRules: { ...DEFAULT_STATE.botRules, ...(meta.botRules || {}) },
    };
}

async function saveSecurityState(nextState) {
    const normalized = {
        vulnerabilities: Array.isArray(nextState.vulnerabilities) ? nextState.vulnerabilities : [],
        pathBlocks: Array.isArray(nextState.pathBlocks) ? nextState.pathBlocks : [],
        captchaProvider: (nextState.captchaProvider || DEFAULT_PROVIDER).toLowerCase(),
        wafRules: { ...DEFAULT_STATE.wafRules, ...(nextState.wafRules || {}) },
        botRules: { ...DEFAULT_STATE.botRules, ...(nextState.botRules || {}) },
    };

    const existing = await Setting.query()
        .where('is_deleted', 0)
        .andWhere('name', 'security-center')
        .first();

    if (!existing) {
        await Setting.query().insert({
            name: 'security-center',
            description: 'Security center data (vulnerabilities, path blocks, captcha)',
            value: JSON.stringify({}),
            meta: normalized,
        });
    } else {
        await Setting.query().patchAndFetchById(existing.id, { meta: normalized });
    }

    writePathBlocks(normalized.pathBlocks);
    writeWafRules(normalized.wafRules);
    writeBotRules(normalized.botRules);

    try {
        await internalNginx.reload();
    } catch (err) {
        // Do not block response on reload failure
    }

    return normalized;
}

async function getCaptchaConfig() {
    const state = await loadSecurityState();
    const provider = (state.captchaProvider || DEFAULT_PROVIDER).toLowerCase();

    if (provider === 'turnstile') {
        return {
            provider,
            siteKey: TURNSTILE_SITE_KEY,
            secret: TURNSTILE_SECRET,
            script: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
            widgetHtml: `<div class="cf-turnstile" data-sitekey="${TURNSTILE_SITE_KEY}" data-callback="onVerify"></div>`,
            verifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            payload: (token, ip) => ({ secret: TURNSTILE_SECRET, response: token, remoteip: ip || '' }),
        };
    }
    if (provider === 'hcaptcha') {
        return {
            provider,
            siteKey: HCAPTCHA_SITE_KEY,
            secret: HCAPTCHA_SECRET,
            script: 'https://js.hcaptcha.com/1/api.js',
            widgetHtml: `<div class="h-captcha" data-sitekey="${HCAPTCHA_SITE_KEY}" data-callback="onVerify"></div>`,
            verifyUrl: 'https://hcaptcha.com/siteverify',
            payload: (token, ip) => ({ secret: HCAPTCHA_SECRET, response: token, remoteip: ip || '' }),
        };
    }
    // default recaptcha
    return {
        provider: 'recaptcha',
        siteKey: RECAPTCHA_SITE_KEY,
        secret: RECAPTCHA_SECRET,
        script: 'https://www.google.com/recaptcha/api.js',
        widgetHtml: `<div class="g-recaptcha" data-sitekey="${RECAPTCHA_SITE_KEY}" data-callback="onVerify"></div>`,
        verifyUrl: 'https://www.google.com/recaptcha/api/siteverify',
        payload: (token, ip) => ({ secret: RECAPTCHA_SECRET, response: token, remoteip: ip || '' }),
    };
}

// Public captcha page (no auth)
router.get('/captcha', async (req, res) => {
    res.type('html');
    const cfg = await getCaptchaConfig();
    if (!cfg.siteKey) {
        return res.send('<html><body><h3>Captcha site key not configured.</h3></body></html>');
    }

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bot Verification</title>
  <script src="${cfg.script}" async defer></script>
  <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;} .card{background:#fff;padding:24px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.1);max-width:420px;width:100%;text-align:center;} button{margin-top:16px;padding:10px 16px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;cursor:pointer;} button:disabled{background:#94a3b8;cursor:not-allowed;} </style>
</head>
<body>
  <div class="card">
    <h2>봇이 아닌 것을 확인해주세요</h2>
    <p>캡차 완료 후 접근이 허용됩니다. (${cfg.provider})</p>
    ${cfg.widgetHtml}
    <button id="submitBtn" disabled onclick="submitToken()">확인</button>
    <p id="msg" style="color:#ef4444;font-size:12px;margin-top:8px;"></p>
  </div>
  <script>
    let token = '';
    function onVerify(t){ token = t; document.getElementById('submitBtn').disabled = false; }
    async function submitToken(){
      if(!token) return;
      document.getElementById('submitBtn').disabled = true;
      const res = await fetch('/bot-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      if(res.ok){ window.location.href = '/'; return; }
      document.getElementById('msg').innerText = '검증에 실패했습니다. 다시 시도하세요.';
      document.getElementById('submitBtn').disabled = false;
      token = '';
      if (window.grecaptcha) grecaptcha.reset();
      if (window.turnstile && window.turnstile.reset) turnstile.reset();
      if (window.hcaptcha && window.hcaptcha.reset) hcaptcha.reset();
    }
  </script>
</body>
</html>`;
    res.send(html);
});

// Public verify (no auth)
router.post('/verify', async (req, res) => {
    const cfg = await getCaptchaConfig();
    if (!cfg.secret) {
        return res.status(501).json({ error: { message: 'captcha secret not configured' } });
    }
    const token = req.body?.token;
    if (!token) {
        return res.status(400).json({ error: { message: 'token is required' } });
    }

    try {
        const verifyRes = await fetch(cfg.verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(cfg.payload(token, req.ip)).toString(),
        });
        const data = await verifyRes.json();
        if (!data.success) {
            return res.status(401).json({ error: { message: `${cfg.provider} failed` } });
        }

        res.setHeader('Set-Cookie', 'bot_pass=1; Path=/; Max-Age=86400; SameSite=Lax');
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: { message: `${cfg.provider} verify error` } });
    }
});

router.use(authenticate);

// 캡차 프로바이더 설정 변경
router.put('/captcha-provider', async (req, res, next) => {
    try {
        const provider = String(req.body?.provider || '').toLowerCase();
        const allowed = ['recaptcha', 'turnstile', 'hcaptcha'];
        if (!allowed.includes(provider)) {
            return res.status(400).json({ error: { message: 'provider must be recaptcha | turnstile | hcaptcha' } });
        }

        const state = await loadSecurityState();
        const saved = await saveSecurityState({ ...state, captchaProvider: provider });
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

// 전체 상태 조회
router.get('/', async (req, res, next) => {
    try {
        const state = await loadSecurityState();
        res.json(state);
    } catch (err) {
        next(err);
    }
});

// 취약점 항목 추가
router.post('/vulns', async (req, res, next) => {
    try {
        const { title, severity = 'medium', status = 'open', note = '' } = req.body || {};
        if (!title) {
            return res.status(400).json({ error: { message: 'title is required' } });
        }

        const state = await loadSecurityState();
        const now = new Date().toISOString();
        const item = {
            id: Date.now(),
            title,
            severity,
            status,
            note,
            created_at: now,
            updated_at: now,
        };
        const nextState = {
            ...state,
            vulnerabilities: [item, ...state.vulnerabilities].slice(0, 200),
        };
        const saved = await saveSecurityState(nextState);
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

// 취약점 상태/메모 업데이트
router.patch('/vulns/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { status, note } = req.body || {};
        const state = await loadSecurityState();
        const next = state.vulnerabilities.map((v) => {
            if (v.id !== id) return v;
            return {
                ...v,
                status: status || v.status,
                note: note !== undefined ? note : v.note,
                updated_at: new Date().toISOString(),
            };
        });
        const saved = await saveSecurityState({ ...state, vulnerabilities: next });
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

// 취약점 삭제
router.delete('/vulns/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const state = await loadSecurityState();
        const saved = await saveSecurityState({
            ...state,
            vulnerabilities: state.vulnerabilities.filter((v) => v.id !== id),
        });
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

// URL 경로 차단 추가
router.post('/path-blocks', async (req, res, next) => {
    try {
        const { pattern, note = '', enabled = true } = req.body || {};
        if (!pattern) {
            return res.status(400).json({ error: { message: 'pattern is required' } });
        }

        const state = await loadSecurityState();
        const item = {
            id: Date.now(),
            pattern,
            note,
            enabled: !!enabled,
            created_at: new Date().toISOString(),
        };
        const nextState = {
            ...state,
            pathBlocks: [item, ...state.pathBlocks].slice(0, 200),
        };
        const saved = await saveSecurityState(nextState);
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

// URL 경로 차단 수정 (enable/disable, note 변경)
router.patch('/path-blocks/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { enabled, note } = req.body || {};
        const state = await loadSecurityState();
        const next = state.pathBlocks.map((p) => {
            if (p.id !== id) return p;
            return {
                ...p,
                enabled: typeof enabled === 'boolean' ? enabled : p.enabled,
                note: note !== undefined ? note : p.note,
            };
        });
        const saved = await saveSecurityState({ ...state, pathBlocks: next });
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

// URL 경로 차단 삭제
router.delete('/path-blocks/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const state = await loadSecurityState();
        const saved = await saveSecurityState({
            ...state,
            pathBlocks: state.pathBlocks.filter((p) => p.id !== id),
        });
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

// WAF 규칙 설정 변경
router.post('/waf-rules', async (req, res, next) => {
    try {
        const updates = req.body || {};
        const state = await loadSecurityState();
        const nextState = {
            ...state,
            wafRules: {
                ...state.wafRules,
                ...updates
            }
        };
        const saved = await saveSecurityState(nextState);
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

// 봇 차단 규칙 설정 변경
router.post('/bot-rules', async (req, res, next) => {
    try {
        const updates = req.body || {};
        const state = await loadSecurityState();
        const nextState = {
            ...state,
            botRules: {
                ...state.botRules,
                ...updates
            }
        };
        const saved = await saveSecurityState(nextState);
        res.json(saved);
    } catch (err) {
        next(err);
    }
});

export default router;