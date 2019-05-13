
const {
  crdebug,
  crlogger,
  Pane,
  fuzzyFinderMainModule,
  fuzzyFinderProjectView,
  global_cr_update
} = require('./cr-base');

const CodeRibbonTipsView = require('./code-ribbon-tips-view.js');

class CodeRibbonPatch extends Pane {

  static deserialize (state, {
    deserializers,
    applicationDelegate,
    config,
    notifications,
    views
  }) {
    const {activeItemIndex} = state;
    const activeItemURI = state.activeItemURI || state.activeItemUri;

    const items = []
    for (const itemState of state.items) {
      const item = deserializers.deserialize(itemState);
      if (item) items.push(item);
    }
    state.items = items;

    state.activeItem = items[activeItemIndex]
    if (!state.activeItem && activeItemURI) {
      state.activeItem = state.items.find((item) =>
        typeof item.getURI === 'function' && item.getURI() === activeItemURI
      );
    }

    return new CodeRibbonPatch(Object.assign({
      deserializerManager: deserializers,
      notificationManager: notifications,
      viewRegistry: views,
      config,
      applicationDelegate
    }, state));
  }

  constructor(params = {}) {
    super(params);

    // create a fuzzy finder object for us to use when we have no items
    this.ff_ProjectView = new fuzzyFinderProjectView(
      fuzzyFinderMainModule.projectPaths
    );
    this.ff_ProjectView.element.classList.add('cr-patch-fuzzyfinder');
    this.ff_ProjectView.selectListView.refs.queryEditor.setPlaceholderText("Search project files...");

    this.cr_TipsView = new CodeRibbonTipsView(this);
    this.cr_TipsView.element.classList.add('cr-patch-background-tips');
  }

  /**
   * open a file in this editor, will replace any existing item
   * @param {URI} n_initialpath URI to open
   */
  replace_primary_item_with_uri(n_initialpath) {
    var n_item_promise = atom.workspace.createItemForURI(n_initialpath);
    n_item_promise.then(n_item => {
      crdebug("Replacing item in", this, "with ", n_item);
      this.addItem(n_item);
      this.setActiveItem(n_item);
      this.destroyInactiveItems();
    });
    n_item_promise.catch(reason => {
      atom.notifications.addError("CodeRibbon could not open that!", {
        "dismissable": true,
        "detail": String(reason)
      });
    });
  }

  element_handleDrop(event) {
    // NOTE `this` is a PaneElement
    var parentPatch = this.getModel();
    event.preventDefault()
    crdebug("CodeRibbonPatch element getting Drop event: ", event);

    var dataobj = {};
    function data_into_obj(type) {
      dataobj[type] = event.dataTransfer.getData(type);
    }
    // stuff from tabs
    data_into_obj('text/plain');
    data_into_obj('atom-event');
    data_into_obj('allowed-location-center');
    data_into_obj('from-pane-id');
    data_into_obj('from-pane-index');
    data_into_obj('sortable-index');
    data_into_obj('from-window-id');
    // stuff from project tree / files
    data_into_obj('initialpaths');

    crdebug("Known data collected:", dataobj);
    var data = event.dataTransfer.items
    for (var thing_idx = 0; thing_idx < data.length; thing_idx++) {
      var dataItem = data[thing_idx];
      if (! (dataItem.type in dataobj)) {
        crdebug("dataItem from Drop event unrecognized:", dataItem);
      }
    }

    if (dataobj['from-pane-id'] != "") {
      try {
        var target_pane_id = parseInt(dataobj['from-pane-id']);
        var target_patch = atom.workspace.getPanes().find(pane => {
          return pane.id == target_pane_id;
        });
        if (
          target_pane_id === parentPatch.id ||
          target_patch === parentPatch
        ) {
          // we aren't going to drop on ourselves
          return;
        }
        else if (parentPatch.items.length > 0) {
          crdebug("Starting swap with Patch", target_patch);
          // SWAP OPERATION
          // first take their item:
          var their_item = target_patch.getActiveItem();
          target_patch.removeItem(their_item, true); // moved: true
          var our_item = parentPatch.getActiveItem();
          parentPatch.removeItem(our_item, true);
          // now put them back:
          target_patch.addItem(our_item, {moved: true});
          parentPatch.addItem(their_item, {moved: true});
        }
        else { // we don't have an item to swap, so just take it
          target_patch.moveItemToPane(
            target_patch.getActiveItem(),
            parentPatch,
            0
          );
        }
        global_cr_update();
        event.stopPropagation();
      }
      catch (err) {
        crdebug("Failed to swap:", err);
      }
    }
    // dropping a file from the project tree
    if (dataobj['initialpaths'] != "") {
      parentPatch.replace_primary_item_with_uri(dataobj['initialpaths']);
      parentPatch.activate();
      global_cr_update();
      event.stopPropagation();
    }

  }

