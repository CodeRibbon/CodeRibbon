
const {
  // PaneContainer,
  crdebug,
  crlogger,
  global_cr_update,
  get_cr_panecontainer,
  metrics
} = require('./cr-base');

const {
  scrollPatchIntoView
} = require('./cr-common');

const CodeRibbonRibbonContainer = require('./code-ribbon-ribbon-container');
// const CodeRibbonSingleRibbon = require('./code-ribbon-single-ribbon');

const { CompositeDisposable } = require('atom');

class CodeRibbonManager {

  static deserialize(state, {
    deserializers,
    views
  }) {
    state.codeRibbonContainer = deserializers.deserialize(state.codeRibbonContainer);
    return new CodeRibbonManager(state, views);
  }

  // cons

  constructor(state, viewRegistry) {
    this.viewRegistry = viewRegistry;
    this.cr_primary_container = atom.workspace.getCenter().paneContainer;
    this.subscriptions = new CompositeDisposable();
    this.abortcontroller = new AbortController();
    this.active_patch = null;

    if (state.previousContainerSerializedRoot) {
      this.previousContainerSerializedRoot = state.previousContainerSerializedRoot;
      crdebug("Pre-CR container root available for restoration:", this.previousContainerSerializedRoot);
    } else {
      // capture the current workspace container root so we can put it back
      // after we deactivate or destroy
      this.previousContainerSerializedRoot = this.cr_primary_container.getRoot().serialize();
      crdebug(
        "Backed up current paneContainer to previousContainerSerializedRoot:",
        this.previousContainerSerializedRoot
      );
    }

    // watch focus of Patches
    this.subscriptions.add(atom.workspace.observeActivePane((pane) => {
      if (pane.cr_update) {
        // it's a Patch
        this.active_patch = pane;
      }
    }));

    crdebug("Replacing container root with our new one!");
    this.cr_primary_container.getRoot().destroy();
    if (
      state.codeRibbonContainer &&
      state.codeRibbonContainer.__proto__.constructor.name == "CodeRibbonRibbonContainer"
    ) {
      crdebug("CodeRibbonManager using codeRibbonContainer from previous state.");
      this.cr_primary_container.setRoot(state.codeRibbonContainer);
    } else {
      this.install_new_root_crrc();
    }
    this.cr_primary_container.getRoot().initialize();
    this.cr_primary_container.getElement().classList.add("cr-primary-container");

    // install scroll listener:
    this.cr_primary_container.getElement().addEventListener(
      'scroll',
      e => {
        this.handle_scroll(e);
      },
      {
        signal: this.abortcontroller.signal,
      }
    );
    // update when config changes:
    // this.scrollAlignTimeout = atom.config.get("code-ribbon.autoscroll_timeout");
    this.subscriptions.add(atom.config.observe(
      "code-ribbon.snap_alignment.autoscroll_timeout",
      newValue => {
        this.scrollAlignTimeout = newValue;
      }
    ));

    // the command for overview mode:
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:toggle-overview': () => this.cr_primary_container.getRoot().toggle_overview_mode()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:zoom-patch': () => this.cr_primary_container.getRoot().toggle_zoom_mode()
    }));

    this.subscriptions.add(atom.commands.add('atom-pane-axis.cr-vertical-strip', {
      'code-ribbon:add-patch-column-right': (dispatch_event) => {
        crdebug(dispatch_event);
        let crrc = this.cr_primary_container.getRoot()
        let crpc = get_cr_panecontainer();
        try {
          dispatch_event.stopImmediatePropagation();
          let position = crrc.children.indexOf(dispatch_event.currentTarget.model)+1;
          // ensure the new column is visible
          let right_sibling_crsr = crrc.children[position];
          let right_focus_target = right_sibling_crsr.children[0];
          scrollPatchIntoView(right_focus_target, () => {
            // crdebug("Adding a CRSS from add-patch-column-right COMMAND");
            let n_crss = crrc.cr_add_strip(position);
            let n_p = n_crss.find_empty_patch();
            if (n_p) {
              // takes time for column to grow
              let te_cb = () => {
                n_crss.element.removeEventListener('transitionend', te_cb);
                n_p.smoothactivate();
              }
              n_crss.element.addEventListener('transitionend', te_cb);
            }
            global_cr_update(); // this will cause the transition
          });
          metrics.event({
            name: "Add patch column right",
            type: 'interaction',
            location: crrc.children.indexOf(dispatch_event.currentTarget.model)+1
          });
        }
        catch (err) {
          crlogger.error(err);
        }
      },
      'code-ribbon:add-patch-column-left': (dispatch_event) => {
        crdebug(dispatch_event);
        let crrc = this.cr_primary_container.getRoot();
        let crpc = get_cr_panecontainer();
        try {
          dispatch_event.stopImmediatePropagation();
          crpc.getElement().classList.add('cr-managed-scroll-active');
          let n_crss = crrc.cr_add_strip(
            crrc.children.indexOf(dispatch_event.currentTarget.model)
          );
          let n_p = n_crss.find_empty_patch();
          if (n_p) {
            // takes time for column to grow
            let te_cb = () => {
              n_crss.element.removeEventListener('transitionend', te_cb);
              n_p.smoothactivate(() => {
                crpc.getElement().classList.remove('cr-managed-scroll-active');
              });
            }
            n_crss.element.addEventListener('transitionend', te_cb);
          }
          global_cr_update(); // this will cause the transition
          metrics.event({
            name: "Add patch column left",
            type: 'interaction',
            location: crrc.children.indexOf(dispatch_event.currentTarget.model)
          });
        }
        catch (err) {
          crlogger.error(err);
        }
      },
      'code-ribbon:close-patch-column': (dispatch_event) => {
        var crrc = this.cr_primary_container.getRoot()
        var closepromise = dispatch_event.currentTarget.model.close();
        // crdebug("Promise to close patch column:", closepromise);
        closepromise.then(() => {
          global_cr_update();
          metrics.event({
            name: "Close patch column complete",
            type: 'followup'
          });
        });
        metrics.event({
          name: "Close patch column begin",
          type: 'interaction',
          location: crrc.children.indexOf(dispatch_event.currentTarget.model)
        });
      }
    }));
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: "CodeRibbonManager",
      codeRibbonContainer: this.cr_primary_container.getRoot().serialize(),
      previousContainerSerializedRoot: this.previousContainerSerializedRoot
    };
  }

  cr_update() {
    (atom.devMode) ?
      this.cr_primary_container.getElement().classList.add("cr-dev-active")
    : this.cr_primary_container.getElement().classList.remove("cr-dev-active");

    if (
      this.cr_primary_container.getRoot().__proto__.constructor.name != "CodeRibbonRibbonContainer"
    ) {
      crlogger.warn(
        "Current workspace root (",
        this.cr_primary_container.getRoot(),
        ") isn't a CodeRibbonRibbonContainer... replacing..."
      );
      var prevRoot = this.cr_primary_container.getRoot();
      this.install_new_root_crrc();
      prevRoot.destroy();
    }
    this.cr_primary_container.getRoot().cr_update();
  }

  handle_scroll(e) {
    if (this.scrollAlignTimeout == 0) return false;
    window.clearTimeout(this.whileScrolling);
    // managed scrolls disable the snapping while active
    if (this.cr_primary_container.getElement().classList.contains('cr-managed-scroll-active')) {
      // crdebug("ignore cr managed scroll");
      return false;
    }
    this.whileScrolling = setTimeout(() => {
      crdebug("manager scroll snapping last event:", e, "this:", this);
      let distance_cutoff = atom.config.get("code-ribbon.snap_alignment.distance_cutoff");
      if (distance_cutoff.slice(-1) == "%") {
        let col_width = this.cr_primary_container.getRoot().get_first_visible_strip().getElement().getBoundingClientRect().width;
        let percentage = parseInt(distance_cutoff.slice(0, -1));
        distance_cutoff = col_width * (percentage / 100);
      }
      this.cr_primary_container.getRoot().align_ribbon_to_nearest_snap_point({
        nearby_cutoff_px: distance_cutoff,
      });
    }, 1000 * this.scrollAlignTimeout); // ms timeout
  }

  install_new_root_crrc() {
    crdebug("CodeRibbonManager creating a new CodeRibbonRibbonContainer...");
    var n_crrc = new CodeRibbonRibbonContainer({
      orientation: null,
      /**
       * since this is a brand new CodeRibbonRibbonContainer,
       * the init should auto-populate some new Ribbons for us
       * according to the config
       */
      children: null,
      flexScale: null
    }, this.viewRegistry);
    this.cr_primary_container.setRoot(n_crrc);
  }

  // Tear down any state and detach
  destroy() {
    crdebug("CodeRibbonManager destroy()");
    this.subscriptions.dispose();
    this.abortcontroller.abort();
    this.cr_primary_container.getRoot().destroy();
    var previousContainerRoot = atom.deserializers.deserialize(this.previousContainerSerializedRoot);
    this.cr_primary_container.setRoot(previousContainerRoot);
    this.previousContainerSerializedRoot = null;
    metrics.event({
      name: "CodeRibbonManager destroy()",
      type: "system"
    });
  }

}

module.exports = CodeRibbonManager;
