import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FOOTER } from './slide-data.mjs';
import { TYPE, SPACE } from './typography.mjs';
import { renderFlowchart } from './flowchart-renderer.mjs';
import { COLORS } from './theme-tech.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT = readFileSync(join(__dirname, 'fonts/NotoSansJP-Regular.otf'));
const W = 1920;
const H = 1080;
const FONT_FAMILY = 'Noto Sans JP';

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
      backgroundColor: COLORS.bg,
      ...style,
    },
  }, ...children);
}

function chromeBar(label = 'techsapo — wall-bounce-proposal') {
  return el('div', {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 44,
      backgroundColor: COLORS.bgElevated,
      borderBottom: `1px solid ${COLORS.border}`,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 64,
      paddingRight: 64,
    },
  }, [
    el('div', { style: { display: 'flex', flexDirection: 'row', marginRight: 16 } }, [
      el('div', { style: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.dotRed, marginRight: 8 } }),
      el('div', { style: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.dotYellow, marginRight: 8 } }),
      el('div', { style: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.dotGreen } }),
    ]),
    el('div', {
      style: { fontSize: 18, color: COLORS.muted, fontFamily: FONT_FAMILY },
    }, label),
  ]);
}

function footerBar() {
  return el('div', {
    style: {
      flexShrink: 0,
      marginTop: 'auto',
      paddingTop: SPACE.footerPadTop,
      minHeight: SPACE.footerMinH,
      borderTop: `1px solid ${COLORS.border}`,
      fontSize: TYPE.footer,
      lineHeight: 1.35,
      color: COLORS.accent,
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
      paddingTop: 8,
    },
  }, ...children);
}

function head(title) {
  return el('div', {
    style: {
      display: 'flex',
      flexDirection: 'row',
      flexShrink: 0,
      marginBottom: SPACE.headGap,
      paddingBottom: 14,
      borderBottom: `2px solid ${COLORS.borderAccent}`,
      alignItems: 'baseline',
    },
  }, [
    el('div', {
      style: {
        fontSize: TYPE.slideTitle * 0.75,
        fontWeight: 700,
        color: COLORS.green,
        fontFamily: FONT_FAMILY,
        marginRight: 8,
      },
    }, '#'),
    el('div', {
      style: {
        fontSize: TYPE.slideTitle,
        fontWeight: 700,
        color: COLORS.accent,
        fontFamily: FONT_FAMILY,
        lineHeight: 1.25,
        flex: 1,
      },
    }, sanitize(title)),
  ]);
}

function tCell(cell, ci, ri) {
  const rowBg = ri % 2 ? COLORS.bgElevated : COLORS.bgPanel;
  return el('div', {
    style: {
      flex: ci === 0 ? 0.9 : 1,
      padding: '14px 18px',
      fontSize: TYPE.table,
      lineHeight: 1.45,
      fontFamily: FONT_FAMILY,
      color: ci === 0 ? COLORS.cyan : COLORS.text,
      fontWeight: ci === 0 ? 600 : 400,
      backgroundColor: ci === 0 ? COLORS.bgPanel : rowBg,
      borderBottom: `1px solid ${COLORS.border}`,
    },
  }, sanitize(cell));
}

function bullets(items, size = TYPE.body) {
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
          fontSize: size + 4,
          lineHeight: 1.4,
          color: COLORS.green,
          marginRight: 16,
          flexShrink: 0,
          fontWeight: 700,
          fontFamily: FONT_FAMILY,
        },
      }, '›'),
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

function colPanel(title, items, size = TYPE.bodySm) {
  return el('div', {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: COLORS.bgElevated,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      padding: '24px 28px',
    },
  }, [
    el('div', {
      style: {
        fontSize: TYPE.h3,
        fontWeight: 700,
        color: COLORS.cyan,
        marginBottom: 16,
        paddingBottom: 10,
        borderBottom: `1px solid ${COLORS.border}`,
        fontFamily: FONT_FAMILY,
      },
    }, `## ${sanitize(title)}`),
    bullets(items, size),
  ]);
}

function slideNote(noteText) {
  return el('div', {
    style: {
      marginTop: 24,
      padding: '16px 20px',
      border: `1px solid ${COLORS.border}`,
      borderRadius: 8,
      backgroundColor: COLORS.bgElevated,
      fontSize: TYPE.caption,
      color: COLORS.muted,
      lineHeight: 1.45,
      fontFamily: FONT_FAMILY,
    },
  }, `// ${sanitize(noteText)}`);
}

function contentSlide(children, bg = COLORS.bg) {
  return slideBase({ backgroundColor: bg, color: COLORS.text, paddingTop: 56 }, [
    chromeBar(),
    ...children,
  ]);
}

