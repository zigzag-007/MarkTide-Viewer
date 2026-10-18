const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');
const { mobileProse } = require('../helpers/screen-tables');

const longDocument = '# Field guide\n\nA practical guide to planning, building and reviewing a project.\n\n'
  + Array.from({ length: 16 }, (_, index) => `## Chapter ${index + 1}\n\n`
    + Array.from({ length: 6 }, () => 'A useful explanation makes the decisions and their consequences clear. '
      + 'Record the assumptions, keep the next step small, and review the outcome with the team.\n\n').join('')
    + `\n\n### Notes ${index + 1}\n\n| Item | Status |\n| --- | --- |\n| Review | Ready |\n\n`
    + '\n\n```js\nconst ready = true;\n```\n\n').join('');
const links = '.marktide-toc a';
const markers = '.marktide-heading-marker';
const current = '.marktide-toc a[aria-current="location"]';
const reviewDirectory = process.env.MARKTIDE_OUTLINE_VISUAL_DIR;
const railDocument = '# Index\n\n' + Array.from({ length: 140 }, (_, index) =>
  `## Section ${index + 1}\n\nA paragraph for this section.\n\n`).join('');

function railVisibility(page) {
  return page.locator('.marktide-heading-rail').evaluate(rail => {
    const bounds = rail.getBoundingClientRect();
    const marker = rail.querySelector('.marktide-heading-marker[aria-current]').getBoundingClientRect();
    const indicator = rail.querySelector('.marktide-active-marker').getBoundingClientRect();
    const range = rail.querySelector('.marktide-viewport-marker').getBoundingClientRect();
    const top = Math.max(0, bounds.top);
    const bottom = Math.min(innerHeight, bounds.bottom);
    return { marker: marker.top >= top && marker.bottom <= bottom,
      indicator: indicator.top >= top && indicator.bottom <= bottom,
      range: range.bottom > top && range.top < bottom };
  });
}

async function expectVisibleRail(page) {
  await expect.poll(() => railVisibility(page)).toEqual({ marker: true, indicator: true, range: true });
}

async function expectVisibleHeading(page, name) {
  await expect.poll(() => page.getByRole('heading', { name, exact: true }).evaluate(heading => {
    const pane = document.querySelector('.preview-pane');
    const reading = pane?.getBoundingClientRect();
    const bounds = heading.getBoundingClientRect();
    return bounds.top >= Math.max(0, reading?.top || 0)
      && bounds.bottom <= Math.min(innerHeight, reading?.bottom || innerHeight);
  })).toBe(true);
}

async function setup(page, source = longDocument) {
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await page.locator('#close-dropzone').click();
  await renderMarkdown(page, source);
  await expect(page.locator('.marktide-outline')).toHaveCount(1);
}

async function contents(page) {
  await page.evaluate(async () => {
    const animations = document.querySelector('.preview-pane')?.getAnimations({ subtree: true }) || [];
    await Promise.all(animations.filter(animation => Number.isFinite(animation.effect.getTiming().iterations))
      .map(animation => animation.finished.catch(() => {})));
  });
  if (await page.evaluate(() => matchMedia('(max-width: 767px)').matches)) {
    if (await page.locator('.marktide-toc').getAttribute('aria-hidden') !== 'false') {
      await page.getByRole('button', { name: 'Table of contents', exact: true }).click();
    }
  } else await page.locator('.marktide-heading-rail').hover();
  await expect(page.locator('.marktide-toc')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.marktide-toc')).toBeVisible();
}

async function dismiss(page) {
  await page.keyboard.press('Escape');
  await expect(page.locator('.marktide-toc')).toBeHidden();
}

async function screenshot(page, testInfo, name) {
  const buffer = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`${name}.png`, { body: buffer, contentType: 'image/png' });
  if (reviewDirectory) {
    fs.mkdirSync(reviewDirectory, { recursive: true });
    fs.writeFileSync(path.join(reviewDirectory, `${name}.png`), buffer);
  }
}

