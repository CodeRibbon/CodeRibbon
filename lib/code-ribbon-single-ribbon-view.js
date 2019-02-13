'use babel';

export default class CodeRibbonSingleRibbonView {

  state: {
    pane_count: {
      "horizontal": 3
    }
  }

  constructor(serializedState) {
    this.state = serializedState;
    // this is the base element that composes one ribbon
    this.element = document.createElement("atom-workspace-axis");
    // all ribbons are horizontal:
    this.element.classList.add("horizontal");
    this.element.classList.add("cr-single-ribbon-main-axis");
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return this.state;
  }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
