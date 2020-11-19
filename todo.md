# V 1 P 1
## general
+ dropdown auf `.ge-tools-drawer` für löschen, copy, paste und add row/col 
+ kopieren von elemenet (egal was) > json
+ zwischenablage > localStorage
- paste nur aktiv wenn etwas in ZWA
- row in col, col in row
```json
{dataType:"row",data:{...}}
```
+ beim kopieren funktion
- beim löschen: nicht deinit sondern `delete`

+ softErrors: alert

- create delete für alles   
+ staged delete für children  
+ handler onDelete für col 
- handler onCopy und onPaste für col

- schnitstelle aufbauen  

## module
- module: neue instanz ID ???

## Encounters
> nicht so bauen, dass externe irgendwelche files verschieben oder löschen können
die bilder haben keine fixe uuid
