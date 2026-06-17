import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FOOTER } from './slide-data.mjs';
import { TYPE, SPACE } from './typography.mjs';
import { renderFlowchart } from './flowchart-renderer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT = readFileSync(join(__dirname, 'fonts/NotoSansJP-Regular.otf'));
const W = 1920;
const H = 1080;
const FONT_FAMILY = 'Noto Sans JP';

const COLORS = {
  primary: '#1A365D',
  accent: '#2B6CB0',
  light: '#F7FAFC',
  text: '#2D3748',
  muted: '#718096',
  border: '#E2E8F0',
  white: '#FFFFFF',
  sky: '#4299E1',
  pale: '#E2E8F0',
};

const fonts = [{ name: FONT_FAMILY, data: FONT, weight: 400, style: 'normal' }];

function sanitize(s) {
  return String(s)
    .replace(/✅/g, '[OK]')
    .replace(/❌/g, '[NG]')
    .replace(/⚠️/g, '[!]');
}

function el(type, props, ...children) {
  const flat = children.flat().filter((c) => c !== null && c !== false && c !== '');
  return {
    type,
    props: {
      ...props,
      children: flat.length <= 1 ? flat[0] ?? null : flat,
    },
  };
}

function slideBase(style, ...children) {
  return el('div', {
    style: {
      width: W,
      height: H,
      display: 'flex',
      flexDirection: 'column',
      padding: SPACE.slidePad,
      position: 'relative',
      ...style,
    },
  }, ...children);
}

function footerBar(mutedColor = COLORS.muted) {
  return el('div', {
    style: {
      flexShrink: 0,
      marginTop: 'auto',
      paddingTop: SPACE.footerPadTop,
      minHeight: SPACE.footerMinH,
      borderTop: `1px solid ${COLORS.border}`,
      fontSize: TYPE.footer,
      lineHeight: 1.35,
      color: mutedColor,
      fontFamily: FONT_FAMILY,
      display: 'flex',
      alignItems: 'center',
    },
  }, FOOTER);
}

function bodyWrap(...children) {
  return el('div', {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      overflow: 'hidden',
    },
  }, ...children);
}

function head(title) {
  return el('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      marginBottom: SPACE.headGap,
      paddingBottom: 14,
      borderBottom: `3px solid ${COLORS.border}`,
    },
  }, el('div', {
    style: {
      fontSize: TYPE.slideTitle,
      fontWeight: 700,
      color: COLORS.primary,
      fontFamily: FONT_FAMILY,
      lineHeight: 1.25,
    },
  }, sanitize(title)));
}

function tCell(cell, ci, ri) {
  const bgFirst = ri % 2 ? COLORS.border : '#EDF2F7';
  return el('div', {
    style: {
      flex: ci === 0 ? 0.9 : 1,
      padding: '14px 18px',
      fontSize: TYPE.table,
      lineHeight: 1.45,
      fontFamily: FONT_FAMILY,
      color: COLORS.text,
      fontWeight: ci === 0 ? 600 : 400,
      backgroundColor: ci === 0 ? bgFirst : ri % 2 ? COLORS.light : COLORS.white,
      borderBottom: `1px solid ${COLORS.border}`,
    },
  }, sanitize(cell));
}

function bullets(items, size = TYPE.body) {
  const dotTop = Math.round(size * 0.45);
  return el('div', { style: { display: 'flex', flexDirection: 'column' } },
    ...items.map((t) => el('div', {
      style: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACE.bulletGap,
      },
    }, [
      el('div', {
        style: {
          width: SPACE.bulletDot,
          height: SPACE.bulletDot,
          borderRadius: SPACE.bulletDot / 2,
          backgroundColor: COLORS.accent,
          marginTop: dotTop,
          marginRight: 20,
          flexShrink: 0,
        },
      }),
      el('div', {
        style: {
          fontSize: size,
          lineHeight: 1.5,
          color: COLORS.text,
          fontFamily: FONT_FAMILY,
          flex: 1,
        },
      }, sanitize(t)),
    ])),
  );
}

function slideNote(noteText) {
  return el('div', {
    style: {
      marginTop: 24,
      paddingTop: 18,
      borderTop: `1px solid ${COLORS.border}`,
      fontSize: TYPE.caption,
      color: COLORS.muted,
      fontStyle: 'italic',
      lineHeight: 1.45,
      fontFamily: FONT_FAMILY,
    },
  }, sanitize(noteText));
}

