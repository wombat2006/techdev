#!/usr/bin/env node
/**
 * TechSapo 提案 PPTX
 *
 * Pipeline: slide-data → Satori (flexbox, tech theme) → PNG → pptxgenjs
 * HTML/CSS (slides/theme.css) はプレビュー用。レイアウト定義は satori-renderer と同期。
 *
 * Usage: node generate-proposal-pptx.mjs
 * Output: ../../docs/proposals/TechSapo_Wall_Bounce_Proposal.pptx
 */

import pptxgen from 'pptxgenjs';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SLIDES } from './slide-data.mjs';
import { slideToHtml } from './html-builder.mjs';
import { renderSlideToPng } from './satori-renderer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '../../docs/proposals/TechSapo_Wall_Bounce_Proposal.pptx');
const TMP_DIR = join(__dirname, '.tmp/render');

const FONT_PATH = join(__dirname, 'fonts/NotoSansJP-Regular.otf');

function ensureFont() {
  if (existsSync(FONT_PATH)) return;
  mkdirSync(join(__dirname, 'fonts'), { recursive: true });
  console.log('Downloading Noto Sans JP font (first run)...');
  execSync(
    `curl -fsSL -o "${FONT_PATH}" "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf"`,
    { stdio: 'inherit' },
  );
}

async function main() {
  ensureFont();
  mkdirSync(TMP_DIR, { recursive: true });

  console.log('Rendering slides (Satori → PNG)...');
  const pngPaths = [];

  for (let i = 0; i < SLIDES.length; i++) {
    const n = String(i + 1).padStart(2, '0');
    const pngPath = join(TMP_DIR, `slide-${n}.png`);
    const htmlPath = join(TMP_DIR, `slide-${n}.html`);

    const png = await renderSlideToPng(SLIDES[i]);
    writeFileSync(pngPath, png);
    writeFileSync(htmlPath, slideToHtml(SLIDES[i]), 'utf-8');

    pngPaths.push(pngPath);
    console.log(`  slide ${i + 1}/${SLIDES.length}`);
  }

  console.log('Building PPTX...');
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'TechSapo Development Team';
  pres.title = 'TechSapo Wall-Bounce Platform Proposal';
  pres.subject = 'AI Orchestration Platform Technical Proposal';

  for (const pngPath of pngPaths) {
    const slide = pres.addSlide();
    slide.addImage({
      path: pngPath,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      sizing: { type: 'cover', w: '100%', h: '100%' },
    });
  }

  await pres.writeFile({ fileName: OUT_PATH });

  console.log(`Generated: ${OUT_PATH}`);
  console.log(`Slides: ${pngPaths.length}  |  Pipeline: slide-data → Satori → PNG → PPTX`);
  console.log(`Preview: ${TMP_DIR}/slide-*.html / slide-*.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
