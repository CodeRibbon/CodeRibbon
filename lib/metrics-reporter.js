
const {
  crdebug,
  crlogger,
  hash
} = require('./cr-base');

const {
  getNowYYYYMMDDHHMMSS
} = require('./cr-common');

const {dialog} = require('electron').remote;
const fs = require('fs-plus');
const EventEmitter = require('events');
const { CompositeDisposable } = require('atom');

class CodeRibbonMetricsReporter extends EventEmitter {
  constructor() {
    super();
    this.eventbuffer = [];
    this.eventfile = null;
    this.session = hash({
      time: Date.now(),
      rand: Math.random()
    });
    this.subscriptions = new CompositeDisposable();

    this.reporting_mode = 'disabled';
  }

  initialize(persistence_hash) {
    if (persistence_hash) {
      this.persistence_hash = persistence_hash;
    }
    else {
      this.persistence_hash = this.session;
    }
    // Register listener that watches config changes
    this.subscriptions.add(atom.config.onDidChange(
      "code-ribbon.metrics_preference",
      ({ newValue, oldValue }) => { // eslint-disable-line no-unused-vars
        this.reporting_mode = newValue;
        crdebug("Metrics metrics_preference config changed to", this.reporting_mode);
      }
    ));
    // FIRST THING REQUIRED: enable metrics if we are allowed
    this.reporting_mode = this.get_reporting_preference();
    this.on('cr-metric-event', this.on_cr_metric_event);
    this.emit('cr-metric-event', {
      name: 'MetricsReporter init',
      type: 'metrics',
      version: atom.packages.getLoadedPackage('code-ribbon').metadata.version,
      id: atom.packages.getLoadedPackage('code-ribbon').metadata._id
    });
  }

  shutdown() {
    if (this.eventfile) {
      // save remains to file on shutdown
      this.push_buffer_to_file();
    }
  }

  get_reporting_preference () {
    return atom.config.get("code-ribbon.metrics_preference");
  }

  event(event) {
    this.emit('cr-metric-event', event);
  }

  /**
   * store the event into the buffer
   */
  on_cr_metric_event(event) {
    // CRITICAL: user privacy enforcement
    if (this.reporting_mode == 'disabled') return;
    event.persist = this.persistence_hash;
    event.session = this.session;
    event.clienttime = Date.now();

    this.eventbuffer.push(event);
  }

  /**
   * push events in the buffer to the telemetrics backend server
   * @return {Promise} did all the events get submitted?
   */
  async push_buffer_to_remote_backend() {
    if (this.reporting_mode != "remote") {
      crlogger.error("Not allowing push of metrics events to server: reporting_mode not remote.");
    }
    // TODO
  }

  async push_buffer_to_file() {
    let startnotif = atom.notifications.addInfo(
      "Exporting metrics event buffer...",
      {
        dismissable: true
      }
    );
    this.event({
      name: "CR Metrics exporting to file",
      type: 'metrics',
      numevents: this.eventbuffer.length
    });

    if (! this.eventfile) {
      // prompt for a file to write to
      let path = dialog.showSaveDialog({
        title: "Export CodeRibbon Events",
        defaultPath: "coderibbon-events-" + getNowYYYYMMDDHHMMSS() + ".json"
      });
      if (! path) {
        crlogger.warn("Cancel save of eventfile.");
        return;
      }
      crdebug("Chose path", path);
      this.eventfile = fs.createWriteStream(
        path,
        {
          flags: 'a' // append
        }
      );
      this.eventfilepath = path;
    }

    crdebug("Writing to", this.eventfile);
    if (! this.eventfile.writable) {
      crlogger.error("Event file not writable:", this.eventfile);
      return;
    }
    this.eventfile.cork();
    for (var i = 0; i < this.eventbuffer.length; i++) {
      let ev = this.eventbuffer[i];
      this.eventfile.write(",\n" + JSON.stringify(ev, null, 2));
    }
    this.eventbuffer = [];
    this.eventfile.uncork();

    startnotif.dismiss();
    atom.notifications.addSuccess(
      "Exported events to file.",
      {
        description: "Output appended to file:" + this.eventfilepath
      }
    );
  }
}

module.exports = {
  CodeRibbonMetricsReporter
}
