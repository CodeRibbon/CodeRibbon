/**
 * can't use a transpiler here (ex. babel)
 * since we are grabbing a prototype from an existing object
 * and the transpiler will mess that up in the class constructor
 *
 * @see https://stackoverflow.com/questions/51860043/javascript-es6-typeerror-class-constructor-client-cannot-be-invoked-without-ne/51860850
 */
const {
  crdebug,
  crlogger,
  PaneAxis,
  Pane
} = require('./cr-base');

const CodeRibbonPatch = require('./code-ribbon-patch');

class CodeRibbonSingleRibbon extends PaneAxis {

  static deserialize(state, {
    deserializers,
    views
  }) {
    state.children = state.children.map(patchState => deserializers.deserialize(patchState));
    return new CodeRibbonSingleRibbon(state, views)
  }

  constructor(state, viewRegistry) {
    super(state, viewRegistry);
    crdebug("CodeRibbonSingleRibbon children:", this.children);
    this.leftDroppedSerializedPatches = state.leftDroppedSerializedPatches || [];

    // ribbons always show panes horizontally
    this.orientation = "horizontal";

    crdebug("CodeRibbonSingleRibbon: constructed:", this.element);
  }

  initialize() {
    this.cr_update();
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'CodeRibbonSingleRibbon',
      children: this.children.map(child => child.serialize()),
      orientation: this.orientation,
      flexScale: this.flexScale,
      leftDroppedSerializedPatches: this.leftDroppedSerializedPatches
    };
  }

  cr_update() {
    // add panes to meet quota:
    while (
      this.children.length <
      this.getParent().patchQuota
    ) {
      var n_pane = new CodeRibbonPatch({
        viewRegistry: this.viewRegistry,
        applicationDelegate: atom.applicationDelegate, // TODO wtf is this???
        config: atom.config
      });
      // using addChild from the PaneAxis
      this.addChild(n_pane);
      n_pane.initialize();
      crdebug("CodeRibbonSingleRibbon made new n_pane:", n_pane)
    }

    // TODO deal with too many blank patches at the end

    // TODO load or unload from leftDroppedSerializedPatches

    // TODO set width and scrolling etc,
    // ensure that we have the quota of patches to match sibling ribbons

    // cr_update on Patches
    this.children.map(child => {
      child.cr_update();
    });
  }

}

module.exports = CodeRibbonSingleRibbon;
