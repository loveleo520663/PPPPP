const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const app = express();
const port = 3000;
const crypto = require('crypto');

app.use(express.urlencoded({ extended: true }));

// 啟用 session
app.use(session({
  secret: 'your_secret_key', // 請改成你自己的密鑰
  resave: false,
  saveUninitialized: false
}));

// 建立資料庫
const db = new sqlite3.Database('./users.db');

// 建立 users 資料表，新增 session_id 與 login_ip 欄位
db.run('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, active INTEGER DEFAULT 1, session_id TEXT, login_ip TEXT)');
// 確保 session_id 與 login_ip 欄位存在（舊資料庫升級）
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (!columns.some(col => col.name === 'session_id')) {
    db.run('ALTER TABLE users ADD COLUMN session_id TEXT');
  }
  if (!columns.some(col => col.name === 'login_ip')) {
    db.run('ALTER TABLE users ADD COLUMN login_ip TEXT');
  }
});

// CSS 樣式
const style = `
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { ... }
    .container { ... }
    /* ...原本的CSS... */

    /* 這裡加上卡片CSS */
    .card-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
    }
    .card {
      flex: 1 1 180px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 8px #eee;
      padding: 18px 16px 12px 16px;
      min-width: 140px;
      text-align: left;
      margin-bottom: 0;
    }
    .card-title {
      font-size: 17px;
      font-weight: bold;
      color: #222;
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .base-rate { color: #338bff; }
    .target-rate { color: #27c24c; }
    .time-rate { color: #7d3cff; }
    .success-rate { color: #ff9800; }
    .card-diff {
      font-size: 14px;
      margin-top: 2px;
    }
    @media (max-width: 600px) {
      .card-row { flex-direction: column; gap: 12px; }
      .card { min-width: 0; padding: 14px 10px 8px 10px; }
      .card-title { font-size: 15px; }
      .card-value { font-size: 22px; }
      .card-diff { font-size: 13px; }
    }
    body { font-family: Arial; background: #f0f0f0; }
    .container {
      max-width: 400px;
      margin: 50px auto;
      background: #fff;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 2px 16px #ccc;
    }
    input, select, button {
      width: 100%;
      padding: 12px;
      margin: 12px 0;
      border-radius: 8px;
      border: 1px solid #ccc;
      box-sizing: border-box;
      font-size: 18px;
    }
    button {
      background: #338bff;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 20px;
      font-weight: bold;
      margin-top: 16px;
    }
    a { color: #338bff; text-decoration: none; }
    .error { color: red; }
    h1 {
      color: #1a2a3a;
      text-align: center;
      margin-bottom: 24px;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    h2 {
      text-align: center;
      font-size: 20px;
      margin-bottom: 16px;
      color: #1a2a3a;
      font-weight: bold;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { word-break: break-all; }
    @media (max-width: 600px) {
      .container {
        max-width: 98vw;
        padding: 8vw 2vw;
        border-radius: 10vw;
        margin: 10vw auto;
      }
      h1 { font-size: 6vw; }
      h2 { font-size: 5vw; }
      input, select, button { font-size: 5vw; padding: 4vw; border-radius: 3vw; }
      button { font-size: 5vw; margin-top: 4vw; }
      table { font-size: 4vw; }
      th, td { padding: 2vw 1vw; }
    }    
      .topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 18px 0;
  border-bottom: 1px solid #eee;
  margin-bottom: 18px;
}
.topbar-left {
  font-size: 20px;
  font-weight: bold;
  color: #1a2a3a;
  letter-spacing: 1px;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-account {
  font-size: 16px;
  color: #338bff;
  margin-right: 6px;
}
.logout-btn {
  background: #ff3b30;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 15px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}
.logout-btn:hover {
  background: #d32f2f;
}
@media (max-width: 600px) {
  .topbar-left { font-size: 4.5vw; }
  .user-account { font-size: 3.8vw; }
  .logout-btn { font-size: 3.8vw; padding: 4px 10px; }
}
  </style>
`;

// 登入頁面
app.get('/', (req, res) => {
  // 已登入直接導到 dashboard
  if (req.session.user) return res.redirect('/dashboard');
  res.send(`
    ${style}
    <div class="container">
      <div class="topbar">
        <div class="topbar-left">益信國際</div>
        <div class="topbar-right"></div>
      </div>
      <h1>會員登入</h1>
      <form method="POST" action="/login">
        <div style="margin-bottom:12px;">
          <label>帳號：</label>
          <input type="text" name="username" required autocomplete="username">
        </div>
        <div style="margin-bottom:12px;">
          <label>密碼：</label>
          <input type="password" name="password" required autocomplete="current-password">
        </div>
        <button type="submit">登入</button>
      </form>
    </div>
  `);
});

