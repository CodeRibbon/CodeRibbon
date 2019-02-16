/**
 * can't use a transpiler here (ex. babel)
 * since we are grabbing a prototype from an existing object
 * and the transpiler will mess that up in the class constructor
 *
 * @see https://stackoverflow.com/questions/51860043/javascript-es6-typeerror-class-constructor-client-cannot-be-invoked-without-ne/51860850
 */
const {
  crdebug,
  PaneAxis
} = require('./cr-base');
const CodeRibbonSingleRibbon = require('./code-ribbon-single-ribbon');

/**
 * Containing Axis that holds Ribbons (vertical count)
 * @type PaneAxis
 */
class CodeRibbonRibbonContainer extends PaneAxis {

  static deserialize(state, {
    deserializers,
    views
  }) {
    state.children = state.children.map(ribbonState => deserializers.deserialize(ribbonState));
    return new CodeRibbonRibbonContainer(state, views);
  }

  constructor(state, viewRegistry) {
    super(state, viewRegistry);
    if (this.children == null) {
      // PaneAxis was supposed to do this?
      // HACK ???
      this.children = [];
    }
    crdebug("CodeRibbonRibbonContainer children:", this.children);
    this.downDroppedSerializedRibbons = state.downDroppedSerializedRibbons || [];

    // create Ribbons that don't exist yet
    while (
      this.children.length <
      atom.config.get("code-ribbon.pane_count_calc.pane_count_vertical_number")
    ) {
      crdebug("CodeRibbonRibbonContainer is creating a new CodeRibbonSingleRibbon...");
      this.addChild(
        new CodeRibbonSingleRibbon({
          orientation: null,
          children: null, // will auto-populate in CodeRibbonSingleRibbon constructor
          flexScale: null
        }, viewRegistry)
      );
    }

    // We always stack ribbons vertically
    this.orientation = "vertical";

    crdebug("CodeRibbonSingleRibbonView: constructed:", this.element);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'CodeRibbonRibbonContainer',
      children: this.children.map(singleribbon => singleribbon.serialize()),
      orientation: this.orientation,
      flexScale: this.flexScale,
      downDroppedSerializedRibbons: this.downDroppedSerializedRibbons
    };
  }

}

module.exports = CodeRibbonRibbonContainer;
