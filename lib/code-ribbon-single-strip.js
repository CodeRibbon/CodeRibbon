
const {
  crdebug,
  crlogger,
  global_cr_update,
  PaneAxis,
  metrics,
  get_cr_panecontainer
} = require('./cr-base');

const {
  getVerticalPatchesPerScreen
} = require('./cr-common');

const CodeRibbonPatch = require('./code-ribbon-patch');

const { CompositeDisposable } = require('atom');

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
    // this.leftDroppedSerializedPatches = state.leftDroppedSerializedPatches || [];

    // ribbons always show panes horizontally
    this.orientation = "vertical";
    this.session_restored = state.session_restored || false;

    this.subscriptions = new CompositeDisposable();

    crdebug("CodeRibbonSingleStrip: constructed.");
  }

  initialize() {
    // init on Patches
    this.children.map(child => {
      child.initialize();
    });
    this.getElement().classList.add('cr-vertical-strip');

    if (! this.session_restored && this.children.length == 0) {
      // add panes to meet quota:
      while (
        this.children.length <
        getVerticalPatchesPerScreen()
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
    }

    this.children.map((child) => {
      child.onDidDestroy(() => {
        crdebug("CodeRibbonPatch destroyed:", n_pane);
        global_cr_update();
      });
    });

    this.getElement().addEventListener('mousedown', (e) => {
      if (e.target.matches("atom-pane-resize-handle.vertical")) {
        if (! atom.workspace.getCenter().getActivePane().parent.isVisible()) {
          // then we should move focus into this column
          crdebug("CRSS acquires focus due to patch-resize-handle grab:", this);
          this.children[0].activate();
        }
      }
    }, {capture: true, passive: true});

    this.subscriptions.add(this.onDidDestroy(() => {
      this.subscriptions.dispose();
    }));

    // this.subscriptions.add(this.onDidRemoveChild(({child, index}) => {
    // }));

    this.cr_update();

    metrics.event({
      name: 'Strip init',
      id: this.id
    });
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'CodeRibbonSingleStrip',
      children: this.children.map(child => child.serialize()),
      orientation: this.orientation,
      flexScale: this.flexScale,
      session_restored: true,
      //leftDroppedSerializedPatches: this.leftDroppedSerializedPatches
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

  get_contentful_size() {
    var totalsize = 0;
    this.children.map((child) => {
      totalsize += child.get_contentful_size();
    });
    return totalsize;
  }

  find_empty_patch() {
    return this.children.find(child => {
      return child.get_contentful_size() == 0;
    });
  }

  /**
   * mimick the Atom Pane `close`: close unless user cancels via dialog
   * @return {[type]} [description]
   */
  close() {
    var children_close_promises = this.children.map((child) => {
      return child.closable();
    });
    crdebug("Waiting for children to destroy:", children_close_promises);
    var all_children_closing = Promise.all(children_close_promises);
    all_children_closing.then((values) => {
      crdebug("Destroying after promises resolved:", values);
      // move focus to the next strip
      let next_strip = this.parent.get_sibling(this, 'right');
      this.destroy();
      next_strip.children[0].smoothactivate();
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
        crlogger.error("CodeRibbonSingleStrip: get_sibling: Bad argument: side:", side);
        return undefined;
    }
  }

  cr_update() {
    // cr_update on Patches
    this.children.map(child => {
      child.cr_update();
    });
  }

  isActive() {
    // if we contain active pane
    var activePane = this.children.find((child) => {
      return child.isActive();
    });
    if (activePane) return true;
    else return false;
  }

  isVisible() {
    let myrects = this.element.getBoundingClientRect();
    let pc = get_cr_panecontainer();
    let pcrects = pc.element.getBoundingClientRect();

    let centerx = (myrects.left + myrects.right) / 2;
    let centery = (myrects.top + myrects.bottom) / 2;

    // crdebug("isVisible? on screen:", centerx, centery, "inside of", pcrects);
    // if center of crss is within pc:
    if (
      (centerx >= pcrects.left) &&
      (centerx <= pcrects.right) &&
      (centery >= pcrects.top) &&
      (centery <= pcrects.bottom)
    ) {
      return true;
    }
    return false;
  }
}

module.exports = CodeRibbonSingleStrip;