test('no headings, one heading, nesting, duplicate names and literal code build the actual outline', async ({ page }) => {
  await setup(page, 'A document without headings.');
  await expect(page.locator('.marktide-outline')).toBeHidden();
  await expect(page.locator(markers)).toHaveCount(0);
  await renderMarkdown(page, '# Only heading');
  await expect(page.locator(markers)).toHaveCount(1);
  await expect(page.locator(current)).toHaveText('Only heading');
  await renderMarkdown(page, '# Title\n\n## Same\n\n### Child\n\n## Same\n\n```md\n# Literal\n```\n\n# Ending');
  await expect(page.locator(markers)).toHaveCount(5);
  await contents(page);
  expect(await page.locator(links).allTextContents()).toEqual(['Title', 'Same', 'Child', 'Same', 'Ending']);
  const ids = await page.locator('#markdown-preview :is(h1,h2,h3)').evaluateAll(headings => headings.map(heading => heading.id));
  expect(ids).toEqual(['title', 'same', 'child', 'same-2', 'ending']);
  expect(await page.locator(links).evaluateAll(elements => elements.map(element => decodeURIComponent(element.hash.slice(1))))).toEqual(ids);
  await expect(page.locator('.marktide-toc > ol > li')).toHaveCount(2);
  await expect(page.locator('.marktide-toc > ol > li').first().locator(':scope > ol > li')).toHaveCount(2);
});

test('scroll tracking, smooth rapid jumps and back to top use the contained preview', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  await expect(page.locator(markers)).toHaveCount(33);
  await setTheme(page, 'dark');
  await contents(page);
  await screenshot(page, testInfo, 'split-dark');
  await dismiss(page);
  const editorBefore = await page.evaluate(() => window.MarkTideMonaco.getEditor().getScrollTop());
  const pageBefore = await page.evaluate(() => scrollY);
  await page.locator(markers).nth(15).click();
  await expect(page.locator(current)).toHaveText('Chapter 8');
  await page.locator(markers).nth(23).click();
  await page.locator(markers).nth(7).click();
  await expect(page.locator(current)).toHaveText('Chapter 4');
  expect(await page.evaluate(() => window.MarkTideMonaco.getEditor().getScrollTop())).toBe(editorBefore);
  expect(await page.evaluate(() => scrollY)).toBe(pageBefore);
  await page.getByRole('button', { name: 'Back to top', exact: true }).click();
  await expect(page.locator(current)).toHaveText('Field guide');
  await expect.poll(() => page.locator('.preview-pane').evaluate(pane => pane.scrollTop)).toBe(0);
  await page.evaluate(() => {
    const pane = document.querySelector('.preview-pane');
    const heading = document.getElementById('chapter-6');
    pane.scrollTop += heading.getBoundingClientRect().top - pane.getBoundingClientRect().top - 20;
  });
  await expect(page.locator(current)).toHaveText('Chapter 6');
  await expect(page.locator(markers + '[aria-current]')).toHaveCount(1);
});