  split (orientation, side, params) {
    crdebug("Overriden Patch split processing");
    crdebug("Prevent split:", orientation, side, params);
  }

  /**
   * overriding the Atom pane function to prevent pane destruction when default
   */
  removeItem (item, moved) {
    const index = this.items.indexOf(item)
    if (index === -1) return;
    if (this.getPendingItem() === item) this.pendingItem = null;
    this.removeItemFromStack(item);
    this.emitter.emit('will-remove-item', {item, index, destroyed: !moved, moved});
    this.unsubscribeFromItem(item);

    if (item === this.activeItem) {
      if (this.items.length === 1) {
        this.setActiveItem(undefined);
      } else if (index === 0) {
        this.activateNextItem();
      } else {
        this.activatePreviousItem();
      }
    }
    this.items.splice(index, 1);
    this.emitter.emit('did-remove-item', {item, index, destroyed: !moved, moved});
    if (!moved && this.container) this.container.didDestroyPaneItem({item, index, pane: this});
    //if (this.items.length === 0 && this.config.get('core.destroyEmptyPanes')) this.destroy();
  }

  initialize() {
    this.getElement().classList.add('cr-patch');
    // html event listener:
    // NOTE we're using capturing instead of bubbling!!!
    // this allows us complete control over the drop
    // since we get the event before any children (i.e. **atom/TABS**)
    this.element.addEventListener('drop', this.element_handleDrop, true);

    this.onDidAddItem(n_item => {
      crdebug("Patch",this.id,"got new item:", n_item);
      if (
        n_item.moved === false &&
        this.items.length > 1
      ) {
        crdebug("Attempt to move new item to best available patch:", n_item.item);
        // try to move the item somewhere better
        // TODO usage of best_available_patch ???
      }
      global_cr_update();
    });

    this.onDidMoveItem(thing => {
      crdebug("Patch",this.id,"item was moved: ", thing);
    });

    this.onWillRemoveItem(r_item => {
      crdebug("Patch",this.id,"having item removed: ", r_item);
    });

    this.onDidRemoveItem(d_item => {
      crdebug("Patch",this.id,"item removed: ", d_item);
      if (d_item.destroyed === true && d_item.moved === false) {
        global_cr_update();
        this.ff_ProjectView.populate();
      }
    });

    this.onDidActivate(() => {
      //this.cr_update();
      global_cr_update();
      if (this.current_display_mode == "fuzzyfinder") {
        this.ff_ProjectView.populate();
        this.ff_ProjectView.selectListView.refs["queryEditor"].component.didUpdateStyles();
        this.ff_ProjectView.selectListView.focus();
      }
    });

    this.element.getElementsByClassName('item-views')[0].appendChild(
      this.ff_ProjectView.element
    );
    this.element.getElementsByClassName('item-views')[0].appendChild(
      this.cr_TipsView.element
    );
  }

  serialize() {
    var pane_stuff = super.serialize();

    pane_stuff.deserializer = 'CodeRibbonPatch';

    return pane_stuff;
  }

  cr_update() {
    if (this.items.length > 0) {
      this.change_patch_display_mode("pane");
    }
    else {
      // if there are no items in this patch
      if (this.isActive() == true) {
        this.change_patch_display_mode("fuzzyfinder");
        this.ff_ProjectView.selectListView.refs["queryEditor"].component.didUpdateStyles();
      }
      else {
        // not currently an active pane:
        this.change_patch_display_mode("cr-tips");
      }
    }
  }

  /**
   * sets what the patch should be displaying
   * @param  {string} mode one of: [fuzzyfinder, cr-tips, pane]
   */
  change_patch_display_mode(mode) {
    if (this.current_display_mode == mode) return;
    this.current_display_mode = mode;

    // start: remove everything to begin with:
    this.ff_ProjectView.element.style.display = "none";
    this.cr_TipsView.element.style.display = "none";
    this.cr_TipsView.stop();
    switch (mode) {
      case "pane":
        // act like a normal Atom Pane
        break;
      case "fuzzyfinder":
        // show a fuzzy finder with files to select from and open
        this.ff_ProjectView.element.style.display = "";
        // NOTE ff/select-list calls scrollIntoViewIfNeeded
        this.ff_ProjectView.populate();
        break;
      case "cr-tips":
        // show coderibbon usage tips
        this.cr_TipsView.start()
        this.cr_TipsView.element.style.display = "";
        break;
      default:
        crlogger.warn("Unknown Patch display mode:", mode);
    }
  }

}

module.exports = CodeRibbonPatch;
