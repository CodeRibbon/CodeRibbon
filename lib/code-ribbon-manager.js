
const {
  PaneContainer,
  crdebug
} = require('./cr-base');

const CodeRibbonRibbonContainer = require('./code-ribbon-ribbon-container');
const CodeRibbonSingleRibbon = require('./code-ribbon-single-ribbon');

class CodeRibbonManager {

  static deserialize(state, {
    deserializers,
    views
  }) {
    state.codeRibbonContainer = deserializers.deserialize(state.codeRibbonContainer);
    state.previousContainerRoot = deserializers.deserialize(state.previousContainerRoot);
    return new CodeRibbonManager(state, views);
  }

  constructor(state, viewRegistry) {
    this.cr_primary_container = atom.workspace.getCenter().paneContainer;

    if (state.previousContainerRoot) {
      this.previousContainerRoot = state.previousContainerRoot;
      crdebug("Pre-CR container root available for restoration:", this.previousContainerRoot);
    } else {
      // capture the current workspace container root so we can put it back
      // after we deactivate or destroy
      this.previousContainerRoot = this.cr_primary_container.getRoot();
      crdebug(
        "Backed up current paneContainer to previousContainerRoot:",
        this.previousContainerRoot
      );
    }
    crdebug("Replacing container root with our new one!");

    if (state.codeRibbonContainer) {
      crdebug("CodeRibbonManager using codeRibbonContainer from previous state.");
      this.cr_primary_container.setRoot(state.codeRibbonContainer);
    } else {
      crdebug("CodeRibbonManager creating a new CodeRibbonRibbonContainer...");
      this.cr_primary_container.setRoot(
        new CodeRibbonRibbonContainer({
          orientation: null,
          /**
           * since this is a brand new CodeRibbonRibbonContainer,
           * the init should auto-populate some new Ribbons for us
           * according to the config
           */
          children: null,
          flexScale: null
        }, viewRegistry)
      );
    }
    this.cr_primary_container.getElement().classList.add("cr-primary-container");

    // default stuff:
    this.element = document.createElement('div');
    this.element.classList.add('code-ribbon');

    // Create message element
    const message = document.createElement('div');
    message.textContent = 'The CodeRibbon package is Alive! It\'s ALIVE!';
    message.classList.add('message');
    this.element.appendChild(message);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: "CodeRibbonManager",
      codeRibbonContainer: this.cr_primary_container.getRoot().serialize(),
      previousContainerRoot: this.previousContainerRoot.serialize()
    };
  }

  // Tear down any state and detach
  destroy() {
    crdebug("CodeRibbonView destroy()");
    this.cr_primary_container.setRoot(this.previousContainerRoot);
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}

module.exports = CodeRibbonManager;