test('hover overlays the editor, pin reserves space, and pointer exit respects the pin', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  await setTheme(page, 'dark');
  const geometry = () => page.evaluate(() => ({
    editor: document.querySelector('.editor-wrapper').getBoundingClientRect().width,
    preview: document.getElementById('markdown-preview').getBoundingClientRect().width,
    pane: document.querySelector('.preview-pane').getBoundingClientRect().width,
    rail: document.querySelector('.marktide-outline').getBoundingClientRect().left,
  }));
  const before = await geometry();
  await page.locator('.marktide-heading-rail').hover();
  await expect(page.locator('.marktide-toc')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Table of contents', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Close table of contents', exact: true })).toHaveCount(0);
  await expect(page.locator('.marktide-toc button')).toHaveCount(1);
  expect(await geometry()).toEqual(before);
  const panel = await page.locator('.marktide-toc').boundingBox();
  expect(panel.x + panel.width).toBeCloseTo(before.rail, 0);
  await page.locator('.marktide-toc-header').hover();
  await expect(page.locator('.marktide-toc')).toBeVisible();
  await screenshot(page, testInfo, 'split-hover-dark');
  await page.locator('.app-header').hover();
  await expect(page.locator('.marktide-toc')).toBeHidden();
  await page.locator('.marktide-heading-rail').hover();
  await page.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
  await expect.poll(async () => (await geometry()).editor).toBeCloseTo(before.editor - 262, 0);
  expect((await geometry()).preview).toBe(before.preview);
  expect((await geometry()).pane).toBe(before.pane);
  const pinnedPanel = await page.locator('.marktide-toc').boundingBox();
  expect(pinnedPanel.x + pinnedPanel.width).toBeCloseTo(before.rail, 0);
  await page.locator('.app-header').hover();
  await expect(page.locator('.marktide-toc')).toBeVisible();
  await screenshot(page, testInfo, 'split-pinned-dark');
  await setTheme(page, 'light');
  await screenshot(page, testInfo, 'split-pinned-light');
  await page.getByRole('button', { name: 'Unpin table of contents', exact: true }).click();
  await expect.poll(async () => (await geometry()).editor).toBe(before.editor);
  expect((await geometry()).preview).toBe(before.preview);
  await page.locator('.app-header').hover();
  await expect(page.locator('.marktide-toc')).toBeHidden();
});

test('short rails stay compact and the viewport range moves with scrolling', async ({ page }, testInfo) => {
  await setup(page, Array.from({ length: 12 }, (_, index) => `## Section ${index + 1}\n\nA short paragraph.\n\n`).join(''));
  await expect.poll(() => page.locator('.marktide-rail-track').evaluate(element => element.clientHeight)).toBeLessThanOrEqual(156);
  const start = await page.locator('.marktide-viewport-marker').evaluate(element => ({
    transform: element.style.transform, height: parseFloat(element.style.height),
  }));
  expect(start.height).toBeGreaterThan(12);
  await screenshot(page, testInfo, 'short-rail');
  await page.locator(markers).nth(2).click();
  await expect(page.locator(current)).toHaveText('Section 3');
  await expect.poll(() => page.locator('.marktide-viewport-marker').evaluate(element => element.style.transform)).not.toBe(start.transform);
  await screenshot(page, testInfo, 'short-rail-scrolled');
});

test('uneven document sections never leave gaps or duplicate rail markers', async ({ page }) => {
  await setup(page, '# Start\n\n## Close\n\n### Nested\n\n<div style="height:2200px"></div>\n\n## Far away\n\n<div style="height:800px"></div>\n\n# End');
  await expect(page.locator(markers)).toHaveCount(5);
  const positions = await page.locator(markers).evaluateAll(elements => elements.map(el => new DOMMatrix(getComputedStyle(el).transform).m42));
  expect(positions).toEqual([0, 12, 24, 36, 48]);
  await page.locator(markers).nth(3).click();
  await expect(page.locator(current)).toHaveText('Far away');
});

test('dense rails keep every heading reachable and TOC scrolling stays separate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page, '# Index\n\n' + Array.from({ length: 200 }, (_, index) =>
    `## Section ${index + 1}\n\nA paragraph for this section.\n\n`).join(''));
  await expect(page.locator(markers)).toHaveCount(201);
  await page.locator(markers).first().focus();
  await page.locator(markers).first().press('End');
  await expect(page.locator(markers).last()).toBeFocused();
  await expect(page.locator(current)).toHaveText('Section 200');
  await expect.poll(() => page.locator('.marktide-heading-rail').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.locator(markers).last().press('Home');
  await expect(page.locator(markers).first()).toBeFocused();
  await expect(page.locator(current)).toHaveText('Index');
  await expect.poll(() => page.locator('.marktide-heading-rail').evaluate(el => el.scrollTop)).toBe(0);
  const paneBefore = await page.locator('.preview-pane').evaluate(el => el.scrollTop);
  await contents(page);
  const list = page.locator('.marktide-toc > ol');
  await list.hover();
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('.preview-pane').evaluate(el => el.scrollTop)).toBe(paneBefore);
  await expect(page.locator(current)).toHaveText('Index');
});

