
var ff_pkg = atom.packages.loadPackage('fuzzy-finder');
// run a require statement in their context:
ff_pkg.mainModule.gimme_thing = function () {
  var the_thing = require('@atom/fuzzy-native');
  console.log(the_thing);
  return the_thing;
}
var fuzzyFinderModuleFuzzyNative = ff_pkg.mainModule.gimme_thing();

module.exports = fuzzyFinderModuleFuzzyNative;
