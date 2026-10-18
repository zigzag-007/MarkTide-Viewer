const { test, expect } = require('playwright/test');
const { spawnSync } = require('node:child_process');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

const imageUrl = '/test-document-image.svg';
const screenshotUrl = process.env.MARKTIDE_STYLES_REVIEW_IMAGE || imageUrl;
const markdown = `![Default screenshot](${screenshotUrl})

# Document style regression

## Heading divider

Body text remains searchable with the same paragraph spacing.

- List text uses the shared line spacing.

<img src="${imageUrl}" alt="Authored width" width="500">

<img src="${imageUrl}" alt="Authored style" style="width:420px">

<img src="${imageUrl}" alt="Authored dimensions" width="240" height="120">

<img src="${imageUrl}" alt="Small image" width="100">

<img src="${imageUrl}" alt="Styled default" style="border:1px solid red">

<img src="/test-small-image.svg" alt="Default small image">

Inline <img src="${imageUrl}" alt="Inline image" width="24"> stays inline.

![Badge](https://img.shields.io/test-document-badge.svg)

| Name | Value |
| --- | --- |
| Ordinary table | Same font and cell spacing |

\`\`\`js
const unchangedCode = true;
\`\`\`
`;

async function installImages(context) {
  await context.route('**/test-document-image.svg', route => {
    return route.fulfill({ contentType: 'image/svg+xml', body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800"><rect width="1600" height="800" fill="#e8eff7"/><text x="80" y="140" font-size="64">Screenshot layout test</text></svg>' });
  });
  await context.route('**/test-small-image.svg', route => route.fulfill({
    contentType: 'image/svg+xml', body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="#246"/></svg>',
  }));
  await context.route('https://img.shields.io/test-document-badge.svg', route => route.fulfill({
    contentType: 'image/svg+xml', body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"><rect width="100" height="20" fill="#246"/></svg>',
  }));
}

async function metricsFor(documentPage) {
  await documentPage.evaluate(() => document.fonts.ready);
  await documentPage.waitForFunction(() => [...document.querySelectorAll('.markdown-body img')]
    .every(image => image.complete && image.naturalWidth > 0));
  return documentPage.locator('.markdown-body').evaluate(article => {
    const style = getComputedStyle(article);
    const contentWidth = article.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    const lineRatio = element => {
      const css = getComputedStyle(element);
      return parseFloat(css.lineHeight) / parseFloat(css.fontSize);
    };
    const headings = [...article.querySelectorAll('h1, h2')].map(heading => {
      const css = getComputedStyle(heading);
      return { paddingRatio: parseFloat(css.paddingBottom) / parseFloat(css.fontSize),
        marginBottom: css.marginBottom, border: css.borderBottom, fontSize: css.fontSize };
    });
    const paragraph = [...article.querySelectorAll('p')].find(p => p.textContent.includes('Body text'));
    const paragraphStyle = getComputedStyle(paragraph);
    const images = Object.fromEntries([...article.querySelectorAll('img')].map(image => {
      const bounds = image.getBoundingClientRect();
      const parent = image.parentElement.getBoundingClientRect();
      const parentStyle = getComputedStyle(image.parentElement);
      const imageStyle = getComputedStyle(image);
      const left = parent.left + parseFloat(parentStyle.paddingLeft);
      const right = parent.right - parseFloat(parentStyle.paddingRight);
      return [image.alt, { width: bounds.width, height: bounds.height,
        naturalRatio: image.naturalWidth / image.naturalHeight,
        contentRatio: (bounds.width - parseFloat(imageStyle.borderLeftWidth) - parseFloat(imageStyle.borderRightWidth))
          / (bounds.height - parseFloat(imageStyle.borderTopWidth) - parseFloat(imageStyle.borderBottomWidth)),
        centerError: Math.abs((bounds.left - left) - (right - bounds.right)),
        defaultSize: image.classList.contains('marktide-default-image'),
        display: getComputedStyle(image).display }];
    }));
    return { contentWidth, articleRatio: lineRatio(article), paragraphRatio: lineRatio(paragraph),
      listRatio: lineRatio(article.querySelector('li')), headings, images,
      paragraph: { marginTop: paragraphStyle.marginTop, marginBottom: paragraphStyle.marginBottom,
        fontSize: paragraphStyle.fontSize },
      codeRatio: lineRatio(article.querySelector('pre')),
      tablePadding: getComputedStyle(article.querySelector('td')).padding };
  });
}

function assertStyles(metrics, print = false) {
  for (const key of ['articleRatio', 'paragraphRatio', 'listRatio']) {
    expect(metrics[key]).toBeCloseTo(1.4, 4);
  }
  metrics.headings.forEach(heading => {
    expect(heading.paddingRatio).toBeCloseTo(0.2, 4);
    expect(heading.marginBottom).toBe(print ? '14px' : '16px');
    expect(heading.border).toContain('1px solid');
  });
  expect(metrics.paragraph.marginTop).toBe('0px');
  expect(metrics.paragraph.marginBottom).toBe('16px');
  expect(metrics.codeRatio).toBeCloseTo(1.45, 4);
  for (const alt of ['Default screenshot', 'Styled default']) {
    const image = metrics.images[alt];
    expect(image.defaultSize).toBe(true);
    expect(image.width).toBeCloseTo(metrics.contentWidth * 0.85, 0);
    expect(image.contentRatio).toBeCloseTo(image.naturalRatio, 2);
    expect(image.centerError).toBeLessThan(1);
  }
  for (const [alt, width] of [['Authored width', 500], ['Authored style', 420],
    ['Authored dimensions', 240], ['Small image', 100]]) {
    expect(metrics.images[alt].defaultSize).toBe(false);
    expect(metrics.images[alt].width).toBeCloseTo(Math.min(width, metrics.contentWidth), 0);
    expect(metrics.images[alt].centerError).toBeLessThan(1);
  }
  expect(metrics.images['Authored dimensions'].height).toBe(120);
  expect(metrics.images['Inline image'].display).toBe('inline');
  expect(metrics.images['Inline image'].width).toBe(24);
  expect(metrics.images.Badge.defaultSize).toBe(false);
  expect(metrics.images.Badge.width).toBe(100);
  expect(metrics.images['Default small image'].width).toBe(100);
}

for (const theme of ['light', 'dark']) {
  test(`shared document styles reach Preview and standalone HTML in ${theme}`, async ({ page, context, baseURL }) => {
    await installStandaloneCdnMirror(context);
    await installImages(context);
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await setTheme(page, theme);
    await renderMarkdown(page, markdown);
    const preview = await metricsFor(page);
    assertStyles(preview);
    const oldStyles = await page.addStyleTag({ content: `
      .markdown-body { line-height: 1.7; }
      .markdown-body h1, .markdown-body h2 { padding-bottom: 0.3em; }
    ` });
    const baseline = await metricsFor(page);
    expect(preview.paragraph).toEqual(baseline.paragraph);
    expect(preview.tablePadding).toBe(baseline.tablePadding);
    preview.headings.forEach((heading, index) => {
      expect(heading.fontSize).toBe(baseline.headings[index].fontSize);
      expect(heading.border).toBe(baseline.headings[index].border);
    });
    await oldStyles.evaluate(style => style.remove());
    await page.evaluate(() => document.body.classList.add('preview-only-active'));
    assertStyles(await metricsFor(page));
    await page.setViewportSize({ width: 390, height: 844 });
    assertStyles(await metricsFor(page));

    const html = await captureHtmlExport(page);
    const htmlPage = await context.newPage();
    try {
      await htmlPage.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`), { waitUntil: 'load' });
      assertStyles(await metricsFor(htmlPage));
      await htmlPage.setViewportSize({ width: 390, height: 844 });
      assertStyles(await metricsFor(htmlPage));
    } finally {
      await htmlPage.close();
    }
  });
}

for (const previewWidth of [1280, 390]) {
  test(`PDF uses shared image sizing and spacing with searchable text from ${previewWidth}px Preview`, async ({ page, context, baseURL }, testInfo) => {
    await page.setViewportSize({ width: previewWidth, height: 844 });
    await installImages(context);
    await page.goto('/index.html');
    await waitForMarkTide(page);
    await renderMarkdown(page, markdown);
    const prepared = await capturePdfPreparation(page, 'Document styles', { includeDocumentHtml: true });
    const printPage = await context.newPage();
    try {
      await printPage.setViewportSize({ width: 709, height: 1018 });
      await printPage.emulateMedia({ media: 'print' });
      await printPage.setContent(prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`));
      const metrics = await metricsFor(printPage);
      assertStyles(metrics, true);
      expect(metrics.paragraph.fontSize).toBe('14.7px');
      expect(metrics.tablePadding).toBe('6px 12px');
      const pdf = await printPage.pdf({ preferCSSPageSize: true, printBackground: true,
        path: process.env.MARKTIDE_STYLES_REVIEW_PDF || undefined });
      await testInfo.attach('document-styles.pdf', { body: pdf, contentType: 'application/pdf' });
      const probe = spawnSync('pdftotext', ['-v']);
      if (probe.error?.code !== 'ENOENT') {
        expect(probe.status).toBe(0);
        const text = spawnSync('pdftotext', ['-', '-'], { input: pdf, encoding: 'utf8' });
        expect(text.status).toBe(0);
        expect(text.stdout).toContain('Document style regression');
        expect(text.stdout).toContain('Body text remains searchable with the same paragraph spacing.');
      }
    } finally {
      await printPage.close();
    }
  });
}
