
const atom_PaneAxis = atom.workspace.getCenter().paneContainer.root.__proto__.constructor;
console.log("CR: Took PaneAxis as:");
console.log(atom_PaneAxis);

const atom_PaneContainer = atom.workspace.getCenter().paneContainer.__proto__.constructor;
console.log("CR: Took PaneContainer as:");
console.log(atom_PaneContainer);

var Debugger = function(prefixStr) {
  this.debug = {};
  if (atom.devMode) {
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

  crdebug: debug.log
}
