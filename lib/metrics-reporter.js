
const {
  crdebug,
  crlogger,
  hash
} = require('./cr-base');

const EventEmitter = require('events');

class CodeRibbonMetricsReporter extends EventEmitter {
  constructor() {
    super();
    this.eventbuffer = [];
    this.session = hash({
      time: Date.now(),
      rand: Math.random()
    });
  }

  initialize(persistence_hash) {
    if (persistence_hash) {
      this.persistence_hash = persistence_hash;
    }
    else {
      this.persistence_hash = this.session;
    }
    this.on('cr-metric-event', this.on_cr_metric_event);
    this.emit('cr-metric-event', {
      name: 'MetricsReporter init',
      type: 'system'
    });
  }

  event(event) {
    this.emit('cr-metric-event', event);
  }

  /**
   * store the event into the buffer
   */
  on_cr_metric_event(event) {
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
    // TODO
  }
}

module.exports = {
  CodeRibbonMetricsReporter
}
