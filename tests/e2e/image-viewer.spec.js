const { test, expect } = require('playwright/test');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

const picture = 'data:image/svg+xml;base64,' + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#142534"/><rect x="100" y="100" width="1400" height="700" rx="24" fill="#dbe9f3"/><text x="800" y="460" text-anchor="middle" font-family="sans-serif" font-size="64" fill="#142534">MarkTide image review</text></svg>'
).toString('base64');
const source = `# Image viewer review

![Figure 1. Markdown evidence.](${picture})

> This quotation stays separate from the caption.

<img id="authored" src="assets/img/desktop-preview.png" alt="Figure 2. Authored evidence." width="500" style="border:1px solid #999">

<figure><img id="custom" src="${picture}" alt="Accessible alternative" width="240"><figcaption>Author written caption</figcaption></figure>

![image](${picture})

<img id="empty" src="${picture}" alt="">

<img id="decorative" src="${picture}" alt="Decoration" role="presentation">

<a href="#linked-destination" id="authored-link"><img src="${picture}" alt="Linked evidence" width="160"></a>

Inline ![Inline evidence](${picture}) stays inline.

![Build badge](https://img.shields.io/viewer-badge.svg)

<img id="broken" src="/missing-viewer-image.png" alt="Missing evidence" width="120">

<img id="unsafe" src="javascript:alert(1)" alt="Unsafe" onerror="window.__unsafeViewer=true">

<div style="display:none"><img src="${picture}" alt="Hidden evidence"></div>

## Linked destination
`;

async function setup(page, context, theme = 'light') {
  await installStandaloneCdnMirror(context);
  await context.route('https://img.shields.io/viewer-badge.svg', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"/>',
  }));
  await page.goto('/index.html');
  await waitForMarkTide(page);
  expect(await page.evaluate(() => typeof window.PhotoSwipe)).toBe('function');
  await page.locator('#close-dropzone').click();
  await setTheme(page, theme);
  await renderMarkdown(page, source);
  await expect(page.locator('.marktide-viewable-image')).toHaveCount(4);
}

