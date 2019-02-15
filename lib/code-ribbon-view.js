'use babel';

import CodeRibbonSingleRibbonView from './code-ribbon-single-ribbon-view';

export default class CodeRibbonView {

  constructor(serializedState) {
    if (serializedState != null) {
      this.state = serializedState;
    }
    else {
      this.state = {
        ribbonStates: [],
        pane_count: {
          "horizontal": 3,
          "vertical": 2
        }
      }
    }
    this.cr_primary_container = atom.workspace.getCenter().paneContainer;
    this.cr_primary_container.getElement().classList.add("cr-primary-container");
    // hide the previous stuff inside (will restore on deactivate)
    this.cr_primary_container.root.children.forEach((child_of_primary) => {
      console.log("CR: Hiding non-CR child item:");
      console.log(child_of_primary);
      child_of_primary.getElement().classList.add("cr-hidden-display-none");
    });
    console.log("CodeRibbonView state before ribbon install:");
    console.log(this.state);
    // Install the Ribbons!
    this.ribbonsInView = [];
    for (var i = 0; i < this.state.pane_count.vertical; i++) {
      this.ribbonsInView[i] = new CodeRibbonSingleRibbonView(
        this.state.ribbonStates[i]
      );
      this.cr_primary_container.root.getElement().insertAdjacentElement(
        "beforeend",
        this.ribbonsInView[i].element
      );
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
    // TODO fetch ribbon states?
    return this.state;
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