for (const layout of [{ name: 'desktop', width: 1440, height: 780, touch: false },
  { name: 'tablet', width: 768, height: 1024, touch: true }]) {
  test.describe(`scrolling ${layout.name} rail`, () => {
    test.use({ hasTouch: layout.touch, isMobile: layout.touch });
    for (const theme of ['dark', 'light']) for (const pinned of [false, true]) {
      test(`TOC jumps reveal the active marker and range in ${theme}, ${pinned ? 'pinned' : 'floating'}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: layout.width, height: layout.height });
        await setup(page, railDocument);
        await setTheme(page, theme);
        if (layout.touch) await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
        const openPanel = async () => {
          if (!layout.touch) await contents(page);
          else {
            if (await page.locator('.marktide-toc').getAttribute('aria-hidden') !== 'false') {
              await page.locator(markers).first().tap();
            }
            await expect(page.locator('.marktide-toc')).toBeVisible();
          }
        };
        const select = async name => {
          await openPanel();
          const link = page.getByRole('link', { name, exact: true });
          if (layout.touch) await link.tap();
          else await link.click();
          await expectVisibleHeading(page, name);
          await expect(page.locator(current)).toHaveText(name);
          await expectVisibleRail(page);
        };
        await openPanel();
        if (pinned) {
          const pin = page.getByRole('button', { name: 'Pin table of contents', exact: true });
          if (layout.touch) await pin.tap();
          else await pin.click();
        }
        await select('Section 140');
        const suffix = `${layout.name}-${theme}-${pinned ? 'pinned' : 'floating'}`;
        await screenshot(page, testInfo, `rail-jump-bottom-${suffix}`);
        await page.locator('.marktide-heading-rail').evaluate(el => { el.scrollTop = 0; });
        await select('Section 140');
        await select('Index');
        await screenshot(page, testInfo, `rail-jump-top-${suffix}`);
        await page.locator('.marktide-heading-rail').evaluate(el => { el.scrollTop = el.scrollHeight; });
        await select('Index');
        await select('Section 70');
        await screenshot(page, testInfo, `rail-jump-middle-${suffix}`);
        await page.setViewportSize({ width: layout.width, height: 420 });
        await expectVisibleRail(page);
        await expect(page.locator(markers + '[aria-current]')).toHaveCount(1);
      });
    }
  });
}

test('standalone HTML follows TOC jumps in a long rail while offline', async ({ page, browser }, testInfo) => {
  await setup(page, railDocument);
  const file = testInfo.outputPath('long-rail.html');
  fs.writeFileSync(file, await captureHtmlExport(page));
  const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 780 } });
  const exported = await context.newPage();
  try {
    await exported.goto(`file://${file}`);
    await expect(exported.locator(markers)).toHaveCount(141);
    await contents(exported);
    for (const name of ['Section 140', 'Index', 'Section 70']) {
      await exported.getByRole('link', { name, exact: true }).click();
      await expectVisibleHeading(exported, name);
      await expect(exported.locator(current)).toHaveText(name);
      await expectVisibleRail(exported);
    }
    await screenshot(exported, testInfo, 'rail-jump-standalone-offline');
  } finally { await context.close(); }
});

test('mobile TOC leaves existing table geometry and overflow unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await setup(page, mobileProse);
  await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations()
      .filter(animation => Number.isFinite(animation.effect.getTiming().iterations))
      .map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const geometry = () => page.locator('.marktide-table-scroll').last().evaluate(el => ({
    viewport: el.clientWidth, table: el.querySelector('table').getBoundingClientRect().width,
    overflow: el.scrollWidth - el.clientWidth, font: getComputedStyle(el.querySelector('table')).fontSize,
    rows: [...el.querySelector('table').rows].map(row => row.getBoundingClientRect().height),
  }));
  const enabled = await geometry();
  await page.evaluate(() => window.MarkTideOutline.destroy());
  await expect(page.locator('.marktide-outline')).toHaveCount(0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await geometry()).toEqual(enabled);
  await page.evaluate(() => window.MarkTideOutline.init());
  await expect(page.locator('.marktide-outline')).toBeVisible();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await geometry()).toEqual(enabled);
});