async function exportedPage(page, context, baseURL) {
  const html = await captureHtmlExport(page);
  expect(html).toContain('PhotoSwipe 5.4.4');
  expect(html).toContain('MIT License');
  expect(html).not.toMatch(/<script[^>]*src=["'][^"']*photoswipe/i);
  const exported = await context.newPage();
  await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
  await expect(exported.locator('.marktide-viewable-image')).toHaveCount(4);
  return { exported, html };
}

async function checkViewer(surface, width) {
  await surface.evaluate(async () => {
    await document.fonts.ready;
    const readingArea = document.querySelector('.preview-pane') || document.querySelector('.markdown-body');
    await Promise.all(readingArea.getAnimations().filter(animation =>
      Number.isFinite(animation.effect.getTiming().iterations)).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const image = surface.locator('.marktide-viewable-image').first();
  await expect(image).toHaveCount(1);
  const before = await image.boundingBox();
  const docSize = await surface.locator('.markdown-body').evaluate(el => [el.clientWidth, el.scrollHeight]);
  await image.focus();
  await surface.keyboard.press('Enter');
  const dialog = surface.getByRole('dialog', { name: 'Document image viewer' });
  await expect(dialog).toBeVisible();
  await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(surface.locator('.markdown-body .pswp')).toHaveCount(0);
  await expect(surface.locator('.pswp__document-caption')).toHaveText('Figure 1. Markdown evidence.');
  await expect(dialog.locator('.pswp__img:not(.pswp__img--placeholder)').first()).toHaveAttribute('alt', 'Figure 1. Markdown evidence.');
  const box = await dialog.boundingBox();
  expect(box.x).toBe(0);
  expect(box.y).toBe(0);
  expect(box.width).toBe(width);
  expect(box.height).toBe(844);
  for (const name of ['Close image viewer', 'Zoom image', 'Next image']) {
    const button = dialog.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    const bounds = await button.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  }
  await surface.keyboard.press('Tab');
  expect(await surface.evaluate(() => Boolean(document.activeElement.closest('.pswp')))).toBe(true);
  const zoomBefore = await surface.evaluate(() => window.MarkTideImageViewer.viewer.currSlide.currZoomLevel);
  await dialog.getByRole('button', { name: 'Zoom image', exact: true }).click();
  await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer.currSlide.currZoomLevel)).toBeGreaterThan(zoomBefore);
  await dialog.getByRole('button', { name: 'Zoom image', exact: true }).click();
  await surface.keyboard.press('ArrowRight');
  await expect(surface.locator('.pswp__document-caption')).toHaveText('Figure 2. Authored evidence.');
  const dimensions = await surface.evaluate(() => {
    const slide = window.MarkTideImageViewer.viewer.currSlide;
    return [slide.data.width, slide.data.height, slide.data.alt];
  });
  const intrinsic = await surface.locator('#authored').evaluate(img => [img.naturalWidth, img.naturalHeight, img.alt]);
  expect(dimensions).toEqual(intrinsic);
  await surface.keyboard.press('ArrowRight');
  await expect(surface.locator('.pswp__document-caption')).toHaveText('Author written caption');
  await surface.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(image).toBeFocused();
  const after = await image.boundingBox();
  expect([after.width, after.height]).toEqual([before.width, before.height]);
  expect(await surface.locator('.markdown-body').evaluate(el => [el.clientWidth, el.scrollHeight])).toEqual(docSize);
  await image.click();
  await expect(dialog).toBeVisible();
  await surface.getByRole('button', { name: 'Close image viewer', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(image).toBeFocused();
}

for (const theme of ['light', 'dark']) {
  test(`shared image viewer at mobile tablet desktop in ${theme}`, async ({ page, context, baseURL }) => {
    test.setTimeout(120_000);
    await setup(page, context, theme);
    const { exported } = await exportedPage(page, context, baseURL);
    try {
      for (const width of [390, 768, 1440]) {
        for (const surface of [page, exported]) {
          await surface.setViewportSize({ width, height: 844 });
          await checkViewer(surface, width);
          await expect(surface.locator('#authored')).toHaveAttribute('width', '500');
          await expect(surface.locator('#authored')).toHaveCSS('border-left-width', '1px');
          for (const selector of ['#empty', '#decorative', '#broken', '#unsafe', '#authored-link img',
            'img[alt="Inline evidence"]', 'img[alt="Build badge"]', 'img[alt="Hidden evidence"]']) {
            await expect(surface.locator(selector)).not.toHaveClass(/marktide-viewable-image/);
          }
          await expect(surface.locator('#authored-link')).toHaveAttribute('href', '#linked-destination');
          expect(await surface.evaluate(() => window.__unsafeViewer)).toBeUndefined();
        }
      }
      // Check navigation last: the export test's base URL may leave this page.
      for (const surface of [page, exported]) {
        await surface.locator('#authored-link').click();
        await expect(surface.locator('.pswp')).toHaveCount(0);
        expect(await surface.evaluate(() => location.hash)).toBe('#linked-destination');
      }
    } finally { await exported.close(); }
  });
}

test('optional real cover animation review', async ({ browser, baseURL }) => {
  const directory = process.env.MARKTIDE_IMAGE_MOTION_REVIEW_DIR;
  test.skip(!directory, 'Optional manual motion review files');
  test.setTimeout(120_000);
  const fs = require('node:fs');
  const path = require('node:path');
  const cover = path.resolve(__dirname, '../../Evidence/cover_artwork.png');
  test.skip(!fs.existsSync(cover), 'The user supplied cover is not present');
  fs.mkdirSync(directory, { recursive: true });
  for (const [theme, width, mode] of [['dark', 1280, 'preview'], ['light', 390, 'html']]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 844 },
      recordVideo: { dir: path.join(directory, 'recordings'), size: { width, height: 844 } } });
    const page = await context.newPage();
    let surface = page;
    try {
      await setup(page, context, theme);
      await renderMarkdown(page, `# Image motion review\n\n<img src="Evidence/cover_artwork.png" alt="Cover artwork" width="600">\n\n![Figure 1. Sysmon Event ID 1 received in Wazuh Discover.](Evidence/02_Detection_1/D1_03b_Sysmon_Event1_Discover_Verified_Columns.png)`);
      await expect(page.locator('.marktide-viewable-image')).toHaveCount(2);
      if (mode === 'preview') await page.locator('#show-code-button').click();
      const html = await captureHtmlExport(page);
      fs.writeFileSync(path.join(directory, `motion-${theme}.html`), html);
      if (mode === 'html') {
        surface = await context.newPage();
        await surface.setContent(html);
      }
      const image = surface.locator('img[alt="Cover artwork"]').first();
      const video = surface.video();
      await image.click();
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
      await surface.screenshot({ path: path.join(directory, `${mode}-${theme}-${width}.png`) });
      await surface.getByRole('button', { name: 'Close image viewer', exact: true }).click();
      await expect(surface.locator('.pswp')).toHaveCount(0);
      await image.click();
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
      await surface.getByRole('button', { name: 'Next image', exact: true }).click();
      await expect(surface.locator('.pswp__document-caption')).toHaveText('Figure 1. Sysmon Event ID 1 received in Wazuh Discover.');
      await surface.keyboard.press('Escape');
      await expect(surface.locator('.pswp')).toHaveCount(0);
      await surface.close();
      await video.saveAs(path.join(directory, `${mode}-${theme}-${width}.webm`));
    } finally { await context.close(); }
  }
});

test('fresh standalone viewer and embedded local images work with all network disabled', async ({ page, context, baseURL }) => {
  await setup(page, context);
  const { exported, html } = await exportedPage(page, context, baseURL);
  await exported.close();
  const offline = await context.browser().newContext({ offline: true, viewport: { width: 390, height: 844 } });
  const document = await offline.newPage();
  try {
    await document.setContent(html);
    await expect(document.locator('.marktide-viewable-image')).toHaveCount(4);
    await expect(document.locator('#authored')).toHaveAttribute('src', /^data:image\//);
    await checkViewer(document, 390);
  } finally { await offline.close(); }
});

test('cross origin images remain safe when embedding is allowed or denied', async ({ page, context, baseURL }) => {
  await setup(page, context);
  const body = Buffer.from(picture.split(',')[1], 'base64');
  const server = require('node:http').createServer((request, response) => {
    response.setHeader('Content-Type', 'image/svg+xml');
    if (request.url.includes('/allowed')) response.setHeader('Access-Control-Allow-Origin', '*');
    response.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await renderMarkdown(page, `<img id="remote-allowed" src="${origin}/allowed.svg" alt="Allowed remote evidence">
    <img id="remote-denied" src="${origin}/denied.svg" alt="Denied remote evidence">`);
  await expect(page.locator('.marktide-viewable-image')).toHaveCount(2);
  const { html } = { html: await captureHtmlExport(page) };
  const exported = await context.newPage();
  try {
    await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
    await expect(exported.locator('.marktide-viewable-image')).toHaveCount(2);
    await expect(exported.locator('#remote-allowed')).toHaveAttribute('src', /^data:image\//);
    await expect(exported.locator('#remote-denied')).toHaveAttribute('src', origin + '/denied.svg');
    await exported.locator('#remote-denied').click();
    await expect(exported.getByRole('dialog', { name: 'Document image viewer' })).toBeVisible();
    await expect.poll(() => exported.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
    await exported.keyboard.press('Escape');
    await expect(exported.locator('.pswp')).toHaveCount(0);
  } finally { await exported.close(); await new Promise(resolve => server.close(resolve)); }
});

test('mobile touch swipe and pinch zoom work in Preview and fresh HTML offline', async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await setup(page, context);
    const { exported } = await exportedPage(page, context, baseURL);
    await context.setOffline(true);
    for (const surface of [page, exported]) {
      await surface.locator('.marktide-viewable-image').first().tap();
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
      const session = await context.newCDPSession(surface);
      const touch = (type, points) => session.send('Input.dispatchTouchEvent', { type,
        touchPoints: points.map(([x, y], id) => ({ x, y, id, radiusX: 2, radiusY: 2 })) });
      await touch('touchStart', [[330, 400]]);
      for (const x of [280, 220, 160, 100, 40]) await touch('touchMove', [[x, 400]]);
      await touch('touchEnd', []);
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer.currIndex)).toBe(1);
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer.mainScroll.isShifted())).toBe(false);
      await surface.keyboard.press('Escape');
      await expect(surface.locator('.pswp')).toHaveCount(0);
      await surface.locator('#authored').tap();
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
      await surface.getByRole('button', { name: 'Previous image', exact: true }).tap();
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer.currIndex)).toBe(0);
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer.mainScroll.isShifted())).toBe(false);
      const before = await surface.evaluate(() => window.MarkTideImageViewer.viewer.currSlide.currZoomLevel);
      await touch('touchStart', [[155, 400], [235, 400]]);
      for (const spread of [55, 75, 95, 115, 140]) {
        await touch('touchMove', [[195 - spread, 400], [195 + spread, 400]]);
        await surface.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      }
      await touch('touchEnd', []);
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer.currSlide.currZoomLevel)).toBeGreaterThan(before);
      await surface.getByRole('button', { name: 'Close image viewer', exact: true }).tap();
      await expect(surface.locator('.pswp')).toHaveCount(0);
      await session.detach();
    }
  } finally { await context.close(); }
});