// 處理登入
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (!row) {
      res.send(`
        ${style}
        <div class="container">
          <h1>益信國際</h1>
          <p class="error">帳號不存在</p>
          <a href="/">回登入</a>
        </div>
      `);
    } else if (row.active === 0) {
      res.send(`
        ${style}
        <div class="container">
          <h1>益信國際</h1>
          <p class="error">此帳號已被停用</p>
          <a href="/">回登入</a>
        </div>
      `);
    } else {
      bcrypt.compare(password, row.password).then(match => {
        if (match) {
          // 產生新的 session id
          const newSessionId = crypto.randomBytes(24).toString('hex');
          req.session.user = { username: row.username, session_id: newSessionId, login_ip: ip };
          // 寫入資料庫
          db.run('UPDATE users SET session_id = ?, login_ip = ? WHERE username = ?', [newSessionId, ip, row.username], (err) => {
            res.redirect('/dashboard');
          });
        } else {
          res.send(`
            ${style}
            <div class="container">
              <h1>益信國際</h1>
              <p class="error">密碼錯誤</p>
              <a href="/">回登入</a>
            </div>
          `);
        }
      });
    }
  });
});

// session 狀態檢查 API
app.get('/session-check', (req, res) => {
  if (!req.session.user) return res.sendStatus(401);
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip;
  db.get('SELECT session_id, login_ip FROM users WHERE username = ?', [req.session.user.username], (err, row) => {
    if (!row || row.session_id !== req.session.user.session_id || row.login_ip !== ip) {
      req.session.destroy(() => {
        res.sendStatus(401);
      });
    } else {
      res.sendStatus(200);
    }
  });
});

// 功能頁（需登入）
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip;
  // 驗證 session_id 與 login_ip 是否一致
  db.get('SELECT session_id, login_ip FROM users WHERE username = ?', [req.session.user.username], (err, row) => {
    if (!row || row.session_id !== req.session.user.session_id || row.login_ip !== ip) {
      // session 或 IP 不一致，強制登出
      req.session.destroy(() => {
        res.redirect('/');
      });
      return;
    }
    const ua = req.headers['user-agent'];
    let deviceType = 'PC';
    if (/android|iphone|ipad|mobile/i.test(ua)) {
      deviceType = '手機';
    }
    res.send(`
      ${style}
<div class="topbar">
  <div class="topbar-left">益信國際</div>
  <div class="topbar-right">
    ${req.session.user ? `
      <span class="user-account">${req.session.user.username}</span>
      <form method="GET" action="/logout" style="display:inline;">
        <button type="submit" class="logout-btn">登出</button>
      </form>
    ` : ''}
  </div>
</div>
  <form id="injectForm">
<div id="result">
  <div class="card-row">
    <div class="card">
      <div class="card-title">基準中獎率</div>
      <div class="card-value base-rate" id="baseRate">尚未注入</div>
      <div class="card-diff" id="baseDiff"></div>
    </div>
    <div class="card">
      <div class="card-title">目標中獎率</div>
      <div class="card-value target-rate" id="targetRate">尚未注入</div>
      <div class="card-diff" id="targetDiff"></div>
    </div>
  <div class="card">
    <div class="card-title">後台運算時間</div>
    <div class="card-value time-rate" id="timeRate">尚未注入</div>
    <div class="card-diff" id="timeDiff"></div>
  </div>
  <div class="card">
    <div class="card-title">成功率</div>
    <div class="card-value success-rate" id="successRate">尚未注入</div>
    <div class="card-diff" id="successDiff"></div>
  </div>
</div>
<div style="margin-bottom:8px;">
  <label>選擇遊戲：</label>
  <select name="game">
    <option>雷神之錘</option>
    <option>戰神呂布</option>
    <option>戰神賽特</option>
    <option>魔龍之戰</option>
  </select>
</div>
<div style="margin-bottom:8px;">
  <label>選擇平台：</label>
  <select name="platform">
    <option>RSG電子</option>
    <option>ATG電子</option>
  </select>
</div>
<div style="margin-bottom:8px;">
</div>
<div style="margin-bottom:8px;">
  <label>請輸入機台台號：</label>
  <input type="number" id="machineIdInput" name="machine_id" placeholder="請輸入機台台號" required min="1" max="5000" step="1">
<label>
    <input type="checkbox" id="noMachine" name="no_machine" value="1" style="width:auto;vertical-align:middle;margin-right:6px;">
    無機台
  </label>
  </div>
        <label>修改功能：</label>
        <table style="margin-bottom:16px;">
          <tr>
            <td style="padding:4px 8px;">免費遊戲機率</td>
            <td><input type="checkbox" name="free"></td>
          </tr>
          <tr>
            <td style="padding:4px 8px;">高倍磁性調校</td>
            <td><input type="checkbox" name="high"></td>
          </tr>
          <tr>
            <td style="padding:4px 8px;">全域相容雲端化</td>
            <td><input type="checkbox" name="cloud"></td>
          </tr>
          <tr>
            <td style="padding:4px 8px;">智慧隱匿反偵測</td>
            <td><input type="checkbox" name="hide"></td>
          </tr>
        </table>
        <button type="submit">注入</button>
      </form>
      <br>
      <p>你的IP位置：${ip}</p>
      <label>你的設備類型：</label>
  <span>${deviceType}</span>
      <p>其他設備資訊：${ua}</p>
    </div>
    <div id="loadingModal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:9999;justify-content:center;align-items:center;">
  <div style="background:#fff;padding:32px 48px;border-radius:8px;box-shadow:0 2px 8px #888;text-align:center;min-width:260px;">
    <div style="font-size:20px;margin-bottom:18px;">系統處理中...</div>
    <ul id="loadingSteps" style="list-style:none;padding:0;text-align:left;">
      <li><span class="step-icon spinner"></span> 讀取機料庫</li>
      <li><span class="step-icon spinner"></span> 系統運算中</li>
      <li><span class="step-icon spinner"></span> 遊戲後台IP讀取中</li>
      <li><span class="step-icon spinner"></span> 排序資料中</li>
      <li><span class="step-icon spinner"></span> 注入修改資料中</li>
    </ul>
  </div>
</div>
<style>
  @keyframes spin {
    0% { transform: rotate(0deg);}
    100% { transform: rotate(360deg);}
  }
  .spinner {
    display:inline-block;
    width:20px;height:20px;
    border:3px solid #eee;
    border-top:3px solid #338bff;
    border-radius:50%;
    animation:spin 1s linear infinite;
    vertical-align:middle;
    margin-right:8px;
  }
  .check {
    display:inline-block;
    width:20px;height:20px;
    color:#27c24c;
    font-size:20px;
    font-weight:bold;
    vertical-align:middle;
    margin-right:8px;
  }
</style>
<script>
  // 無機台勾選控制
  document.getElementById('noMachine').addEventListener('change', function() {
    const input = document.getElementById('machineIdInput');
    if (this.checked) {
      input.disabled = true;
      input.required = false;
      input.value = '';
    } else {
      input.disabled = false;
      input.required = true;
    }
  });

  // 送出表單動畫與AJAX
  document.getElementById('injectForm').addEventListener('submit', function(e) {
    e.preventDefault();
    document.getElementById('loadingModal').style.display = 'flex';

    // 步驟動畫
    const steps = document.querySelectorAll('#loadingSteps li');
    steps.forEach((li, i) => {
      li.querySelector('.step-icon').className = 'step-icon spinner';
    });

    // 依序完成每個步驟
    let current = 0;
    function nextStep() {
      if (current > 0) {
        // 上一個步驟打勾
        steps[current-1].querySelector('.step-icon').outerHTML = '<span class="step-icon check">&#10003;</span>';
      }
      if (current < steps.length) {
        setTimeout(() => {
          current++;
          nextStep();
        }, 1000); // 每個步驟間隔1秒
      }
    }
    nextStep();

    const formData = new FormData(this);
    fetch('/inject', {
      method: 'POST',
      body: formData
    })
    .then(res => res.text())
    .then(html => {
      // 全部步驟打勾
      steps.forEach(li => {
        li.querySelector('.step-icon').outerHTML = '<span class="step-icon check">&#10003;</span>';
      });
      setTimeout(() => {
  document.getElementById('loadingModal').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' }); // 先滾到最上層
  document.getElementById('result').innerHTML = html;
}, 500);
    });
  });
</script>
  `);
});
}); // 補上 dashboard callback 結尾