export function slideToTree(slide) {
  switch (slide.type) {
    case 'title':
      return slideBase({
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        justifyContent: 'center',
        paddingBottom: 100,
      }, [
        el('div', { style: { fontSize: TYPE.eyebrow, color: COLORS.sky, marginBottom: 20, fontFamily: FONT_FAMILY } }, slide.eyebrow),
        el('div', { style: { fontSize: TYPE.display, fontWeight: 700, lineHeight: 1.15, color: COLORS.white, marginBottom: 32, fontFamily: FONT_FAMILY } }, slide.title),
        el('div', { style: { fontSize: TYPE.subtitle, lineHeight: 1.55, color: COLORS.pale, maxWidth: 1300, fontFamily: FONT_FAMILY } }, slide.subtitle),
        el('div', { style: { marginTop: 'auto', fontSize: TYPE.meta, color: COLORS.sky, fontFamily: FONT_FAMILY } }, slide.meta),
      ]);

    case 'section':
      return slideBase({
        backgroundColor: COLORS.accent,
        color: COLORS.white,
        justifyContent: 'center',
        paddingLeft: 96,
      }, [
        el('div', { style: { fontSize: TYPE.section, fontWeight: 700, lineHeight: 1.2, color: COLORS.white, fontFamily: FONT_FAMILY } }, slide.title),
        slide.subtitle
          ? el('div', { style: { marginTop: 24, fontSize: TYPE.subtitle, color: COLORS.pale, fontFamily: FONT_FAMILY } }, slide.subtitle)
          : null,
      ]);

    case 'content': {
      const bg = slide.theme === 'light' ? COLORS.light : COLORS.white;
      return slideBase({ backgroundColor: bg, color: COLORS.text }, [
        head(slide.title),
        bodyWrap(
          el('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' } }, [
            bullets(slide.bullets),
            slide.note ? slideNote(slide.note) : null,
          ]),
        ),
        footerBar(),
      ]);
    }

    case 'two-col':
      return slideBase({ backgroundColor: COLORS.white, color: COLORS.text }, [
        head(slide.title),
        bodyWrap(
          el('div', { style: { display: 'flex', flexDirection: 'row', gap: 40, flex: 1, minHeight: 0 } }, [
            el('div', { style: { flex: 1, display: 'flex', flexDirection: 'column' } }, [
              el('div', { style: { fontSize: TYPE.h3, fontWeight: 700, color: COLORS.accent, marginBottom: 16, fontFamily: FONT_FAMILY } }, slide.leftTitle),
              bullets(slide.left, TYPE.bodySm),
            ]),
            el('div', { style: { flex: 1, display: 'flex', flexDirection: 'column' } }, [
              el('div', { style: { fontSize: TYPE.h3, fontWeight: 700, color: COLORS.accent, marginBottom: 16, fontFamily: FONT_FAMILY } }, slide.rightTitle),
              bullets(slide.right, TYPE.bodySm),
            ]),
          ]),
        ),
        footerBar(),
      ]);

    case 'table': {
      const th = slide.headers.map((h) =>
        el('div', {
          style: {
            flex: 1,
            backgroundColor: COLORS.primary,
            color: COLORS.white,
            padding: '14px 18px',
            fontSize: TYPE.tableHead,
            fontWeight: 600,
            fontFamily: FONT_FAMILY,
          },
        }, sanitize(h)),
      );
      const rows = slide.rows.map((row, ri) =>
        el('div', { style: { display: 'flex', flexDirection: 'row' } },
          ...row.map((cell, ci) => tCell(cell, ci, ri)),
        ),
      );
      return slideBase({ backgroundColor: COLORS.white }, [
        head(slide.title),
        bodyWrap(
          el('div', { style: { display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden' } }, [
            el('div', { style: { display: 'flex', flexDirection: 'row' } }, th),
            ...rows,
          ]),
        ),
        footerBar(),
      ]);
    }

    case 'flowchart':
      return slideBase({ backgroundColor: COLORS.white, color: COLORS.text }, [
        head(slide.title),
        bodyWrap(
          el('div', {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: '100%',
              minHeight: 0,
              overflow: 'hidden',
            },
          }, renderFlowchart(slide.variant)),
          slide.note ? slideNote(slide.note) : null,
        ),
        footerBar(),
      ]);

    case 'closing':
      return slideBase({
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }, [
        el('div', { style: { fontSize: TYPE.closingTitle, fontWeight: 700, color: COLORS.white, marginBottom: 24, fontFamily: FONT_FAMILY } }, slide.title),
        el('div', { style: { fontSize: TYPE.closingTag, color: COLORS.sky, maxWidth: 1000, lineHeight: 1.45, marginBottom: 28, fontFamily: FONT_FAMILY } }, slide.tagline),
        el('div', { style: { fontSize: TYPE.closingTeam, color: 'rgba(255,255,255,0.55)', fontFamily: FONT_FAMILY } }, slide.team),
      ]);

    default:
      throw new Error(`Unknown slide type: ${slide.type}`);
  }
}

export async function renderSlideToPng(slide) {
  const tree = slideToTree(slide);
  const svg = await satori(tree, { width: W, height: H, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } });
  return resvg.render().asPng();
}

export async function renderAllSlides(slides) {
  const buffers = [];
  for (const slide of slides) {
    buffers.push(await renderSlideToPng(slide));
  }
  return buffers;
}
