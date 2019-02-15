'use babel';

import CodeRibbonRibbonContainer from './code-ribbon-ribbon-container';
atom.deserializers.add(CodeRibbonRibbonContainer);
import CodeRibbonSingleRibbon from './code-ribbon-single-ribbon';
atom.deserializers.add(CodeRibbonSingleRibbon);

export default class CodeRibbonManager {

  static deserialize (state, {deserializers, views}) {
    state.codeRibbonContainer = deserializers.deserialize(state.codeRibbonContainer);
    state.previousContainerRoot = deserializers.deserialize(state.previousContainerRoot);
    return new CodeRibbonManager(state, views);
  }

  constructor(state, viewRegistry) {
    if (state.codeRibbonContainer) {
      this.codeRibbonContainer = state.codeRibbonContainer;
    }
    else {
      this.cr_primary_container = atom.workspace.getCenter().paneContainer;
      this.cr_primary_container.getElement().classList.add("cr-primary-container");
    }

    if (state.previousContainerRoot) {
      this.previousContainerRoot = state.previousContainerRoot;
    }
    else {
      // hide the previous stuff inside (will restore on deactivate)
      console.log("Backing up the previousContainerRoot: ");
      this.previousContainerRoot = this.cr_primary_container.getRoot();
      console.log(this.previousContainerRoot);
      console.log("Replacing container root with our new one!");
    }

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
      codeRibbonContainer: this.codeRibbonContainer.serialize(),
      previousContainerRoot: this.previousContainerRoot.serialize()
    };
  }

  // Tear down any state and detach
  destroy() {
    console.log("CR: CodeRibbonView destroy()");
    for (var i = 0; i < this.ribbonsInView.length; i++) {
      console.log("CR: Destroying this thing:");
      var single_ribbon_view = this.ribbonsInView[i];
      console.log(single_ribbon_view);
      single_ribbon_view.destroy();
    }
    this.cr_primary_container.root.children.forEach((child_of_primary) => {
      child_of_primary.getElement().classList.remove("cr-hidden-display-none");
    });
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