test.describe('touch navigation', () => {
  test.use({ hasTouch: true, isMobile: true });

  for (const theme of ['dark', 'light']) {
    test(`phone sheets dismiss directly and sit above Back to top in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await setup(page);
      await setTheme(page, theme);
      await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
      const button = page.getByRole('button', { name: 'Table of contents', exact: true });
      const sheet = page.getByRole('dialog', { name: 'Table of contents', exact: true });
      await expect(page.locator('.marktide-heading-rail')).toBeHidden();
      await expect(button).toBeVisible();
      await screenshot(page, testInfo, `phone-closed-${theme}`);
      await button.tap();
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('button')).toHaveCount(0);
      expect(await sheet.boundingBox()).toMatchObject({ x: 0, width: 390 });
      await expect(page.getByRole('button', { name: 'Share', exact: true })).toHaveCount(0);
      const contrast = await page.locator(current).evaluate(el => {
        const context = document.createElement('canvas').getContext('2d');
        const luminance = color => {
          context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--markdown-bg');
          context.fillRect(0, 0, 1, 1);
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const rgb = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
            .map(channel => channel / 255).map(channel => channel <= 0.04045
              ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const style = getComputedStyle(el);
        const foreground = luminance(style.color);
        const background = luminance(style.backgroundColor);
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      await screenshot(page, testInfo, `phone-open-${theme}`);
      await button.tap();
      await expect(sheet).toBeHidden();
      await button.tap();
      await page.locator('.marktide-toc-backdrop').tap({ position: { x: 4, y: 4 } });
      await expect(sheet).toBeHidden();
      await button.tap();
      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      await expect(button).toBeFocused();
      await button.tap();
      await page.getByRole('link', { name: 'Chapter 8', exact: true }).tap();
      await expect(sheet).toBeHidden();
      await expect.poll(() => page.locator('#chapter-8').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(32);
      await expect(page.locator(current)).toHaveText('Chapter 8');
      const top = page.getByRole('button', { name: 'Back to top', exact: true });
      await expect(top).toBeVisible();
      const tocBox = await button.boundingBox();
      const topBox = await top.boundingBox();
      expect(tocBox.y + tocBox.height).toBeLessThanOrEqual(topBox.y - 8);
      expect(tocBox.x).toBeCloseTo(topBox.x, 0);
      await screenshot(page, testInfo, `phone-controls-${theme}`);
      await button.tap();
      await page.getByRole('link', { name: 'Chapter 12', exact: true }).tap();
      await expect(sheet).toBeHidden();
      await expect(page.locator(current)).toHaveText('Chapter 12');
      await expect.poll(() => page.locator('#chapter-12').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(32);
      await button.tap();
      const pageBefore = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 400);
      expect(await page.evaluate(() => scrollY)).toBe(pageBefore);
      await top.tap();
      await expect(sheet).toBeHidden();
      await expect(page.locator(current)).toHaveText('Field guide');
      for (const width of [320, 430, 640, 767]) {
        await page.setViewportSize({ width, height: 844 });
        await button.tap();
        const bounds = await sheet.boundingBox();
        expect(bounds.x).toBe(0);
        expect(bounds.width).toBe(width);
        expect(bounds.y + bounds.height).toBeCloseTo(844, 0);
        await button.tap();
      }
    });

    test(`tablet panels float at full height and dock the preview in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setup(page);
      await setTheme(page, theme);
      await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
      const pane = page.locator('.preview-pane');
      const rail = page.locator('.marktide-heading-rail');
      const panel = page.getByRole('navigation', { name: 'Table of contents', exact: true });
      const before = await pane.evaluate(el => parseFloat(getComputedStyle(el).paddingLeft));
      await expect(page.getByRole('button', { name: 'Table of contents', exact: true })).toBeHidden();
      await screenshot(page, testInfo, `tablet-closed-${theme}`);
      await page.locator(markers).first().tap();
      await expect(panel).toBeVisible();
      expect(await pane.evaluate(el => parseFloat(getComputedStyle(el).paddingLeft))).toBe(before);
      const box = await panel.boundingBox();
      const railBox = await rail.boundingBox();
      expect(box.width).toBe(262);
      expect(box.x).toBeCloseTo(railBox.x + railBox.width, 0);
      expect(box.y + box.height).toBeCloseTo(1024, 0);
      await screenshot(page, testInfo, `tablet-floating-${theme}`);
      await page.locator('.app-header').tap();
      await expect(panel).toBeHidden();
      await page.locator(markers).first().tap();
      await page.getByRole('button', { name: 'Pin table of contents', exact: true }).tap();
      await expect(pane).toHaveClass(/marktide-outline-expanded/);
      expect(await pane.evaluate(el => parseFloat(getComputedStyle(el).paddingLeft))).toBe(before);
      expect(await page.locator('#markdown-preview').evaluate(el => getComputedStyle(el).marginLeft)).toBe('262px');
      await page.locator('.app-header').tap();
      await expect(panel).toBeVisible();
      await screenshot(page, testInfo, `tablet-pinned-${theme}`);
      for (const size of [{ width: 820, height: 1180 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
        await page.setViewportSize(size);
        await expect(panel).toBeVisible();
        await expect.poll(() => panel.evaluate(el => Math.round(el.getBoundingClientRect().bottom))).toBe(size.height);
        expect((await panel.boundingBox()).width).toBe(262);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole('dialog', { name: 'Table of contents' })).toBeVisible();
      await page.getByRole('button', { name: 'Table of contents', exact: true }).tap();
      await expect(page.locator('.marktide-toc')).toBeHidden();
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('.marktide-outline')).toHaveClass(/is-floating/);
      await expect(pane).not.toHaveClass(/marktide-outline-expanded/);
    });
  }
});

