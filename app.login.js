const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false
}));

const db = new sqlite3.Database('./users.db');
db.run('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, active INTEGER DEFAULT 1, session_id TEXT)');

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || req.ip;
}
function getDeviceId() {
  return crypto.randomBytes(18).toString('base64').replace(/\+/g, 'A').replace(/\//g, 'B');
}

// 登入頁面3
app.get('/login', (req, res) => {
  res.send(`
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>
      body {
        font-family: 'Segoe UI', 'Noto Sans TC', Arial, sans-serif;
        background: #18191a;
        margin: 0;
      }
      .login-container {
        max-width: 400px;
        margin: 7vw auto 0 auto;
        background: #232c3b;
        padding: 40px 28px 32px 28px;
        border-radius: 18px;
        box-shadow: 0 4px 32px #0008;
        color: #fff;
        position: relative;
      }
      .login-logo {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 18px;
      }
      .login-logo img {
        width: 120px;
        height: 120px;
        border-radius: 16px;
        box-shadow: 0 2px 16px #0006;
        background: #222;
      }
      .login-title {
        color: #FFD700;
        text-align: center;
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 18px;
        letter-spacing: 2px;
        text-shadow: 0 2px 8px #0006;
      }
      .login-container input, .login-container button {
        width: 100%;
        font-size: 1.1rem;
        padding: 14px;
        border-radius: 8px;
        border: 1px solid #444;
        margin-bottom: 18px;
        box-sizing: border-box;
        background: #232c3b;
        color: #fff;
        outline: none;
        transition: border 0.2s;
      }
      .login-container input:focus {
        border: 1.5px solid #FFD700;
      }
      .login-container button {
        background: linear-gradient(90deg,#FFD700 60%,#ffb300 100%);
        color: #232c3b;
        border: none;
        font-weight: bold;
        font-size: 1.15rem;
        margin-bottom: 0;
        box-shadow: 0 2px 8px #0003;
        letter-spacing: 1px;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
      }
      .login-container button:hover {
        background: linear-gradient(90deg,#ffb300 0%,#FFD700 100%);
        color: #18191a;
      }
      @media (max-width: 600px) {
        .login-container { max-width: 96vw; padding: 24px 8vw; }
        .login-logo img { width: 90px; height: 90px; }
        .login-title { font-size: 1.3rem; }
      }
    </style>
    <div class="login-container">
      <div class="login-logo">
        <img src="/slot777.png" alt="JACKPOT 777">
      </div>
      <div class="login-title">TF電子老虎機機台檢測</div>
      <form method="POST" action="/login">
        <input name="username" placeholder="請輸入帳號" required autocomplete="username">
        <input name="password" type="password" placeholder="請輸入密碼" required autocomplete="current-password">
        <button type="submit">登入</button>
      </form>
    </div>
  `);
});

// 登入驗證
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (!row) {
      return res.send('<script>alert("帳號不存在");window.location="/login";</script>');
    }
    if (row.active === 0) {
      return res.send('<script>alert("帳號已停用");window.location="/login";</script>');
    }
    bcrypt.compare(password, row.password).then(match => {
      if (match) {
        const newSessionId = crypto.randomBytes(24).toString('hex');
        req.session.user = { username: row.username, session_id: newSessionId };
        db.run('UPDATE users SET session_id = ? WHERE username = ?', [newSessionId, row.username], () => {
          res.redirect('/');
        });
      } else {
        res.send('<script>alert("密碼錯誤");window.location="/login";</script>');
      }
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  // 取得真實IP（去除 ::ffff: 前綴）
  let ip = getClientIp(req);
  if (ip && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  // 自動判斷設備類型
  const ua = req.headers['user-agent'] || '';
  const deviceType = /android|iphone|ipad|mobile/i.test(ua) ? '手機設備' : '電腦設備';
  // 產生唯一設備序號（每次登入唯一）
  let deviceId = req.session.deviceId;
  if (!deviceId) {
    deviceId = getDeviceId();
    req.session.deviceId = deviceId;
  }
  const username = req.session.user.username;
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
      <title>TF電子老虎機機台檢測</title>
      <link rel="icon" type="image/png" href="/slot777.png">
      <style>
        body {
          font-family: 'Segoe UI', 'Noto Sans TC', Arial, sans-serif;
          background: #18191a;
          margin: 0;
        }
        .main-bg {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #18191a;
        }
        .main-container {
          max-width: 520px;
          width: 98vw;
          margin: 0 auto;
          background: #232c3b;
          padding: 56px 36px 40px 36px;
          border-radius: 24px;
          box-shadow: 0 6px 40px #000a;
          color: #fff;
          position: relative;
          box-sizing: border-box;
        }
        .main-title {
          color: #FFD700;
          text-align: center;
          font-size: 2.4rem;
          font-weight: bold;
          margin-bottom: 28px;
          letter-spacing: 2px;
          text-shadow: 0 2px 12px #0008;
        }
        .main-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .main-header-bar .user {
          color: #FFD700;
          font-size: 1.2rem;
          margin-bottom: 0;
          word-break: break-all;
        }
        .logout-btn {
          background: linear-gradient(90deg,#FFD700 60%,#ffb300 100%);
          color: #232c3b;
          border: none;
          border-radius: 10px;
          padding: 14px 32px;
          font-size: 1.25rem;
          font-weight: bold;
          cursor: pointer;
          margin-bottom: 0;
          margin-left: 12px;
          box-shadow: 0 2px 8px #0003;
          letter-spacing: 1px;
          transition: background 0.2s, color 0.2s;
          float: none;
          display: inline-block;
        }
        .logout-btn:hover {
          background: linear-gradient(90deg,#ffb300 0%,#FFD700 100%);
          color: #18191a;
        }
        .card {
          background: #18191a;
          border-radius: 16px;
          margin-bottom: 28px;
          padding: 28px 22px;
          box-shadow: 0 2px 16px #000a;
          box-sizing: border-box;
        }
        .card-title {
          font-size: 1.35rem;
          font-weight: bold;
          margin-bottom: 12px;
          color: #FFD700;
        }
        .card-value {
          font-size: 2.1rem;
          font-weight: bold;
          color: #fff;
          word-break: break-all;
        }
        .base, .target, .time, .success {
          color: #FFD700;
        }
        .form-group { margin-bottom: 22px; }
        label { font-size: 1.15rem; margin-bottom: 6px; display: block; }
        select, input[type=checkbox], input[type=number] {
          font-size: 1.25rem;
          padding: 14px;
          border-radius: 10px;
          border: 1.5px solid #444;
          width: 100%;
          background: #232c3b;
          color: #fff;
          outline: none;
          transition: border 0.2s;
          box-sizing: border-box;
        }
        select:focus, input[type=number]:focus {
          border: 2px solid #FFD700;
        }
        .checkbox-group { margin-bottom: 16px; }
        .checkbox-group label { display: flex; align-items: center; font-size: 1.15rem; margin-bottom: 0; }
        .checkbox-group input { width: auto; margin-right: 12px; }
        .info-box {
          background: #232c3b;
          border-radius: 10px;
          padding: 18px 14px;
          margin-bottom: 18px;
          font-size: 1.15rem;
          color: #FFD700;
          box-shadow: 0 1px 8px #0006;
          word-break: break-all;
        }
        .disabled-btn {
          background: #444;
          color: #aaa;
          border: none;
          border-radius: 10px;
          padding: 18px;
          font-size: 1.35rem;
          width: 100%;
          font-weight: bold;
          cursor: not-allowed;
          margin-top: 16px;
        }
        @media (max-width: 600px) {
          .main-container { max-width: 99vw; padding: 12vw 2vw; }
          .main-title { font-size: 1.4rem; }
          .card-title { font-size: 1.1rem; }
          .card-value { font-size: 1.3rem; }
          .logout-btn { font-size: 1.05rem; padding: 10px 16px; margin-bottom: 0; }
          .main-header-bar { flex-direction: column; align-items: flex-end; gap: 8px; }
          .main-header-bar .user { font-size: 1rem; }
        }
      </style>
    </head>
    <body>
      <div class="main-bg">
        <div class="main-container">
          <div class="main-title">TF電子老虎機機台檢測</div>
          <div class="main-header-bar">
            <span class="user">${username}</span>
            <form method="GET" action="/logout" style="display:inline;"><button class="logout-btn">登出</button></form>
          </div>
          <div class="card">
            <div class="card-title">平轉中獎率</div>
            <div class="card-value base"><span id="baseRate">尚未注入</span><span class="unit">%</span></div>
          </div>
          <div class="card">
            <div class="card-title">免遊中獎率</div>
            <div class="card-value target"><span id="targetRate">尚未注入</span><span class="unit">%</span></div>
          </div>
          <div class="card">
            <div class="card-title">後台運算時間</div>
            <div class="card-value time"><span id="timeRate">尚未注入</span><span class="unit">秒</span></div>
          </div>
          <div class="card">
            <div class="card-title">整體推薦</div>
            <div class="card-value success"><span id="successRate">尚未注入</span><span class="unit">%</span></div>
          </div>
          <div class="form-group">
            <label><input type="checkbox" id="noMachine" style="width:auto;margin-right:8px;"> 無機台</label>
          </div>
          <div class="form-group">
            <label for="machineId">請輸入機台號</label>
            <input type="number" id="machineId" name="machineId" placeholder="請輸入機台號" min="1" max="5000">
            <div id="machineIdError" style="color:#d32f2f;font-size:14px;display:none;margin-top:2px;">機台號必須介於 1~5000</div>
          </div>
          <div class="form-group">
            <label>選擇平台</label>
            <select name="platform">
              <option value="" disabled selected>請選擇平台</option>
              <option value="RSG電子">RSG電子</option>
              <option value="ATG電子">ATG電子</option>
            </select>
          </div>
          <div class="form-group">
            <label>選擇遊戲</label>
            <select name="game">
              <option value="" disabled selected>請選擇遊戲</option>
              <option value="雷神之錘">雷神之錘</option>
              <option value="戰神呂布">戰神呂布</option>
              <option value="戰神賽特">戰神賽特</option>
              <option value="魔龍之戰">魔龍之戰</option>
            </select>
          </div>
          <div class="checkbox-group">
            <label><input type="checkbox" name="freegame"> 免費遊戲機率</label>
            <label><input type="checkbox" name="magnetic"> 高倍磁性調校</label>
            <label><input type="checkbox" name="cloud"> 全域相容雲端優化</label>
            <label><input type="checkbox" name="stealth"> 智慧隱匿反偵測</label>
          </div>
          <div class="info-box">
            <div>所在IP位置<br><b>${ip}</b></div>
            <div style="margin-top:8px;">設備類型<br><b>${deviceType === '電腦設備' ? 'PC' : deviceType}</b></div>
            <div style="margin-top:8px;">設備序列號<br><b>${deviceId}</b></div>
          </div>
          <button id="injectBtn" class="disabled-btn" disabled>開始注入</button>
          <!-- 處理中 Modal -->
          <div id="progressModal" style="display:none;position:fixed;z-index:9999;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);">
            <div style="max-width:340px;margin:18vh auto 0 auto;background:#232c3b;padding:32px 24px;border-radius:12px;box-shadow:0 2px 16px #0008;">
              <div style="font-size:22px;font-weight:bold;text-align:center;margin-bottom:18px;color:#FFD700;">系統處理中</div>
              <ul id="progressSteps" style="list-style:none;padding:0;margin:0;">
                <li id="step1"><span class="step-icon">○</span> 讀取資料庫</li>
                <li id="step2"><span class="step-icon">○</span> 系統運算中</li>
                <li id="step3"><span class="step-icon">○</span> 遊戲後台IP讀取中</li>
                <li id="step4"><span class="step-icon">○</span> 排序資料中</li>
                <li id="step5"><span class="step-icon">○</span> 注入修改資料中</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <script>
        // 當勾選無機台時，禁用機台號輸入
        document.addEventListener('DOMContentLoaded', function() {
          var noMachine = document.getElementById('noMachine');
          var machineId = document.getElementById('machineId');
          var platform = document.querySelector('select[name=platform]');
          var game = document.querySelector('select[name=game]');
          var checkboxes = document.querySelectorAll('.checkbox-group input[type=checkbox]');
          var injectBtn = document.getElementById('injectBtn');

          function validate() {
            // 必須選擇平台
            var platformValid = platform && platform.value;
            // 必須選擇遊戲
            var gameValid = game && game.value;
            // 必須勾選至少一項功能
            var checkedCount = 0;
            checkboxes.forEach(function(cb){ if(cb.checked) checkedCount++; });
            var featureValid = checkedCount > 0;
            // 必須輸入機台號或勾選無機台
            var noMachine = document.getElementById('noMachine');
            var machineId = document.getElementById('machineId');
            var machineValid = false;
            if(noMachine && machineId) {
              if(noMachine.checked) {
                machineValid = true;
              } else {
                var val = machineId.value.trim();
                var num = Number(val);
                machineValid = val !== '' && !isNaN(num) && num >= 1 && num <= 5000;
              }
            }
            if(platformValid && gameValid && featureValid && machineValid) {
              injectBtn.disabled = false;
              injectBtn.textContent = '開始注入';
              injectBtn.classList.remove('disabled-btn');
              injectBtn.style.background = '#1976d2';
              injectBtn.style.color = '#fff';
              injectBtn.style.cursor = 'pointer';
              injectBtn.style.width = '100%';
              injectBtn.style.fontSize = '1.2em';
              injectBtn.style.padding = '16px 0';
              injectBtn.style.marginTop = '10px';
            } else {
              injectBtn.disabled = true;
              injectBtn.textContent = '開始注入';
              injectBtn.classList.add('disabled-btn');
              injectBtn.style.background = '';
              injectBtn.style.color = '';
              injectBtn.style.cursor = 'not-allowed';
            }
          }

          if(noMachine && machineId) {
            noMachine.addEventListener('change', function() {
              machineId.disabled = this.checked;
              if(this.checked) machineId.value = '';
            });
          }
          if(platform) platform.addEventListener('change', validate);
          if(game) game.addEventListener('change', validate);
          checkboxes.forEach(function(cb){ cb.addEventListener('change', validate); });
          // 機台號即時驗證
          if(machineId) {
            machineId.addEventListener('input', function() {
              var val = machineId.value.trim();
              var num = Number(val);
              var errorDiv = document.getElementById('machineIdError');
              if(val !== '' && (!/^[0-9]+$/.test(val) || isNaN(num) || num < 1 || num > 5000)) {
                errorDiv.style.display = '';
              } else {
                errorDiv.style.display = 'none';
              }
              validate();
            });
          }
          validate(); // 初始狀態
          // 處理中動畫
          var injectBtn = document.getElementById('injectBtn');
          var progressModal = document.getElementById('progressModal');
          var progressSteps = [
            {id:'step1', text:'讀取資料庫'},
            {id:'step2', text:'系統運算中'},
            {id:'step3', text:'遊戲後台IP讀取中'},
            {id:'step4', text:'排序資料中'},
            {id:'step5', text:'注入修改資料中'}
          ];
          function setStepStatus(idx, status) {
            var li = document.getElementById(progressSteps[idx].id);
            if(!li) return;
            var icon = li.querySelector('.step-icon');
            if(status==='done') {
              icon.textContent = '✔️';
              icon.style.color = '#27c24c';
            } else if(status==='doing') {
              icon.innerHTML = '<span class="loader" style="display:inline-block;width:16px;height:16px;border:2px solid #1976d2;border-radius:50%;border-right-color:transparent;vertical-align:middle;animation:spin 1s linear infinite;"></span>';
              icon.style.color = '#1976d2';
            } else {
              icon.textContent = '○';
              icon.style.color = '#aaa';
            }
          }
          // 數字動畫
          function animateNumber(id, to, unit, duration = 1200) {
            var el = document.getElementById(id);
            if (!el) return;
            var start = 0;
            var startTime = null;
            function step(ts) {
              if (!startTime) startTime = ts;
              var progress = Math.min((ts - startTime) / duration, 1);
              var value = Math.floor(progress * (to - start) + start);
              el.textContent = value;
              if (progress < 1) requestAnimationFrame(step);
              else el.textContent = to;
            }
            requestAnimationFrame(step);
          }
          // 機台數據快取（記憶一分鐘）
          var machineCache = {};
          function showProgressModal() {
            progressModal.style.display = '';
            for(var i=0;i<progressSteps.length;i++) setStepStatus(i,'pending');
            var cur = 0;
            var t0 = Date.now();
            function nextStep() {
              if(cur>0) setStepStatus(cur-1,'done');
              if(cur<progressSteps.length) {
                setStepStatus(cur,'doing');
                var wait = 1000 + Math.random()*2000;
                setTimeout(function(){ cur++; nextStep(); }, wait);
              } else {
                setStepStatus(cur-1,'done');
                setTimeout(function(){
                  progressModal.style.display='none';
                  // 僅桌機自動滾動到頂，手機不滾動
                  if(window.innerWidth > 600) {
                    window.scrollTo({top:0,behavior:'smooth'});
                  }
                  // 取得機台號
                  var machineId = document.getElementById('machineId');
                  var cacheKey = '';
                  if(machineId && !machineId.disabled && machineId.value.trim()!=='') {
                    cacheKey = 'machine_' + machineId.value.trim();
                  } else {
                    cacheKey = 'machine_none';
                  }
                  var now = Date.now();
                  var cache = machineCache[cacheKey];
                  var base, target, success;
                  if(cache && now-cache.time<60000) {
                    base = cache.base;
                    target = cache.target;
                  } else {
                    base = Math.floor(Math.random()*21)+10; // 10~30
                    target = Math.floor(Math.random()*40)+1; // 1~40
                    machineCache[cacheKey] = {base,target,time:now};
                  }
                  // 計算整體推薦
                  var total = base + target;
                  if(total > 60) {
                    success = Math.floor(Math.random()*21)+60; // 60~80
                  } else {
                    success = Math.floor(Math.random()*41)+20; // 20~60
                  }
                  var t1 = Date.now();
                  var sec = ((t1-t0)/1000).toFixed(2);
                  animateNumber('baseRate', base, '%');
                  animateNumber('targetRate', target, '%');
                  animateNumber('successRate', success, '%');
                  document.getElementById('timeRate').textContent = sec;
                }, 800);
              }
            }
            nextStep();
          }
          if(injectBtn) {
            injectBtn.addEventListener('click', function(e){
              if(this.disabled) return;
              showProgressModal();
            });
          }
          // 加入 loading 旋轉動畫
          var style = document.createElement('style');
          style.innerHTML = '@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}';
          document.head.appendChild(style);
        });
      </script>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log('網站已啟動 http://localhost:' + port);
});
