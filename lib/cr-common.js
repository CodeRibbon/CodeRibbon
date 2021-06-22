
const {
  crdebug,
  crlogger,
  fuzzyFinderProjectView,
  get_cr_panecontainer
} = require('./cr-base');

var scrollIntoView = require('scroll-into-view');

var whileScrolling;
var onScrollStopOnceCallbacks = [];

var last_char_width = 8; // default only when opened to a blank workspace

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
      if (
        atom.workspace.paneContainers.center
        && atom.workspace.paneContainers.center.paneContainer.root.overview_active
        && last_char_width > 0
      ) {
        // do not measure dimensions while in overview
        return last_char_width;
      }
      let old_last_width = last_char_width;
      // method one: use the active editor
      if (atom.workspace.getActiveTextEditor()) {
        last_char_width = atom.workspace.getActiveTextEditor().component.getBaseCharacterWidth();
      }
      // method two: get any editor in the workspace:
      if (atom.workspace.getTextEditors().length > 0) {
        last_char_width = atom.workspace.getTextEditors()[0].component.getBaseCharacterWidth();
      }
      if (old_last_width != last_char_width) {
        crlogger.warn("Character width changed since last measure:", old_last_width, "to", last_char_width);
      }
      if (last_char_width > 0) {
        return last_char_width;
      }
      else {
        last_char_width = old_last_width;
        crlogger.error("Did not find any valid character width.");
        return last_char_width;
      }
    }
    catch (err) {
      crlogger.error("Failed to get TextEditorBaseCharacterWidth, using fallback value");
      crlogger.error(err);
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

  scrollPatchIntoView (patch, callback, {skip_visible_check = false}={}) {
    // primary container is what has scrollLeft nonzero
    var crpc = get_cr_panecontainer();

    if (!skip_visible_check) {
      if (patch.parent.isVisible()) {
        crdebug("scrollPatchIntoView: Patch", patch.id, "already in view.");
        if (callback) callback();
        return;
      }
    }

    var timeoutHandle;
    let cur_scroll = crpc.element.scrollLeft;
    let scrolldiff = 0;
    let crpc_bounds = crpc.element.getBoundingClientRect();
    let patch_bounds = patch.element.getBoundingClientRect();

    if (patch_bounds.right > crpc_bounds.right) {
      // it's off to the right of the view, need to add
      scrolldiff = patch_bounds.right - crpc_bounds.right;
    }
    else if (patch_bounds.left < crpc_bounds.left) {
      scrolldiff = patch_bounds.left - crpc_bounds.left;
    }

    const target_scroll = (cur_scroll + scrolldiff);
    const fixed_scroll = target_scroll.toFixed();

    crdebug("Scrolling", scrolldiff, "px to get", patch.id, "into view...");
    crpc.getElement().classList.add('cr-managed-scroll-active');

    const stopScrollCallback = () => {
      cur_scroll = crpc.element.scrollLeft;
      if (cur_scroll.toFixed() != fixed_scroll) {
        crlogger.warn("Scrolling stopped before reaching target point! At", cur_scroll, "wanted to get to", fixed_scroll);
      }
      if (callback) callback();
      crpc.getElement().classList.remove('cr-managed-scroll-active');
    };
    const checkScroll = () => {
      if (crpc.element.scrollLeft.toFixed() == fixed_scroll) {
        crdebug("Scroll finished.");
        crpc.element.removeEventListener('scroll', checkScroll);
        if (callback) callback();
      }
      else {
        window.clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(() => {
          crdebug("CRPC stopped scrolling.");
          crpc.element.removeEventListener('scroll', checkScroll);
          stopScrollCallback();
        }, 300); // millis timeout
      }
    };

    crpc.element.addEventListener('scroll', checkScroll);
    checkScroll();
    setTimeout(() => {
      crpc.element.scrollTo({
        left: target_scroll,
        behavior: 'smooth'
      });
    });

    // scrollIntoView(patch.getElement(), {
    //   time: 500,
    // }, (callback == undefined? null : callback));
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
