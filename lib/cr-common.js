
const {
  crdebug,
  fuzzyFinderProjectView
} = require('./cr-base');

module.exports = {
  getHorizontalPatchesPerScreen() {
    return atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number");
  },

  getVerticalPatchesPerScreen() {
    return atom.config.get("code-ribbon.pane_count_calc.pane_count_vertical_number");
  },

  scrollPatchIntoView (patch) {
    crdebug("Scrolling", patch, "into view...");
    patch.getElement().scrollIntoView({
      block: "center", // vertical
      // TODO probably want user preference for start/end/center
      // BUG center is good for ODD n-patches, even has half patches edge
      // inline: "nearest",
      inline: (atom.config.get(
        "code-ribbon.pane_count_calc.pane_count_horizontal_number"
      ) % 2) == 1 ? "center" : "end", // horizontal
      behavior: "smooth"
    });
  },

  fuzzyFinderProjectViewFactory () {
    var n_ffpv = new fuzzyFinderProjectView([]);
    n_ffpv.selectListView.update({
      loadingMessage: 'Reindexing project\u2026',
      infoMessage: null
    });
    n_ffpv.selectListView.refs.queryEditor.setPlaceholderText("Search project files...");
    return n_ffpv;
  }
}
