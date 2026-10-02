const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');
const { caption, review, source } = require('../helpers/image-captions');

async function installImages(context) {
  await context.route('**/caption-test-image.svg', route => route.fulfill({
    contentType: 'image/svg+xml', body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#e8eff7"/></svg>',
  }));
  await context.route('**/caption-small-image.svg', route => route.fulfill({
    contentType: 'image/svg+xml', body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="#246"/></svg>',
  }));
  await context.route('https://img.shields.io/caption-test.svg', route => route.fulfill({
    contentType: 'image/svg+xml', body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"><rect width="100" height="20" fill="#246"/></svg>',
  }));
}

async function checkCaptions(page, selector = '.markdown-body') {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(selector => [...document.querySelectorAll(`${selector} img`)]
    .every(image => image.complete && image.naturalWidth > 0), selector);
  const article = page.locator(selector);
  const captions = article.locator('.marktide-image-caption');
  await expect(captions).toHaveText([
    caption, 'Figure 2. Authored HTML evidence.', 'Safe inline sized evidence.',
    'Fixed authored dimensions.', 'Small natural evidence.',
    'Styled image paragraph.',
    'Figure 10. Image in an authored wrapper.',
    '<script>window.__captionUnsafe = true</script>',
    'Figure 6. Caption before a separate quotation.',
    'Figure 8. Caption before separate prose.',
  ]);
  const metrics = await article.evaluate(article => {
    const style = getComputedStyle(article);
    const width = article.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const images = [...article.querySelectorAll('img')].map(image => {
      const bounds = image.getBoundingClientRect();
      return { alt: image.getAttribute('alt'), width: bounds.width, height: bounds.height,
        captioned: image.parentElement.classList.contains('marktide-image-figure') };
    });
    const captions = [...article.querySelectorAll('.marktide-image-caption')].map(caption => {
      const style = getComputedStyle(caption);
      const bounds = caption.getBoundingClientRect();
      const image = caption.parentElement.querySelector('img').getBoundingClientRect();
      return { style: style.fontStyle, align: style.textAlign, gap: bounds.top - image.bottom,
        width: bounds.width, ratio: parseFloat(style.fontSize) / parseFloat(getComputedStyle(caption.parentElement).fontSize) };
    });
    const quotes = [...article.querySelectorAll('blockquote')].map(quote => {
      const style = getComputedStyle(quote);
      return { border: style.borderLeft, color: style.color, padding: style.paddingLeft,
        margin: style.margin, captionParent: Boolean(quote.closest('figure')) };
    });
    return { images, captions, quotes, width, unsafeCount: article.querySelectorAll('script, [onerror]').length,
      authoredCaptionCount: article.querySelectorAll('#authored-figure figcaption').length };
  });
  expect(metrics.unsafeCount).toBe(0);
  expect(metrics.authoredCaptionCount).toBe(1);
  await expect(article.locator('#styled-image')).toHaveCSS('font-size', '18px');
  await expect(article.locator('#styled-image')).toHaveCSS('margin-bottom', '20px');
  await expect(article.locator('#authored-image-wrapper')).toHaveCSS('margin-top', '20px');
  const byAlt = alt => metrics.images.find(image => image.alt === alt);
  expect(byAlt('Figure 10. Image in an authored wrapper.').width).toBe(160);
  expect(byAlt(caption).width).toBeCloseTo(metrics.width * 0.85, 0);
  expect(byAlt('Figure 2. Authored HTML evidence.').width).toBeCloseTo(Math.min(500, metrics.width), 0);
  expect(byAlt('Safe inline sized evidence.').width).toBeCloseTo(Math.min(420, metrics.width), 0);
  expect(byAlt('Fixed authored dimensions.')).toMatchObject({ width: 240, height: 120 });
  expect(byAlt('Small natural evidence.')).toMatchObject({ width: 100, height: 50 });
  for (const alt of ['', 'image', 'Screenshot', null, 'Inline evidence', 'Inline HTML evidence',
    'Descriptive badge', 'Figure 3. Existing Markdown caption.', 'Alternative accessible text',
    'Figure 4. Visible heading already labels the evidence.', 'Inline authored caption',
    'Figure 5. Existing labelled caption.', 'Figure 7. Caption written above the image.',
    'Hidden evidence', 'Hidden wrapper evidence', 'PHOTO', 'Diagram 2', 'Picture']) {
    expect(byAlt(alt), `Image with alt ${alt}`).toBeDefined();
    expect(byAlt(alt).captioned, String(alt)).toBe(false);
  }
  metrics.captions.forEach(caption => {
    expect(caption.style).toBe('italic');
    expect(caption.align).toBe('center');
    expect(caption.gap).toBeGreaterThan(4);
    expect(caption.width).toBeLessThanOrEqual(metrics.width + 1);
    expect(caption.ratio).toBeCloseTo(0.9, 3);
  });
  metrics.quotes.forEach(quote => {
    expect(quote.captionParent).toBe(false);
    expect(quote.border).toBe('4px solid rgb(79, 195, 247)');
  });
  expect(await page.evaluate(() => window.__captionUnsafe)).toBeUndefined();
}

