// Tailwind CSS for the calculator (app.html). The CSS is compiled once and committed: vendor/tailwind/app.css.
// Rebuild after changing classes in app.html or modules/ui:  sh tools/build-css.sh
//
// Torsio Engineering palette, "B3 · Banco di comando su carta" (18/10): warm drafting paper and graphite, Prussian blue accent.
// The calculator was written for a dark theme, so the scales are inverted: slate-900 is the paper, slate-50 the ink,
// "white" is the ink; blue is the accent, emerald (verified) is blue too; the other accents are darkened for paper.
module.exports = {
  content: ['./app.html', './modules/**/*.js'],
  theme: { extend: {
    fontFamily: { sans: ['Archivo', 'Helvetica Neue', 'Arial', 'sans-serif'], mono: ['IBM Plex Mono', 'ui-monospace', 'Consolas', 'monospace'] },
    colors: {
      white: '#22211f',
      slate: { 50: '#22211f', 100: '#2c2a27', 200: '#3a3732', 300: '#4a463f', 400: '#5b5750', 500: '#6f6a62', 600: '#a39d92', 700: '#d6d1c6', 800: '#fbfaf7', 900: '#f1efea', 950: '#e9e6df' },
      blue: { 50: '#16304f', 100: '#1b3a63', 200: '#21497f', 300: '#21497f', 400: '#21497f', 500: '#9bb7dc', 600: '#dce6f3', 700: '#e7eef7', 800: '#eef3f9', 900: '#f3f6fa', 950: '#f7f9fc' },
      sky: { 300: '#21497f', 400: '#2f66b3', 500: '#2f66b3', 600: '#21497f' },
      emerald: { 300: '#21497f', 400: '#21497f', 500: '#2f66b3', 600: '#2f66b3' },
      amber: { 300: '#7a5806', 400: '#8a6408', 500: '#c99613', 600: '#8a6408' },
      rose: { 300: '#9b2317', 400: '#b42318', 500: '#c0392b', 600: '#c0392b', 900: '#f6dcd8', 950: '#fbecea' },
      purple: { 300: '#5e3591', 400: '#6b3fa0', 500: '#7a4fb3' }
    }
  } }
};
