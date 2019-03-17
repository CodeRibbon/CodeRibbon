
const {
  crdebug,
  // crlogger,
  Pane,
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
          crdebug("Dropped thing came from pane id", target_pane_id);
          if (parentPatch.items.length > 0) {
            // get our item:
            var my_item = parentPatch.items[0];
            // give it to the patch that gave us this new dropped one:
            var target_patch = atom.workspace.getPanes().find(pane => {
              return pane.id == target_pane_id;
            });
            crdebug("Giving my item in return to ", target_patch);
            // removeItem(item, moved?)
            parentPatch.moveItemToPane(my_item, target_patch, 0);
          }
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

    this.onDidAddItem(thing => {
      crdebug("Patch got new item:", thing);
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
      global_cr_update();
    });
  }

  serialize() {
    var pane_stuff = super.serialize();

    pane_stuff.deserializer = 'CodeRibbonPatch';

    return pane_stuff;
  }

  cr_update() {}

}

module.exports = CodeRibbonPatch;
