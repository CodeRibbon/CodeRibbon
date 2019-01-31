# CodeRibbon

A reimplementation of Patchworks for the Atom Editor.

Patchworks was a 2014 research project into better navigation and organization of code in IDEs. It's core concept consisted of an infinite 'Ribbon' of Patches in which code was displayed.

As you open code to edit, your Ribbon grows to accomodate more active patches, leaving a timeline-like history of recently used files.

## TODO

 - [ ] Replicate Ben's JS/CSS Atom hack into a plugin
 - [ ] Investigate how to completely replace tab functionality
 - [ ] Files open to the right if not open and increments ribbon, or shifts ribbon to already visible patch; drag and drop into specific patch
 - [ ] Name shown at the top of patch
 - [ ] Drag and drop name to other patches; dropping into existing patch will swap both patches
 - [ ] Shortcuts to shift ribbon left/right one column
 - [ ] Blow up view / single-patch zoom by double clicking patch name
 - [ ] Zoom out view by using a short cut (overview mode)
 - [ ] Configurable patch grid (minimum size per patch or NxN patch grid)
 - [ ] Cache older patches outside the DOM (serializable)
 - [ ] Multiple monitor support (dynamic ribbon sets)
