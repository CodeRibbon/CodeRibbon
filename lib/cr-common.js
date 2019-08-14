
const {
  crdebug,
  crlogger,
  fuzzyFinderProjectView
} = require('./cr-base');

var scrollIntoView = require('scroll-into-view');

var whileScrolling;
var onScrollStopOnceCallbacks = [];

module.exports = {
  getHorizontalPatchesPerScreen() {
    return atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number");
  },

  getVerticalPatchesPerScreen() {
    return atom.config.get("code-ribbon.pane_count_calc.pane_count_vertical_number");
  },

  getActivePatchClientWidth() {
    return atom.workspace.getActivePane().element.clientWidth;
  },

  scrollPatchIntoView (patch, callback, horizontalAlignment) {
    crdebug("Scrolling", patch, "into view...");

    // var inline_scroll_mode = (atom.config.get(
    //   "code-ribbon.pane_count_calc.pane_count_horizontal_number"
    // ) % 2) == 1 ? "center" : "end"; // horizontal
    // if (mode != undefined) {
    //   inline_scroll_mode = mode;
    // }

    scrollIntoView(patch.getElement(), {
      time: 500,
    }, (callback == undefined? null : callback));
  },

  fuzzyFinderProjectViewFactory () {
    var n_ffpv = new fuzzyFinderProjectView([]);
    n_ffpv.selectListView.update({
      loadingMessage: 'Reindexing project\u2026',
      infoMessage: null
    });
    n_ffpv.selectListView.refs.queryEditor.setPlaceholderText("Search project files...");
    return n_ffpv;
  },

  onScrollStopOnce (callback) {
    if (!callback || typeof callback !== 'function') return;

    onScrollStopOnceCallbacks.push(callback);

    crdebug("onScrollStopOnceCallbacks is now:", onScrollStopOnceCallbacks);
  },

  elementIsVisible (elem) {
    if (!(elem instanceof Element)) throw Error('elem is not an element.');
    const style = getComputedStyle(elem);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (style.opacity < 0.1) return false;
    if (elem.offsetWidth + elem.offsetHeight + elem.getBoundingClientRect().height +
        elem.getBoundingClientRect().width === 0) {
        return false;
    }
    const elemCenter   = {
        x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
        y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
    };
    if (elemCenter.x < 0) return false;
    if (elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
    if (elemCenter.y < 0) return false;
    if (elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
    let pointContainer = document.elementFromPoint(elemCenter.x, elemCenter.y);
    do {
        if (pointContainer === elem) return true;
    } while (pointContainer = pointContainer.parentNode); // eslint-disable-line no-cond-assign
    return false;
  }
}

atom.packages.onDidActivateInitialPackages(() => {
  window.addEventListener('scroll', (event) => {
    crdebug("Scrollevent", event);
    window.clearTimeout(whileScrolling);
    whileScrolling = setTimeout(() => {
      // run that callback
      onScrollStopOnceCallbacks.map((callback) => {
        try {
          callback();
        }
        catch (err) {
          crlogger.warn(err);
        }
      });
      onScrollStopOnceCallbacks = [];
    }, 60); // ms timeout
  });
});
