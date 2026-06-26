# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ad_interstitial.spec.js >> verify AdSense interstitial config and History redirection
- Location: tests/ad_interstitial.spec.js:3:1

# Error details

```
Error: expect(received).toBeDefined()

Received: undefined
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - link [ref=e6] [cursor=pointer]:
      - /url: /inicio
      - img [ref=e7]
    - heading "Histórico" [level=1] [ref=e9]
    - button [ref=e10] [cursor=pointer]:
      - img [ref=e11]
  - generic [ref=e15]:
    - generic [ref=e16]:
      - heading "Junho 2026" [level=2] [ref=e17]:
        - img [ref=e18]
        - text: Junho 2026
      - generic [ref=e20]:
        - button [ref=e21] [cursor=pointer]:
          - img [ref=e22]
        - button [ref=e24] [cursor=pointer]:
          - img [ref=e25]
    - generic [ref=e27]:
      - generic [ref=e28]: D
      - generic [ref=e29]: S
      - generic [ref=e30]: T
      - generic [ref=e31]: Q
      - generic [ref=e32]: Q
      - generic [ref=e33]: S
      - generic [ref=e34]: S
    - generic [ref=e35]:
      - button "1" [ref=e36] [cursor=pointer]: "1"
      - button "2" [ref=e37] [cursor=pointer]: "2"
      - button "3" [ref=e38] [cursor=pointer]: "3"
      - button "4" [ref=e39] [cursor=pointer]: "4"
      - button "5" [ref=e40] [cursor=pointer]: "5"
      - button "6" [ref=e41] [cursor=pointer]: "6"
      - button "7" [ref=e42] [cursor=pointer]: "7"
      - button "8" [ref=e43] [cursor=pointer]: "8"
      - button "9" [ref=e44] [cursor=pointer]: "9"
      - button "10" [ref=e45] [cursor=pointer]: "10"
      - button "11" [ref=e46] [cursor=pointer]: "11"
      - button "12" [ref=e47] [cursor=pointer]: "12"
      - button "13" [ref=e48] [cursor=pointer]: "13"
      - button "14" [ref=e49] [cursor=pointer]: "14"
      - button "15" [ref=e50] [cursor=pointer]: "15"
      - button "16" [ref=e51] [cursor=pointer]: "16"
      - button "17" [ref=e52] [cursor=pointer]: "17"
      - button "18" [ref=e53] [cursor=pointer]: "18"
      - button "19" [ref=e54] [cursor=pointer]: "19"
      - button "20" [ref=e55] [cursor=pointer]: "20"
      - button "21" [ref=e56] [cursor=pointer]: "21"
      - button "22" [ref=e57] [cursor=pointer]: "22"
      - button "23" [ref=e58] [cursor=pointer]: "23"
      - button "24" [ref=e59] [cursor=pointer]: "24"
      - button "25" [ref=e60] [cursor=pointer]: "25"
      - button "26" [ref=e61] [cursor=pointer]: "26"
      - button "27" [ref=e62] [cursor=pointer]: "27"
      - button "28" [ref=e63] [cursor=pointer]: "28"
      - button "29" [ref=e64] [cursor=pointer]: "29"
      - button "30" [ref=e65] [cursor=pointer]: "30"
  - insertion [ref=e67]:
    - iframe [ref=e69]:

  - navigation [ref=e70]:
    - link "Treinos" [ref=e71] [cursor=pointer]:
      - /url: /inicio
      - img [ref=e72]
      - generic [ref=e78]: Treinos
    - link "Histórico" [ref=e79] [cursor=pointer]:
      - /url: /historico
      - img [ref=e80]
      - generic [ref=e84]: Histórico
    - link "Perfil" [ref=e85] [cursor=pointer]:
      - /url: /perfil
      - img [ref=e86]
      - generic [ref=e89]: Perfil
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('verify AdSense interstitial config and History redirection', async ({ page }) => {
  4  |   // Inject mock session
  5  |   await page.addInitScript(() => {
  6  |     const session = {
  7  |       access_token: 'fake-token',
  8  |       token_type: 'bearer',
  9  |       expires_in: 3600,
  10 |       refresh_token: 'fake-refresh-token',
  11 |       user: {
  12 |         id: '12345678-1234-1234-1234-123456789012',
  13 |         aud: 'authenticated',
  14 |         role: 'authenticated',
  15 |         email: 'test@example.com',
  16 |         user_metadata: { full_name: 'Test User' },
  17 |         app_metadata: { provider: 'email' },
  18 |       },
  19 |       expires_at: Math.floor(Date.now() / 1000) + 3600,
  20 |     };
  21 |     window.localStorage.setItem('sb-fbdzbafzdmzcrteqhbto-auth-token', JSON.stringify(session));
  22 |
  23 |     // Capture adsbygoogle pushes
  24 |     window.ads_pushes = [];
  25 |
  26 |     // We want to intercept when the code sets window.adsbygoogle
  27 |     let adsbygoogleValue;
  28 |     Object.defineProperty(window, 'adsbygoogle', {
  29 |       configurable: true,
  30 |       enumerable: true,
  31 |       get: function() {
  32 |         return adsbygoogleValue;
  33 |       },
  34 |       set: function(val) {
  35 |         adsbygoogleValue = val;
  36 |         if (adsbygoogleValue && Array.isArray(adsbygoogleValue) && !adsbygoogleValue.push._isMocked) {
  37 |           const oldPush = adsbygoogleValue.push;
  38 |           adsbygoogleValue.push = function(obj) {
  39 |             window.ads_pushes.push(obj);
  40 |             return oldPush.apply(this, arguments);
  41 |           };
  42 |           adsbygoogleValue.push._isMocked = true;
  43 |         }
  44 |       }
  45 |     });
  46 |   });
  47 |
  48 |   await page.route('**/rest/v1/**', route => route.fulfill({ status: 200, body: '[]' }));
  49 |
  50 |   await page.goto('http://localhost:5173/historico');
  51 |
  52 |   // Check AdSense config
  53 |   // The push might happen after some ticks
  54 |   let adsConfig;
  55 |   for (let i = 0; i < 10; i++) {
  56 |     adsConfig = await page.evaluate(() => {
  57 |       return (window.ads_pushes || []).find(p => p.enable_page_level_ads === true);
  58 |     });
  59 |     if (adsConfig) break;
  60 |     await page.waitForTimeout(500);
  61 |   }
  62 |
> 63 |   expect(adsConfig).toBeDefined();
     |                     ^ Error: expect(received).toBeDefined()
  64 |   expect(adsConfig.google_ad_client).toBe('ca-pub-1997524989701565');
  65 |   expect(adsConfig.overlays.bottom).toBe(true);
  66 |
  67 |   // Mock export and check redirection
  68 |   // We need to trigger the export logic. handleGenerateFilteredPDF is internal,
  69 |   // so we click the "Gerar PDF" button in the modal.
  70 |
  71 |   await page.click('button:has(svg.lucide-file-down)'); // Open modal
  72 |   await page.waitForSelector('text=Exportar PDF');
  73 |
  74 |   // We need to mock the PDF export utility or ensure it doesn't crash.
  75 |   // The actual function handleGenerateFilteredPDF calls exportHistoryToPDF.
  76 |
  77 |   await page.evaluate(() => {
  78 |     // Override the function to avoid actual PDF generation and just check redirection
  79 |     // This is tricky because it's inside the component.
  80 |     // Instead, let's just trigger the button and hope the mocks handle it.
  81 |   });
  82 |
  83 |   await page.click('button:has-text("Gerar PDF")');
  84 |
  85 |   // Wait for redirection to /inicio
  86 |   await page.waitForURL('**/inicio');
  87 |   expect(page.url()).toContain('/inicio');
  88 |
  89 |   await page.screenshot({ path: 'interstitial_flow_verification.png' });
  90 | });
  91 |
```