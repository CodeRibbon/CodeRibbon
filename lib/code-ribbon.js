'use babel';

import CodeRibbonManager from './code-ribbon-manager';
atom.deserializers.add(CodeRibbonManager);
import { CompositeDisposable } from 'atom';

export default {

  codeRibbonManager: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    if (state.deserializer) {
      console.log("CR: Restoring from state:");
      console.log(state);
      this.codeRibbonManager = atom.deserializers.deserialize(state);
      console.log("CR: Restored codeRibbonManager:");
      console.log(this.codeRibbonManager);
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
        console.log("CR: Config pane_count_calc changed!");
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
    console.log('CodeRibbon was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
