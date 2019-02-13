'use babel';

import CodeRibbonView from './code-ribbon-view';
import { CompositeDisposable } from 'atom';

export default {

  codeRibbonView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.codeRibbonView = new CodeRibbonView(state.codeRibbonViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.codeRibbonView.getElement(),
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
    this.codeRibbonView.destroy();
  },

  serialize() {
    return {
      codeRibbonViewState: this.codeRibbonView.serialize()
    };
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
