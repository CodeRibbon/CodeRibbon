'use babel';

export default class CodeRibbonSingleRibbonView {

  constructor(serializedState) {
    this.state = serializedState || {};
    this.state.realActivePanes = this.state.realActivePanes || [];
    this.state.leftInactivePaneStates = this.state.leftInactivePaneStates || [];

    // this is the base element that composes one ribbon
    this.element = document.createElement("atom-pane-axis");
    // all ribbons are horizontal:
    this.element.classList.add("horizontal");
    this.element.classList.add("cr-single-ribbon-main-axis");

    // this.pane_container = new PaneContainer();
    // this.element.insertAdjacentElement(
    //   "afterbegin",
    //   this.pane_container.getElement()
    // )

    // add some panes to fill at least one screen:
    // while (this.state.realActivePanes.length <
    //   atom.config.get("code-ribbon.pane_count_calc.pane_count_horizontal_number")
    // ) {
    //   this.state.realActivePanes.add(new Pane());
    // }
    // for (var active_pane in this.state.realActivePanes) {
    //   this.element.insertAdjacentElement(
    //     "beforeend",
    //     active_pane.getElement()
    //   );
    // }

    console.log("CR:CodeRibbonSingleRibbonView: constructed:");
    console.log(this.element);
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
