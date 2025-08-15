
const express = require('express');
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

// 取得客戶端 IP
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || req.ip;
}

// 產生設備序號
function getDeviceId() {
  return crypto.randomBytes(18).toString('base64').replace(/\+/g, 'A').replace(/\//g, 'B');
}


// 假設帳號登入流程（實際應用請串接資料庫驗證）
app.get('/login', (req, res) => {
  res.send(`
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{font-family:sans-serif;background:#f6f8fa;}</style>
    <div style="max-width:340px;margin:60px auto;background:#fff;padding:32px 24px;border-radius:12px;box-shadow:0 2px 16px #e0e0e0;">
      <h2 style="color:#1976d2;text-align:center;">TF電子老虎機機台檢測</h2>
      <form method="POST" action="/login">
        <input name="username" placeholder="請輸入帳號" required style="width:100%;padding:12px;margin-bottom:12px;border-radius:6px;border:1px solid #bdbdbd;">
        <input name="password" type="password" placeholder="請輸入密碼" required style="width:100%;padding:12px;margin-bottom:16px;border-radius:6px;border:1px solid #bdbdbd;">
        <button type="submit" style="width:100%;padding:12px;background:#1976d2;color:#fff;border:none;border-radius:6px;font-weight:bold;">登入</button>
      </form>
    </div>
  `);
});

// 假帳號密碼驗證（示範用，請改用資料庫驗證）
const fakeUsers = [
  { username: 'admin', password: '123456' },
  { username: 'test', password: 'testpass' }
];
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.redirect('/login');
  const user = fakeUsers.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.send(`
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <div style="max-width:340px;margin:60px auto;background:#fff;padding:32px 24px;border-radius:12px;box-shadow:0 2px 16px #e0e0e0;">
        <h2 style="color:#d32f2f;text-align:center;">登入失敗</h2>
        <div style="color:#d32f2f;text-align:center;margin-bottom:16px;">帳號或密碼錯誤</div>
        <a href="/login" style="display:block;text-align:center;color:#1976d2;">返回登入</a>
      </div>
    `);
  }
  req.session.user = { username };
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';
  const deviceType = /android|iphone|ipad|mobile/i.test(ua) ? '手機設備' : '電腦設備';
  const deviceId = getDeviceId();
  const username = req.session.user.username;
  res.send(`
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { background: #f6f8fa; font-family: 'Segoe UI', Arial, sans-serif; margin: 0; }
      .topbar { background: #232c3b; color: #fff; padding: 18px 0 12px 0; display: flex; justify-content: space-between; align-items: center; }
      .topbar-title { font-size: 20px; font-weight: bold; margin-left: 18px; }
      .topbar-user { font-size: 16px; margin-right: 12px; }
      .logout-btn { background: #fff; color: #232c3b; border: none; border-radius: 6px; padding: 6px 16px; font-size: 15px; font-weight: bold; cursor: pointer; }
      .container { max-width: 480px; margin: 32px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px #e0e0e0; padding: 24px 18px; }
      .card { background: #fafbfc; border-radius: 10px; margin-bottom: 18px; padding: 18px 16px; box-shadow: 0 1px 4px #eee; }
      .card-title { font-size: 17px; font-weight: bold; margin-bottom: 8px; }
      .card-value { font-size: 22px; font-weight: bold; }
      .base { color: #1976d2; } .target { color: #27c24c; } .time { color: #7d3cff; } .success { color: #ff9800; }
      .form-group { margin-bottom: 16px; }
      label { font-size: 15px; margin-bottom: 4px; display: block; }
      select, input[type=checkbox] { font-size: 16px; padding: 6px; border-radius: 6px; border: 1px solid #bdbdbd; width: 100%; }
      .checkbox-group { margin-bottom: 10px; }
      .checkbox-group label { display: flex; align-items: center; font-size: 15px; margin-bottom: 0; }
      .checkbox-group input { width: auto; margin-right: 8px; }
      .info-box { background: #f4f6f8; border-radius: 8px; padding: 12px 10px; margin-bottom: 12px; font-size: 15px; color: #333; }
      .disabled-btn { background: #e0e0e0; color: #aaa; border: none; border-radius: 6px; padding: 12px; font-size: 17px; width: 100%; font-weight: bold; cursor: not-allowed; }
    </style>
    <div class="topbar">
      <div class="topbar-title">TF電子老虎機機台檢測</div>
      <div class="topbar-user">${username} <form method="GET" action="/logout" style="display:inline;"><button class="logout-btn">登出</button></form></div>
    </div>
    <div class="container">
      <div class="card">
        <div class="card-title">基準中獎率</div>
        <div class="card-value base"><span id="baseRate">0</span><span class="unit">%</span></div>
      </div>
      <div class="card">
        <div class="card-title">目標中獎率</div>
        <div class="card-value target"><span id="targetRate">0</span><span class="unit">%</span></div>
      </div>
      <div class="card">
        <div class="card-title">後台運算時間</div>
        <div class="card-value time"><span id="timeRate">0</span><span class="unit">秒</span></div>
      </div>
      <div class="card">
        <div class="card-title">成功率</div>
        <div class="card-value success"><span id="successRate">0</span><span class="unit">%</span></div>
      </div>
      <div class="form-group">
        <label>選擇平台</label>
        <select name="platform" style="width:100%;padding:8px;border-radius:6px;border:1px solid #bdbdbd;">
          <option value="RSG電子">RSG電子</option>
          <option value="ATG電子">ATG電子</option>
        </select>
      </div>
      <div class="form-group">
        <label>選擇遊戲</label>
        <select name="game" style="width:100%;padding:8px;border-radius:6px;border:1px solid #bdbdbd;">
          <option value="雷神之錘">雷神之錘</option>
          <option value="戰神呂布">戰神呂布</option>
          <option value="戰神賽特">戰神賽特</option>
          <option value="魔龍之戰">魔龍之戰</option>
        </select>
      </div>
      <div class="checkbox-group">
        <label><input type="checkbox" disabled> 免費遊戲機率</label>
        <label><input type="checkbox" disabled> 高倍磁性調校</label>
        <label><input type="checkbox" disabled> 全域相容雲端優化</label>
        <label><input type="checkbox" disabled> 智慧隱匿反偵測</label>
      </div>
      <div class="info-box">
        <div>我的所在IP位置<br><b>${ip}</b></div>
        <div style="margin-top:8px;">設備類型<br><b>${deviceType}</b></div>
        <div style="margin-top:8px;">設備序列號<br><b>${deviceId}</b></div>
      </div>
      <button class="disabled-btn" disabled>無法注入</button>

    </div>
    <script>
      // 動畫數字跳動函式
      function animateNumber(id, to, unit, duration = 1200) {
        const el = document.getElementById(id);
        if (!el) return;
        let start = 0;
        let startTime = null;
        function step(ts) {
          if (!startTime) startTime = ts;
          const progress = Math.min((ts - startTime) / duration, 1);
          const value = Math.floor(progress * (to - start) + start);
          el.textContent = value;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = to;
        }
        requestAnimationFrame(step);
      }
      // 範例：animateNumber('baseRate', 78, '%')
      // 你可根據實際需求在AJAX回傳後呼叫 animateNumber
    </script>
  `);
});

app.listen(port, '0.0.0.0', () => {
  console.log('網站已啟動 http://0.0.0.0:' + port);
});