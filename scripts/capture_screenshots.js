import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'http://13.235.95.252';

const OUT_DIR = path.resolve(process.cwd(), 'docs', 'assets');
const LINKEDIN_DIR = path.resolve(OUT_DIR, 'linkedin');
const TEMP_PROFILE = 'C:\\Users\\Lenovo\\AppData\\Local\\Temp\\brave_capture_final';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(LINKEDIN_DIR)) fs.mkdirSync(LINKEDIN_DIR, { recursive: true });

async function getAuthTokens() {
  const fetchToken = async (email, password) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return data.token;
  };

  const adminToken = await fetchToken('admin@dropsecure.edu', 'Admin@123');
  const studentToken = await fetchToken('alice@student.dropsecure.edu', 'Student@123');
  return { adminToken, studentToken };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('[CAPTURE] Fetching demo auth tokens from live API...');
  const { adminToken, studentToken } = await getAuthTokens();
  console.log('[CAPTURE] Tokens acquired successfully.');

  console.log('[CAPTURE] Launching headless Brave on port 9229...');
  const braveProc = spawn(BRAVE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--no-first-run',
    `--user-data-dir=${TEMP_PROFILE}`,
    '--window-size=1440,900',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9229/json');
  const targets = await targetsRes.json();
  const pageTarget = targets[0];

  console.log('[CAPTURE] Connecting to debugger:', pageTarget.webSocketDebuggerUrl);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));

  let reqId = 0;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const curId = ++reqId;
      const handler = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', handler);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        } catch (e) {}
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

  await send('Page.enable');

  const pages = [
    {
      name: '01-portal-gateway',
      url: `${BASE_URL}/`,
      token: null,
      readmeTarget: 'portal-gateway.png',
    },
    {
      name: '02-courier-dropoff',
      url: `${BASE_URL}/courier`,
      token: null,
      readmeTarget: 'courier-dropoff.png',
    },
    {
      name: '03-collection-kiosk',
      url: `${BASE_URL}/kiosk`,
      token: null,
      readmeTarget: 'kiosk-station.png',
    },
    {
      name: '04-student-portal',
      url: `${BASE_URL}/student`,
      token: studentToken,
      readmeTarget: 'student-portal.jpg',
    },
    {
      name: '05-admin-console',
      url: `${BASE_URL}/admin`,
      token: adminToken,
      readmeTarget: 'admin-multi-campus.jpg',
    },
  ];

  for (const p of pages) {
    console.log(`[CAPTURE] Processing ${p.name} (${p.url})...`);

    // First ensure on domain to manipulate localStorage
    await send('Page.navigate', { url: p.url });
    await sleep(1500);

    if (p.token) {
      await send('Runtime.evaluate', {
        expression: `localStorage.setItem('dropsecure_token', '${p.token}'); location.reload();`,
      });
      await sleep(2500);
    } else {
      await send('Runtime.evaluate', {
        expression: `localStorage.removeItem('dropsecure_token');`,
      });
      await sleep(1000);
    }

    // Wait for full content render
    await sleep(2000);

    const evalRes = await send('Runtime.evaluate', {
      expression: '({ title: document.title, length: document.body.innerText.length })',
      returnByValue: true,
    });
    console.log(`[DOM] ${p.name} ->`, evalRes.value);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');

    // Save master png
    const outPng = path.join(OUT_DIR, `${p.name}.png`);
    fs.writeFileSync(outPng, buffer);
    console.log(`[SAVED] ${outPng} (${(buffer.length / 1024).toFixed(1)} KB)`);

    // Save to LinkedIn folder
    const linkedinPng = path.join(LINKEDIN_DIR, `${p.name}.png`);
    fs.writeFileSync(linkedinPng, buffer);
    console.log(`[LINKEDIN] ${linkedinPng}`);

    // Update README target
    if (p.readmeTarget) {
      const readmeDest = path.join(OUT_DIR, p.readmeTarget);
      fs.writeFileSync(readmeDest, buffer);
      console.log(`[README ASSET] ${readmeDest}`);
    }
  }

  // Copy diagram assets to linkedin directory as well
  const archSrc = path.join(OUT_DIR, 'architecture-diagram.jpg');
  if (fs.existsSync(archSrc)) {
    fs.copyFileSync(archSrc, path.join(LINKEDIN_DIR, '00-aws-architecture-diagram.jpg'));
  }
  const vpcSrc = path.join(OUT_DIR, 'aws-vpc-resource-map.png');
  if (fs.existsSync(vpcSrc)) {
    fs.copyFileSync(vpcSrc, path.join(LINKEDIN_DIR, '06-aws-vpc-resource-map.png'));
  }

  console.log('[CAPTURE] Done! Closing browser...');
  ws.close();
  braveProc.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('[CAPTURE] Fatal error:', err);
  process.exit(1);
});
