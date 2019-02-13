'use babel';

export default class CodeRibbonView {

  /**
   * Contains a list of Ribbons that each have their own set of panes
   * @type list
   *
   * Should be (re)stored with serialization
   */
  ribbonsInView: null;

  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('code-ribbon');

    // Create message element
    const message = document.createElement('div');
    message.textContent = 'The CodeRibbon package is Alive! It\'s ALIVE!';
    message.classList.add('message');
    this.element.appendChild(message);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
