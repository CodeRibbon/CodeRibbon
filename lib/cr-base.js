

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

// TODO disable during non-devMode
debug.warn("=== CODERIBBON IN DEBUG MODE! ===");

var atom_PaneContainer = atom.workspace.getCenter().paneContainer.__proto__.constructor;
debug.log("CR: Took PaneContainer as:", atom_PaneContainer);

var atom_PaneAxis = atom.workspace.getCenter().paneContainer.root.__proto__.constructor;
debug.log("CR: Took PaneAxis as:", atom_PaneAxis);

/**
 * HACK: force atom to generate a PaneAxis for us to steal the prototype from
 * (because I can't find any other access to it from outside Atom Core)
 */
if (atom_PaneAxis.name != "PaneAxis") {
  debug.warn("Attempting recovery of PaneAxis prototype!");
  // force atom to use at least one PaneAxis
  p = atom.workspace.getCenter().paneContainer.activePane.splitDown();
  // try to capture it
  var atom_PaneAxis = atom.workspace.getCenter().paneContainer.root.__proto__.constructor;
  // clean up
  debug.warn("Attempt at PaneAxis recovery returned:", atom_PaneAxis);
  p.destroy();
}

var atom_Pane = atom.workspace.getActivePane().__proto__.constructor;
debug.log("CR: Took Pane as:", atom_Pane);

/**
 * ASSERTION OF HACK
 * we need to make sure we correctly found the PaneContainer, PaneAxis and Pane
 * constructors from Atom, since they aren't available directly by import,
 * we need to do some pathfinding to get access to their prototypes...
 */
function ensureClassMatches(proto_class, class_name) {
  if (proto_class.name != class_name) {
    failmsg = "\nThis is a catastrophic failure of CodeRibbon and things WILL break!";
    atom.notifications.addFatalError("CR acquire "+class_name+" FAIL", {
      "description": "CodeRibbon failed to acquire "+class_name+" Prototype!" + failmsg,
      "dismissable": true
    });
    console.error(
      "CodeRibbon FAILURE TO ACQUIRE PROTOTYPE:",
      class_name, "\n",
      "got this instead:",
      proto_class
    );
  }
}

ensureClassMatches(atom_PaneContainer, "PaneContainer");
ensureClassMatches(atom_PaneAxis, "PaneAxis");
ensureClassMatches(atom_Pane, "Pane");

module.exports = {
  PaneContainer: atom_PaneContainer,
  PaneAxis: atom_PaneAxis,
  Pane: atom_Pane,

  crlogger: debug,
  crdebug: debug.log
}
