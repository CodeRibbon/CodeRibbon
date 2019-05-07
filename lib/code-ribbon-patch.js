
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
    this.ff_ProjectView.selectListView.refs.queryEditor.setPlaceholderText("CR Patch ID#" + this.id);
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
    event.stopPropagation()
    crdebug("CodeRibbonPatch element getting Drop event: ", event);
    var data = event.dataTransfer.items
    for (var thing_idx = 0; thing_idx < data.length; thing_idx++) {
      var dataItem = data[thing_idx];
      crdebug("Got dataItem from Drop event:", dataItem);
      // var dataidtype = String(my_thing.type);
      // crdebug("It has type:", dataidtype);
      // data[thing_idx].getAsString(strstuff => {
      //   crdebug("Got drag things from ", dataidtype, ": ", strstuff);
      // });
      if (dataItem.type == "from-pane-id") {
        // initiate swapping with the other pane
        dataItem.getAsString(other_pane_id => {
          var target_pane_id = parseInt(other_pane_id);
          crdebug("Dropped thing going to ", parentPatch);
          crdebug("Dropped thing came from pane id", target_pane_id);
          // get our old (now inactive) item:
          var my_old_items = parentPatch.getItems().filter(
            item => item != parentPatch.activeItem
          );
          if (my_old_items.length == 0) {
            crdebug("No old items to swap.");
            crdebug("(not old items: ", parentPatch.getItems());
            return;
          }
          // give it to the patch that gave us this new dropped one:
          var target_patch = atom.workspace.getPanes().find(pane => {
            return pane.id == target_pane_id;
          });
          if (target_patch == undefined) {
            crlogger.error("No target_patch found for id ", target_pane_id);
          }
          crdebug("Giving my item ", my_old_items, " in return to ", target_patch);
          // removeItem(item, moved?)
          parentPatch.moveItemToPane(my_old_items[0], target_patch, 0);
        });
      }
      else if (dataItem.type == "initialpaths") {
        // this might be a drag-in from the file tree
        dataItem.getAsString(d_initialpath => {
          crdebug("Got an initialpath:", d_initialpath);
          parentPatch.replace_primary_item_with_uri(d_initialpath);
        });
      }
    }
  }

  split (orientation, side, params) {
    crdebug("Overriden Patch split processing");
    crdebug("Prevent split:", orientation, side, params);
  }

  initialize() {
    this.getElement().classList.add('cr-patch');
    // html event listener:
    this.element.addEventListener('drop', this.element_handleDrop);

    this.onDidAddItem(n_item => {
      crdebug("Patch got new item:", n_item);
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

    // this.onWillRemoveItem(thing => {
    //   crdebug("Patch having item removed: ", thing);
    // });

    this.onDidRemoveItem(thing => {
      crdebug("Patch item removed: ", thing);
      // global_cr_update();
    });

    // HACK/TODO put the fuzzy finder in
    this.element.getElementsByClassName('item-views')[0].appendChild(
      this.ff_ProjectView.element
    );
  }

  serialize() {
    var pane_stuff = super.serialize();

    pane_stuff.deserializer = 'CodeRibbonPatch';

    return pane_stuff;
  }

  cr_update() {
    // if there are no items in this patch, show this instead:
    crlogger.info(
      "Patch updating FF paths!",
      this.ff_ProjectView.populate()
    );
    if (this.items.length == 0) {
      // hide our fuzzy finder element
      this.ff_ProjectView.element.style.display = "";
    }
    else {
      // remove the fuzzy finder element
      this.ff_ProjectView.element.style.display = "none";
    }
  }

}

module.exports = CodeRibbonPatch;
