import { render } from '@create-figma-plugin/ui'
import { h } from 'preact'
import { App } from './ui/App'
import '!./output.css'
import '!@create-figma-plugin/ui/lib/css/theme.css'

// FigJam does not inject --figma-color-* CSS variables or the figma-dark/figma-light
// class into plugin webviews. Mirror the OS dark-mode preference instead, which
// tracks Figma's own dark mode in the common case.
function syncThemeClass(dark: boolean) {
  document.body.classList.toggle('figma-dark', dark)
  document.body.classList.toggle('figma-light', !dark)
}
const mq = window.matchMedia('(prefers-color-scheme: dark)')
syncThemeClass(mq.matches)
mq.addEventListener('change', (e) => syncThemeClass(e.matches))

export default render(App)
