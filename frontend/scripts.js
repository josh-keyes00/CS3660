// scripts.js — site-wide enhancements for Wizz Wizards Worldwide

(function(){
  const root = document.documentElement;
  const KEY = 'www-theme';
  const btn = document.getElementById('themeToggle');

  // Initialize theme from localStorage or system preference
  const saved = localStorage.getItem(KEY);
  if(saved === 'light' || saved === 'dark'){
    root.setAttribute('data-theme', saved);
  }

  // Toggle dark/light mode
  btn?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
  }, { passive:true });

})();

// OPTIONAL: magical cursor sparkles ✨
(function(){
  const sparkleColor = ['#ffd700','#ffae00','#ffffff','#ba55d3'];
  const maxSparkles = 40;
  let sparkles = [];

  function createSparkle(x,y){
    const s = document.createElement('div');
    s.className = 'cursor-sparkle';
    s.style.left = x+'px';
    s.style.top = y+'px';
    s.style.background = sparkleColor[Math.floor(Math.random()*sparkleColor.length)];
    document.body.appendChild(s);

    setTimeout(()=>{ s.remove(); }, 1000);
    sparkles.push(s);
    if(sparkles.length > maxSparkles){
      const old = sparkles.shift();
      old?.remove();
    }
  }

  window.addEventListener('mousemove', e=>{
    if(Math.random()<0.4){ // not every pixel, just random
      createSparkle(e.pageX, e.pageY);
    }
  });

})();


// Highlight current page link in navbar
(function(){
  const path = window.location.pathname.split("/").pop(); // e.g. "about.html"
  document.querySelectorAll(".navbar a").forEach(link => {
    const href = link.getAttribute("href");
    if(href === path || (href === "index.html" && path === "")){
      link.classList.add("active");
      link.setAttribute("aria-current","page");
    }
  });
})();


// --- Roster card backgrounds with fallback ---
(function(){
  const cards = document.querySelectorAll('.wizard-card');
  if(!cards.length) return;

  const fallback = 'pics/default.jpg';

  cards.forEach(card => {
    const url = card.getAttribute('data-bg');
    const media = card.querySelector('.wizard-card__media');
    if(!media) return;

    if(!url){ 
      media.style.backgroundImage = `url('${fallback}')`;
      return;
    }

    // Preload to detect errors, then set background
    const img = new Image();
    img.onload = () => {
      media.style.backgroundImage = `url('${url}')`;
    };
    img.onerror = () => {
      media.style.backgroundImage = `url('${fallback}')`;
    };
    img.src = url;
  });
})();



// --- Register form validation & demo submit ---
(function(){
  const form = document.getElementById('registerForm');
  if(!form) return;

  const emailEl = document.getElementById('regEmail');
  const pwEl    = document.getElementById('regPassword');
  const errBox  = document.getElementById('regErrors');
  const okBox   = document.getElementById('regSuccess');

  const emailRe =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  // At least 8 chars, one uppercase, one number, one symbol
  const pwRe =
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+\=\[\]{};:'",.<>\/?\\|`~]).{8,}$/;

  function showError(msg){
    if(errBox){ errBox.textContent = msg; }
    if(okBox){ okBox.style.display = 'none'; }
  }
  function showSuccess(msg){
    if(okBox){ okBox.textContent = msg; okBox.style.display = 'block'; }
    if(errBox){ errBox.textContent = ''; }
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const email = emailEl.value.trim();
    const password = pwEl.value;

    // Client-side checks
    if(!emailRe.test(email)){
      showError('Please enter a valid email address (e.g., mage@example.com).');
      emailEl.focus();
      return;
    }
    if(!pwRe.test(password)){
      showError('Password must be 8+ chars and include an uppercase letter, a number, and a symbol.');
      pwEl.focus();
      return;
    }

    try {
      // NOTE: For security, hashing must be performed on the server
      // with Argon2id or bcrypt, and the connection must be HTTPS.
      // This demo posts plaintext over HTTPS to your API endpoint.
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      });

      if(res.ok){
        showSuccess('Account created! Please check your inbox to verify your email.');
        form.reset();
      } else {
        const data = await res.json().catch(()=> ({}));
        showError(data?.error || 'Registration failed. Please try again.');
      }
    } catch(err){
      showError('Network error. Please try again.');
    }
  });
})();


(function loginHandler(){
  const form = document.getElementById('loginForm');
  if(!form) return;

  const emailEl = document.getElementById('loginEmail');
  const pwEl    = document.getElementById('loginPassword');
  const errBox  = document.getElementById('loginErrors');
  const okBox   = document.getElementById('loginSuccess');

  const showError = (msg) => { if(errBox) errBox.textContent = msg; if(okBox) okBox.style.display='none'; };
  const showSuccess = (msg) => { if(okBox){ okBox.textContent = msg; okBox.style.display='block'; } if(errBox) errBox.textContent=''; };

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = (emailEl.value || '').trim();
    const password = pwEl.value || '';

    if(!email || !password){
      showError('Email and password are required.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/login`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      });

      // Read body as text first, then try JSON (prevents crashes on HTML errors)
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}

      if(res.ok){
        showSuccess('Login successful! Redirecting...');
        setTimeout(()=>{ window.location.href = 'dashboard.html'; }, 800);
      } else {
        const detail = data?.error || (text ? text.slice(0, 200) : '');
        showError(`Login failed (HTTP ${res.status})${detail ? ' — ' + detail : ''}`);
      }
    } catch (err) {
      showError(`Network error: ${err?.message || 'request failed'}`);
    }
  });
})();

// --- Profile button logic ---
(function profileButton(){
  const btn = document.getElementById('profileBtn');
  if(!btn) return;

  let auth = null;
  try { auth = JSON.parse(localStorage.getItem('www-auth') || 'null'); } catch {}

  if (auth && (auth.user_id || auth.email)) {
    btn.setAttribute('href', 'dashboard.html');
  } else {
    btn.setAttribute('href', 'login.html');
    btn.querySelector('img')?.setAttribute('src', 'pics/default-profile.png');
  }
})();

// --- Auth-aware navbar swapping ---
(function navAuthSwap(){
  const authLinks = document.getElementById('authLinks'); // Login / Create Account
  const userLinks = document.getElementById('userLinks'); // Dashboard / Logout
  const profileBtn = document.getElementById('profileBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  let auth = null;
  try { auth = JSON.parse(localStorage.getItem('www-auth') || 'null'); } catch {}

  if (auth && (auth.user_id || auth.email)) {
    authLinks && (authLinks.style.display = 'none');
    userLinks && (userLinks.style.display = 'flex');
    profileBtn && profileBtn.setAttribute('href', 'dashboard.html');

    logoutBtn?.addEventListener('click', () => {
      localStorage.removeItem('www-auth');
      window.location.href = 'index.html';
    });
  } else {
    authLinks && (authLinks.style.display = 'flex');
    userLinks && (userLinks.style.display = 'none');
    profileBtn && profileBtn.setAttribute('href', 'login.html');
  }
})();