export function slideToTree(slide) {
  switch (slide.type) {
    case 'title':
      return slideBase({
        backgroundColor: COLORS.bg,
        color: COLORS.textBright,
        justifyContent: 'center',
        paddingBottom: 80,
        paddingTop: 56,
      }, [
        chromeBar('techsapo — init'),
        el('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } }, [
          el('div', {
            style: { fontSize: TYPE.eyebrow, color: COLORS.green, marginBottom: 20, fontFamily: FONT_FAMILY },
          }, `$ ${sanitize(slide.eyebrow)}`),
          el('div', {
            style: {
              fontSize: TYPE.display,
              fontWeight: 700,
              lineHeight: 1.12,
              color: COLORS.textBright,
              marginBottom: 28,
              fontFamily: FONT_FAMILY,
            },
          }, sanitize(slide.title)),
          el('div', {
            style: {
              fontSize: TYPE.subtitle,
              lineHeight: 1.55,
              color: COLORS.muted,
              maxWidth: 1300,
              fontFamily: FONT_FAMILY,
              borderLeft: `4px solid ${COLORS.border}`,
              paddingLeft: 24,
            },
          }, sanitize(slide.subtitle).replace(/\n/g, '\n')),
          el('div', {
            style: {
              marginTop: 48,
              fontSize: TYPE.meta,
              color: COLORS.accent,
              fontFamily: FONT_FAMILY,
            },
          }, sanitize(slide.meta)),
        ]),
      ]);

    case 'section':
      return slideBase({
        backgroundColor: COLORS.bgElevated,
        color: COLORS.textBright,
        justifyContent: 'center',
        paddingLeft: 96,
        borderLeft: `6px solid ${COLORS.accent}`,
      }, [
        el('div', {
          style: { fontSize: 28, color: COLORS.green, marginBottom: 12, fontFamily: FONT_FAMILY },
        }, '## section'),
        el('div', {
          style: { fontSize: TYPE.section, fontWeight: 700, lineHeight: 1.15, color: COLORS.cyan, fontFamily: FONT_FAMILY },
        }, sanitize(slide.title)),
        slide.subtitle
          ? el('div', {
            style: { marginTop: 20, fontSize: TYPE.subtitle, color: COLORS.muted, fontFamily: FONT_FAMILY },
          }, sanitize(slide.subtitle))
          : null,
      ]);

    case 'content': {
      const bg = slide.theme === 'light' ? COLORS.bgPanel : COLORS.bg;
      return contentSlide([
        head(slide.title),
        bodyWrap(
          el('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' } }, [
            bullets(slide.bullets),
            slide.note ? slideNote(slide.note) : null,
          ]),
        ),
        footerBar(),
      ], bg);
    }

    case 'two-col':
      return contentSlide([
        head(slide.title),
        bodyWrap(
          el('div', { style: { display: 'flex', flexDirection: 'row', gap: 32, flex: 1, minHeight: 0 } }, [
            colPanel(slide.leftTitle, slide.left),
            colPanel(slide.rightTitle, slide.right),
          ]),
        ),
        footerBar(),
      ]);

    case 'table': {
      const th = slide.headers.map((h) =>
        el('div', {
          style: {
            flex: 1,
            backgroundColor: COLORS.bgElevated,
            color: COLORS.accent,
            padding: '14px 18px',
            fontSize: TYPE.tableHead,
            fontWeight: 600,
            fontFamily: FONT_FAMILY,
            borderBottom: `2px solid ${COLORS.borderAccent}`,
          },
        }, sanitize(h)),
      );
      const rows = slide.rows.map((row, ri) =>
        el('div', { style: { display: 'flex', flexDirection: 'row' } },
          ...row.map((cell, ci) => tCell(cell, ci, ri)),
        ),
      );
      return contentSlide([
        head(slide.title),
        bodyWrap(
          el('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
            },
          }, [
            el('div', { style: { display: 'flex', flexDirection: 'row' } }, th),
            ...rows,
          ]),
        ),
        footerBar(),
      ]);
    }

    case 'flowchart':
      return contentSlide([
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
        backgroundColor: COLORS.bg,
        color: COLORS.textBright,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }, [
        el('div', {
          style: { fontSize: 28, color: COLORS.green, marginBottom: 16, fontFamily: FONT_FAMILY },
        }, '$ exit 0'),
        el('div', {
          style: { fontSize: TYPE.closingTitle, fontWeight: 700, color: COLORS.textBright, marginBottom: 24, fontFamily: FONT_FAMILY },
        }, sanitize(slide.title)),
        el('div', {
          style: {
            fontSize: TYPE.closingTag,
            color: COLORS.accent,
            maxWidth: 1000,
            lineHeight: 1.45,
            marginBottom: 28,
            fontFamily: FONT_FAMILY,
          },
        }, sanitize(slide.tagline)),
        el('div', {
          style: { fontSize: TYPE.closingTeam, color: COLORS.muted, fontFamily: FONT_FAMILY },
        }, sanitize(slide.team)),
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
