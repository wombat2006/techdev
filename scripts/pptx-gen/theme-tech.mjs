/**
 * Tech / developer aesthetic — GitHub-dark + terminal accents
 * Shared by satori-renderer, flowchart-renderer, theme.css (manual sync)
 */
export const COLORS = {
  bg: '#0d1117',
  bgElevated: '#161b22',
  bgPanel: '#1c2128',
  bgCode: '#0d1117',
  border: '#30363d',
  borderAccent: '#388bfd',
  text: '#c9d1d9',
  textBright: '#f0f6fc',
  muted: '#8b949e',
  accent: '#58a6ff',
  cyan: '#39c5cf',
  green: '#3fb950',
  greenDim: '#238636',
  orange: '#d29922',
  red: '#f85149',
  purple: '#bc8cff',
  white: '#ffffff',
  dotRed: '#ff5f57',
  dotYellow: '#febc2e',
  dotGreen: '#28c840',
};

export const NODE_COLORS = {
  primary: { bg: '#1f2937', fg: COLORS.textBright, border: COLORS.accent },
  accent: { bg: '#1a2332', fg: COLORS.cyan, border: COLORS.cyan },
  light: { bg: COLORS.bgPanel, fg: COLORS.text, border: COLORS.border },
  sky: { bg: '#132033', fg: COLORS.accent, border: COLORS.accent },
  green: { bg: '#122117', fg: COLORS.green, border: COLORS.greenDim },
  orange: { bg: '#2a1f0a', fg: COLORS.orange, border: COLORS.orange },
};
