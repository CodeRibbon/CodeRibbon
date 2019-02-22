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
    crdebug("CodeRibbonRibbonContainer children:", this.children);
    this.downDroppedSerializedRibbons = state.downDroppedSerializedRibbons || [];

    // We always stack ribbons vertically
    this.orientation = "vertical";

    crdebug("CodeRibbonRibbonContainer: constructed:", this.element);
  }

  initialize() {
    this.cr_update();
    this.getElement().classList.add("cr-ribbon-container");
    
    // TODO: Why would this not fire??
    // this.getElement().addEventListener("scroll", function(e) {
    //   console.log("scrolling");
    // })

    // give focus back to whichever pane had (or now has) focus
    this.getElement().addEventListener(
      "transitionend",
      function(event) {
        // crdebug("transitionend event: ", event);
        if (
          // ignore events from children elements bubbling up
          event.propertyName == "transform" &&
          event.target.classList.contains('cr-ribbon-container') &&
          event.target.classList.contains('cr-overview-active') == false
        ) {
          crdebug("Refocusing activePane!");
          atom.workspace.getActivePane().element.scrollIntoView({
            block: "center", // vertical
            // TODO probably want user preference for start/end/center
            // BUG center is good for ODD n-patches, even has half patches edge
            // inline: "nearest",
            inline: (atom.config.get(
              "code-ribbon.pane_count_calc.pane_count_horizontal_number"
            ) % 2) == 1 ? "center" : "end", // horizontal
            behavior: "smooth"
          });
        }
      },
      false
    );
  }

  toggle_overview_mode() {
    // null/undefined is falsey
    if ( ! this.overview_active) {
      this.getParent().getElement().onclick = () => {
        atom.commands.dispatch(atom.workspace.getElement(), 'code-ribbon:toggle-overview');
      };
      // calculate where to zoom out from
      var horiz_transformpoint = (
        this.getParent().getElement().scrollLeft + (
          this.getParent().getElement().clientWidth / 2
        )
      );
      crdebug("Calculated horiz_transformpoint as ", horiz_transformpoint);
      this.getElement().style.transformOrigin = horiz_transformpoint.toString() + "px 50%";
      this.getElement().classList.add('cr-overview-active');
      this.overview_active = true;
    }
    else {
      this.getParent().getElement().onclick = "";
      // calculate where to zoom back in to
      var active_pane = atom.workspace.getActivePane();
      var horiz_transformpoint = (
        active_pane.getElement().offsetLeft + (
          active_pane.getElement().offsetWidth / 2
        )
      );
      crdebug("Calculated horiz_transformpoint as ", horiz_transformpoint);
      crdebug("Refocusing activePane!");
      atom.workspace.getActivePane().element.scrollIntoView({
        block: "center", // vertical
        // TODO smooth this out for continuation in transitionend hook
        inline: "center", // horizontal
        behavior: "smooth"
      });
      this.getElement().style.transformOrigin = horiz_transformpoint.toString() + "px 50%";
      this.getElement().classList.remove('cr-overview-active');
      this.overview_active = false;
    }
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

  cr_update() {
    // create enough Ribbons to satisfy config values
    while (
      this.children.length <
      atom.config.get("code-ribbon.pane_count_calc.pane_count_vertical_number")
    ) {
      var n_crsr = new CodeRibbonSingleRibbon({
        orientation: null,
        children: null, // will auto-populate in CodeRibbonSingleRibbon constructor
        flexScale: null
      }, this.viewRegistry);
      this.addChild(n_crsr);
      crdebug("CodeRibbonRibbonContainer made new CodeRibbonSingleRibbon:", n_crsr);
      n_crsr.initialize();
    }

    // update all the children
    this.children.map(child => {
      child.cr_update();
    });

    // set width and scrolling etc,
    // find the max number of items of any child:
    this.max_horiz_patches = 1;
    // crdebug("Finding max_horiz_patches...")
    this.children.map(child => {
      // crdebug("Looking at ", child);
      if (child.children.length > this.max_horiz_patches) {
        this.max_horiz_patches = child.children.length;
      }
    });
    var widthpercent = 100 * (
      this.max_horiz_patches / atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number")
    );
    this.getElement().style.width = widthpercent.toString() + "%";

    // TODO deal with case when we have too many Ribbons for target count

  }

}

module.exports = CodeRibbonRibbonContainer;
