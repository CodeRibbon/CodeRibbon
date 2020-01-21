
const {
  crdebug,
  crlogger,
  metrics
} = require('./cr-base');

const { CompositeDisposable } = require('atom');

class CodeRibbonStatusbarElement extends HTMLElement {
  initialize(CRM) {
    crdebug("Initializing a CodeRibbonStatusbarElement");
    this.CRM = CRM;

    this.subscriptions = new CompositeDisposable();

    this.titlename = document.createElement('span');
    this.titlename.classList.add('inline-block');
    this.titlename.innerHTML = "CodeRibbon!";
    this.appendChild(this.titlename);

    // button to toggle overview
    this.overview_button = document.createElement('a');
    this.overview_button.classList.add('inline-block');
    this.overview_button.style.marginLeft = '6px';
    this.overview_button.innerHTML = "Overview";
    this.overview_button.addEventListener('click', () => {
      atom.commands.dispatch(
        this.CRM.cr_primary_container.getRoot().getElement(),
        'code-ribbon:toggle-overview'
      );
      metrics.event({
        name: "Statusbar Overview button pressed",
        type: 'interaction'
      });
    });
    this.appendChild(this.overview_button);

    // info about Active pane
    this.patchinfo = document.createElement('span');
    this.patchinfo.classList.add('inline-block');
    this.patchinfo.style.marginLeft = '6px';
    this.patchinfo.innerHTML = "Waiting...";
    this.appendChild(this.patchinfo);

    this.classList.add('inline-block');

    return this;
  }

  cr_update() {
    var activepatch = this.CRM.cr_primary_container.getActivePane();
    try {
      this.patchinfo.innerHTML = "Patch ID #" + activepatch.id;
    }
    catch (err) {
      this.patchinfo.innerHTML = "Patch ID Error";
      crlogger.warn(err);
    }
  }
}

module.exports = document.registerElement('code-ribbon-status', {
  prototype: CodeRibbonStatusbarElement.prototype
});
