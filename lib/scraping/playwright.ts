// lib/scraping/playwright.ts
/**
 * Playwright-based browser automation scraper.
 * 
 * Used as the first-tier fallback when no API keys are available.
 * Requires `playwright` and `@playwright/test` packages installed.
 * 
 * Install: npm install playwright && npx playwright install chromium
 *
 * This module is structured to be tree-shaken in demo mode (no PLAYWRIGHT_ENABLED env).
 * Set PLAYWRIGHT_ENABLED=true to activate.
 */

import type { NormalizedSocialData } from "@/types";

const ENABLED = process.env.PLAYWRIGHT_ENABLED === "true";

/* ─── LinkedIn scraper ──────────────────────────────────────────────────────── */

export async function scrapeLinkedInWithPlaywright(profileUrl: string): Promise<NormalizedSocialData> {
  if (!ENABLED) {
    throw new Error("PLAYWRIGHT_ENABLED is not set — using API/mock fallback");
  }

  // Dynamic import to avoid bundling when not enabled
  const { chromium } = await import(/* webpackIgnore: true */ "playwright");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-US",
    viewport: { width: 1280, height: 900 },
  });

  try {
    const page = await context.newPage();

    // Navigate to the public LinkedIn profile
    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Wait for the name header to load
    await page.waitForSelector("h1", { timeout: 8_000 }).catch(() => null);

    // Extract profile data
    const data = await page.evaluate(() => {
      const getText = (selector: string) =>
        document.querySelector(selector)?.textContent?.trim() ?? "";

      const name = getText("h1");
      const headline = getText(".text-body-medium.break-words") ?? getText("[data-generated-suggestion-target]");
      const location = getText(".pb2.pv-text-details__left-panel > span:nth-child(1)") ?? getText(".t-black--light.t-normal span");

      // About / summary section
      const about = getText(".display-flex.ph5.pv3 .pv-shared-text-with-see-more span") ??
        getText("[data-field='summary'] span");

      // Experience items
      const expItems = Array.from(document.querySelectorAll(".pvs-list__item--line-separated"))
        .slice(0, 5)
        .map((el) => el.textContent?.trim() ?? "")
        .filter(Boolean);

      return { name, headline, location, about, expItems };
    });

    return {
      source: "playwright",
      handle: profileUrl.split("/in/")[1]?.replace(/\/$/, "") ?? "",
      displayName: data.name || undefined,
      headline: data.headline || undefined,
      location: data.location || undefined,
      bio: data.about || undefined,
      experience: data.expItems.length ? data.expItems : undefined,
    };
  } finally {
    await browser.close();
  }
}

/* ─── Instagram scraper ─────────────────────────────────────────────────────── */

export async function scrapeInstagramWithPlaywright(profileUrl: string): Promise<NormalizedSocialData> {
  if (!ENABLED) {
    throw new Error("PLAYWRIGHT_ENABLED is not set — using API/mock fallback");
  }

  const { chromium } = await import(/* webpackIgnore: true */ "playwright");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
  });

  try {
    const page = await context.newPage();
    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Wait for the bio section
    await page.waitForSelector("header", { timeout: 10_000 }).catch(() => null);

    const data = await page.evaluate(() => {
      const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? "";

      const handle = window.location.pathname.replace(/\//g, "");
      const bio = getText("div.-vDIg span") ?? getText("._aacl._aaco._aacu._aacx._aad7._aade");
      const followerText = getText("a[href$='/followers/'] span") ?? "";
      const followers = followerText ? parseInt(followerText.replace(/[^0-9]/g, "")) : undefined;

      return { handle, bio, followers };
    });

    return {
      source: "playwright",
      handle: data.handle || profileUrl.split("instagram.com/")[1]?.replace(/\/$/, "") || "",
      bio: data.bio || undefined,
      followers: data.followers && !isNaN(data.followers) ? data.followers : undefined,
    };
  } finally {
    await browser.close();
  }
}

/* ─── Usage notes ────────────────────────────────────────────────────────────── 

To use Playwright scraping in production:

1. Install Playwright:
   npm install playwright
   npx playwright install chromium

2. Set env var:
   PLAYWRIGHT_ENABLED=true

3. Add Playwright to the scraping pipeline in lib/agents/analyzer.ts:
   - Before calling fetchLinkedInProfile(), try scrapeLinkedInWithPlaywright()
   - Before calling fetchInstagramProfile(), try scrapeInstagramWithPlaywright()

4. For production deployment (Vercel/Railway), use:
   - Browserless.io (cloud Playwright provider)
   - Set BROWSERLESS_TOKEN and use ws://chrome.browserless.io/?token=TOKEN

Note: LinkedIn aggressively detects and blocks scrapers. In production:
   - Use residential proxies
   - Add random delays between requests
   - Rotate user agents
   - Consider Proxycurl API as the primary source (more reliable)

─────────────────────────────────────────────────────────────────────────────── */
