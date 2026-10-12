import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow CORS so HealTest can inspect or preview if needed
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

function renderPage(version) {
  const isVersionB = version === 'b' || version === 'B';
  const versionTitle = isVersionB ? 'Version B (Mutated UI)' : 'Version A (Original UI)';
  const buttonText = isVersionB ? 'Continue to Purchase' : 'Checkout';
  const buttonId = isVersionB ? 'continue-purchase-btn' : 'checkout-btn';
  const buttonClass = isVersionB ? 'btn-checkout btn-mutated' : 'btn-checkout';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NovaStore - Checkout (${versionTitle})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f2937;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.12);
      --accent: #8b5cf6;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #090d16 60%);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .header-inner {
      max-width: 1000px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 20px;
      letter-spacing: -0.02em;
      color: #fff;
      text-decoration: none;
    }
    .logo-badge {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .version-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1e293b;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid #334155;
    }
    .version-link {
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.2s ease;
      color: #94a3b8;
    }
    .version-link.active {
      background: #3b82f6;
      color: #fff;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    }
    .version-link:hover:not(.active) {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }
    .banner {
      background: ${isVersionB ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)'};
      border-bottom: 1px solid ${isVersionB ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'};
      padding: 10px 24px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      color: ${isVersionB ? '#fbbf24' : '#60a5fa'};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: ${isVersionB ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.25)'};
    }
    main {
      flex: 1;
      max-width: 900px;
      width: 100%;
      margin: 40px auto;
      padding: 0 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 32px;
    }
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 11px 14px;
      border-radius: 8px;
      border: 1px solid #374151;
      background: #0f172a;
      color: #fff;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: var(--primary);
    }
    .item-row {
      display: flex;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid #1f2937;
      margin-bottom: 20px;
    }
    .item-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      background: linear-gradient(135deg, #1e293b, #334155);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      border: 1px solid #334155;
    }
    .item-info {
      flex: 1;
    }
    .item-name {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 4px;
    }
    .item-sub {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .item-price {
      font-weight: 700;
      color: #38bdf8;
      font-size: 15px;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 10px;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      font-size: 17px;
      font-weight: 800;
      color: #fff;
      padding-top: 14px;
      border-top: 1px solid #1f2937;
      margin-top: 14px;
      margin-bottom: 24px;
    }
    .btn-checkout {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      font-family: inherit;
    }
    .btn-checkout:hover {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }
    .btn-checkout.btn-mutated {
      background: linear-gradient(135deg, #059669, #047857);
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);
    }
    .btn-checkout.btn-mutated:hover {
      background: linear-gradient(135deg, #047857, #065f46);
      box-shadow: 0 6px 20px rgba(5, 150, 105, 0.45);
    }
    .btn-checkout:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    #order-status {
      display: none;
      margin-top: 24px;
      padding: 16px;
      border-radius: 12px;
      background: var(--success-bg);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #6ee7b7;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.5;
      text-align: center;
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .order-number {
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
      font-weight: 700;
    }
    footer {
      text-align: center;
      padding: 24px;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <a href="/" class="logo">
        <div class="logo-badge">⚡</div>
        <span>NovaStore</span>
      </a>
      <div class="version-nav">
        <a href="/version-a" class="version-link ${!isVersionB ? 'active' : ''}">Version A (Original)</a>
        <a href="/version-b" class="version-link ${isVersionB ? 'active' : ''}">Version B (Mutated)</a>
      </div>
    </div>
  </header>

  <div class="banner">
    <span>Active Configuration:</span>
    <span class="tag">${versionTitle}</span>
    <span>• Target Server: <strong>http://localhost:4000</strong></span>
  </div>

  <main>
    <div class="grid">
      <!-- Shipping Information Card -->
      <div class="card">
        <h2 class="card-title">1. Shipping Information</h2>
        <div class="form-group">
          <label for="fullname">Full Name</label>
          <input type="text" id="fullname" name="fullname" value="Alex Morgan" placeholder="Enter full name" />
        </div>
        <div class="form-group">
          <label for="email">Email Address</label>
          <input type="email" id="email" name="email" value="alex.morgan@example.com" placeholder="Enter email" />
        </div>
        <div class="form-group">
          <label for="address">Delivery Address</label>
          <input type="text" id="address" name="address" value="742 Evergreen Terrace, Springfield" placeholder="Enter address" />
        </div>
        <div class="form-group">
          <label for="order-notes">Order Notes (Optional)</label>
          <input type="text" id="order-notes" name="notes" placeholder="e.g. Leave at front door" />
        </div>
      </div>

      <!-- Order Summary Card -->
      <div class="card">
        <h2 class="card-title">2. Order Summary</h2>
        <div class="item-row">
          <div class="item-icon">🎧</div>
          <div class="item-info">
            <div class="item-name">Nova Pro ANC Headphones</div>
            <div class="item-sub">Space Black • Qty: 1</div>
          </div>
          <div class="item-price">$199.99</div>
        </div>

        <div class="summary-line">
          <span>Subtotal</span>
          <span>$199.99</span>
        </div>
        <div class="summary-line">
          <span>Standard Shipping</span>
          <span style="color: #10b981;">Free</span>
        </div>
        <div class="summary-line">
          <span>Estimated Tax</span>
          <span>$16.00</span>
        </div>

        <div class="summary-total">
          <span>Total</span>
          <span style="color: #38bdf8;">$215.99</span>
        </div>

        <!-- Action Button (Version A: "Checkout" | Version B: "Continue to Purchase") -->
        <button id="${buttonId}" role="button" aria-label="${buttonText}" class="${buttonClass}" onclick="document.getElementById('order-status').style.display='block'; this.style.display='none';">${buttonText}</button>

        <!-- Verifiable Ground Truth Outcome Banner -->
        <div id="order-status" role="status" data-testid="order-status">
          <h3 style="color: #6ee7b7; font-size: 16px; margin-bottom: 6px;">Order Confirmed!</h3>
          <p>Your order <span class="order-number">#HT-8842</span> has been placed successfully.<br />Thank you for your purchase!</p>
        </div>
      </div>
    </div>
  </main>

  <footer>
    NovaStore Target E-Commerce Application • Running independently on Port 4000
  </footer>

  <script>
    const checkoutBtn = document.getElementById('${buttonId}');
    const statusBanner = document.getElementById('order-status');

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        checkoutBtn.style.display = 'none';
        statusBanner.style.display = 'block';
      });
    }
  </script>
</body>
</html>`;
}

// Routes for Version A
app.get('/', (req, res) => {
  const version = req.query.version;
  res.setHeader('Content-Type', 'text/html');
  res.send(renderPage(version === 'b' || version === 'B' ? 'b' : 'a'));
});

app.get('/version-a', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(renderPage('a'));
});

// Routes for Version B
app.get('/version-b', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(renderPage('b'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'NovaStore E-Commerce Target',
    port: PORT,
    routes: {
      versionA: 'http://localhost:4000/version-a',
      versionB: 'http://localhost:4000/version-b',
    },
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[NovaStore Website] Target e-commerce website running independently at http://localhost:${PORT}`);
  console.log(`  - Version A (Original "Checkout"):             http://localhost:${PORT}/version-a`);
  console.log(`  - Version B (Mutated "Continue to Purchase"): http://localhost:${PORT}/version-b`);
});
