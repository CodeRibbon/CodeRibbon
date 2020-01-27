
const {
  backgroundTipsView
} = require('./cr-base');

var Tips = [
  // CR notes
  "Welcome to CodeRibbon!",
  "You can drag files onto patches from the Tree View",
  "Swap patches by dragging a titlebar onto the other patch",
  "CodeRibbon was directly inspired by PatchWorks by Austin Henley",
  "Give us feedback via GitHub Issues!",

  // CR Keybinds
  "Use {window:focus-pane-on-right} to focus one pane to the right",
  "Use {code-ribbon:toggle-overview} to overview your patches",
  "Use the arrow keys or HJKL to navigate patches in overview mode",
  "Use {window:focus-pane-below} to focus the pane below",

  // stuff from Atom:
  'Close panels like find and replace with {body>core:cancel}',
  'Everything Atom can do is in the Command Palette. See it by using {command-palette:toggle}',
  //'You can quickly open files with the Fuzzy Finder. Try it by using {fuzzy-finder:toggle-file-finder}',
  'You can toggle the Tree View with {tree-view:toggle}',
  'You can focus the Tree View with {tree-view:toggle-focus}',
  'You can toggle the Git tab with {github:toggle-git-tab}',
  'You can focus the Git tab with {github:toggle-git-tab-focus}',
  // 'You can toggle the GitHub tab with {github:toggle-github-tab}',
  // 'You can focus the GitHub tab with {github:toggle-github-tab-focus}',
  //'You can split a pane with {pane:split-right-and-copy-active-item}',
  'You can jump to a method in the editor using {symbols-view:toggle-file-symbols}',
  'You can install packages and themes from the Settings View: {settings-view:open}'
]

const TEMPLATE = `\
<ul class="centered background-message">
  <li class="message"></li>
</ul>\
`

class CodeRibbonTipsView extends backgroundTipsView {
  constructor(n_pane) {
    super()
    this.parentPane = n_pane;
    this.displayDuration = 20000;
  }

  randomizeIndex () {
    const len = Tips.length
    this.index = Math.round(Math.random() * len) % len
  }

  showNextTip () {
    this.index = ++this.index % Tips.length
    this.message.classList.remove('fade-in')
    this.nextTipTimeout = setTimeout(() => {
      this.message.innerHTML = Tips[this.index]
      this.message.classList.add('fade-in')
    }, this.fadeDuration)
  }

  renderTips () {
    if (this.tipsRendered) return
    for (let i = 0; i < Tips.length; i++) {
      const tip = Tips[i]
      Tips[i] = this.renderTip(tip)
    }
    this.tipsRendered = true
  }

  shouldBeAttached () {
    return this.parentPane.current_display_mode == "cr-tips";
  }

  attach () {
    this.element.innerHTML = TEMPLATE;
    this.message = this.element.querySelector('.message')

    const paneView = atom.views.getView(this.parentPane);
    // const itemViews = paneView.querySelector('.item-views');
    // let top = 0
    // if (itemViews && itemViews.offsetTop) {
    //   top = itemViews.offsetTop
    // }
    //
    // this.element.style.top = top + 'px'
    paneView.appendChild(this.element)
  }

}

module.exports = CodeRibbonTipsView;