test('source lines exclude fenced code and map Setext, quotes, lists and authored HTML', async ({ page }) => {
  const source = '# Intro\n\n```md\n# Fake\n```\n\n## Duplicate\n\nParagraph.\n\n## Duplicate\n\nSetext title\n------------\n\n> ### Quoted\n\n- ### Listed\n\n<h2 id="authored">HTML heading</h2>\n';
  await setup(page, source);
  const headings = await page.evaluate(source => window.MarkTideOutline.sourceHeadings(source), source);
  expect(headings.map(({ line, label }) => [line, label])).toEqual([
    [1, 'Intro'], [7, 'Duplicate'], [11, 'Duplicate'], [13, 'Setext title'],
    [16, 'Quoted'], [18, 'Listed'], [20, 'HTML heading'],
  ]);
  await expect(page.locator(markers)).toHaveCount(7);
  await page.evaluate(() => window.MarkTideViewManager.setView('editor-only'));
  for (const [index, line] of [[2, 11], [3, 13], [4, 16], [5, 18], [6, 20]]) {
    await contents(page);
    await page.locator(links).nth(index).click();
    await expect.poll(() => page.evaluate(() => window.MarkTideMonaco.getEditor().getPosition().lineNumber)).toBe(line);
  }
});

test('editor navigation follows source positions, cursor and scrolling', async ({ page }, testInfo) => {
  await setup(page);
  await setTheme(page, 'dark');
  await page.evaluate(() => window.MarkTideViewManager.setView('editor-only'));
  await contents(page);
  await screenshot(page, testInfo, 'editor-only-dark');
  await page.getByRole('link', { name: 'Chapter 10', exact: true }).click();
  const line = longDocument.split('\n').findIndex(text => text === '## Chapter 10') + 1;
  await expect.poll(() => page.evaluate(() => window.MarkTideMonaco.getEditor().getPosition().lineNumber)).toBe(line);
  await expect(page.locator(current)).toHaveText('Chapter 10');
  await page.evaluate(() => window.MarkTideMonaco.getEditor().setScrollTop(0));
  await expect(page.locator(current)).toHaveText('Field guide');
  await page.evaluate(() => window.MarkTideMonaco.getEditor().setPosition({ lineNumber: 30, column: 1 }));
  await expect(page.locator(current)).not.toHaveText('Field guide');
  await setTheme(page, 'light');
  await page.setViewportSize({ width: 390, height: 900 });
  await contents(page);
  await screenshot(page, testInfo, 'editor-only-light-narrow');
});