test('image viewer review files use the real report', async ({ page, context, baseURL }) => {
  test.skip(!process.env.MARKTIDE_IMAGE_REVIEW_DIR, 'Optional manual review files');
  test.setTimeout(120_000);
  const fs = require('node:fs');
  const path = require('node:path');
  const directory = process.env.MARKTIDE_IMAGE_REVIEW_DIR;
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.resolve(__dirname, '../../Report.md');
  const report = fs.readFileSync(filename, 'utf8');
  await setup(page, context);
  await renderMarkdown(page, report);
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    const html = await captureHtmlExport(page);
    fs.writeFileSync(path.join(directory, `report-${theme}.html`), html);
    const exported = await context.newPage();
    try {
      await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
      for (const width of [390, 768, 1440]) {
        for (const [surface, name] of [[page, 'preview'], [exported, 'html']]) {
          await surface.setViewportSize({ width, height: 844 });
          const image = surface.locator('img.marktide-viewable-image[alt^="Figure 1."]').first();
          await expect(image).toBeVisible();
          await image.click();
          await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
          await surface.screenshot({ path: path.join(directory, `${name}-${theme}-${width}.png`) });
          await surface.keyboard.press('Escape');
          await expect(surface.locator('.pswp')).toHaveCount(0);
        }
      }
    } finally { await exported.close(); }
  }
  expect(fs.readFileSync(filename, 'utf8')).toBe(report);
});

