const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false
}));

const db = new sqlite3.Database('./users.db');
db.run('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, active INTEGER DEFAULT 1, session_id TEXT)');
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (!columns.some(col => col.name === 'session_id')) {
    db.run('ALTER TABLE users ADD COLUMN session_id TEXT');
  }
});

// 簡潔現代風格 CSS
const style = `
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; margin: 0; }
    .container { max-width: 400px; margin: 60px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px #e0e0e0; padding: 32px 28px; }
    .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .topbar-left { font-size: 22px; font-weight: bold; color: #1976d2; }
    .user-account { color: #1976d2; font-weight: bold; margin-right: 10px; }
    .logout-btn { background: #e53935; color: #fff; border: none; border-radius: 6px; padding: 6px 16px; font-size: 15px; cursor: pointer; font-weight: bold; }
    .logout-btn:hover { background: #b71c1c; }
    h1 { color: #1976d2; text-align: center; margin-bottom: 24px; }
    .error { color: #e53935; text-align: center; margin-bottom: 16px; }
    input, button { width: 100%; padding: 12px; margin: 10px 0; border-radius: 6px; border: 1px solid #bdbdbd; font-size: 16px; }
    button { background: #1976d2; color: #fff; border: none; font-weight: bold; }
    button:hover { background: #1565c0; }
    .info { color: #555; font-size: 14px; margin-bottom: 8px; }
  </style>
`;

// 登入頁面
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.send(`
    ${style}
    <div class=\"container\">
      <div class=\"topbar\">
        <div class=\"topbar-left\">益信國際</div>
        <div></div>
      </div>
      <h1>會員登入</h1>
      <form method=\"POST\" action=\"/login\">
        <input type=\"text\" name=\"username\" placeholder=\"帳號\" required autocomplete=\"username\">
        <input type=\"password\" name=\"password\" placeholder=\"密碼\" required autocomplete=\"current-password\">
        <button type=\"submit\">登入</button>
      </form>
    </div>
  `);
});

// 處理登入
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (!row) {
      return res.send(`${style}<div class=\"container\"><div class=\"error\">帳號不存在</div><a href=\"/\">回登入</a></div>`);
    }
    if (row.active === 0) {
      return res.send(`${style}<div class=\"container\"><div class=\"error\">此帳號已被停用</div><a href=\"/\">回登入</a></div>`);
    }
    bcrypt.compare(password, row.password).then(match => {
      if (match) {
        const newSessionId = crypto.randomBytes(24).toString('hex');
        req.session.user = { username: row.username, session_id: newSessionId };
        db.run('UPDATE users SET session_id = ? WHERE username = ?', [newSessionId, row.username], () => {
          res.redirect('/dashboard');
        });
      } else {
        res.send(`${style}<div class=\"container\"><div class=\"error\">密碼錯誤</div><a href=\"/\">回登入</a></div>`);
      }
    });
  });
});

// session 狀態檢查 API
app.get('/session-check', (req, res) => {
  if (!req.session.user) return res.sendStatus(401);
  db.get('SELECT session_id FROM users WHERE username = ?', [req.session.user.username], (err, row) => {
    if (!row || row.session_id !== req.session.user.session_id) {
      req.session.destroy(() => res.sendStatus(401));
    } else {
      res.sendStatus(200);
    }
  });
});

// 功能頁（需登入）
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  db.get('SELECT session_id FROM users WHERE username = ?', [req.session.user.username], (err, row) => {
    if (!row || row.session_id !== req.session.user.session_id) {
      req.session.destroy(() => res.redirect('/'));
      return;
    }
    const ua = req.headers['user-agent'];
    let deviceType = /android|iphone|ipad|mobile/i.test(ua) ? '手機' : 'PC';
    res.send(`
      ${style}
      <div class=\"container\">
        <div class=\"topbar\">
          <div class=\"topbar-left\">益信國際</div>
          <div>
            <span class=\"user-account\">${req.session.user.username}</span>
            <form method=\"GET\" action=\"/logout\" style=\"display:inline;\">
              <button type=\"submit\" class=\"logout-btn\">登出</button>
            </form>
          </div>
        </div>
        <h1>歡迎，${req.session.user.username}</h1>
        <div class=\"info\">設備類型：${deviceType}</div>
        <div class=\"info\">User-Agent：${ua}</div>
        <div style=\"margin:24px 0; color:#888;\">（此頁僅供展示登入狀態，無注入功能）</div>
      </div>
    `);
  });
});

// 登出
app.get('/logout', (req, res) => {
  if (req.session.user) {
    db.run('UPDATE users SET session_id = NULL WHERE username = ?', [req.session.user.username], () => {
      req.session.destroy(() => res.redirect('/'));
    });
  } else {
    req.session.destroy(() => res.redirect('/'));
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log('網站已啟動');
});