for (const theme of ['light', 'dark']) {
  test(`captions share safe rendering in ${theme} Preview and HTML`, async ({ page, context, baseURL }) => {
    await installStandaloneCdnMirror(context);
    await installImages(context);
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await renderMarkdown(page, source);
    await checkCaptions(page, '#markdown-preview');
    const repeated = await page.evaluate(() => {
      const renderer = window.MarkTideRenderer;
      const result = renderer.prepareRenderedHtml(document.getElementById('markdown-preview').innerHTML);
      const documentCopy = new DOMParser().parseFromString(result, 'text/html');
      return documentCopy.querySelectorAll('.marktide-image-caption').length;
    });
    expect(repeated).toBe(10);
    const quoteStyles = await page.locator('#markdown-preview blockquote').first().evaluate(quote => {
      const style = getComputedStyle(quote);
      return [style.color, style.borderLeft, style.paddingLeft, style.margin];
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await checkCaptions(page, '#markdown-preview');
    const html = await captureHtmlExport(page);
    const exported = await context.newPage();
    try {
      await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
      await checkCaptions(exported);
      expect(await exported.locator('blockquote').first().evaluate(quote => {
        const style = getComputedStyle(quote);
        return [style.color, style.borderLeft, style.paddingLeft, style.margin];
      })).toEqual(quoteStyles);
      await exported.setViewportSize({ width: 390, height: 844 });
      await checkCaptions(exported);
    } finally {
      await exported.close();
    }
  });
}

test('PDF captions retain authored sizes, separate quotes and searchable caption text', async ({ page, context, baseURL }, testInfo) => {
  await installImages(context);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, source);
  const prepared = await capturePdfPreparation(page, 'Caption regression', { includeDocumentHtml: true });
  const printed = await context.newPage();
  try {
    await printed.setViewportSize({ width: 709, height: 1018 });
    await printed.emulateMedia({ media: 'print' });
    await printed.setContent(prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`));
    await checkCaptions(printed);
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    await testInfo.attach('captions.pdf', { body: pdf, contentType: 'application/pdf' });
    const probe = spawnSync('pdftotext', ['-v']);
    if (probe.error?.code !== 'ENOENT') {
      const text = spawnSync('pdftotext', ['-', '-'], { input: pdf, encoding: 'utf8' });
      expect(text.status).toBe(0);
      expect(text.stdout).toContain(caption);
      expect(text.stdout.match(/Figure 2\. Authored HTML evidence\./g)).toHaveLength(1);
      expect(text.stdout).toContain('Author written caption');
    }
  } finally {
    await printed.close();
  }
});

test('caption reference exports keep each image with its caption', async ({ page, context, baseURL }, testInfo) => {
  await installImages(context);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, review);
  const prepared = await capturePdfPreparation(page, 'Caption review', { includeDocumentHtml: true });
  const printed = await context.newPage();
  try {
    await printed.setViewportSize({ width: 709, height: 1018 });
    await printed.emulateMedia({ media: 'print' });
    await printed.setContent(prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`));
    await printed.evaluate(() => document.fonts.ready);
    await printed.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true,
      path: process.env.MARKTIDE_CAPTION_REVIEW_PDF || undefined });
    await testInfo.attach('caption-review.pdf', { body: pdf, contentType: 'application/pdf' });
    const text = spawnSync('pdftotext', ['-', '-'], { input: pdf, encoding: 'utf8' });
    if (!text.error) {
      expect(text.status).toBe(0);
      const pages = text.stdout.split('\f').filter(text => text.trim());
      expect(pages[0]).toContain(caption);
      expect(pages.join('')).toContain('Figure 2. Authored HTML evidence.');
    }
  } finally {
    await printed.close();
  }
});

test('PDF page breaks keep a fitting image and its caption together', async ({ page, context, baseURL }) => {
  const probe = spawnSync('pdfimages', ['-v']);
  test.skip(probe.error?.code === 'ENOENT', 'Install Poppler pdfimages to check image page boundaries');
  await installImages(context);
  await page.goto('/index.html');
  await waitForMarkTide(page);
  // A raster image lets Poppler report which page contains the picture.
  const raster = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';
  await renderMarkdown(page, `<div style="height:800px">Page one content</div>\n\n<img src="${raster}" alt="Figure 9. Image and caption stay together." width="500" height="300">`);
  const prepared = await capturePdfPreparation(page, 'Caption boundary', { includeDocumentHtml: true });
  const printed = await context.newPage();
  try {
    await printed.emulateMedia({ media: 'print' });
    await printed.setContent(prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`));
    await printed.evaluate(() => document.fonts.ready);
    await printed.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth));
    const pdf = await printed.pdf({ preferCSSPageSize: true, printBackground: true });
    const extracted = spawnSync('pdftotext', ['-', '-'], { input: pdf, encoding: 'utf8' });
    expect(extracted.status).toBe(0);
    const pages = extracted.stdout.split('\f').filter(text => text.trim());
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain('Page one content');
    expect(pages[0]).not.toContain('Figure 9.');
    expect(pages[1]).toContain('Figure 9. Image and caption stay together.');
    const images = spawnSync('pdfimages', ['-list', '-'], { input: pdf, encoding: 'utf8' });
    expect(images.status).toBe(0);
    const imagePages = [...images.stdout.matchAll(/^\s*(\d+)\s+\d+\s+image\s/gm)].map(match => Number(match[1]));
    expect(imagePages).toEqual([2]);
  } finally {
    await printed.close();
  }
});