test('reduced motion, rerenders, delayed images and print isolation', async ({ page, context, baseURL }) => {
  await setup(page, context);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.marktide-viewable-image').first().click();
  expect(await page.evaluate(() => {
    const options = window.MarkTideImageViewer.viewer.options;
    return [options.showHideAnimationType, options.zoomAnimationDuration];
  })).toEqual(['none', 0]);
  await renderMarkdown(page, '# Replaced document');
  await expect(page.locator('.pswp')).toHaveCount(0);
  for (let index = 0; index < 3; index++) {
    await renderMarkdown(page, source);
    await expect(page.locator('.marktide-viewable-image')).toHaveCount(4);
    await page.evaluate(() => { window.MarkTideImageViewer.init(); window.MarkTideImageViewer.init(); });
    await page.locator('.marktide-viewable-image').first().click();
    await expect(page.locator('.pswp')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('.pswp')).toHaveCount(0);
  }
  const { exported } = await exportedPage(page, context, baseURL);
  try {
    for (const surface of [page, exported]) {
      await surface.locator('.marktide-viewable-image').first().click();
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
      await surface.emulateMedia({ media: 'print' });
      await expect(surface.locator('.pswp')).toBeHidden();
      await surface.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      await expect(surface.locator('.pswp')).toHaveCount(0);
      await surface.emulateMedia({ media: 'screen' });
      await surface.locator('.marktide-viewable-image').first().click();
      await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
      await surface.keyboard.press('Escape');
    }
    const prepared = await capturePdfPreparation(page, 'Image viewer isolation', { includeDocumentHtml: true });
    expect(prepared.documentHtml).not.toMatch(/PhotoSwipe|image-viewer|marktide-viewable-image/);
    expect(prepared.documentHtml).toContain('Figure 1. Markdown evidence.');
    expect(prepared.documentHtml).toContain('width="500"');
  } finally { await exported.close(); }
  let release;
  const loaded = new Promise(resolve => { release = resolve; });
  await context.route('**/delayed-viewer.svg', async route => {
    await loaded;
    await route.fulfill({ contentType: 'image/svg+xml', body: Buffer.from(picture.split(',')[1], 'base64') });
  });
  await renderMarkdown(page, '<img src="/delayed-viewer.svg" alt="Delayed evidence">');
  await expect(page.locator('.marktide-viewable-image')).toHaveCount(0);
  release();
  await expect(page.locator('.marktide-viewable-image')).toHaveCount(1);
});

