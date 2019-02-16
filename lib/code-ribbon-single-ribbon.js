/**
 * can't use a transpiler here (ex. babel)
 * since we are grabbing a prototype from an existing object
 * and the transpiler will mess that up in the class constructor
 *
 * @see https://stackoverflow.com/questions/51860043/javascript-es6-typeerror-class-constructor-client-cannot-be-invoked-without-ne/51860850
 */
const {
  crdebug,
  PaneAxis,
  Pane
} = require('./cr-base');

class CodeRibbonSingleRibbon extends PaneAxis {

  static deserialize(state, {
    deserializers,
    views
  }) {
    state.children = state.children.map(childState => deserializers.deserialize(childState));
    return new CodeRibbonSingleRibbon(state, views)
  }

  constructor(state, viewRegistry) {
    super(state, viewRegistry);
    if (this.children == null) {
      // PaneAxis was supposed to do this?
      // HACK ???
      this.children = [];
    }
    crdebug("CodeRibbonSingleRibbon children:", this.children);
    this.leftDroppedSerializedPatches = state.leftDroppedSerializedPatches || [];

    // add some panes to fill at least one screen:
    while (
      this.children.length <
      atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number")
    ) {
      // using addChild from the PaneAxis
      this.addChild(
        new Pane({
          viewRegistry: viewRegistry,
          applicationDelegate: atom.applicationDelegate // TODO wtf is this???
        })
      );
    }

    // ribbons always show panes horizontally
    this.orientation = "horizontal";

    crdebug("CodeRibbonSingleRibbonView: constructed:", this.element);
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

}

module.exports = CodeRibbonSingleRibbon;
