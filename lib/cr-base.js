
/**
 * this is the file where all the Atom hacks go
 *
 * we do stuff like stealing prototypes, copying and manipulating other plugins,
 * and general other HACK like stuff
 *
 * if you're going to fork Atom, this would be the first thing to rewrite.
 */

const force_atom_devMode = true;

var Debugger = function(prefixStr) {
  this.debug = {};
  if (atom.devMode || force_atom_devMode) {
    for (var m in console)
      if (typeof console[m] == 'function') // eslint-disable-line no-console
        this.debug[m] = console[m].bind(window.console, prefixStr); // eslint-disable-line no-console
  }
  else {
    for (var m in console) // eslint-disable-line no-redeclare
      if (typeof console[m] == 'function') // eslint-disable-line no-console
        this.debug[m] = function(){};
  }
  return this.debug;
}

var debug = Debugger("CR:");

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
  var p = atom.workspace.getCenter().paneContainer.activePane.splitDown();
  // try to capture it
  atom_PaneAxis = atom.workspace.getCenter().paneContainer.root.__proto__.constructor;
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
    var failmsg = "\nThis is a catastrophic failure of CodeRibbon and things WILL break!";
    atom.notifications.addFatalError("CR acquire "+class_name+" FAIL", {
      "description": "CodeRibbon failed to acquire "+class_name+" Prototype!" + failmsg,
      "dismissable": true
    });
    debug.error(
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

function global_cr_update() {
  atom.packages.getLoadedPackage('code-ribbon').mainModule.cr_update();
}

atom.packages.loadPackage('fuzzy-finder');
var fuzzyFinderPackage = atom.packages.getLoadedPackage('fuzzy-finder');
var fuzzyFinderMainModule = fuzzyFinderPackage.mainModule;
var fuzzyFinderPath = fuzzyFinderPackage.path;
if (fuzzyFinderPath == undefined) {
  atom.notifications.addFatalError("CodeRibbon can't access Fuzzy-Finder!", {
    "description": "CodeRibbon failed to get a path to the fuzzy-finder package!",
    "dismissable": true
  });
}
// HACK probly doesn't work on Windows?
var fuzzyFinderProjectView = require(fuzzyFinderPath + "/lib/project-view.js");
//var fuzzyFinderReporterProxy = require(fuzzyFinderPath + "/lib/reporter-proxy.js");
// TODO some way to avoid this or nah?
//const fuzzyFinderMetricsReporter = new fuzzyFinderReporterProxy();

var contextMenuCommandsToDisable = [
  // no closing panes:
  "pane:close",
  // no splitting panes:
  "pane:split-up-and-copy-active-item",
  "pane:split-down-and-copy-active-item",
  "pane:split-right-and-copy-active-item",
  "pane:split-left-and-copy-active-item",
  // no using tabs to split either:
  "tree-view:open-selected-entry-up",
  "tree-view:open-selected-entry-down",
  "tree-view:open-selected-entry-right",
  "tree-view:open-selected-entry-left",
  "tabs:split-up",
  "tabs:split-down",
  "tabs:split-right",
  "tabs:split-left"
]

/**
 * Function that should be run after every other plugin does it's things
 * Should be able to be run multiple times without consequence
 *
 * Will do things like remove menu items that break CodeRibbon,
 *
 */
function delayed_initialize() {
  // remove context menu items that allow closing/splitting patches/panes:
  atom.contextMenu.itemSets.map(menuItemSet => {
    menuItemSet.items = menuItemSet.items.filter(
      function(menuItem, index, arr) { // eslint-disable-line no-unused-vars
        if (
          contextMenuCommandsToDisable.includes(menuItem.command)
        ) {
          debug.log(
            "Removing an item from context menu: ",
            menuItemSet,
            menuItem
          );
          return false;
        }
        else return true;
      }
    );
  });

  global_cr_update();
}

atom.packages.onDidActivateInitialPackages(delayed_initialize);

module.exports = {
  PaneContainer: atom_PaneContainer,
  PaneAxis: atom_PaneAxis,
  Pane: atom_Pane,

  fuzzyFinderMainModule: fuzzyFinderMainModule,
  fuzzyFinderProjectView: fuzzyFinderProjectView,
  //fuzzyFinderMetricsReporter: fuzzyFinderMetricsReporter,

  crlogger: debug,
  crdebug: debug.log,

  global_cr_update: global_cr_update
}
