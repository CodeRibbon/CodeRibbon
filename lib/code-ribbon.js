'use babel';

import CodeRibbonView from './code-ribbon-view';
import {
  CompositeDisposable
} from 'atom';

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

    // test code for window-resize
    var resizeTimer;
    atom.getCurrentWindow().on('resize', function(e) {
      console.log("Resize event firing");

      clearTimeout(resizeTimer); // stop execution of func below

      resizeTimer = setTimeout(function() {
        // Run code here, resizing has "stopped"
        console.log("Resizing ended");
      }, 500);
    });

    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
