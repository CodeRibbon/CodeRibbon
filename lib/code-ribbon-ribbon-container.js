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
  metrics,
  global_cr_update, // eslint-disable-line no-unused-vars
  get_crrc,
  get_cr_panecontainer
} = require('./cr-base');
const {
  scrollPatchIntoView,
  getActivePatchClientWidth,
  getPreferredLineLengthCharacters,
  getTextEditorBaseCharacterWidth,
  getActivePatchOrMostRecent
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
    this.overview_active = state.overviewActive || false;
    this.zoom_active = false;
    this.previousBaseCharacterWidth = state.previousBaseCharacterWidth || getTextEditorBaseCharacterWidth();

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

    this.resize_observer = new ResizeObserver(modifications => {
      // for (let modification of modifications) { // eslint-disable-line no-unused-vars
      //   crdebug("ResizeObserver modification:", modification);
      // }
      this.recalc_width();
    });

    this.resize_observer.observe(
      this.element
    );

    // init ribbons
    this.children.map(child => {
      child.initialize();
      child.onDidDestroy(() => {
        crdebug("CodeRibbonSingleStrip destroyed:", child);
        global_cr_update();
      });
    });

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:scroll-ribbon-left': () => {
        this.parent.element.scroll({
          "left": this.parent.element.scrollLeft - getActivePatchClientWidth(),
          "behavior": 'smooth'
        });
      },
      'code-ribbon:scroll-ribbon-right': () => {
        this.parent.element.scroll({
          "left": this.parent.element.scrollLeft + getActivePatchClientWidth(),
          "behavior": 'smooth'
        });
      }
    }));

    // this.cr_update();

    if (this.overview_active === true) {
      this.overview_active = false;
      this.toggle_overview_mode();
    }

    metrics.event({
      name: 'RibbonContainer init'
    });
    crdebug("CRRC init complete.");
  }

  toggle_overview_mode() {
    crdebug("Toggling overview... previously:", this.overview_active);
    var active_pane = atom.workspace.getActivePane();
    var crrc = get_crrc();
    // null/undefined is falsey
    // zoom out:
    if (this.overview_active == false) {
      this.getParent().getElement().onclick = () => {
        atom.commands.dispatch(atom.workspace.getElement(), 'code-ribbon:toggle-overview');
      };
      // calculate where to zoom out from
      let crrc_pel = crrc.getParent().getElement();
      this.horiz_transformpoint = (
        crrc_pel.scrollLeft + (crrc_pel.clientWidth / 2)
      );
      crdebug("Calculated horiz_transformpoint as ", this.horiz_transformpoint);
      this.getElement().style.transformOrigin = this.horiz_transformpoint.toString() + "px 50%";
      this.element.classList.add('cr-overview-active');
      this.getParent().getElement().classList.add('cr-overview-active');
      this.overview_active = true;

      metrics.event({
        name: 'Overview active'
      });
    }
    // zoom back normal:
    else if (this.overview_active == true) {
      this.getParent().getElement().onclick = "";
      // crdebug("Refocusing activePane!");
      // atom.workspace.getActivePane().element.scrollIntoView({
      //   block: "center", // vertical
      //   // TODO smooth this out for continuation in transitionend hook
      //   inline: "center", // horizontal
      //   behavior: "smooth"
      // });
      this.element.addEventListener('transitionend', this.element_transitionend_overview_mode);
      this.element.classList.remove('cr-overview-active');
      this.getParent().getElement().classList.remove('cr-overview-active');
      this.overview_active = false;
      crdebug(this, "Exiting overview...");
      // NOTE DONT cr_update here because that will happen after the transition

      metrics.event({
        name: 'Overview inactive'
      });
    }
    else {
      crlogger.error("Bad value:", this, this.overview_active);
      this.overview_active = false;
    }
  }

  /**
   * NOTE `this` is the element!
   */
  element_transitionend_overview_mode(event) {
    if (
      event.srcElement !== this ||
      event.target !== this ||
      event.propertyName != "transform"
    ) {
      // only pay attention to our own transition
      return;
    }
    crdebug("transition overview END", this, this.model, event);
    setTimeout(() => {
      scrollPatchIntoView(
        atom.workspace.getActivePane(),
        () => {
          // global_cr_update();
        }
      );
    }, 0);
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

  toggle_zoom_mode() {
    var ap = atom.workspace.getActivePane();
    // what if it's not a CodeRibbonPatch?
    if ( ! ap.cr_patch_toggle_zoom ) {
      atom.notifications.addWarning(
        "Please select a Patch!",
        {
          "description": "Only CodeRibbon Patches can be zoomed in the workspace!"
        }
      );
      return;
    }
    ap.cr_patch_toggle_zoom();
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'CodeRibbonRibbonContainer',
      children: this.children.map(singlestrip => singlestrip.serialize()),
      orientation: this.orientation,
      flexScale: this.flexScale,
      stripQuota: this.stripQuota,
      downDroppedSerializedRibbons: this.downDroppedSerializedRibbons,
      overviewActive: this.overview_active
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
      crdebug("Not destroying empty CRRC.");
      // this.destroy();
    }
  }

  getHorizontalPatchesPerScreen() {
    if (
      atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_mode")
      == "linelength"
      || atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_mode")
      == "cr-linelength"
    ) {
      const lineWidthPreference = getPreferredLineLengthCharacters();
      const charWidth = getTextEditorBaseCharacterWidth();
      var elementWidth = this.element.offsetWidth;
      const n = Math.floor(
        elementWidth / (
          lineWidthPreference * charWidth
        )
      ) || 1
      if (
        n < 1 ||
        n > 200
      ) {
        crlogger.warn("getHorizontalPatchesPerScreen() came up with unreasonable result:", n);
        crlogger.warn("getTextEditorBaseCharacterWidth():", charWidth);
        crlogger.warn("getPreferredLineLengthCharacters():", lineWidthPreference);
        crlogger.warn("this.element.offsetWidth:", elementWidth);
        crdebug(this);
        crdebug("Using pane_count_horizontal_number plugin config value as fallback.");
        return atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number");
      }
      else {
        return n;
      }
    }
    else if (
      atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_mode")
      == "number"
    ) {
      return atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number");
    }
    else {
      crlogger.error("Unknown pane_count_calc method.");
    }
    return 1;
  }

  cr_update() {
    var horiz_patches_per_screen = this.getHorizontalPatchesPerScreen();
    // JUST for this following logic
    if (horiz_patches_per_screen < 2) horiz_patches_per_screen = 2;

    if (this.children.length < horiz_patches_per_screen) {
      // create enough Ribbons to satisfy config values
      while (
        this.children.length <
        horiz_patches_per_screen
      ) {
        crdebug("CRRC Adding strip to fill initial window:", this.children.length, "of", this.stripQuota);
        this.cr_add_strip();
      }
    }
    else if (this.count_empty_right_patch_columns() == this.children.length) {
      // empty ribbon, no need to add or remove
      crdebug("Open some things!");
    }
    else {
      // if the last N cols are empty: remove until there are horiz_patches_per_screen-1 empty cols remaining
      if (this.count_empty_right_patch_columns() >= horiz_patches_per_screen) {
        crdebug("CRRC trimming the tail off the ribbon.");
        this.children[this.children.length-1].destroy();
      }
    }

    // if the tail end is full, add more space:
    if (this.children[this.children.length-1].get_contentful_size() > 0) {
      this.cr_add_strip();
    }

    // update all the children
    this.children.map(child => {
      child.cr_update();
    });

    this.recalc_width();
  }

  recalc_width() {
    let new_hpps = this.getHorizontalPatchesPerScreen();
    const widthpercent = 100 / new_hpps;

    if (new_hpps == this.prev_hpps) {
      this.children.map((child) => {
        child.getElement().style.flexBasis = widthpercent.toString() + "%";
      });
      this.align_ribbon_to_nearest_snap_point({scroll_behavior: 'instant'});
    }
    else {
      crdebug("HPPS is changing from", this.prev_hpps, "to", new_hpps);
      this.children.map((child) => {
        child.getElement().classList.add("cr-resize-active");
      });

      const crpc = get_cr_panecontainer();
      // check which strip needs to stay on screen:
      let crss;
      let ap;
      if (new_hpps < this.prev_hpps) {
        // view is getting smaller
        if (getActivePatchOrMostRecent() && getActivePatchOrMostRecent().isVisible()) {
          // prefer to keep the active focus patch on screen
          ap = getActivePatchOrMostRecent();
          crss = ap.parent;
        }
        else {
          crss = this.get_first_visible_strip();
        }
      }
      else {
        // view is getting wider
        // ap = getActivePatchOrMostRecent();
        crss = this.get_first_visible_strip();
      }

      if (! crss) {
        crlogger.error("recalc_width: no visible strip");
      }

      this.children.map((child) => {
        child.getElement().style.flexBasis = widthpercent.toString() + "%";
      });

      // wait for next frame
      setTimeout(() => {
        if (ap && !ap.isVisible()) {
          crdebug("HPPS changed: keeping focused Patch in view");
          scrollPatchIntoView(ap, undefined, {
            scroll_behavior: 'instant'
          });
        }
        else {
          let crpc_bounds = crpc.element.getBoundingClientRect();
          let crss_bounds = crss.element.getBoundingClientRect();
          let scrolldiff = crss_bounds.left - crpc_bounds.left;
          crpc.element.scrollBy({
            left: scrolldiff,
            behavior: 'instant'
          });
        }

        this.children.map((child) => {
          child.getElement().classList.remove("cr-resize-active");
        });
      });

      this.prev_hpps = new_hpps;
    }
  }

  cr_add_strip(index = this.children.length, new_children = null) {
    // add a column
    var n_crsr = new CodeRibbonSingleStrip({
      orientation: null,
      // will auto-populate in CodeRibbonSingleStrip constructor
      children: new_children,
      flexScale: null
    }, this.viewRegistry);
    this.addChild(n_crsr, index);
    crdebug("CodeRibbonRibbonContainer added new CodeRibbonSingleStrip at index ", index, ":", n_crsr);
    n_crsr.initialize();
    n_crsr.onDidDestroy(() => {
      crdebug("CodeRibbonSingleStrip destroyed:", n_crsr);
      setTimeout(() => {
        global_cr_update();
      });
    });

    metrics.event({
      name: 'Strip added',
      index: index
    });
    return n_crsr;
  }

  /**
   * returns the sibling next to baseChild
   * @param  {Pane} baseChild sibling which serves as base reference
   * @param  {"left","right"} side which side of the baseChild
   * @return {Pane,undefined} probably a patch
   */
  get_sibling(baseChild, side) {
    const baseChildIndex = this.children.indexOf(baseChild);
    if (baseChildIndex == -1) {
      return undefined;
    }
    switch (side) {
      case 'before':
      case 'above':
      case 'left':
        if (baseChildIndex <= 0 ) {
          return undefined;
        }
        else {
          return this.children[baseChildIndex - 1];
        }
        break; // eslint-disable-line no-unreachable
      case 'after':
      case 'below':
      case 'right':
        if ( (baseChildIndex + 1) >= this.children.length) {
          return undefined;
        }
        else {
          return this.children[baseChildIndex + 1];
        }
        break; // eslint-disable-line no-unreachable
      default:
        crlogger.error("CodeRibbonRibbonContainer: get_sibling: Bad argument: side:", side);
        return undefined;
    }
  }

  /**
   * How many empty cols are at the tail end of the ribbon?
   * @return {bool} true when patch column was removed
   */
  count_empty_right_patch_columns() {
    let count = 0;
    for (
      var i = this.children.length - 1;
      i >= 0;
      i--
    ) {
      if (this.children[i].get_contentful_size() == 0) {
        count++;
      }
      else {
        break;
      }
    }
    return count;
  }

  /**
   * if there's a visible empty patch, return it, else undefined
   *
   * @return {[type]} [description]
   */
  find_visible_empty_patch() {
    for (let i=0; i<this.children.length; i++) {
      let crss = this.children[i];
      if (crss.isVisible()) {
        let pm = crss.find_empty_patch();
        if (pm) return pm;
      }
    }
    return undefined;
  }

  /**
   * returns the empty patch at the end of the ribbon where the it should grow
   *
   * needed to quickly scroll to or focus the very end of the entire loaded ribbon
   * @return {CodeRibbonPatch} empty patch at ribbon's tail
   */
  get_ribbon_tail_empty_patch() {
    for (let i=this.children.length-1; i >= 0; i--) {
      var crss = this.children[i];
      if (crss.get_contentful_size()) break;
    }
    let pm = crss.find_empty_patch();
    if (pm) return pm;
    crss = this.get_sibling(crss, 'right');
    // TODO is there a possibility crss is now undefined?
    pm = crss.find_empty_patch();
    if (pm) {
      return pm
    }
    else {
      crlogger.error("No empty patch at the ribbon tail?", crss);
    }
  }

  get_first_visible_strip() {
    let crss;
    for (let i=0; i<this.children.length; i++) {
      crss = this.children[i];
      if (crss.isVisible()) {
        break;
      }
    }
    if (! crss.isVisible()) {
      crlogger.error("failed to find a visible column within the Ribbon!");
      return undefined;
    }
    return crss;
  }

  /**
   * move the ribbon the minimal amount such that the Patches are aligned with
   * screen edges
   * @param  {Number} [nearby_cutoff_px=0] zero/falsey to disable, do not scroll if further away than n pixels
   * @return {bool} if scrolling was needed/started
   */
  align_ribbon_to_nearest_snap_point(
      {
        nearby_cutoff_px = null,
        scroll_behavior = 'smooth'
      }={}
    ) {
    let crpc = get_cr_panecontainer();
    // find a visible column
    let crss = this.get_first_visible_strip();
    if (! crss) {
      crlogger.error("align_ribbon_to_nearest_snap_point: no visible strip");
      return false;
    }
    let crpc_bounds = crpc.element.getBoundingClientRect();
    let crss_bounds = crss.element.getBoundingClientRect();

    let scrolldiff = crss_bounds.left - crpc_bounds.left;

    if (Math.abs(scrolldiff) < 1) return false;
    if (nearby_cutoff_px && Math.abs(scrolldiff) > nearby_cutoff_px) return false;

    crpc.element.scrollBy({
      left: scrolldiff,
      behavior: scroll_behavior
    });
    return true;
  }

}

module.exports = CodeRibbonRibbonContainer;