for (const theme of ['light', 'dark']) {
  test(`transparent images animate without a solid placeholder in ${theme}`, async ({ page, context, baseURL }) => {
    test.setTimeout(90_000);
    await setup(page, context, theme);
    // This PNG has transparent edges, like the real report's cover artwork.
    const transparent = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const drawing = canvas.getContext('2d');
      drawing.fillStyle = 'rgba(183, 135, 85, 0.5)';
      drawing.beginPath();
      drawing.arc(400, 300, 160, 0, Math.PI * 2);
      drawing.fill();
      return canvas.toDataURL('image/png');
    });
    await renderMarkdown(page, `# Transparent image review\n\n![Cover artwork](${transparent})\n\n![Second transparent image](${transparent})`);
    await expect(page.locator('.marktide-viewable-image')).toHaveCount(2);
    const html = await captureHtmlExport(page);
    const exported = await context.newPage();
    await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
    try {
      for (const width of [390, 1440]) {
        for (const surface of [page, exported]) {
          await surface.setViewportSize({ width, height: 844 });
          const image = surface.locator('.marktide-viewable-image').first();
          await surface.evaluate(() => {
            window.__imageMotionFrames = [];
            document.addEventListener('click', () => queueMicrotask(() => {
              const viewer = window.MarkTideImageViewer.viewer;
              if (!viewer) return;
              window.__imageMotionInitial = {
                type: viewer.options.showHideAnimationType,
                thumbnail: viewer.currSlide.data.msrc,
                source: viewer.currSlide.data.src,
                bounds: viewer.getThumbBounds(),
              };
              viewer.on('closingAnimationStart', () => { window.__imageClosingStarted = true; });
              function sample() {
                if (window.MarkTideImageViewer.viewer !== viewer) return;
                const placeholder = viewer.currSlide.getPlaceholderElement();
                window.__imageMotionFrames.push({
                  opening: viewer.opener.isOpening,
                  closing: viewer.opener.isClosing,
                  transform: getComputedStyle(viewer.currSlide.container).transform,
                  placeholderTag: placeholder?.tagName,
                  placeholderBackground: placeholder && getComputedStyle(placeholder).backgroundColor,
                  placeholderLoaded: placeholder instanceof HTMLImageElement && placeholder.complete && placeholder.naturalWidth > 0,
                });
                requestAnimationFrame(sample);
              }
              sample();
            }), { once: true });
          });
          await image.click();
          const initial = await surface.evaluate(() => window.__imageMotionInitial);
          expect(initial.type).toBe('zoom');
          expect(initial.thumbnail).toBe(initial.source);
          expect(initial.bounds.w).toBeGreaterThan(0);
          await expect.poll(() => surface.evaluate(() => window.MarkTideImageViewer.viewer?.opener.isOpen)).toBe(true);
          await expect(surface.locator('div.pswp__img--placeholder')).toHaveCount(0);
          const opening = await surface.evaluate(() => window.__imageMotionFrames.filter(frame => frame.opening));
          expect(opening.length).toBeGreaterThan(1);
          expect(opening.every(frame => frame.placeholderTag === 'IMG'
            && frame.placeholderBackground === 'rgba(0, 0, 0, 0)' && frame.placeholderLoaded)).toBe(true);
          expect(new Set(opening.map(frame => frame.transform)).size).toBeGreaterThan(1);
          expect(await surface.evaluate(async () => {
            const content = window.MarkTideImageViewer.viewer.currSlide.content;
            await content.element.decode();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const placeholder = content.placeholder?.element;
            return !placeholder || getComputedStyle(placeholder).visibility === 'hidden';
          })).toBe(true);
          await surface.getByRole('button', { name: 'Next image', exact: true }).click();
          await expect(surface.locator('.pswp__document-caption')).toHaveText('Second transparent image');
          await expect(surface.locator('div.pswp__img--placeholder')).toHaveCount(0);
          await surface.getByRole('button', { name: 'Close image viewer', exact: true }).click();
          await expect(surface.locator('.pswp')).toHaveCount(0);
          const closing = await surface.evaluate(() => window.__imageMotionFrames.filter(frame => frame.closing));
          expect(await surface.evaluate(() => window.__imageClosingStarted)).toBe(true);
          expect(closing.length).toBeGreaterThan(1);
          expect(new Set(closing.map(frame => frame.transform)).size).toBeGreaterThan(1);
          await expect(image).toBeFocused();
          // A quick Escape during opening still uses the normal closing path.
          await surface.evaluate(() => {
            window.__earlyImageClose = false;
            document.addEventListener('click', () => {
              const viewer = window.MarkTideImageViewer.viewer;
              viewer.on('closingAnimationStart', () => { window.__earlyImageClose = true; });
              viewer.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            }, { once: true });
          });
          await image.click();
          await expect(surface.locator('.pswp')).toHaveCount(0);
          expect(await surface.evaluate(() => window.__earlyImageClose)).toBe(true);
          await expect(image).toBeFocused();
        }
      }
    } finally { await exported.close(); }
  });
}
