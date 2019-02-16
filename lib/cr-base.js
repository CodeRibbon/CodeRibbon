
// TODO disable during non-devMode
console.log("=== CODERIBBON IN DEBUG MODE! ===");

const atom_PaneContainer = atom.workspace.getCenter().paneContainer.__proto__.constructor;
console.log("CR: Took PaneContainer as:", atom_PaneContainer);

const atom_PaneAxis = atom.workspace.getCenter().paneContainer.root.__proto__.constructor;
console.log("CR: Took PaneAxis as:", atom_PaneAxis);

const atom_Pane = atom.workspace.getActivePane().__proto__.constructor;
console.log("CR: Took Pane as:", atom_Pane);

const force_atom_devMode = true;

var Debugger = function(prefixStr) {
  this.debug = {};
  if (atom.devMode || force_atom_devMode) {
    for (var m in console)
      if (typeof console[m] == 'function')
        this.debug[m] = console[m].bind(window.console, prefixStr);
  }
  else {
    for (var m in console)
      if (typeof console[m] == 'function')
        this.debug[m] = function(){};
  }
  return this.debug;
}

debug = Debugger("CR:");

module.exports = {
  PaneContainer: atom_PaneContainer,
  PaneAxis: atom_PaneAxis,
  Pane: atom_Pane,

  crdebug: debug.log
}
