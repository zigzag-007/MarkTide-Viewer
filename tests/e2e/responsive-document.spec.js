const { test, expect } = require('playwright/test');
const { source } = require('../helpers/responsive-document');
const { captureHtmlExport, capturePdfPreparation } = require('../helpers/export-capture');
const { renderMarkdown, setTheme, waitForMarkTide } = require('../helpers/marktide-page');
const { installStandaloneCdnMirror } = require('../helpers/standalone-cdn-mirror');

async function setup(page, context) {
  await installStandaloneCdnMirror(context);
  await context.route('**/responsive-image.svg', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"><rect width="1000" height="500" fill="#e8eff7"/></svg>',
  }));
  await page.goto('/index.html');
  await waitForMarkTide(page);
  await renderMarkdown(page, source);
}

async function metrics(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const animations = document.querySelector('.markdown-body').getAnimations({ subtree: true })
      .filter(animation => Number.isFinite(animation.effect.getTiming().iterations));
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  });
  return page.locator('.markdown-body').evaluate(article => {
    const style = getComputedStyle(article);
    const bounds = article.getBoundingClientRect();
    const contentWidth = bounds.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const pick = element => {
      const css = getComputedStyle(element);
      return Object.fromEntries(['fontSize', 'fontFamily', 'lineHeight', 'fontWeight', 'color',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom',
        'borderBottom', 'borderLeft'].map(key => [key, css[key]]));
    };
    const clippedText = [...article.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote')]
      .filter(element => !element.closest('table,pre,.mermaid'))
      .flatMap(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].filter(rect => rect.width > 0
          && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1));
      }).length;
    return { width: bounds.width, contentWidth, padding: style.padding, fontSize: style.fontSize,
      clippedText,
      heads: [...article.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(pick),
      text: [...article.querySelectorAll('p,li,blockquote,a,code:not(pre code)')].map(pick),
      overflow: article.scrollWidth - article.clientWidth,
      authoredHeading: pick(article.querySelector('#authored-heading')),
      authoredParagraph: pick(article.querySelector('#authored-paragraph')),
      code: pick(article.querySelector('pre code')), table: pick(article.querySelector('td')),
      images: [...article.querySelectorAll('img')].map(image => ({ width: image.getBoundingClientRect().width,
        height: image.getBoundingClientRect().height, cap: getComputedStyle(image).maxWidth })),
      captions: [...article.querySelectorAll('figcaption')].map(pick),
      headingHeight: article.querySelector('h1').getBoundingClientRect().height,
      textHeight: [...article.querySelectorAll('p,li,blockquote')].map(element => element.getBoundingClientRect().height),
      containerWidth: article.parentElement.clientWidth - parseFloat(getComputedStyle(article.parentElement).paddingLeft)
        - parseFloat(getComputedStyle(article.parentElement).paddingRight),
    };
  });
}

function assertDocument(current) {
  const compact = current.containerWidth <= 600;
  expect(current.fontSize).toBe(compact ? '16px' : '16.8px');
  const font = parseFloat(current.fontSize);
  const ratios = compact ? [1.65,1.4,1.2,1.05,1,0.95]
    : current.containerWidth <= 800 ? [2,1.5,1.25,1,0.875,0.85] : [2.1,1.7,1.4,1,0.875,0.85];
  current.heads.slice(0,6).forEach((heading,index) => {
    expect(parseFloat(heading.fontSize)).toBeCloseTo(font * ratios[index], 3);
    expect(heading.fontWeight).toBe('900');
    expect(parseFloat(heading.lineHeight) / parseFloat(heading.fontSize)).toBeCloseTo(1.25, 3);
    if (index < 2) {
      expect(parseFloat(heading.paddingBottom) / parseFloat(heading.fontSize)).toBeCloseTo(0.2, 3);
      expect(heading.borderBottom).toContain('1px solid');
    }
  });
  expect(current.authoredHeading.fontSize).toBe('25px');
  expect(current.authoredHeading.color).toBe('rgb(18, 52, 86)');
  expect(current.authoredParagraph.fontSize).toBe('19px');
  expect(current.authoredParagraph.fontFamily).toBe('Georgia');
  expect(current.overflow).toBeLessThanOrEqual(1);
  expect(current.clippedText).toBe(0);
  expect(current.images[0].width).toBeCloseTo(current.contentWidth * 0.85,0);
  expect(current.images[0].width / current.images[0].height).toBeCloseTo(2,3);
  expect(current.images[1].width).toBe(180);
  expect(current.table.paddingLeft).toBe('13px');
  expect(current.table.paddingTop).toBe('6px');
  current.captions.forEach(caption => expect(parseFloat(caption.fontSize) / font).toBeCloseTo(0.9,3));
}

