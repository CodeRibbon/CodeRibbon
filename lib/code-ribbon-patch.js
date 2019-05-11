
const {
  crdebug,
  crlogger,
  Pane,
  fuzzyFinderMainModule,
  fuzzyFinderProjectView,
  global_cr_update
} = require('./cr-base');

// const CodeRibbonPatchElement = require('./patch-element.js');

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
    this.ff_ProjectView.selectListView.refs.queryEditor.setPlaceholderText("Search project files...");
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
      global_cr_update();
      event.stopPropagation();
    }

  }

  split (orientation, side, params) {
    crdebug("Overriden Patch split processing");
    crdebug("Prevent split:", orientation, side, params);
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

    // probably not useful:
    // this.onDidMoveItem(thing => {
    //   crdebug("Patch item was moved: ", thing);
    // });

    this.onWillRemoveItem(r_item => {
      crdebug("Patch",this.id,"having item removed: ", r_item);
      if (r_item.destroyed === false && r_item.moved === true) {
        // make it so that the target patch can find us as the source
        this.getContainer().root.set_recent_patch_swap_source(this);
      }
    });

    this.onDidRemoveItem(d_item => {
      crdebug("Patch",this.id,"item removed: ", d_item);
      if (d_item.destroyed === true && d_item.moved === false) {
        global_cr_update();
        this.ff_ProjectView.populate();
      }
    });

    // HACK/TODO put the fuzzy finder in
    this.element.getElementsByClassName('item-views')[0].appendChild(
      this.ff_ProjectView.element
    );

    this.onDidActivate(() => {
      if (this.items.length == 0) {
        crlogger.info(
          "Patch ", this.id, " updating FF paths!",
          this.ff_ProjectView.populate()
        );
      }
    });
    // this.ff_ProjectView.populate();
  }

  serialize() {
    var pane_stuff = super.serialize();

    pane_stuff.deserializer = 'CodeRibbonPatch';

    return pane_stuff;
  }

  cr_update() {
    // if there are no items in this patch, show this instead:

    if (this.items.length == 0) {
      // hide our fuzzy finder element
      this.ff_ProjectView.element.style.display = "";
    }
    else {
      // remove the fuzzy finder element
      this.ff_ProjectView.element.style.display = "none";
    }

    //this.setActiveItem(this.items[0]);
  }

}

module.exports = CodeRibbonPatch;
