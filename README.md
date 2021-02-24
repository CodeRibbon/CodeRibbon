# CodeRibbon

A reimplementation of Patchworks for the Atom Editor.

![Overmode Mode Demo](https://user-images.githubusercontent.com/5423266/108159222-8bfd7580-70b4-11eb-88f6-acd10847982a.gif)

Patchworks was a 2014 research project into better navigation and organization of code in IDEs. It's core concept consisted of an infinite 'Ribbon' of Patches in which code was displayed.

As you open code to edit, your Ribbon grows to accommodate more active patches, leaving a timeline-like history of recently used files.

## Currently Working Features

 - 99.9% of other Atom plugins are still supported and work as usual
   - If you find one that doesn't, please leave an issue for it!
 - Patch grid layout and dynamic growth of the Ribbon.
 - Configurable, dynamic size for number of Patches per screen
 - `Ctrl-Alt-O` to look at all the Patches in Overview mode
 - Drag files from the project tree view onto Patches to open the file
 - Swap Patches by dragging one item onto the other patch
 - Keyboard shortcuts for navigating the ribbon
 - Quick Fuzzy search files in the project for blank patches
 - Drag and drop patches onto eachother to create new patches and columns

## A research project from UTK

CodeRibbon is a research project from the University of Tennessee, Knoxville.

The research is supported by Austin Henley. (one of Patchwork's original authors)

For the contributors of CodeRibbon, see https://github.com/utk-se/CodeRibbon/graphs/contributors
