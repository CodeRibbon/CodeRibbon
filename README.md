# CodeRibbon

A reimplementation of Patchworks for the Atom Editor.

Patchworks was a 2014 research project into better navigation and organization of code in IDEs. It's core concept consisted of an infinite 'Ribbon' of Patches in which code was displayed.

As you open code to edit, your Ribbon grows to accomodate more active patches, leaving a timeline-like history of recently used files.

## Currently Working Features

 - Normal Atom editing, plugins, etc, still work
 - Patch grid layout and dynamic growth of the Ribbon.
 - Configurable size for number of Ribbons and Patches per screen
 - `Ctrl-Alt-O` to look at all the Patches in Overview mode
 - Drag files from the project tree view onto Patches to open them
 - Swap Patches by dragging one item onto the other patch
