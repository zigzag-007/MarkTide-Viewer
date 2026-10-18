const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { waitForMarkTide, setTheme, renderMarkdown } = require('../helpers/marktide-page');

const rail = '.marktide-heading-rail';
const panel = '.marktide-toc';
const review = process.env.MARKTIDE_OUTLINE_VISUAL_DIR;

async function welcome(page, theme, width = 1081) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await expect(page.locator('#loading-screen')).toBeHidden();
  await setTheme(page, theme);
  await expect(page.locator('#markdown-preview h1').first()).toHaveText('Welcome to MarkTide Code Editor & Viewer');
  await expect(page.locator('.marktide-heading-marker')).toHaveCount(17);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function shot(page, name) {
  if (!review) return;
  fs.mkdirSync(review, { recursive: true });
  await page.screenshot({ path: path.join(review, `${name}.png`) });
  await page.locator('.marktide-rail-track').screenshot({ path: path.join(review, `${name}-track.png`) });
}

function rangeGeometry() {
  const track = document.querySelector('.marktide-rail-track').getBoundingClientRect();
  const range = document.querySelector('.marktide-viewport-marker').getBoundingClientRect();
  const glyphs = [...document.querySelectorAll('.marktide-heading-marker')].map(marker => {
    const box = marker.getBoundingClientRect();
    const height = parseFloat(getComputedStyle(marker, '::before').height);
    return { top: box.top + (box.height - height) / 2, bottom: box.top + (box.height + height) / 2 };
  });
  const clearance = Math.min(...glyphs.flatMap(glyph => [range.top, range.bottom].map(edge =>
    edge < glyph.top ? glyph.top - edge : edge > glyph.bottom ? edge - glyph.bottom : 0)));
  return { clearance, top: range.top - track.top, bottom: range.bottom - track.top,
    height: range.height, trackHeight: track.height };
}

function expectCleanRange(range) {
  expect(range.clearance).toBeGreaterThanOrEqual(3);
  expect(range.top).toBeGreaterThanOrEqual(0);
  expect(range.bottom).toBeLessThanOrEqual(range.trackHeight);
  expect(range.height).toBeGreaterThanOrEqual(12);
}

for (const theme of ['dark', 'light']) for (const width of [1081, 1440]) {
  test(`welcome range boundaries stay between markers at ${width}px in ${theme}`, async ({ page }) => {
    await welcome(page, theme, width);
    const initial = await page.evaluate(rangeGeometry);
    const track = await page.locator('.marktide-rail-track').boundingBox();
    expect(Number.isInteger(track.x)).toBe(true);
    expect(Number.isInteger(track.y)).toBe(true);
    await shot(page, `welcome-range-before-check-${theme}-${width}`);
    expectCleanRange(initial);
    const samples = [];
    for (const fraction of [0.12, 0.35, 0.65, 1, 0]) {
      await page.locator('.preview-pane').evaluate((pane, amount) => {
        pane.scrollTop = (pane.scrollHeight - pane.clientHeight) * amount;
      }, fraction);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForTimeout(280);
      const geometry = await page.evaluate(rangeGeometry);
      expectCleanRange(geometry);
      const visible = await page.evaluate(() => {
        const pane = document.querySelector('.preview-pane').getBoundingClientRect();
        return [...document.querySelectorAll('#markdown-preview h1, #markdown-preview h2, #markdown-preview h3, #markdown-preview h4, #markdown-preview h5, #markdown-preview h6')]
          .flatMap((heading, index) => {
            const bounds = heading.getBoundingClientRect();
            return bounds.top < pane.bottom && bounds.bottom > pane.top ? [index] : [];
          });
      });
      if (visible.length > 1) {
        expect(geometry.top).toBeCloseTo(visible[0] * 12, 1);
        expect(geometry.bottom).toBeCloseTo((visible.at(-1) + 1) * 12, 1);
      }
      expect(geometry.height).toBeGreaterThanOrEqual(24);
      samples.push(geometry);
      await shot(page, `welcome-range-${theme}-${width}-${fraction}`);
    }
    expect(new Set(samples.map(range => `${range.top}:${range.height}`)).size).toBeGreaterThan(2);
    await page.locator('.marktide-heading-marker').nth(9).click();
    for (let count = 0; count < 15; count++) {
      expect(await page.locator('.marktide-viewport-outline').evaluate(element =>
        getComputedStyle(element).maskImage.includes('rgba(0, 0, 0, 0) 3px, rgba(0, 0, 0, 0) 9px'))).toBe(true);
      await page.waitForTimeout(25);
    }
    await shot(page, `welcome-range-navigation-${theme}-${width}`);
    await page.waitForTimeout(280);
    expectCleanRange(await page.evaluate(rangeGeometry));
    await page.getByRole('button', { name: 'Back to top', exact: true }).click();
    await expect.poll(() => page.locator('.preview-pane').evaluate(pane => pane.scrollTop)).toBe(0);
    await page.waitForTimeout(280);
    expectCleanRange(await page.evaluate(rangeGeometry));
    await renderMarkdown(page, '# Only heading\n\nA small document.');
    await expect(page.locator('.marktide-heading-marker')).toHaveCount(1);
    expectCleanRange(await page.evaluate(rangeGeometry));
  });
}

