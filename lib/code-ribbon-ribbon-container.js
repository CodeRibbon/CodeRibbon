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
  global_cr_update // eslint-disable-line no-unused-vars
} = require('./cr-base');
const {
  getHorizontalPatchesPerScreen,
  scrollPatchIntoView,
  onScrollStopOnce
} = require('./cr-common');

const CodeRibbonSingleStrip = require('./code-ribbon-single-strip');

/**
 * Containing Axis that holds Ribbons
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
    this.downDroppedSerializedRibbons = state.downDroppedSerializedRibbons || [];
    this.overview_active = false;
    this.focus_active = false;

    // We always stack ribbons vertically
    this.orientation = "horizontal";

    if (state.stripQuota) {
      this.stripQuota = state.stripQuota;
    }
    else {
      // This will be updated later:
      this.stripQuota = atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number");
    }
    if (this.stripQuota < 2) this.stripQuota = 2;

    crdebug("CodeRibbonRibbonContainer children:", this.children);
    crdebug("CodeRibbonRibbonContainer stripQuota:", this.stripQuota);
  }

  initialize() {
    this.getElement().classList.add("cr-ribbon-container");

    /*
    // give focus back to whichever pane had (or now has) focus
    this.getElement().addEventListener(
      "transitionend",
      function(event) {
        // crdebug("transitionend event: ", event);
        if (
          // ignore events from children elements bubbling up
          (event.propertyName == "transform" || event.propertyName == "width") &&
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
    //*/

    // init ribbons
    this.children.map(child => {
      child.initialize();
      child.onDidDestroy(() => {
        crdebug("CodeRibbonSingleStrip destroyed:", child);
        global_cr_update();
      });
    });

    this.cr_update();
  }

  toggle_overview_mode() {
    // null/undefined is falsey
    // zoom out:
    if (this.overview_active === false) {
      this.getParent().getElement().onclick = () => {
        atom.commands.dispatch(atom.workspace.getElement(), 'code-ribbon:toggle-overview');
      };
      // calculate where to zoom out from
      // this.horiz_transformpoint = (
      //   this.getParent().getElement().scrollLeft + (
      //     this.getParent().getElement().clientWidth / 2
      //   )
      // );
      // crdebug("Calculated horiz_transformpoint as ", this.horiz_transformpoint);
      // this.getElement().style.transformOrigin = this.horiz_transformpoint.toString() + "px 50%";
      this.element.classList.add('cr-overview-active');
      this.overview_active = true;
    }
    // zoom back normal:
    else {
      this.getParent().getElement().onclick = "";
      // calculate where to zoom back in to
      // var active_pane = atom.workspace.getActivePane();
      // this.horiz_transformpoint = (
      //   active_pane.getElement().offsetLeft + (
      //     active_pane.getElement().offsetWidth / 2
      //   ) * 2
      // );
      // crdebug("Calculated horiz_transformpoint as ", this.horiz_transformpoint);
      // crdebug("Refocusing activePane!");
      // atom.workspace.getActivePane().element.scrollIntoView({
      //   block: "center", // vertical
      //   // TODO smooth this out for continuation in transitionend hook
      //   inline: "center", // horizontal
      //   behavior: "smooth"
      // });
      // this.element.style.transformOrigin = this.horiz_transformpoint.toString() + "px 50%";
      this.element.addEventListener('transitionend', this.element_transitionend_overview_mode);
      this.element.classList.remove('cr-overview-active');
      this.overview_active = false;
      crdebug("Exiting overview...");
      // NOTE DONT cr_update here because that will happen after the transition
      // scrollPatchIntoView(atom.workspace.getActivePane(), "center");
    }
  }

  /**
   * NOTE `this` is the element!
   */
  element_transitionend_overview_mode(event) {
    crdebug("transition overview END", this, this.model, event);
    if (
      event.srcElement !== this &&
      event.target !== this
    ) {
      // only pay attention to our own transition
      return;
    }
    scrollPatchIntoView(
      atom.workspace.getActivePane(),
      () => {global_cr_update();}
    );
    // remove the listener after we're done
    this.removeEventListener(
      'transitionend',
      this.model.element_transitionend_overview_mode
    );

    // force all the editors to recheck dimensions:
    atom.workspace.getTextEditors().map((some_editor) => {
      if (some_editor.component != null) {
        //crdebug("Updating editor styles", some_editor);
        some_editor.component.didUpdateStyles();
      }
    });
  }

  toggle_focus_mode() {
    if ( ! this.focus_active ) {
      var ap = atom.workspace.getActivePane();
      // what if it's not a CodeRibbonPatch?
      if ( ! ap.cr_focused ) {
        atom.notifications.addWarning(
          "Please select a Patch!",
          {
            "description": "Select a patch so that we know what to focus!"
          }
        );
        return;
      }
      ap.cr_focused();
      this.element.classList.add('cr-focus-active');
      this.focus_active = ap;
    }
    else {
      this.element.addEventListener(
        'transitionend',
        this.element_transitionend_focus_mode
      );
      this.element.classList.remove('cr-focus-active');
      this.focus_active.cr_unfocused();
      this.previous_focus_active = this.focus_active;
      this.focus_active = undefined;
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

  removeChild (child, replacing = false) {
    const index = this.children.indexOf(child);
    if (index === -1) {
      throw new Error('Removing non-existent child')
    }

    this.unsubscribeFromChild(child);

    this.children.splice(index, 1);
    this.adjustFlexScale();
    this.emitter.emit('did-remove-child', {child, index});
    // if (!replacing && this.children.length < 2) {
    if (!replacing && this.children.length < 1) {
      this.destroy();
    }
  }

  cr_update() {
    // increment / remove stripQuota
    if (
      this.autoremove_excess_empty_right_patch_column() == false
    ) {
      this.autoincrement_strip_quota();
    }

    // create enough Ribbons to satisfy config values
    while (
      this.children.length <
      this.stripQuota
    ) {
      this.cr_add_strip();
    }

    // update all the children
    this.children.map(child => {
      child.cr_update();
    });

    // set width and scrolling etc,
    var widthpercent = 100 / getHorizontalPatchesPerScreen();
    this.children.map((child) => {
      // crdebug("Setting child width:", this, child, widthpercent);
      child.getElement().style.flexBasis = widthpercent.toString() + "%";
    });
    // this.getElement().style.width = widthpercent.toString() + "%";

    // TODO deal with case when we have too many Ribbons for target count

  }

  cr_add_strip(index = this.children.length) {
    // add a column
    var n_crsr = new CodeRibbonSingleStrip({
      orientation: null,
      children: null, // will auto-populate in CodeRibbonSingleStrip constructor
      flexScale: null
    }, this.viewRegistry);
    this.addChild(n_crsr, index);
    crdebug("CodeRibbonRibbonContainer added new CodeRibbonSingleStrip at index ", index, ":", n_crsr);
    n_crsr.initialize();
    n_crsr.onDidDestroy(() => {
      crdebug("CodeRibbonSingleStrip destroyed:", n_crsr);
      global_cr_update();
    });
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
      getHorizontalPatchesPerScreen()
    ) {
      this.stripQuota = getHorizontalPatchesPerScreen() + 1;
      return true;
    }
    else if (
      this.children.length > 0 &&
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
    if (this.children.length <= getHorizontalPatchesPerScreen()) {
      return false;
    }
    for (
      var i = this.children.length - 1;
      i >= this.children.length - getHorizontalPatchesPerScreen();
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
