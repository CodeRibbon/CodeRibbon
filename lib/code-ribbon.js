'use babel';

import {crdebug} from './cr-base';

import CodeRibbonManager from './code-ribbon-manager';
atom.deserializers.add(CodeRibbonManager);
import { CompositeDisposable } from 'atom';

export default {

  codeRibbonManager: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    crdebug("Beginning package activation...");
    if (state.deserializer) {
      crdebug("Restoring from state:", state);
      this.codeRibbonManager = atom.deserializers.deserialize(state);
      crdebug("Restored codeRibbonManager:");
      crdebug(this.codeRibbonManager);
    }
    else {
      this.codeRibbonManager = new CodeRibbonManager({}, atom.views);
    }
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.codeRibbonManager.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:toggle': () => this.toggle()
    }));

    // Register listener that watches config changes to pane_count_calc
    this.subscriptions.add(atom.config.onDidChange(
      "code-ribbon.pane_count_calc",
      ({ newValue, oldValue }) => {
        crdebug("Config pane_count_calc changed!");
        // don't depend on the args to this function, just get() them
        // since we don't know which sub-key it is.
      }
    ))
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.codeRibbonManager.destroy();
  },

  serialize() {
    return this.codeRibbonManager.serialize();
  },

  toggle() {
    crdebug('CodeRibbon was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
