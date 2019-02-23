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
    // add panes to fill at least one screen:
    while (
      this.children.length <
      atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number")
    ) {
      var n_pane = new Pane({
        viewRegistry: this.viewRegistry,
        applicationDelegate: atom.applicationDelegate, // TODO wtf is this???
        config: atom.config
      });
      // using addChild from the PaneAxis
      this.addChild(n_pane);
      /* getElement needs to happen after addChild so that it's
       * parent container reference is set correctly
       * (required by PaneElement!)
       * n_pane.setContainer(this);
       */
      crdebug("CodeRibbonSingleRibbon made new n_pane:", n_pane)
      if (n_pane.getContainer() == null) {
        crlogger.warn("that n_pane had a null container! correcting to ", this.container, "...");
        n_pane.setContainer(this.container);
        crlogger.warn("New container:", n_pane.getContainer());
      }
      n_pane.getElement().classList.add("cr-blank-patch");
    }

    // TODO deal with too many blank patches at the end

    // TODO load or unload from leftDroppedSerializedPatches

    // TODO set width and scrolling etc,
    var widthpercent = 100 * (
      this.children.length / atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number")
    );
    this.getElement().style.width = widthpercent.toString() + "%";

    // TODO cr_update on Patches when they get their own type
  }

}

module.exports = CodeRibbonSingleRibbon;
