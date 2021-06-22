
const {crdebug, crlogger} = require('./cr-base');
const {scrollPatchIntoView} = require('./cr-common');

const CodeRibbonManager = require('./code-ribbon-manager');
const CodeRibbonRibbonContainer = require('./code-ribbon-ribbon-container');
const CodeRibbonSingleStrip = require('./code-ribbon-single-strip');
const CodeRibbonPatch = require('./code-ribbon-patch');
const CodeRibbonStatusbarElement = require('./code-ribbon-statusbar-element');
const {CodeRibbonMetricsReporter} = require('./metrics-reporter');

const { CompositeDisposable } = require('atom');

module.exports = {

  main_CRM: null,
  modalPanel: null,
  subscriptions: null,
  metrics: new CodeRibbonMetricsReporter(),

  activate(state) {
    crdebug("Beginning package activation...");
    if (state && state.CRM) {
      crdebug("Restoring from state:", state);
      this.main_CRM = atom.deserializers.deserialize(state.CRM);
      crdebug("Restored codeRibbonManager:", this.main_CRM);
      this.metrics.initialize(state.persistence_hash);
    }
    // also covers the failure to deserialize
    if (this.main_CRM == null || this.main_CRM == undefined) {
      crdebug("No CodeRibbonManager to restore with. Creating a new one...");
      this.main_CRM = new CodeRibbonManager({}, atom.views);
      this.metrics.initialize();
    }

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:cr-update': () => this.cr_update()
    }));

    // DEBUG
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:export-metrics-events-to-file': () => this.metrics.push_buffer_to_file()
    }));

    // Register listener that watches config changes to pane_count_calc
    this.subscriptions.add(atom.config.onDidChange(
      "code-ribbon.pane_count_calc",
      ({ newValue, oldValue }) => { // eslint-disable-line no-unused-vars
        crdebug("Config pane_count_calc changed!");
        // enforce some sanity
        if (atom.config.get("code-ribbon.pane_count_calc.pane_count_vertical_number") < 1) {
          atom.config.set("code-ribbon.pane_count_calc.pane_count_vertical_number", 1);
        }
        if (atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number") < 1) {
          atom.config.set("code-ribbon.pane_count_calc.pane_count_horizontal_number", 1);
        }
        // don't depend on the args to this function, just get() them
        // since we don't know which sub-key it is.
        crdebug("Running cr_update...");
        this.cr_update();
        // put the active pane in view: (probably the settings view)
        scrollPatchIntoView(atom.workspace.getActivePane());
      }
    ));

    this.main_CRM.cr_update();
    atom.packages.onDidActivateInitialPackages(() => {
      this.main_CRM.cr_update();
      setTimeout(() => {
        this.main_CRM.cr_update();
        ap = atom.workspace.getActivePane();
        if (!document.body.contains(ap.getElement())) {
          // the active pane isn't in the page!
          crlogger.warn("Active pane doesn't exist in the live DOM! Activating the first patch...")
          atom.workspace.getCenter().getPanes()[0].activate();
          ap = atom.workspace.getActivePane();
        }
        scrollPatchIntoView(ap);
      }, 0);
    });
  },

  deactivate() {
    this.subscriptions.dispose();
    this.main_CRM.destroy();
    if (this.statusBarTile) this.statusBarTile.destroy();

    this.metrics.event({
      name: "Package deactivates",
      type: 'system'
    });
    this.metrics.shutdown();

    // if we've properly restored we should remove previous things from any
    // possible serialized state...
    this.main_CRM = null;
    this.statusBarTile = null;
  },

  consumeStatusBar(statusBar) {
    crdebug("> consumeStatusBar");
    this.statusBarTile = statusBar.addRightTile({
      item: (new CodeRibbonStatusbarElement()).initialize(this.main_CRM),
      priority: 100
    });
  },

  serialize() {
    return {
      CRM: this.main_CRM.serialize(),
      persistence_hash: this.metrics.persistence_hash
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
      case "CodeRibbonSingleStrip":
        return CodeRibbonSingleStrip.deserialize(
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
    if (this.main_CRM == null || this.main_CRM == undefined) {
      crdebug("No CodeRibbonManager to restore with. Creating a new one...");
      this.main_CRM = new CodeRibbonManager({}, atom.views);
    }
    this.main_CRM.cr_update();
    if (this.statusBarTile) {
      crdebug("Updating statusBarTile...")
      this.statusBarTile.getItem().cr_update();
    }
  },

};
