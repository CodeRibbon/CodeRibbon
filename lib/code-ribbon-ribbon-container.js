'use babel';

const PaneContainer = atom.workspace.getCenter().paneContainer.__proto__.constructor;

console.log("CR: Took PaneContainer as:");
console.log(PaneContainer);

export default class CodeRibbonRibbonContainer extends PaneContainer {

  static deserialize (state, {deserializers, views}) {
    state.ribbons = state.ribbons.map(ribbonState => deserializers.deserialize(ribbonState));
    return new CodeRibbonRibbonContainer(state, views);
  }

  constructor(state, viewRegistry) {
    super(state.params);
    this.ribbons = state.ribbons;
    console.log("CR:CodeRibbonRibbonContainer children:");
    console.log(this.ribbons);
    this.state.leftInactivePaneStates = this.state.leftInactivePaneStates || [];

    console.log("CR:CodeRibbonSingleRibbonView: constructed:");
    console.log(this.element);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'CodeRibbonRibbonContainer',
      params: this.params
    };
  }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
