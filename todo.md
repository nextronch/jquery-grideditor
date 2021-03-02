# V 1 P 1
## general
+ dropdown auf `.ge-tools-drawer` für löschen, copy, paste und add row/col 
+ kopieren von elemenet (egal was) > json
+ zwischenablage > localStorage
+ paste nur aktiv wenn etwas in ZWA
+ row in col, col in row
```json
{dataType:"row",data:{...}}
```
+ beim kopieren funktion
- beim löschen: nicht deinit sondern `delete`

+ softErrors: alert

+ create delete für alles  
+ staged delete für children  
+ handler onDelete für col 
- handler onCopy und onPaste für col

> schnitstelle aufbauen  

## module
- module: neue instanz ID ???

## Encounters
> nicht so bauen, dass externe irgendwelche files verschieben oder löschen können
die bilder haben keine fixe uuid

onPaste(object) {object (changed)} in cfc: action return new object


order of action after init:
- paste in as HTML => let prototypeElement
- prototypeElement.each(".ge-content",initColPlugin.call(this,true))
this = ".ge-content"
- `init()`
```javascript
    addAllColClasses(this);
    createRowControls(this);
    createColControls(this);
    makeSortable(this);
```
Math.round(ClientWidth / MAX_COL_SIZE) 
tonextNumber: valid_col_sizes -> toClass(currentView)
```javascript
f.find('.column').resizable({
    handles: "e",
    resize: function(ev,ui){
        let maxWidth = ui.element.parent().get(0).getBoundingClientRect().width;
        let 
        /*
        ui:
        element: $jq
        helper: element
        originalElement: element
        size: {width, height}
        */
    }
})
```
check for Events: 
`$.fn.gridEditor.columnPlugins.text.element.get(0)[$.expando+1].events`  

-- cfc path definable,
-- hooks für verschiedenes,
strukturieren

## Latest
\\\\dev\\home\\webiq_dev6\\www\\admin\\plugins\\grideditor\\jquery.grideditor.C.bildDokumente.js
dev6.webiq.ch  
Bilder Hinzufügen  
Bildvorschau im Grid  
name: `Bild/Dokument`  
Grid:  
- Vorschau der Bilder  
- Button für Externe Img Editor (Modal)  
Modal: (plain AJAX)  
- Media Selector  

+ delete,
+ onpaste,
+ autoupdate on close modal,
* globalelement, (colGlobal.cfc)
