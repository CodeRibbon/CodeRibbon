
const etch = require('etch');
const $ = etch.dom;

const {
  crdebug,
  crlogger,
  Pane,
  global_cr_update,
  metrics,
} = require('./cr-base');

const {
  AtomOriginalOverlayComponent
} = require('./atom/text-editor-overlay-component');

class CodeRibbonTextEditorOverlayComponent extends AtomOriginalOverlayComponent {
  update(newProps) {
    const oldProps = this.props;
    this.props = Object.assign({}, oldProps, newProps);

    crdebug("CodeRibbonTextEditorOverlayComponent update props:", this);

    let crss_rects = this.props.cr_te_comp.cr_patch.parent.element.getClientRects();
    let patch_rects = this.props.cr_te_comp.cr_patch.element.getClientRects();

    let top_different = (this.props.cr_te_comp.cr_patch.element.offsetTop);
    let left_different = 0;
    if (patch_rects.length == 0) {
      crlogger.warn("Patch rects invalid! Element:", this.props.cr_te_comp.cr_patch.element);
    }
    else {
      left_different = patch_rects[0].left;
    }

    if (this.props.pixelTop != null)
      this.element.style.top = (this.props.pixelTop - top_different) + 'px';
    if (this.props.pixelLeft != null)
      this.element.style.left = (this.props.pixelLeft - left_different) + 'px';
    if (newProps.className !== oldProps.className) {
      if (oldProps.className != null)
        this.element.classList.remove(oldProps.className);
      if (newProps.className != null)
        this.element.classList.add(newProps.className);
    }

    if (this.resolveNextUpdatePromise) this.resolveNextUpdatePromise();
  }
}

function replaceTextEditorComponent_overlayDecorationManagement(textEditorItem) {
  if (textEditorItem.__proto__.constructor.name != "TextEditor") {
    crlogger.error("replaceTextEditorComponent_overlayDecorationManagement got something that's not a TextEditor:", textEditorItem);
    crlogger.warn("replaceTextEditorComponent_overlayDecorationManagement will continue anyways, expect problems below!");
  }

  textEditorItem.editorElement.component.renderOverlayDecorations = function() {
    // crdebug("overridden renderOverlayDecorations executing...");
    return this.decorationsToRender.overlays.map(overlayProps =>
      $(
        CodeRibbonTextEditorOverlayComponent,
        Object.assign(
          {
            key: overlayProps.element,
            cr_te_comp: this,
            overlayComponents: this.overlayComponents,
            didResize: overlayComponent => {
              this.updateOverlayToRender(overlayProps);
              overlayComponent.update(overlayProps);
            }
          },
          overlayProps
        )
      )
    );
  };

  crlogger.warn("Replaced TextEditor's renderOverlayDecorations");
}

module.exports = {
  replaceTextEditorComponent_overlayDecorationManagement
}
