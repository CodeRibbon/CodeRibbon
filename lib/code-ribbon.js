
const {crdebug, crlogger} = require('./cr-base');

const CodeRibbonManager = require('./code-ribbon-manager');
const CodeRibbonRibbonContainer = require('./code-ribbon-ribbon-container');
const CodeRibbonSingleRibbon = require('./code-ribbon-single-ribbon');
const CodeRibbonPatch = require('./code-ribbon-patch');

const { CompositeDisposable } = require('atom');

module.exports = {

  main_CRM: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    crdebug("Beginning package activation...");
    if (state.CRM) {
      crdebug("Restoring from state:", state);
      this.main_CRM = atom.deserializers.deserialize(state.CRM);
      crdebug("Restored codeRibbonManager:", this.main_CRM);
    }
    // also covers the failure to deserialize
    if (this.main_CRM == null) {
      crdebug("No CodeRibbonManager to restore with. Creating a new one...");
      this.main_CRM = new CodeRibbonManager({}, atom.views);
    }

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:cr-update': () => this.cr_update()
    }));

    // Register listener that watches config changes to pane_count_calc
    this.subscriptions.add(atom.config.onDidChange(
      "code-ribbon.pane_count_calc",
      ({ newValue, oldValue }) => { // eslint-disable-line no-unused-vars
        crdebug("Config pane_count_calc changed!");
        // don't depend on the args to this function, just get() them
        // since we don't know which sub-key it is.
        crdebug("Running cr_update...");
        this.cr_update();
      }
    ))
  },

  deactivate() {
    this.subscriptions.dispose();
    this.main_CRM.destroy();

    // if we've properly restored we should remove previous things from any
    // possible serialized state...
    this.main_CRM = null;
  },

  serialize() {
    return {
      CRM: this.main_CRM.serialize()
    };
  },

  deserialize_CR_stuff(data) {
    crdebug("deserialize attempt for ", data);
    switch (data.deserializer) {
      case "CodeRibbonManager":
        return CodeRibbonManager.deserialize(
          data,
          {
            deserializers: atom.deserializers,
            views: atom.views
          }
        );
      case "CodeRibbonRibbonContainer":
        return CodeRibbonRibbonContainer.deserialize(
          data,
          {
            deserializers: atom.deserializers,
            views: atom.views
          }
        );
      case "CodeRibbonSingleRibbon":
        return CodeRibbonSingleRibbon.deserialize(
          data,
          {
            deserializers: atom.deserializers,
            views: atom.views
          }
        );
      case "CodeRibbonPatch":
        return CodeRibbonPatch.deserialize(
          data,
          {
            deserializers: atom.deserializers,
            applicationDelegate: atom.applicationDelegate, // TODO idk wat is
            config: atom.config,
            notifications: atom.notifications,
            views: atom.views
          }
        );
      default:
        crlogger.error("CANNOT deserialize this thing: ", data);
        break;
    }
  },

  cr_update() {
    crdebug('CodeRibbon global update processing!');
    this.main_CRM.cr_update();
  },

};
