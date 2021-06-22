
const {
  crdebug,
  crlogger,
  Pane,
  global_cr_update,
  metrics,
  hash,
  get_crrc
} = require('./cr-base');

const {
  fuzzyFinderProjectViewFactory,
  scrollPatchIntoView
} = require('./cr-common');

const {
  replaceTextEditorComponent_overlayDecorationManagement
} = require('./cr-texteditor-overrides');

const { CompositeDisposable } = require('atom');

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

    this.subscriptions = new CompositeDisposable();

    // create a fuzzy finder object for us to use when we have no items

    this.cr_TipsView = new CodeRibbonTipsView(this);
    this.cr_TipsView.element.classList.add('cr-patch-background-tips');
  }

  initialize() {
    this.getElement().classList.add('cr-patch');
    // html event listener:
    // NOTE we're using capturing instead of bubbling!!!
    // this allows us complete control over the drop
    // since we get the event before any children (i.e. **atom/TABS**)
    this.element.addEventListener('drop', this.element_handleDrop, true);

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.__proto__.constructor.name == "TextEditor") {
        crdebug("replacing functions in existing TextEditor during patch initialize:", item);
        replaceTextEditorComponent_overlayDecorationManagement(item);
        item.cr_patch = this;
        item.editorElement.component.cr_patch = this;
      }
    }
    this.subscriptions.add(this.onDidAddItem(n_item => {
      crdebug("Patch",this.id,"got new item:", n_item);
      if (
        n_item.moved === false &&
        n_item.item.__proto__.constructor.name == "TextEditor"
      ) {
        replaceTextEditorComponent_overlayDecorationManagement(n_item.item);
        n_item.item.cr_patch = this;
        n_item.item.editorElement.component.cr_patch = this;
      }
      if (
        n_item.moved === false &&
        this.items.length > 1
      ) {
        crdebug("Gotta move this stuff elsewhere! Will do that soon.");
        setTimeout(() => {
          this.move_secondary_item_elsewhere(true);
        });
      }
      setTimeout(() => {
        global_cr_update();
      });
    }));

    this.subscriptions.add(this.onDidMoveItem(thing => {
      crdebug("Patch",this.id,"item was moved: ", thing);
    }));

    this.subscriptions.add(this.onWillRemoveItem(r_item => {
      crdebug("Patch",this.id,"having item removed: ", r_item);
    }));

    this.subscriptions.add(this.onDidRemoveItem(d_item => {
      crdebug("Patch",this.id,"item removed: ", d_item);
      if (d_item.destroyed === true && d_item.moved === false) {
        global_cr_update();
      }
    }));

    this.subscriptions.add(this.onDidChangeActive((is_active) => {
      if (is_active) { // "is newly active" / "was just activated"
        scrollPatchIntoView(this, () => {
          global_cr_update();
        });
      }
      this.cr_update();
    }));

    this.subscriptions.add(this.onDidActivate(() => {
      crdebug("Patch", this.id, "activated.");
      // don't trigger if we're in overview!
      if (this.getContainer().root.overview_active === true) return;
      this.cr_update();
      if (this.current_display_mode == "fuzzyfinder") {
        try {
          this.ff_ProjectView.selectListView.refs["queryEditor"].component.didUpdateStyles();
          // this is safe because activate() already gave us focus
          this.ff_ProjectView.focusNoScroll();
        }
        catch (err) {
          crlogger.warn(err);
        }
      }
    }));

    this.subscriptions.add(this.onWillDestroy(() => {
      if (this.parent.children.length > 1) {
        if (this.parent.children.indexOf(this) == this.parent.children.length - 1) {
          // we are the last patch, focus the previous one in the strip instead
          // of the one in the next
          let prior_patch = this.parent.get_sibling(this, 'above');
          if (prior_patch.activate) {
            prior_patch.activate();
          }
        }
      }
    }));

    this.subscriptions.add(this.onDidDestroy(() => {
      if (this.ff_ProjectView) {
        this.ff_ProjectView.destroy();
      }
      this.cr_TipsView.destroy();
      this.subscriptions.dispose();
    }));

    this.element.getElementsByClassName('item-views')[0].appendChild(
      this.cr_TipsView.element
    );

    const tab_bar_onwheel_handler = (event) => {

      if (event.deltaX != 0) return;

      crdebug("Wheel on tab bar: ", event);
      // TODO convert direction of scroll while keeping scroll-attachment?
      // this.getContainer().element.scrollLeft += event.deltaY;
      // event.preventDefault();

      if (
        event.deltaY > 1 &&
        !event.shiftKey
      ) {
        event.preventDefault();
        atom.commands.dispatch(
          event.target,
          'code-ribbon:scroll-ribbon-right'
        );
        metrics.event({
          name: 'Tab Bar scrollwheel right',
          // id: this.id,
          type: "interaction"
        });
      }
      else if (
        event.deltaY < -1 &&
        !event.shiftKey
      ) {
        event.preventDefault();
        atom.commands.dispatch(
          event.target,
          'code-ribbon:scroll-ribbon-left'
        );
        metrics.event({
          name: 'Tab Bar scrollwheel left',
          // id: this.id,
          type: "interaction"
        });
      }
    }

    this.element.onwheel = function (event) {
      // .some() will break when one returns true
      event.path.some((path_target) => {
        // NOTE: `this` is the patch element
        if (path_target.parentElement != this) return false;
        if (path_target.classList.contains('tab-bar')) {
          tab_bar_onwheel_handler(event);
          return true;
        }
        else if (path_target.classList.contains('item-views')) {
          return true;
        }
        else {
          return false;
        }
      });
    }

    this.cr_initialized = true;
    metrics.event({
      name: 'Patch init',
      id: this.id,
      parent: this.parent.id,
      type: "system"
    });
  }

  serialize() {
    var pane_stuff = super.serialize();

    pane_stuff.deserializer = 'CodeRibbonPatch';

    return pane_stuff;
  }

  /**
   * open a file in this editor, will replace any existing item
   * @param {URI} n_initialpath URI to open
   */
  replace_primary_item_with_uri(n_initialpath) {
    // first try to close the old item:
    var closing_promise = this.closable();
    closing_promise.then((value) => { // eslint-disable-line no-unused-vars
      // try to get the new Item created:
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
    });
    closing_promise.catch((reason) => {
      crdebug("Didn't replace item:", reason);
    });
    metrics.event({
      name: "Patch opens item via replace_primary_item_with_uri",
      item: hash(n_initialpath),
      id: this.id
    });
  }

  /**
   * warning: adding an item to another patch will force that patch to gain focus
   *
   * only call this when that is the intended behavior
   */
  move_secondary_item_elsewhere() {
    if (this.items.length < 2) {
      crlogger.warn("I don't have an extra item to move!", this.id);
      return;
    }
    // or getActiveItem?
    var n_item = this.items[1];
    crdebug("Attempt to move new item to best available patch:", n_item);
    this.removeItem(n_item, true);
    // try to move the item somewhere better
    let crrc = get_crrc();
    // search for on-screen visible, empty patch:
    let pm = crrc.find_visible_empty_patch();
    if (pm) {
      crdebug("CRRC Found a visible empty patch:", pm);
      this.moveItemToPane(n_item, pm, 0);
      pm.activate();
      return;
    }
    let np_mode = atom.config.get("code-ribbon.pane_creation_strategy");
    switch (np_mode) {
      case 'split_down':
        pm = this.split('vertical', 'after', {
          copyActiveItem: false
        });
      break;
      case 'new_column':
        let newidx = crrc.children.indexOf(this.parent) + 1;
        let new_crss = crrc.cr_add_strip(newidx);
        pm = new_crss.find_empty_patch();
      break;
      case 'nearest_right':
        // first visible column
        let crss = crrc.children.find(c => c.isVisible());
        do {
          pm = crss.find_empty_patch();
          crss = crrc.get_sibling(crss, 'right');
        } while (!pm);
      break;
      case 'ribbon_tail':
        pm = crrc.get_ribbon_tail_empty_patch();
      break;
      default:
        crlogger.error("Unknown pane_creation_strategy:", np_mode);
    }
    if (pm) {
      scrollPatchIntoView(pm, () => {
        // this.moveItemToPane(n_item, pm, 0);
        pm.addItem(n_item, {index: 0, moved: true});
        pm.activate();
      });
    }
    else {
      crlogger.error("Couldn't find a spot to put the new item!", n_item);
      this.addItem(n_item, {index: 1, moved: true});
    }
  }

  /**
   * function to handle drops onto the HTMLElement
   *
   * NOTE `this` will be the ELEMENT!!! not the patch instance!
   * @param  {HTMLDropEvent} event you shouldn't be calling this function
   * @return {wtfdontcallme} no really don't call this, this is for the html
   */
  element_handleDrop(event) {
    // NOTE `this` is a PaneElement
    const parentPatch = this.getModel();
    event.preventDefault();
    event.stopPropagation();
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
    // stuff from tabs
    data_into_obj('atom-tab-event');

    crdebug("Known data collected:", dataobj);
    var data = event.dataTransfer.items
    for (var thing_idx = 0; thing_idx < data.length; thing_idx++) {
      var dataItem = data[thing_idx];
      if (! (dataItem.type in dataobj)) {
        crdebug("dataItem from Drop event unrecognized:", dataItem);
      }
    }

    // if (dataobj['from-pane-id'] != "" && dataobj['atom-tab-event'] != "true") {
    //   try {
    //     var target_pane_id = parseInt(dataobj['from-pane-id']);
    //     var target_patch = atom.workspace.getPanes().find(pane => {
    //       return pane.id == target_pane_id;
    //     });
    //     if (
    //       target_pane_id === parentPatch.id ||
    //       target_patch === parentPatch
    //     ) {
    //       // we aren't going to drop on ourselves
    //       return;
    //     }
    //     else if (parentPatch.items.length > 0) {
    //       crdebug("Starting swap with Patch", target_patch);
    //       // SWAP OPERATION
    //       // first take their item:
    //       var their_item = target_patch.getActiveItem();
    //       target_patch.removeItem(their_item, true); // moved: true
    //       var our_item = parentPatch.getActiveItem();
    //       parentPatch.removeItem(our_item, true);
    //       // now put them back:
    //       target_patch.addItem(our_item, {moved: true});
    //       parentPatch.addItem(their_item, {moved: true});
    //     }
    //     else { // we don't have an item to swap, so just take it
    //       try {
    //         const item = target_patch.getActiveItem();
    //         target_patch.removeItem(item);
    //         parentPatch.addItem(item, { index: 0, moved: true });
    //       }
    //       catch (e) {
    //         crlogger.warn(e);
    //         metrics.event({
    //           name: "Error from element_handleDrop",
    //           type: 'error',
    //           content: e
    //         });
    //       }
    //     }
    //     global_cr_update();
    //     metrics.event({
    //       name: 'Patch get item drop from other Patch',
    //       id: parentPatch.id,
    //       other_id: target_patch.id,
    //       type: "interaction"
    //     });
    //   }
    //   catch (err) {
    //     crdebug("Failed to swap:", err);
    //   }
    // }

    // dropping a file from the project tree
    if (dataobj['initialpaths'] != "") {
      crdebug("got initialpaths from drop:", dataobj['initialpaths']);
      let paths = JSON.parse(dataobj['initialpaths']);
      parentPatch.replace_primary_item_with_uri(paths[0]);
      parentPatch.activate();
      global_cr_update();
      // event.stopPropagation();
      // event.preventDefault();
      metrics.event({
        name: 'Patch get item drop via initialpaths',
        initialpaths: hash(dataobj['initialpaths']),
        type: "interaction"
      });
    }

  }

  split (orientation, side, params) {
    crdebug("Overriden Patch split processing");
    crdebug("Split data:", orientation, side, params);
    if (params && params.copyActiveItem) {
      if (!params.items) params.items = [];
      params.items.push(this.copyActiveItem());
    }

    const newPatch = new CodeRibbonPatch(
      Object.assign({
        applicationDelegate: this.applicationDelegate,
        notificationManager: this.notificationManager,
        deserializerManager: this.deserializerManager,
        config: this.config,
        viewRegistry: this.viewRegistry,
      }, params)
    );
    if (this.parent.orientation == orientation) {
      switch (side) {
        case 'before':
          this.parent.insertChildBefore(this, newPatch);
        break;
        case 'after':
          this.parent.insertChildAfter(this, newPatch);
        break;
      }
    } else {
      crdebug("Patch split creating new column");
      let crrc = get_crrc();
      let newidx = crrc.children.indexOf(this.parent);
      if (side == 'after') {
        newidx++;
      }
      crrc.cr_add_strip(newidx, [newPatch, ]);
    }

    newPatch.initialize();

    if (params && params.moveActiveItem && this.activeItem) {
      this.moveItemToPane(this.activeItem, newPatch);
    }

    newPatch.smoothactivate();
    return newPatch;
  }

  /**
   * replace default move behavior with swapping
   * @param  {Item} item  the item to move
   * @param  {Patch} pane  the target patch
   * @param  {int} index not used
   * @return {Patch}       that patch's addItem return value
   */
  moveItemToPane(item, pane, index) {
    this.removeItem(item, true);
    if (pane.items.length == 1 && this.items.length == 0) {
      crdebug("Patches swapping:", this.id, pane.id);
      pane.moveItemToPane(pane.getActiveItem(), this, 0);
    }
    pane.addItem(item, {index, moved: true});
  }

  /**
   * resolves if it's OK to close this patch
   * else rejects if it's NOT OK to close this patch
   * @return {Promise} resolve: you are allowed to destroy, reject: do not destroy
   */
  closable () {
    return new Promise((resolve, reject) => {
      var closing_items = Promise.all(this.getItems().map(item => this.promptToSaveItem(item)));
      closing_items.then((results) => {
        crdebug("Patch closing_items resolved:", results);
        // ensure that all items are ready:
        if (!results.includes(false)) resolve(true);
        else reject({
          "message": "An Item cancelled the operation.",
          "closing_items": closing_items,
          "closing_items result": results
        });
      });
    });
  }

  // Private: Close the pane unless the user cancels the action via a dialog.
  //
  // Returns a {Promise} that resolves once the pane is either closed, or the
  // closing has been cancelled.
  close () {
    if (this.getItems().length === 0) {
      return new Promise((resolve) => { resolve() })
        .then(() => {
          this.destroy();
        });
    }
    return Promise.all(this.getItems().map(item => this.promptToSaveItem(item)))
      .then(results => {
        if (!results.includes(false)) return this.destroy()
      });
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

  // Public: Destroy all items except for the active item.
  destroyInactiveItems (force = false) {
    return Promise.all(
      this.getItems()
        .filter(item => item !== this.activeItem)
        .map(item => this.destroyItem(item, force))
    )
  }

  cr_update() {
    if (! this.cr_initialized) {
      crlogger.warn("cr_update on uninitialized patch", this);
    }
    if (this.items.length > 0) {
      this.change_patch_display_mode("pane");
    }
    else {
      // if there are no items in this patch
      if (this.isActive() == true) {
        this.change_patch_display_mode("fuzzyfinder");
        this.refresh_ff_ProjectView();
      }
      else {
        // not currently an active pane:
        this.change_patch_display_mode("cr-tips");
      }
    }
  }

  get_contentful_size() {
    return this.items.length;
  }

  refresh_ff_ProjectView() {
    if (this.ff_ProjectView) {
      if (this.isActive() == true) {
        this.ff_ProjectView.reloadPathsIfNeeded().then(() => {});
        this.ff_ProjectView.selectListView.focus();
      }
      this.ff_ProjectView.selectListView.refs["queryEditor"].component.didUpdateStyles();
    }
  }

  cr_patch_toggle_zoom() {
    if (this.is_zoomed) {
      this.cr_patch_unzoom();
    }
    else {
      this.cr_patch_zoom();
    }
  }

  cr_patch_zoom() {
    this.element.classList.add('cr-zoomed');
    this.getParent().element.classList.add('cr-zoomed');

    // ensure the patch gets scrolled into view
    this.smoothactivate();
    this.is_zoomed = true;
    this.element.addEventListener(
      'transitionend',
      this.cr_patch_zoom_transition_end
    );

    this.unzoom_listener = this.onDidChangeActive((is_active) => {
      if (! is_active) {
        this.cr_patch_unzoom();
      }
    })
  }

  cr_patch_zoom_transition_end = e => {
    scrollPatchIntoView(this, () => {
      this.activate();
    }, {skip_visible_check:true});
  }

  cr_patch_unzoom() {
    this.element.classList.remove('cr-zoomed');
    this.getParent().getElement().classList.remove('cr-zoomed');

    this.is_zoomed = false;
    this.element.removeEventListener(
      'transitionend',
      this.cr_patch_zoom_transition_end
    );
    this.unzoom_listener.dispose();
    this.unzoom_listener = undefined;
  }

  /**
   * normally activating the patch will instantly scroll, let's get there smoothly!
   *
   * alternative to pane.activate()
   */
  smoothactivate(callback = undefined) {
    scrollPatchIntoView(this, () => {
      this.activate();
    });
  }

  /**
   * sets what the patch should be displaying
   * @param  {string} mode one of: [fuzzyfinder, cr-tips, pane]
   */
  change_patch_display_mode(mode) {
    if (this.current_display_mode == mode) return;
    this.current_display_mode = mode;

    // start: remove everything to begin with:
    if (this.ff_ProjectView) {
      this.ff_ProjectView.destroy();
      this.ff_ProjectView = null;
    }
    this.cr_TipsView.element.style.display = "none";
    this.cr_TipsView.stop();
    switch (mode) {
      case "pane":
        // act like a normal Atom Pane
        break;
      case "fuzzyfinder":
        // show a fuzzy finder with files to select from and open
        this.ff_ProjectView = fuzzyFinderProjectViewFactory();
        this.element.getElementsByClassName('item-views')[0].appendChild(
          this.ff_ProjectView.element
        );
        this.ff_ProjectView.element.classList.add('cr-patch-fuzzyfinder');
        this.refresh_ff_ProjectView();
        break;
      case "cr-tips":
        // show coderibbon usage tips
        this.cr_TipsView.start()
        this.cr_TipsView.element.style.display = "";
        break;
      default:
        crlogger.warn("Unknown Patch display mode:", mode);
    }
    metrics.event({
      name: "Patch changes display mode to " + mode,
      id: this.id
    });
  }

}

module.exports = CodeRibbonPatch;