// 登出
app.get('/logout', (req, res) => {
  if (req.session.user) {
    // 清空資料庫 session_id
    db.run('UPDATE users SET session_id = NULL WHERE username = ?', [req.session.user.username], () => {
      req.session.destroy(() => {
        res.redirect('/');
      });
    });
  } else {
    req.session.destroy(() => {
      res.redirect('/');
    });
  }
});

// 注入功能（AJAX更新表格）
app.post('/inject', (req, res) => {
  function randPercent() {
    return (Math.random() * 100).toFixed(1) + '%';
  }
  function randDiff() {
    const n = (Math.random() * 10 - 5).toFixed(1);
    return n >= 0
      ? `<span style="color:#27c24c;">↑ ${Math.abs(n)}%</span>`
      : `<span style="color:#ff3b30;">↓ ${Math.abs(n)}%</span>`;
  }
  const waitSeconds = (Math.random() * 4 + 3).toFixed(2);
  setTimeout(() => {
    res.send(`
      <div class="card-row">
        <div class="card">
          <div class="card-title">基準中獎率</div>
          <div class="card-value base-rate">${randPercent()}</div>
          <div class="card-diff">${randDiff()}</div>
        </div>
        <div class="card">
          <div class="card-title">目標中獎率</div>
          <div class="card-value target-rate">${randPercent()}</div>
          <div class="card-diff">${randDiff()}</div>
        </div>
        <div class="card">
          <div class="card-title">後台運算時間</div>
          <div class="card-value time-rate">${waitSeconds}秒</div>
          <div class="card-diff">${randDiff().replace('%','秒')}</div>
        </div>
        <div class="card">
          <div class="card-title">成功率</div>
          <div class="card-value success-rate">${randPercent()}</div>
          <div class="card-diff">${randDiff()}</div>
        </div>
      </div>

    `);
  }, waitSeconds * 1000);
});

app.listen(port, '0.0.0.0', () => {
  console.log('網站已啟動');
});
