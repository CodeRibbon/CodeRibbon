
const {
  PaneContainer,
  crdebug,
  crlogger
} = require('./cr-base');

const CodeRibbonRibbonContainer = require('./code-ribbon-ribbon-container');
const CodeRibbonSingleRibbon = require('./code-ribbon-single-ribbon');

const { CompositeDisposable } = require('atom');

class CodeRibbonManager {

  static deserialize(state, {
    deserializers,
    views
  }) {
    state.codeRibbonContainer = deserializers.deserialize(state.codeRibbonContainer);
    return new CodeRibbonManager(state, views);
  }

  constructor(state, viewRegistry) {
    this.viewRegistry = viewRegistry;
    this.cr_primary_container = atom.workspace.getCenter().paneContainer;
    this.subscriptions = new CompositeDisposable();

    if (state.previousContainerSerializedRoot) {
      this.previousContainerSerializedRoot = state.previousContainerSerializedRoot;
      crdebug("Pre-CR container root available for restoration:", this.previousContainerSerializedRoot);
    } else {
      // capture the current workspace container root so we can put it back
      // after we deactivate or destroy
      this.previousContainerSerializedRoot = this.cr_primary_container.getRoot().serialize();
      crdebug(
        "Backed up current paneContainer to previousContainerSerializedRoot:",
        this.previousContainerSerializedRoot
      );
    }
    crdebug("Replacing container root with our new one!");
    this.cr_primary_container.getRoot().destroy();
    if (
      state.codeRibbonContainer &&
      state.codeRibbonContainer.__proto__.constructor.name == "CodeRibbonRibbonContainer"
    ) {
      crdebug("CodeRibbonManager using codeRibbonContainer from previous state.");
      this.cr_primary_container.setRoot(state.codeRibbonContainer);
    } else {
      this.install_new_root_crrc();
    }
    this.cr_primary_container.getRoot().initialize();
    this.cr_primary_container.getElement().classList.add("cr-primary-container");

    // the command for overview mode:
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:toggle-overview': () => this.cr_primary_container.getRoot().toggle_overview_mode()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:add-patch-column': () => this.cr_primary_container.getRoot().cr_add_column_right()
    }));
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: "CodeRibbonManager",
      codeRibbonContainer: this.cr_primary_container.getRoot().serialize(),
      previousContainerSerializedRoot: this.previousContainerSerializedRoot
    };
  }

  cr_update() {
    (atom.devMode) ?
      this.cr_primary_container.getElement().classList.add("cr-dev-active")
    : this.cr_primary_container.getElement().classList.remove("cr-dev-active");

    if (
      this.cr_primary_container.getRoot().__proto__.constructor.name != "CodeRibbonRibbonContainer"
    ) {
      crlogger.warn(
        "Current workspace root (",
        this.cr_primary_container.getRoot(),
        ") isn't a CodeRibbonRibbonContainer... replacing..."
      );
      var prevRoot = this.cr_primary_container.getRoot();
      this.install_new_root_crrc();
      prevRoot.destroy();
    }
    this.cr_primary_container.getRoot().cr_update();
  }

  install_new_root_crrc() {
    crdebug("CodeRibbonManager creating a new CodeRibbonRibbonContainer...");
    var n_crrc = new CodeRibbonRibbonContainer({
      orientation: null,
      /**
       * since this is a brand new CodeRibbonRibbonContainer,
       * the init should auto-populate some new Ribbons for us
       * according to the config
       */
      children: null,
      flexScale: null
    }, this.viewRegistry);
    this.cr_primary_container.setRoot(n_crrc);
  }

  // Tear down any state and detach
  destroy() {
    crdebug("CodeRibbonManager destroy()");
    this.subscriptions.dispose();
    this.cr_primary_container.getRoot().destroy();
    var previousContainerRoot = atom.deserializers.deserialize(this.previousContainerSerializedRoot);
    this.cr_primary_container.setRoot(previousContainerRoot);
    this.previousContainerSerializedRoot = null;
  }

}

module.exports = CodeRibbonManager;
