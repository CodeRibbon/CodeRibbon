
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
      var node = this.getElement()
      node.insertAdjacentHTML('beforebegin', '<div class="select-list fuzzy-finder"><atom-text-editor class="editor mini" mini="" data-encoding="utf8" data-grammar="text plain null-grammar" tabindex="-1"><div style="position: relative; contain: strict; overflow: hidden; background-color: inherit; height: 27px; width: 100%;"><div class="scroll-view" style="position: absolute; contain: strict; overflow: hidden; top: 0px; bottom: 0px; background-color: inherit; left: 0px; width: 573px;"><div style="contain: strict; overflow: hidden; background-color: inherit; width: 573px; height: 27px; will-change: transform; transform: translate(0px, 0px);"><div class="lines" style="position: absolute; contain: strict; overflow: hidden; width: 573px; height: 27px;"><div class="highlights" style="contain: strict; position: absolute; overflow: hidden; user-select: none; height: 27px; width: 573px;"></div><div style="contain: layout style; position: absolute; height: 27px; width: 573px; transform: translateY(0px);"><div class="line" data-screen-row="0"><span class=""><span class="syntax--text syntax--plain syntax--null-grammar"></span></span></div></div><div class="cursors" style="position: absolute; contain: strict; z-index: 1; width: 573px; height: 27px; pointer-events: none; user-select: none;"><input class="hidden-input" tabindex="-1" style="position: absolute; width: 1px; height: 27px; top: 0px; left: 58px; opacity: 0; padding: 0px; border: 0px;"><div class="cursor" style="height: 27px; width: 8.29688px; transform: translate(58px, 0px);"></div></div></div><div style="contain: strict; position: absolute; visibility: hidden; width: 573px;"></div><div class="line dummy" style="position: absolute; visibility: hidden;"></div></div></div></div></atom-text-editor><span>Project is empty</span></div>')
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