for (const theme of ['dark', 'light']) {
  test(`range grows smoothly with masked borders and respects reduced motion in ${theme}`, async ({ page }) => {
    await welcome(page, theme);
    const samples = await page.evaluate(async () => {
      const range = document.querySelector('.marktide-viewport-marker');
      const pane = document.querySelector('.preview-pane');
      const track = document.querySelector('.marktide-rail-track');
      const result = [];
      pane.scrollTop = 250;
      for (let frame = 0; frame < 34; frame++) {
        if (frame === 5 || frame === 18) pane.scrollTop = 0;
        if (frame === 10) pane.scrollTop = 900;
        const time = await new Promise(resolve => requestAnimationFrame(resolve));
        const bounds = range.getBoundingClientRect();
        const trackBounds = track.getBoundingClientRect();
        result.push({ time, top: bounds.top - trackBounds.top, height: bounds.height, trackHeight: trackBounds.height });
      }
      return result;
    });
    expect(new Set(samples.map(sample => sample.height)).size).toBeGreaterThan(3);
    for (const sample of samples) {
      expect(sample.top).toBeGreaterThanOrEqual(-0.1);
      expect(sample.top + sample.height).toBeLessThanOrEqual(sample.trackHeight + 0.1);
    }
    for (let index = 1; index < samples.length; index++) {
      const elapsed = samples[index].time - samples[index - 1].time;
      // Allow the easing's faster middle without allowing a one frame jump.
      const maxRate = 60 / 240 * 3;
      expect(Math.abs(samples[index].top - samples[index - 1].top), JSON.stringify(samples)).toBeLessThan(elapsed * maxRate);
    }
    expect(await page.locator('.marktide-viewport-outline').evaluate(element => {
      const style = getComputedStyle(element);
      return style.maskImage.includes('rgba(0, 0, 0, 0) 3px, rgba(0, 0, 0, 0) 9px')
        && style.maskSize === '5px 100%, 5px 100%, 20px 100%';
    })).toBe(true);
    expectCleanRange(await page.evaluate(rangeGeometry));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.preview-pane').evaluate(pane => { pane.scrollTop = 0; });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.locator('.marktide-viewport-marker').evaluate(element => element.getAnimations().length)).toBe(0);
    expectCleanRange(await page.evaluate(rangeGeometry));
    // Put the border through a dot and compare the pixels with no border at all.
    await page.locator('.marktide-viewport-marker').evaluate(element => { element.style.transform = 'translateY(4px)'; });
    const track = await page.locator('.marktide-rail-track').boundingBox();
    const clip = { x: track.x + 5, y: track.y + 3, width: 20, height: 6 };
    const guarded = await page.screenshot({ clip });
    await page.locator('.marktide-viewport-marker').evaluate(element => { element.style.borderColor = 'transparent'; });
    const absent = await page.screenshot({ clip });
    expect(guarded.equals(absent)).toBe(true);
  });
}

