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
  global_cr_update
} = require('./cr-base');
const CodeRibbonSingleStrip = require('./code-ribbon-single-strip');

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
    this.orientation = "horizontal";

    if (state.stripQuota) {
      this.stripQuota = state.stripQuota;
    }
    else {
      // This will be updated later:
      this.stripQuota = atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number");
    }

    crdebug("CodeRibbonRibbonContainer: constructed:", this.element);
  }

  initialize() {
    this.getElement().classList.add("cr-ribbon-container");

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
          global_cr_update();
          // force all the editors to recheck dimensions:
          atom.workspace.getTextEditors().map((some_editor) => {
            if (some_editor.component != null) {
              //crdebug("Updating editor styles", some_editor);
              some_editor.component.didUpdateStyles();
            }
          });
        }
      },
      false
    );

    // init ribbons
    this.children.map(child => {
      child.initialize();
    });

    this.cr_update();
  }

  toggle_overview_mode() {
    // null/undefined is falsey
    // zoom out:
    if ( ! this.overview_active) {
      this.getParent().getElement().onclick = () => {
        atom.commands.dispatch(atom.workspace.getElement(), 'code-ribbon:toggle-overview');
      };
      // calculate where to zoom out from
      this.horiz_transformpoint = (
        this.getParent().getElement().scrollLeft + (
          this.getParent().getElement().clientWidth / 2
        )
      );
      crdebug("Calculated horiz_transformpoint as ", this.horiz_transformpoint);
      this.getElement().style.transformOrigin = this.horiz_transformpoint.toString() + "px 50%";
      this.getElement().classList.add('cr-overview-active');
      this.overview_active = true;
    }
    // zoom back normal:
    else {
      this.getParent().getElement().onclick = "";
      // calculate where to zoom back in to
      var active_pane = atom.workspace.getActivePane();
      this.horiz_transformpoint = (
        active_pane.getElement().offsetLeft + (
          active_pane.getElement().offsetWidth / 2
        )
      );
      crdebug("Calculated horiz_transformpoint as ", this.horiz_transformpoint);
      crdebug("Refocusing activePane!");
      atom.workspace.getActivePane().element.scrollIntoView({
        block: "center", // vertical
        // TODO smooth this out for continuation in transitionend hook
        inline: "center", // horizontal
        behavior: "smooth"
      });
      this.getElement().style.transformOrigin = this.horiz_transformpoint.toString() + "px 50%";
      this.getElement().classList.remove('cr-overview-active');
      this.overview_active = false;
    }
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'CodeRibbonRibbonContainer',
      children: this.children.map(singlestrip => singlestrip.serialize()),
      orientation: this.orientation,
      flexScale: this.flexScale,
      stripQuota: this.stripQuota,
      downDroppedSerializedRibbons: this.downDroppedSerializedRibbons
    };
  }

  cr_update() {
    // create enough Ribbons to satisfy config values
    while (
      this.children.length <
      this.stripQuota
    ) {
      var n_crsr = new CodeRibbonSingleStrip({
        orientation: null,
        children: null, // will auto-populate in CodeRibbonSingleStrip constructor
        flexScale: null
      }, this.viewRegistry);
      this.addChild(n_crsr);
      crdebug("CodeRibbonRibbonContainer made new CodeRibbonSingleStrip:", n_crsr);
      n_crsr.initialize();
    }

    // increment / remove stripQuota
    if (
      this.autoremove_excess_empty_right_patch_column() == false
    ) {
      this.autoincrement_strip_quota();
    }

    // update all the children
    this.children.map(child => {
      child.cr_update();
    });

    // set width and scrolling etc,
    var widthpercent = 100.0 * (
      this.stripQuota / atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number")
    );
    this.getElement().style.width = widthpercent.toString() + "%";

    // TODO deal with case when we have too many Ribbons for target count

  }

  cr_add_column_right() {
    // patches add empty panes right to meet quota
    this.stripQuota++;
    this.cr_update();
  }

  /**
   * Increases the patch quota so that there's at one screen of patches -1
   * of patches being renderend after the last contentful patch
   * @return {bool} true if stripQuota was increased
   */
  autoincrement_strip_quota() {
    // check if we need to increase

    if (
      this.stripQuota <
      atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number")
    ) {
      this.stripQuota = atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number") + 1;
      return true;
    }
    else if (
      this.children[this.children.length-1].get_contentful_size() > 0
    ) {
      this.stripQuota++;
      return true;
    }
    else return false;
  }

  /**
   * Removes a right patch column if there's an empty screen's worth of patches
   * @return {bool} true when patch column was removed
   */
  autoremove_excess_empty_right_patch_column() {
    if (this.children.length <= atom.config.get('code-ribbon.pane_count_calc.pane_count_horizontal_number')) {
      return false;
    }
    for (
      var i = this.children.length - 1;
      i >= this.children.length - atom.config.get('code-ribbon.pane_count_calc.pane_count_horizontal_number');
      i--
    ) {
      crdebug("Checking autoremove allowance of ", this.children[i]);
      if (
        this.children[i].get_contentful_size() > 0
      ) {
        return false;
      }
    }
    // then we should be able to remove a patch column
    crdebug("Trimming ribbon...");
    this.children[this.children.length-1].destroy();
    this.stripQuota--;
    return true;
  }

}

module.exports = CodeRibbonRibbonContainer;
