
const {
  crdebug
} = require('./cr-base');

const { CompositeDisposable } = require('atom');

class CodeRibbonStatusbarElement extends HTMLElement {
  initialize(CRM) {
    crdebug("Initializing a CodeRibbonStatusbarElement");
    this.CRM = CRM;

    this.subscriptions = new CompositeDisposable();

    // info about Active pane
    this.patchinfo = document.createElement('span');
    this.patchinfo.classList.add('inline-block');
    this.patchinfo.innerHTML = "CodeRibbon: Waiting...";
    this.appendChild(this.patchinfo);

    // button to toggle overview
    this.overview_button = document.createElement('a');
    this.overview_button.classList.add('inline-block');
    this.overview_button.style.marginLeft = 'inherit';
    this.overview_button.innerHTML = "Toggle Overview";
    this.overview_button.addEventListener('click', () => {
      atom.commands.dispatch(
        this.CRM.cr_primary_container.getRoot().getElement(),
        'code-ribbon:toggle-overview'
      );
    });
    this.appendChild(this.overview_button);

    this.classList.add('inline-block');

    return this;
  }

  cr_update() {
    var activepatch = this.CRM.cr_primary_container.getActivePane();
    this.patchinfo.innerHTML = "CodeRibbon: " +
      "Active Patch ID #" + activepatch.id +
      ", ribbon " + activepatch.getParent().getParent().children.indexOf(activepatch.getParent()) +
      " patch " + activepatch.getParent().children.indexOf(activepatch);
  }
}

module.exports = document.registerElement('code-ribbon-status', {
  prototype: CodeRibbonStatusbarElement.prototype
});
