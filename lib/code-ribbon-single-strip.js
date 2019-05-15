
const {
  crdebug,
  crlogger,
  PaneAxis
  // Pane
} = require('./cr-base');

const CodeRibbonPatch = require('./code-ribbon-patch');

class CodeRibbonSingleStrip extends PaneAxis {

  static deserialize(state, {
    deserializers,
    views
  }) {
    state.children = state.children.map(patchState => deserializers.deserialize(patchState));
    return new CodeRibbonSingleStrip(state, views)
  }

  constructor(state, viewRegistry) {
    super(state, viewRegistry);
    crdebug("CodeRibbonSingleStrip children:", this.children);
    this.leftDroppedSerializedPatches = state.leftDroppedSerializedPatches || [];

    // ribbons always show panes horizontally
    this.orientation = "vertical";

    crdebug("CodeRibbonSingleStrip: constructed.");
  }

  initialize() {
    // init on Patches
    this.children.map(child => {
      child.initialize();
    });
    this.getElement().classList.add('cr-vertical-strip');
    this.cr_update();
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'CodeRibbonSingleStrip',
      children: this.children.map(child => child.serialize()),
      orientation: this.orientation,
      flexScale: this.flexScale,
      leftDroppedSerializedPatches: this.leftDroppedSerializedPatches
    };
  }

  at_least_n_empty_right_patches(target_num = 2) {
    if (target_num > this.children.length) return false;
    for (var i = 1; i <= target_num; i++) {
      if (
        this.children[this.children.length -i].getItems().length > 0
      ) {
        return false;
      }
    }
    // if there weren't any panes that had at least one item:
    return true;
  }

  /**
   * returns the length of this ribbon not including trailing empty patches
   * @return {number} position (1-based) of the lowest patch
   */
  get_contentful_size() {
    var totalsize = 0;
    this.children.map((child) => {
      totalsize += child.get_contentful_size();
    });
    return totalsize;
  }

  /**
   * mimick the Atom Pane `close`: close unless user cancels via dialog
   * @return {[type]} [description]
   */
  close() {
    var children_close_promises = this.children.map((child) => {
      return child.close();
    });
    crdebug("Waiting for children to destroy:", children_close_promises);
    var all_children_closing = Promise.all(children_close_promises);
    all_children_closing.then((values) => {
      crdebug("Destroying after promises resolved:", values);
      this.destroy();
    });
    all_children_closing.catch((reason) => {
      crdebug("Could not close RibbonStrip:", reason);
    });
    return all_children_closing;
  }

  remove_rightmost_patch() {
    var target_patch = this.children[this.children.length -1];
    if (target_patch.getItems().length > 0) {
      crlogger.warn("Removing a Patch which isn't empty: ", target_patch);
    }
    target_patch.destroy();
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

  /**
   * returns the sibling next to baseChild
   * @param  {Pane} baseChild sibling which serves as base reference
   * @param  {"before","after"} side which side of the baseChild
   * @return {Pane,undefined} probably a patch
   */
  get_sibling(baseChild, side) {
    const baseChildIndex = this.children.indexOf(baseChild);
    if (baseChildIndex == -1) {
      return undefined;
    }
    switch (side) {
      case 'before':
        if (baseChildIndex <= 0 ) {
          return undefined;
        }
        else {
          return this.children[baseChildIndex - 1];
        }
        break; // eslint-disable-line no-unreachable
      case 'after':
        if ( (baseChildIndex + 1) >= this.children.length) {
          return undefined;
        }
        else {
          return this.children[baseChildIndex + 1];
        }
        break; // eslint-disable-line no-unreachable
      default:
        crlogger.error("CodeRibbonSingleStrip: get_sibling: Bad argument: side:", side);
        return undefined;
    }
  }

  cr_update() {
    // add panes to meet quota:
    while (
      this.children.length <
      atom.config.get("code-ribbon.pane_count_calc.pane_count_vertical_number")
    ) {
      var n_pane = new CodeRibbonPatch({
        viewRegistry: this.viewRegistry,
        applicationDelegate: atom.applicationDelegate, // TODO wtf is this???
        config: atom.config
      });
      // using addChild from the PaneAxis
      this.addChild(n_pane);
      n_pane.initialize();
      crdebug("CodeRibbonSingleStrip made new n_pane:", n_pane)
    }

    // TODO load or unload from leftDroppedSerializedPatches

    // TODO set width and scrolling etc,
    // ensure that we have the quota of patches to match sibling ribbons

    // cr_update on Patches
    this.children.map(child => {
      child.cr_update();
    });
  }


  isActive() {
    // if we contain active pane
  }
}

module.exports = CodeRibbonSingleStrip;
