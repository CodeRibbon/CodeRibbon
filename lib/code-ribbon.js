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

    // ALWAYS disable tabs on activation .. ?
    // Toggle() 'activates' it, so this is not needed unless we decide to do it differently
    // atom.packages.disablePackage("tabs")

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:toggle': () => this.toggle()
    }));

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

    // toggle the enabling of the package
    // this code for some reason makes the modal panel visibile
    // I set the visibility in order for it to sync correctly with the 'ALIVE' default message
    if (atom.packages.isPackageDisabled("tabs")) {
      atom.packages.enablePackage("tabs");
      this.modalPanel.show();
    } else {
      atom.packages.disablePackage("tabs");
      this.modalPanel.hide();
    }

    // TODO: Do more stuff with the view if on/off
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