for (const theme of ['dark', 'light']) {
  test(`a distant heading reveals its rail marker smoothly in ${theme}`, async ({ page }) => {
    await welcome(page, theme);
    await renderMarkdown(page, Array.from({ length: 100 }, (_, index) =>
      `## Heading ${index}\n\nA paragraph for this section.\n`).join('\n'));
    await expect(page.locator('.marktide-heading-marker')).toHaveCount(100);
    await page.locator(rail).hover();
    await expect(page.locator(panel)).toBeVisible();
    await page.evaluate(() => {
      const rail = document.querySelector('.marktide-heading-rail');
      window.railMotionSamples = [rail.scrollTop];
      rail.addEventListener('scroll', () => window.railMotionSamples.push(rail.scrollTop), { passive: true });
    });
    await page.locator('.marktide-toc a').last().click();
    await expect.poll(() => page.locator('#markdown-preview h2').last().evaluate(heading => {
      const pane = document.querySelector('.preview-pane').getBoundingClientRect();
      return heading.getBoundingClientRect().top < pane.bottom;
    })).toBe(true);
    await page.waitForTimeout(1000);
    const samples = await page.evaluate(() => window.railMotionSamples);
    expect(new Set(samples.map(Math.round)).size).toBeGreaterThan(4);
    const bounds = await page.locator(rail).boundingBox();
    const marker = await page.locator('.marktide-heading-marker').last().boundingBox();
    expect(marker.y).toBeGreaterThanOrEqual(bounds.y);
    expect(marker.y + marker.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    await shot(page, `smooth-rail-reveal-${theme}`);
  });

  test(`small viewport ranges keep two rows at the rail ends in ${theme}`, async ({ page }) => {
    await welcome(page, theme);
    const section = '\n\nA long section with no extra headings.\n'.repeat(40);
    await renderMarkdown(page, `# First${section}\n## Middle${section}\n### Last${section}`);
    await expect(page.locator('.marktide-heading-marker')).toHaveCount(3);
    for (const index of [0, 1, 2]) {
      await page.locator('.preview-pane').evaluate((pane, headingIndex) => {
        const heading = pane.querySelectorAll('h1, h2, h3')[headingIndex];
        pane.scrollTop += heading.getBoundingClientRect().top - pane.getBoundingClientRect().top - 24;
      }, index);
      await page.waitForTimeout(300);
      const geometry = await page.evaluate(rangeGeometry);
      expectCleanRange(geometry);
      expect(geometry.height).toBe(24);
      const marker = await page.locator('.marktide-heading-marker').nth(index).boundingBox();
      const track = await page.locator('.marktide-rail-track').boundingBox();
      expect(marker.y - track.y + 6).toBeGreaterThan(geometry.top);
      expect(marker.y - track.y + 6).toBeLessThan(geometry.bottom);
      const active = await page.locator('.marktide-active-marker').evaluate(element => ({
        width: element.getBoundingClientRect().width, transform: element.style.transform,
        filter: getComputedStyle(element).filter,
      }));
      expect(active.transform).not.toContain('scale');
      expect(active.filter).toBe('none');
      expect(Number.isInteger(active.width)).toBe(true);
      await shot(page, `minimum-range-${theme}-${index}`);
    }
    await renderMarkdown(page, '# Only heading\n\nA short document.');
    await expect(page.locator('.marktide-heading-marker')).toHaveCount(1);
    await page.waitForTimeout(280);
    expect((await page.evaluate(rangeGeometry)).height).toBe(12);
  });
}

for (const deviceScaleFactor of [1.25, 2]) {
  test.describe(`rail alignment at ${deviceScaleFactor} pixel scale`, () => {
    test.use({ deviceScaleFactor });
    for (const theme of ['dark', 'light']) test(`track settles on device pixels in ${theme}`, async ({ page }) => {
      await welcome(page, theme);
      const bounds = await page.locator('.marktide-rail-track').boundingBox();
      for (const coordinate of [bounds.x, bounds.y]) {
        const physical = coordinate * deviceScaleFactor;
        // Chromium stores layout positions in units of 1/64 CSS pixel.
        expect(Math.abs(physical - Math.round(physical))).toBeLessThan(deviceScaleFactor / 64);
      }
      expectCleanRange(await page.evaluate(rangeGeometry));
    });
  });
}
