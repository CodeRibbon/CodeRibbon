
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

// HACK TODO upstream fixable? #74
function replaceTextEditorComponent_didFocus(textEditorItem) {
  if (textEditorItem.__proto__.constructor.name != "TextEditor") {
    crlogger.error("replaceTextEditorComponent_didFocus got something that's not a TextEditor:", textEditorItem);
    crlogger.warn("replaceTextEditorComponent_didFocus will continue anyways, expect problems below!");
  }
  textEditorItem.editorElement.component.didFocus = function() {

    // NOTE direct excerpt from https://github.com/atom/atom/blob/18e6d703c6bcb22ca71d946d44d3c0ac243320ee/src/text-editor-component.js#L1658
    // HACK: modify to prevent the scrolling of the HiddenInput into view

    // This element can be focused from a parent custom element's
    // attachedCallback before *its* attachedCallback is fired. This protects
    // against that case.
    if (!this.attached) this.didAttach();

    // The element can be focused before the intersection observer detects that
    // it has been shown for the first time. If this element is being focused,
    // it is necessarily visible, so we call `didShow` to ensure the hidden
    // input is rendered before we try to shift focus to it.
    if (!this.visible) this.didShow();

    if (!this.focused) {
      this.focused = true;
      this.startCursorBlinking();
      this.scheduleUpdate();
    }

    this.getHiddenInput().focus({
      preventScroll: true
    });
    crlogger.warn("CodeRibbon Override TextEditorComponent didFocus: Focused hiddenInput with prevented scrolling.");
  };
  crlogger.warn("Replaced TextEditor's didFocus");
}

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
  replaceTextEditorComponent_didFocus,
  replaceTextEditorComponent_overlayDecorationManagement
}
