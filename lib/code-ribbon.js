
const {crdebug} = require('./cr-base');

crdebug("Importing and registering deserializers...");
const CodeRibbonManager = require('./code-ribbon-manager');
atom.deserializers.add(CodeRibbonManager);
const CodeRibbonRibbonContainer = require('./code-ribbon-ribbon-container');
atom.deserializers.add(CodeRibbonRibbonContainer);
const CodeRibbonSingleRibbon = require('./code-ribbon-single-ribbon');
atom.deserializers.add(CodeRibbonSingleRibbon);

const { CompositeDisposable } = require('atom');

module.exports = {

  main_CRM: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    crdebug("Beginning package activation...");
    if (state.CRM) {
      crdebug("Restoring from state:", state);
      this.main_CRM = atom.deserializers.deserialize(state);
      crdebug("Restored codeRibbonManager:", this.main_CRM);
    }
    // also covers the failure to deserialize
    if (this.main_CRM == null) {
      crdebug("No CodeRibbonManager to restore with. Creating a new one...");
      this.main_CRM = new CodeRibbonManager({}, atom.views);
    }
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.main_CRM.getElement(),
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
    this.main_CRM.destroy();
  },

  serialize() {
    return {
      CRM: this.main_CRM.serialize()
    };
  },

  deserialize_CR_stuff(data) {
    console.log("deserialize attempt for ", data);
    switch (data.deserializer) {
      case "CodeRibbonManager2":
        if (this.main_CRM == null) {
          activate({
            CRM: data
          });
        }
        return this.main_CRM;
        break;
      default:
        crdebug("CANNOT deserialize this thing: ", data);
        break;
    }
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