test('heading jumps respect both scroll sync states and resume normal sync', async ({ page }) => {
  await setup(page);
  await page.locator(markers).nth(7).click();
  await expect(page.locator(current)).toHaveText('Chapter 4');
  expect(await page.evaluate(() => window.MarkTideMonaco.getEditor().getScrollTop())).toBe(0);
  await page.locator('#toggle-sync').click();
  await page.locator(markers).nth(15).click();
  await expect(page.locator(current)).toHaveText('Chapter 8');
  const line = longDocument.split('\n').findIndex(text => text === '## Chapter 8') + 1;
  await expect.poll(() => page.evaluate(() => window.MarkTideMonaco.getEditor().getPosition().lineNumber)).toBe(line);
  await expect.poll(() => page.evaluate(() => window.MarkTideScrollSync.navigationInProgress)).toBe(false);
  await page.evaluate(() => window.MarkTideMonaco.getEditor().setScrollTop(0));
  await expect.poll(() => page.locator('.preview-pane').evaluate(pane => pane.scrollTop)).toBe(0);
  await page.locator('#toggle-sync').click();
});

test('live edits rebuild IDs and observers without duplicate controls or stale markers', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeObserver = IntersectionObserver;
    window.outlineObservers = new Set();
    window.IntersectionObserver = class extends NativeObserver {
      constructor(...args) { super(...args); window.outlineObservers.add(this); }
      disconnect() { window.outlineObservers.delete(this); super.disconnect(); }
    };
  });
  await setup(page);
  for (const source of ['# New\n\n## Edited', '# New\n\n## New\n\n## New', '# End']) {
    await page.evaluate(source => {
      const host = document.getElementById('markdown-editor');
      host.value = source;
      host.dispatchEvent(new Event('input'));
    }, source);
    await expect(page.locator(links)).toHaveCount(source.match(/^#/gm).length);
    await expect.poll(() => page.evaluate(() => window.outlineObservers.size)).toBe(1);
  }
  await contents(page);
  await page.locator('.app-header').hover();
  await expect(page.locator('.marktide-toc')).toBeHidden();
  await page.evaluate(() => window.MarkTideOutline.destroy());
  await expect(page.locator('.marktide-outline')).toHaveCount(0);
  expect(await page.evaluate(() => window.outlineObservers.size)).toBe(0);
  await page.evaluate(() => { window.MarkTideOutline.init(); window.MarkTideOutline.init(); });
  await expect(page.locator('.marktide-outline')).toHaveCount(1);
  await expect(page.locator(markers)).toHaveCount(1);
  await expect(page.locator('.marktide-toc')).toBeHidden();
  await contents(page);
  await expect(page.locator('.marktide-toc')).toBeVisible();
  await page.evaluate(() => window.MarkTideOutline.refresh());
  await expect(page.locator('#markdown-preview h1')).toHaveAttribute('id', 'end');
});

test('keyboard navigation, reduced motion and responsive themes remain usable', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await page.locator(markers).first().focus();
  await page.locator(markers).first().press('ArrowDown');
  await expect(page.locator(markers).nth(1)).toBeFocused();
  await expect(page.locator(current)).toHaveText('Chapter 1');
  expect(await page.locator('.marktide-active-marker').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  await contents(page);
  await page.getByRole('link', { name: 'Chapter 8', exact: true }).press('Enter');
  await expect(page.locator('#chapter-8')).toBeFocused();
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
      await contents(page);
      const panel = await page.locator('.marktide-toc').boundingBox();
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await screenshot(page, testInfo, `preview-${theme}-${width}`);
      await dismiss(page);
    }
  }
});

