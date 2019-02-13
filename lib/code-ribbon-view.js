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
    // get workspace base element:
    this.workspace_base_axis = document.querySelector(
      "body > atom-workspace > atom-workspace-axis"
    );
    if ( this.workspace_base_axis == null ) {
      console.error();("CR: Didn't acquire workspace_base_axis!");
      atom.notifications.addFatalError(
        "CodeRibbon did not find the main workspace!",
        {}
      )
      return;
    }
    console.log("CR: Got workspace_base_axis: ");
    console.log(this.workspace_base_axis);
    // Check for existing set of panes:
    this.cr_primary_axis = this.workspace_base_axis.querySelector(
      "atom-workspace-axis"
    );
    if ( this.cr_primary_axis == null ) {
      this.cr_primary_axis = document.createElement("atom-workspace-axis");
      console.error("CR: Unimplemented fallback to insert new cr_primary_axis!");
    }
    console.log("CodeRibbonView state before ribbon install:");
    console.log(this.state);
    // Install the Ribbons!
    this.ribbonsInView = [];
    for (var i = 0; i < this.state.pane_count.vertical; i++) {
      this.ribbonsInView[i] = new CodeRibbonSingleRibbonView(
        this.state.ribbonStates[i]
      );
      this.cr_primary_axis.insertAdjacentElement(
        "afterbegin",
        this.ribbonsInView[i].element
      );
    }
    // this.cr_primary_axis.insert
    //
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
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
