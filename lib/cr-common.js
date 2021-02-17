
const {
  crdebug,
  crlogger,
  fuzzyFinderProjectView
} = require('./cr-base');

var scrollIntoView = require('scroll-into-view');

var whileScrolling;
var onScrollStopOnceCallbacks = [];

var secretInternalTextEditor = null;

module.exports = {
  getPreferredLineLengthCharacters() {
    let m_v = 80;
    if (
      atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_mode")
      == "cr-linelength"
    ) {
      m_v = atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_min_chars");
    }
    else {
      m_v = atom.config.get('editor.preferredLineLength');
    }
    if (m_v > 2) {
      return m_v;
    }
    else {
      return 80;
    }
  },

  getTextEditorBaseCharacterWidth() {
    try {
      // method one: use the active editor
      if (atom.workspace.getActiveTextEditor()) {
        return atom.workspace.getActiveTextEditor().component.getBaseCharacterWidth();
      }
      // method two: get any editor in the workspace:
      if (atom.workspace.getTextEditors().length > 0) {
        return atom.workspace.getTextEditors()[0].component.getBaseCharacterWidth();
      }
      // method three: create a temporary editor:
      if (!secretInternalTextEditor) {
        secretInternalTextEditor = atom.workspace.buildTextEditor();
        secretInternalTextEditor.element.style.visibility = "hidden";
        secretInternalTextEditor.element.style.position = "absolute";
        secretInternalTextEditor.element.style.height = "0px";
      }
      atom.workspace.getCenter().getActivePane().getElement().insertBefore(
        secretInternalTextEditor.getElement(),
        atom.workspace.getCenter().getActivePane().getElement().children[0]
      );
      secretInternalTextEditor.component.measureCharacterDimensions();
      const px = secretInternalTextEditor.component.getBaseCharacterWidth();
      if (px <= 0) {
        crlogger.warn("getBaseCharacterWidth on secretInternalTextEditor returned bad value (<=0.0):", secretInternalTextEditor);
        throw new Error("getBaseCharacterWidth refuses to return zero");
      }
      return px;
    }
    catch (err) {
      crlogger.error("Failed to get TextEditorBaseCharacterWidth, using fallback value");
      crlogger.warn(err);
      return 8;
    }
  },

  getVerticalPatchesPerScreen() {
    return atom.config.get("code-ribbon.pane_count_calc.pane_count_vertical_number");
  },

  getActivePatchClientWidth() {
    return atom.workspace.getActivePane().element.clientWidth;
  },

  getNowYYYYMMDDHHMMSS() {
    let d = (new Date());
    Object.defineProperty(d, 'YYYYMMDDHHMMSS', {
      value: function() {
        function pad2(n) {  // always returns a string
            return (n < 10 ? '0' : '') + n;
        }
        return this.getFullYear() +
               pad2(this.getMonth() + 1) +
               pad2(this.getDate()) +
               pad2(this.getHours()) +
               pad2(this.getMinutes()) +
               pad2(this.getSeconds());
      }
    });
    return d.YYYYMMDDHHMMSS();
  },

  scrollPatchIntoView (patch, callback) {
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
