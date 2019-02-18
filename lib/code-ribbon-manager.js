
const {
  PaneContainer,
  crdebug
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
    if (state.codeRibbonContainer) {
      crdebug("CodeRibbonManager using codeRibbonContainer from previous state.");
      this.cr_primary_container.setRoot(state.codeRibbonContainer);
    } else {
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
      }, viewRegistry);
      this.cr_primary_container.setRoot(n_crrc);
      n_crrc.initialize();
    }
    this.cr_primary_container.getElement().classList.add("cr-primary-container");

    // default stuff:
    this.element = document.createElement('div');
    this.element.classList.add('code-ribbon');

    // Create message element
    const message = document.createElement('div');
    message.textContent = 'CodeRibbon Activated!';
    message.classList.add('message');
    this.element.appendChild(message);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: "CodeRibbonManager",
      codeRibbonContainer: this.cr_primary_container.getRoot().serialize(),
      previousContainerSerializedRoot: this.previousContainerSerializedRoot
    };
  }

  // Tear down any state and detach
  destroy() {
    crdebug("CodeRibbonManager destroy()");
    this.cr_primary_container.getRoot().destroy();
    var previousContainerRoot = atom.deserializers.deserialize(this.previousContainerSerializedRoot);
    this.cr_primary_container.setRoot(previousContainerRoot);
    this.previousContainerSerializedRoot = null;
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}

module.exports = CodeRibbonManager;