test('standalone HTML navigation works independently without network or app globals', async ({ page, browser }, testInfo) => {
  await setup(page);
  const html = await captureHtmlExport(page);
  const file = testInfo.outputPath('independent.html');
  fs.writeFileSync(file, html);
  const independent = await browser.newContext({ offline: true, viewport: { width: 1440, height: 900 } });
  const exported = await independent.newPage();
  try {
    await exported.goto(`file://${file}`);
    await expect(exported.locator(markers)).toHaveCount(33);
    await contents(exported);
    await expect.poll(() => exported.locator('.marktide-toc').evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(262);
    await exported.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
    await expect(exported.locator('.marktide-html-reading-area')).toHaveClass(/marktide-outline-expanded/);
    await screenshot(exported, testInfo, 'standalone-offline');
    await exported.getByRole('link', { name: 'Chapter 12', exact: true }).click();
    await expect(exported.locator(current)).toHaveText('Chapter 12');
    await expect(exported.locator('.marktide-toc')).toBeVisible();
    expect(await exported.evaluate(() => typeof window.MarkTideCore)).toBe('undefined');
    expect(await exported.evaluate(() => typeof window.marked)).toBe('undefined');
    await exported.getByRole('button', { name: 'Back to top', exact: true }).click();
    await expect(exported.locator(current)).toHaveText('Field guide');
    await exported.setViewportSize({ width: 390, height: 844 });
    await expect(exported.getByRole('dialog', { name: 'Table of contents' })).toBeVisible();
    await exported.getByRole('button', { name: 'Table of contents', exact: true }).click();
    await contents(exported);
    await exported.getByRole('link', { name: 'Chapter 7', exact: true }).click();
    await expect(exported.locator('.marktide-toc')).toBeHidden();
    await expect(exported.locator(current)).toHaveText('Chapter 7');
    const tocBox = await exported.getByRole('button', { name: 'Table of contents', exact: true }).boundingBox();
    const topBox = await exported.getByRole('button', { name: 'Back to top', exact: true }).boundingBox();
    expect(tocBox.y + tocBox.height).toBeLessThanOrEqual(topBox.y - 8);
    await screenshot(exported, testInfo, 'standalone-phone-offline');
    await contents(exported);
    const list = exported.locator('.marktide-toc > ol');
    const scrollBefore = await list.evaluate(el => el.scrollTop);
    const documentBefore = await exported.evaluate(() => scrollY);
    await list.hover();
    await exported.mouse.wheel(0, 500);
    await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(scrollBefore);
    expect(await exported.evaluate(() => scrollY)).toBe(documentBefore);
    await dismiss(exported);
    await exported.setViewportSize({ width: 768, height: 1024 });
    await contents(exported);
    await exported.getByRole('button', { name: 'Pin table of contents', exact: true }).click();
    await expect(exported.locator('.marktide-html-reading-area')).toHaveClass(/marktide-outline-expanded/);
    expect(await exported.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
  } finally { await independent.close(); }
});

test('live preview and HTML share heading destinations and PDF stays clear of navigation', async ({ page, context, baseURL }) => {
  await installStandaloneCdnMirror(context);
  await setup(page, '# Guide\n\n## Same\n\n## Same\n\n<h3 id="authored">Details</h3>');
  const html = await captureHtmlExport(page);
  const exported = await context.newPage();
  try {
    await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
    await expect(exported.locator(markers)).toHaveCount(4);
    expect(await exported.locator(links).evaluateAll(elements => elements.map(element => element.hash)))
      .toEqual(await page.locator(links).evaluateAll(elements => elements.map(element => element.hash)));
    const pdf = await capturePdfPreparation(page, 'Outline PDF boundary', { includeDocumentHtml: true });
    expect(pdf.documentHtml).not.toContain('marktide-outline');
    await exported.emulateMedia({ media: 'print' });
    await expect(exported.locator('.marktide-outline')).toBeHidden();
  } finally { await exported.close(); }
});