for (const theme of ['light','dark']) {
  test(`shared responsive text matches fresh HTML at equal widths in ${theme}`, async ({ page, context, baseURL }, testInfo) => {
    test.setTimeout(120_000);
    await setup(page, context);
    await setTheme(page, theme);
    await page.evaluate(() => window.MarkTideViewManager.setView('preview-only'));
    const html = await captureHtmlExport(page);
    const exported = await context.newPage();
    try {
      await exported.setContent(html.replace('<head>', `<head><base href="${baseURL}/">`));
      for (const width of [320,390,430,768,1024,1440]) {
        await page.setViewportSize({ width, height: 1024 });
        const current = await metrics(page);
        assertDocument(current);
        const padding = current.containerWidth <= 600 ? 16 : current.containerWidth <= 800 ? 20 : 45;
        expect(parseFloat(current.padding.split(' ')[1] || current.padding)).toBe(padding);
        await exported.setViewportSize({ width: Math.round(current.width), height: 1024 });
        await exported.evaluate(width => { document.body.style.width = `${width}px`; }, current.width);
        const fresh = await metrics(exported);
        assertDocument(fresh);
        expect(fresh.contentWidth).toBeCloseTo(current.contentWidth,0);
        expect(fresh.heads).toEqual(current.heads);
        expect(fresh.text).toEqual(current.text);
        fresh.textHeight.forEach((height,index) => expect(height).toBeCloseTo(current.textHeight[index],0));
        if (width === 1440) {
          expect(current.width).toBe(920);
          expect(current.contentWidth).toBe(830);
          expect(current.heads[0].fontSize).toBe('35.28px');
          expect(current.heads[1].fontSize).toBe('28.56px');
        }
        if (width === 390 || width === 768) {
          await testInfo.attach(`preview-${theme}-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
          await testInfo.attach(`html-${theme}-${width}`, { body: await exported.screenshot(), contentType: 'image/png' });
        }
      }
      await page.setViewportSize({width:1100,height:900});
      await page.evaluate(() => window.MarkTideViewManager.setView('split'));
      const split = await metrics(page);
      assertDocument(split);
      expect(split.fontSize).toBe('16px');
      await exported.setViewportSize({width:Math.round(split.width),height:900});
      await exported.evaluate(width => { document.body.style.width = `${width}px`; }, split.width);
      const fresh = await metrics(exported);
      expect(fresh.heads).toEqual(split.heads);
      expect(fresh.text).toEqual(split.text);
      expect(fresh.contentWidth).toBeCloseTo(split.contentWidth,0);
      if (theme === 'light' && process.env.MARKTIDE_RESPONSIVE_REVIEW_HTML) {
        await renderMarkdown(page, source.split('![Figure 1.')[0]);
        const review = await captureHtmlExport(page);
        require('node:fs').writeFileSync(process.env.MARKTIDE_RESPONSIVE_REVIEW_HTML, review);
      }
    } finally { await exported.close(); }
  });
}

test('screen rules do not change PDF typography or print geometry', async ({page,context,baseURL}) => {
  await setup(page,context);
  const prepared = await capturePdfPreparation(page,'Responsive print check',{includeDocumentHtml:true});
  const printed = await context.newPage();
  try {
    await printed.emulateMedia({media:'print'});
    await printed.setContent(prepared.documentHtml.replace('<head>', `<head><base href="${baseURL}/">`));
    const current = await metrics(printed);
    expect(current.fontSize).toBe('14.7px');
    expect(current.padding).toBe('6px');
    expect(current.heads.slice(0,6).map(h=>h.fontSize)).toEqual(['29.4px','22.05px','18.375px','14.7px','12.8625px','12.495px']);
    const before = await printed.pdf({preferCSSPageSize:true,printBackground:true});
    await printed.evaluate(() => {
      for (const sheet of document.styleSheets) {
        if (sheet.ownerNode.tagName !== 'STYLE') continue;
        for (let index=sheet.cssRules.length-1;index>=0;index-=1) {
          const rule=sheet.cssRules[index];
          if (rule.media?.mediaText.startsWith('screen')) sheet.deleteRule(index);
        }
      }
    });
    expect(await metrics(printed)).toEqual(current);
    const after = await printed.pdf({preferCSSPageSize:true,printBackground:true});
    const {spawnSync}=require('node:child_process');
    const beforeText=spawnSync('pdftotext',['-bbox','-','-'],{input:before,encoding:'utf8'});
    const afterText=spawnSync('pdftotext',['-bbox','-','-'],{input:after,encoding:'utf8'});
    expect(beforeText.status).toBe(0);
    expect(afterText.status).toBe(0);
    const geometry=text=>text.replace(/<head>[\s\S]*?<\/head>/,'');
    expect(geometry(afterText.stdout)).toBe(geometry(beforeText.stdout));
  } finally {await printed.close();}
});
