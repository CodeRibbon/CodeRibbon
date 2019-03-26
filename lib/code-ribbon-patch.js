
const {
  crdebug,
  // crlogger,
  Pane
} = require('./cr-base');

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

  initialize() {
    this.getElement().classList.add('cr-patch');

    this.onDidAddItem(thing => {
      crdebug("Patch got new item: ", thing);
    });

    // probably not useful:
    // this.onDidMoveItem(thing => {
    //   crdebug("Patch item was moved: ", thing);
    // });

    this.onWillRemoveItem(thing => {
      crdebug("Patch having item removed: ", thing);
    });

    this.onDidRemoveItem(thing => {
      crdebug("Patch item removed: ", thing);

      // check if we need to switch this thing with the other patch's thing
      if (thing.moved == true && thing.destroyed == false) {
        // crdebug("Switching thing with other Patch...");
        // TODO
      }

      if (this.items.length == 0) {
        crdebug("empty patch");
  
        // TODO - add fuzzy finder object in here
      }
    });

    if (this.items.length == 0) {
      crdebug("empty patch");

      // TODO - add fuzzy finder object in here
      this.getElement().classList.add('fuzzy-finder')
    }
  }

  serialize() {
    var pane_stuff = super.serialize();

    pane_stuff.deserializer = 'CodeRibbonPatch';

    return pane_stuff;
  }

  cr_update() {}

}

module.exports = CodeRibbonPatch;
