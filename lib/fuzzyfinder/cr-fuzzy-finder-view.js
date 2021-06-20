
var fuzzyFinderView = require("./fuzzy-finder-view");

const fuzzaldrinPlus = require('fuzzaldrin-plus');
// const NativeFuzzy = require('@atom/fuzzy-native')
const SCORING_SYSTEMS = require('./scoring-systems')

const CodeRibbonFakeReporter = require('./cr-fake-reporter');

const MAX_RESULTS = 10

class CodeRibbonFuzzyFinderView extends fuzzyFinderView {
  constructor () {
    super(new CodeRibbonFakeReporter());
  }

  filterFn (items, query) {
    if (!query) {
      return items
    }

    let results
    // const startTime = performance.now()

    if (this.scoringSystem === SCORING_SYSTEMS.FAST) {
      results = this.nativeFuzzy.match(query, {maxResults: MAX_RESULTS})
        .map(({id}) => this.items[id])
    } else {
      results = fuzzaldrinPlus.filter(items, query, {key: 'label'})
    }

    // const duration = Math.round(performance.now() - startTime)

    // this.metricsReporter.sendFilterEvent(duration, items.length, this.scoringSystem)

    return results
  }

  focusNoScroll() {
    this.selectListView.refs.queryEditor.getElement().focus(
      {preventScroll: true}
    );
  }
}

module.exports = CodeRibbonFuzzyFinderView
