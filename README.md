# Documentation for _jquery.grideditor.js_ 
This Documentation contains many code snippets. They can be copied to use faster.  
Include all necessary plugins after _jquery.grideditor.js_.  
```html
<!-- include libraries -->
<script src="https://code.jquery.com/jquery-3.3.1.min.js" type="text/javascript"></script>
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js" type="text/javascript"></script>

<!-- include grideditor -->
<script src="js/jquery.grideditor.js" type="text/javascript"></script>

<!-- include grideditor plugins -->
<script src="js/jquery.grideditor.C.text.js" type="text/javascript"></script>
<script src="js/jquery.grideditor.C.modules.js" type="text/javascript"></script>

<script src="js/jquery.grideditor.R.Default.js" type="text/javascript"></script>
<script src="js/jquery.grideditor.R.Accordion.js" type="text/javascript"></script>
```  
Info: plugins in dropdowns are ordered by import  

## Requirements
- jQuery v3.3.1 [ [Home](https://jquery.com/) | [Download](https://jquery.com/download/) ]  
- jQuery UI v1.12.1 (Sortable) [ [Home](https://jqueryui.com/sortable/) | [Download](https://jqueryui.com/download/) ]  

At least one [columnPlugin](#column-plugins) and one [rowPlugin](#row-plugins)  

## Initiation
Inintiation will use a jQuery object and [settings](#settings)  
```javascript
jQuery(DocumentNode_Or_HTMLElementInDocument).gridEditor(settings);
jQuery(DocumentNode_Or_HTMLElementInDocument).gridEditor(settings).on('webIQGridEditor:changed',function(){
    /* save changes. get json [mime: text/plain] with this: */
    $(this).gridEditor('getJSON')
});
```

### Settings
_Plain Object { }_  
Here is a list of usable settings for the gridEditor that can be set in [initiation](#initiation) and used in [plugins](#plugins--extensions)  

#### new_row_layouts  
_Array( Array( String ) )_  
Templates \[ Columns \[ columnsizes seperated with __space__ (prefix: `<size-prefix-?><number> [...]`) \] \]  
```javascript
new_row_layouts: [
    ["12"],
    ["lg-6 12","lg-6 12"]
]
``` 

#### row_classes & col_classes  
_Array( PlainObject{ label:String, title?:String, cssClass?:String, inverted?:String, default?:Boolean } )_ = `[]`  
Classes \[ ClassDisplay { label, title?, cssClass?, inverted?, default?:false } \]  
At least one of either `cssClass` or `inverted` needs to be defined (not be empty).  
If `default == true`, `inverted` must be defined.  
If `default == false` (default), `cssClass` must be defined.  
```javascript
[row_classes | col_classes] : [ 
    {  
        label : "My Class", 
        title : "make more space around the outside", 
        cssClass : "add-margin-to-all-sides"
    } , {
        label : "Red Border",
        cssClass : "border-red",
        inverted : "default-border",
        default : false
    } , {
        label : "Show",
        default : true,
        inverted : "hide"
    }
],
```  

#### col_tools & row_tools  
_Array( AttributeContainer )_ = `[]`  
Settings \[ AttributeContainer \]  
DO NOT use as name 'type', it is already reserved for plugins.

**AttributeContainer:** _PlainObject{ name:String, label:String, type:String, &lt;type relevant settings&gt; }_  
Type relevant settings:  
```
type : 'dropdown'
settings : 
    options = Array[ String | PlainObject{ name:String , settings:AttributeContainer } ]

type : 'switch'
settings : 
    default? = Boolean(false)

type : 'input'
settings : 
    inputtype? = String(default:'text')
    default? = String(default:'')
    placeholder? = String(default: name)
```  

#### custom_filter  
_Array( String | Function( gridElement:jQuery, isInit:Boolean ) )_ = `[]`  
Filters \[ FilterItem:function(gridElement, isInit){...} | 'myFunction' \]  
Strings are keys to functions on the window object. An Example is shown below.  <!-- Internal Code: `if (typeof filterItem == 'string') { filterItem = window[filterItem]; }`-->  
```javascript
window.myCustomFilter = function(gridElement,isInit){
    if(isInit){return;} // no need to Filter on init 
    gridElement.find("[data-ge-content-type=text]").each(function(i, textPluginElement){
        $(textPluginElement||this).html($(textPluginElement||this).html().replace("badWord","*****"))
    })
    
};
```
in settings:  
```javascript
custom_filter: [
    function(gridElement,isInit){/* ... */},
    "myCustomFilter",
]
```  

#### idleTime  
_Int_ = `1000`  
Time in **ms** before between the [change](#change) and [change**d**-event](#changed)  

#### plugins  
_PlainObject{ &lt;custom Plugin settings&gt; }_ = `{}`  
Custom keys and values for plugins (self care)  

#### lang  
_String_ = `en`  
Current language used by Plugins for translation  
If selected language is not preserved by plugin, it will fallback to 'all'.  
If neither of them is preserved, it will show `untranslated[<lang>][<key>]` (visit [translation](#translation) for usage example)  

#### default_col_plugin & default_row_plugin  
_String\( pluginname \)_ = _first Plugin that was included on each end_  
On creating a new Column or Row, use this plugin as default  

#### breakpointOrder  
_Array( String )_ = `["","sm","md","lg","xl"]`  
defaults for bootstrap 4  
size-prefixes in order from smallest to largest  

#### breakpoints  
_Array( PlainObject{ col:String, type:String, width:String } )_  
Breakpoints \[ Breakpoint{ col:"&lt;size-prefix&gt;", type:"title", width: "###px"|"none" } \]  
Order for dropdown in the top-right  
```javascript
breakpoints:[ {col:"lg", type:"Desktop", width:"none"}, /* ... */ ]
```
`width: none` means: take as much space as you can for the preview.  
Warning: do not use other breakpoint-syntaxes here than there are defined in _breakpointOrder_.  

#### valid_col_sizes  
_Array( Int )_ = `[1,2,...,11,12]`  
Column can only be scaled to these sizes  

## Events
These events can be listen to on certain jQuery object.  
as example: [jQuery Object of grid](#initiation), [plugin.element](#element)
### change
`webIQGridEditor:change`  
Indicates an change (starts [idleTimer](#idleTime)).  
After the timer runout, the [changed-event](#changed) will be triggered.  
### changed
`webIQGridEditor:changed`  
Indicates the change has applied and it is safe to transmit the data.  
Triggers automaticly after [a certain time (idleTime)](#idleTime) since the last [change-event](#change) occured.  
### block
`webIQGridEditor:block`  
Indicates a change is occuring and its **not safe** to transmit now. (Overwrite the Event, or `event.preventDefault()`).  
Cancels the [changed-event](#changed).  

## Translation in Grideditor  
Required: _false_  
You can translate all text seen in the Editor. The Translation is saved in `$.fn.gridEditor.translation.<lang>`.  
```javascript
$.fn.gridEditor.translation["en"]={
    col_add : "Add column",
    col_copy : "Copy column",
    col_paste : "Paste column",
    col_remove : "Remove column",
    col_remove_confirm : "Delete column?",
    row_add : "Add row",
    row_copy : "Copy row",
    row_paste : "Paste row",
    row_remove : "Remove row",
    row_remove_confirm : "Delete row?",
    settings : "Settings",
    move : "Move",
    smaller : "Make column narrower (hold shift for min)",
    bigger : "Make column wider (hold shift for max)",
};
```

# Plugins / Extensions  
This part shows the structure of Plugins.  
The Plugin gets Appended as an _Plain Object{ }_ to `jQuery.fn.gridEditor.<row/column>Plugins.<pluginName>`  

## Row Plugins  
```javascript
(function($){
    /* Add Global Configuration for other elements / Plugins */
    $.fn.gridEditor.rowPlugins.myRowPlugin = {
        internal: [ AttributeContainer ],
    }
})(jQuery)
```  
### internal  
Required: _true_  
Type: _Array( AttributeContainer )_  
Lookup _**AttributeContainer**_ in [col_tools & row_tools](#col_tools--row_tools)  
Do not use `position` in AttributeContainer.type  

## Column Plugins  
```javascript
(function($,$g){
    /* Add Global Configuration for other elements / Plugins */
    let self = $g.columnPlugins.myColumnPlugin = {
        /* Add Custom functions and variables here */
        element: $('<eventControllerElement />'),
        initialContent: '{"myField":"Inital Content"}',
        firstInit: function(resolve,reject){/* ... */},
        init: function(settings, contentArea, isFromServer){/* ... */},
        deinit: function(settings, contentArea){/* ... */},
        parse: function(settings, contentArea){ return {/* ... */} },
        onCopy: function(settings, contentArea){ return {/* ... */} },
        onPaste: function(settings, contentArea, isFromServer){/* ... */},
    }
})(jQuery,jQuery.fn.gridEditor)
```
### Variables
Plugin can contain as many Variables as needed, reserved are [functions](#functions) and following variables  

#### initialContent
Required: _false_  
Type: _any_  
Default value can be stored here. Usefull for later in [`init()`](#init).  

#### element
Required: _true_  
Type: _jQuery Object_  
Used to communicate with [Events](#events) to GridEditor  

### Functions
Plugins can contain as many Functions as needed, reserved are [variables](#variables) and following functions  

#### firstInit
This Function is **only called once** and it will setup the internal plugin (if needed)  
Required: _false_  
Expected _return_ Value: _none_  
Arguments:  
0 resolve: Function, call this function if the Plugin Initiation Suceed  
1 reject: Function, call this function if the Plugin Initiation Failed  
2 settings: [settings object](#settings) from initiation   
```javascript
firstInit: function(resolve,reject,settings){
    $.ajax({
        url: self.url,
        data:{
            method: 'getVariables',
            myArgument: 'myValue'
        },
        dataType:"json",
        success:function(data){
            self.VARIABLE = data;
            resolve();
        },
        error:function(reason){
            reject(reason);
        },
    });
    /* more stuff to do */
}
```
**important**: the plugin needs to call `resolve()` or `reject()`  
if `reject(<reason>)` is called, the gridEditor will not initiate **ANY** plugins and understand the response as an [**HARD ERROR** (indicateError)](#indicateerror)  

#### init
The most important function, the "Creator". His Job is to Build the plugin into the container ( _contentArea_ ).  
Required: _true_  
Expected _return_ Value: _none_  
Arguments:  
0 settings: [settings object](#settings) from initiation  
1 contentArea: _jQuery Object_ containing the element, where the inside is 100% for the plugin  
2 isFromServer: Boolean, is true, if the Plugin was initiated with content inside `contentArea` provided by the server  
```javascript
init:function(settings,contentArea,isFromServer){

    let defaults = JSON.parse(self.initialContent);
    // expect an element <input type="hidden" name="plugin" value="<serverside plugin output>"> from the server
    if(isFromServer){ defaults = JSON.parse(contentArea.find('[name=plugin]').val()); }

    let content = `<label>my Field</label><input type="text" name="myField" value="${defaults.myField}>`;
    content=$(content);
    content.appendTo(contentArea);
    // append events
    contentArea.find("[name=myField]").on("change",function(){ 
        self.element.trigger("webIQGridEditor:change");
    });
}
```  
- To indicate a change, use an [Event](#events).   
- You *can* replace near `let content`, "my Field" with `${self.tr(settings.lang,"myKey")}`. See [Translation](#translation).  
- You *can* replace the two lines with `defaults` with just this code:  
`let defaults = JSON.parse(contentArea.find('[name=plugin]').val()||self.initialContent);`  

#### deinit
This will destroy the inside of the plugin container, will be called on "delete" and "change" of plugin-type  
Required: _true_  
Expected _return_ Value: _none_  
Arguments:  
0 settings: [settings object](#settings) from initiation  
1 contentArea: _jQuery Object_ containing the element, where the inside is 100% for the plugin  
```javascript
deinit: function(settings, contentArea){
    contentArea
        .off() // remove all listeners (if they are on the main element)
        .html('') // clean the content
        .attr('class','ge-content'); // reset class to the default state
    // this is the minified variant of what this function has to do
}
```
This function should reset the container for the next Plugin (leave as want to be found)  

#### parse
This function is the data collector of the Plugin  
Required: _true_  
Expected _return_ Value: _Plain Object { any }_  
Arguments:  
0 settings: [settings object](#settings) from initiation  
1 contentArea: _jQuery Object_ containing the element, where the inside is 100% for the plugin  
```javascript
parse: function(settings, contentArea){
    return {
        "myField": contentArea.find("[name=myField]").val(),
    }
}
```
The returned value will be stringified to send the Data  

#### onCopy  
This function is the prework for copying the pluign  
Required: _false_  
Expected _return_ Value: _Boolean | Plain Object { any }_  
Arguments:  
0 settings: [settings object](#settings) from initiation  
1 contentArea: _jQuery Object_ containing the element, where the inside is 100% for the plugin  
```javascript
onCopy: function(settings, contentArea){
    return $.extend(
        {},
        self.parse(contentArea),
        (contentArea.find("[name=myField]").val() == "Inital Content")?{ "myField": "@" }:{ }
    )
}
```  
If _True_ is returned, the data copied is from _parse()_  
If _False_ is returned, this plugin is not able to be copied  

#### onPaste  
This function resolves the data from copy. function should work like init(...)  
If no `onPaste` is defined, it calls `init`  
Required: _false_  
Arguments:  
0 settings: [settings object](#settings) from initiation  
1 contentArea: _jQuery Object_ containing the Element where to put the new Container  
2 isFromServer: Boolean, is true, if the Plugin was initiated with content inside `contentArea` provided by the server  
```javascript
onPaste: function(settings, contentArea, isFromServer){
    let data = JSON.parse(contentArea.find('[name=plugin]').val());
    if(data.myField == "@"){
        data = self.initialContent;
    }
    let content = `<label>my Field</label><input type="text" name="myField" value="${data.myField}>`;
    content=$(content);
    content.appendTo(contentArea);
    // append events
    contentArea.find("[name=myField]").on("change",function(){ 
        self.element.trigger("webIQGridEditor:change");
    });
}
```

### Translation  
Required: _false_  
You can use custom translations for your plugin.  
GridEditor provides the function _translate()_ :  
```javascript
jQuery.fn.gridEditor.translate( language, key, translations )
```  
can also be used like this  
```javascript
jQuery.fn.gridEditor.translate.call( translations, language, key, overwrite_translations? )
```  
example: 
```javascript
t:{
    "en" :{"myKey":"my field"},
    "de" :{"myKey":"Mein Feld"},
},
// this works
tr:function(language,key){return $g.translate(language,key,self.t)}
// this works too
tr:function(...langKeyOwt){return $g.translate.call(self.t,...langKeyOwt)},
```
Can be used like this:
```javascript
let content = `...<label>${ self.tr(settings.lang,"myKey") }</label>...`;
```
Order of language  
1. t\[[settings.lang](#lang)\]  
2. t\['en'\]  
3. 'untranslated\[ _language_ \]\[ _key_ \]'  

**If a function `tr` is not provided or the function will not return a translated key of `pluginName`, the pluginname will apear as the Structurekey from the `$.fn.gridEditor.<col/row>Plugin` Structure.**  

### Other Functions  
These Functions can be accessed from the most locations of the code.  
#### silent  
`$.fn.gridEditor.silent(...)`  
Log content **IF** in _jQuery.grideditor.js_ the 2nd argument of the last line is `true` (also called "debug-mode")  

#### indicateError  
`$(<gridElement>).data('gridEditor').indicateError(message, error, stack)`  
indicates An Hard Error, that stop everything from doing anything (crash like)  
message: cause of Error  
error: type of error or undefined  
stack: stacktrace of error (can be recieved with the next function)  
Also Achivable by unhandled `throw Error(...)` and unhandled `Promise.reject(...)`  

#### stack   
`$.fn.gridEditor.stack(level?)`  
returns the stack from current call (level = 0) or higher (level = n) in an Array  

#### softError  
`$.fn.gridEditor.softError(...)`  
displays an error, without stoping anything

# Documentation for cfcs  
All cfc-pluginnames need to be the same as the structurekey in `$.fn.gridEditor.<col/row>Plugin.<pluginName>`.  
Ex: `$.fn.gridEditor.colPlugin.myColumnPlugin={/* ... */}` -> `Colmycolumnplugin.cfc`.  
## Col  
```xml
<cfcomponent exptends="Col">

    <cffunction name="renderFrontend" access="public" returntype="Array">
        <cfargument name="data" required="true" type="struct">

		<cfset arguments.data=super.validateData(data=arguments.data,overwrite={"plugin"={"myField"=""}})>
		<cfoutput>
			<cfsavecontent variable="local.o1">
				<div class="#arguments.data.size# #arguments.data.class#">
			</cfsavecontent>

			<cfsavecontent variable="local.o2">
				<div class="alert alert-danger">no content for plugin: #arguments.data.type#</div>
			</cfsavecontent>

			<cfsavecontent variable="local.o3">
				</div>
			</cfsavecontent>
		</cfoutput>

		<cfreturn [local.o1,local.o2,local.o3]>
    </cffunction>

    <cffunction name="renderBackend" access="public" returntype="Array">
		<cfargument name="data" type="struct" required="true">
		<cfset arguments.data=super.validateData(data=arguments.data,overwrite={"plugin"={"myField"="undefined"}})>
		
		<cfoutput>
			<cfsavecontent variable="local.o1">
				<div class="#arguments.data.size# #arguments.data.class#" value-type="#arguments.data.type#" #super.attributeBuilder(arguments.data)# #StructKeyExists(arguments.data,"data")?super.DataAttributeBuilder(arguments.data.data):""#>
			</cfsavecontent>
			<cfsavecontent variable="local.o2">
				<div class="ge-content" data-ge-content-type="#arguments.data.type#">
					<input name="plugin" type="hidden" value='#serializeJSON(arguments.data.plugin)#'>
				</div>
			</cfsavecontent>
			<cfsavecontent variable="local.o3">
				</div>
			</cfsavecontent>
		</cfoutput>
		<cfreturn [local.o1,local.o2,local.o3]>
    </cffunction>

	<cffunction name="onDelete" access="public" returntype="boolean">
		<cfargument name="data" required="true" type="struct">
		<cfreturn true>
	</cffunction>

	<cffunction name="onPaste" returntype="struct">
		<cfargument name="data" required="true" type="struct">
		<cfreturn arguments.data>
	</cffunction>
	
	<cffunction name="onVersion" returntype="struct">
		<cfargument name="data" required="true" type="struct">
		<cfreturn arguments.data>
	</cffunction>

    <!-- optional: Remote Functions -->
    <cffunction name="getVariables" access="remote" returntype="Array" returnformat="JSON">
		<cfreturn ... >
    </cffunction>
</cfcomponent>
```

### renderFrontend  
Required: _false_  
Returns: _Array(3)_  
Access: _public_  

Arguments:  
1 data _struct_  

Expected return value:  
_Array[1]_ precontainer _string_  
_Array[2]_ content _string_ (row could apear before and/or after this element)  
_Array[3]_ postcontainer _string_  

### renderBackend
Required: _false_  
Returns: _Array(3)_  
Access: _public_  

Arguments:  
1 data _struct_  

Expected return value:  
_Array[1]_ precontainer _string_  
_Array[2]_ content _string_ (row could apear before and/or after this element)  
_Array[3]_ postcontainer _string_  

### onDelete  
Required: _false_  
Returns: _Boolean(true)_  
Access: _package_  

Arguments:  
1 data _struct_  
2 ? gridKey _string_  
3 ? version _number_  

Expected return value:  
_true_ = can Delete now  
_false_ = prevent Delete  

returnvalues do not prevent deleting plugin when gridKey and version is not `""`  

### onPaste  
Required: _false_  
Returns: _struct_  
Access: _package_  

Arguments:  
1 data _struct_  

Expected return value:  
modified copy of data  

### onVersion  
Required: _false_  
Returns: _struct_  
Access: _package_  

Arguments:  
1 data _struct_  

Expected return value:  
modified copy of data  

if no `onVersion` is defined, `onPaste()` will be called instead  

### Col Utils  
Helpfull utils to create ColPlugins.  
Some may never be used.  

#### attributeBuilder  
Also in Row  
Arguments:  
1 data _struct_  
Builds attributes from data's keys (one level; gets filtered).  
Ex: `attributeBuilder({test="hi",foo=2,bar=false})` => `value-test="hi" value-foo=2 value-bar=false `  

#### validateData  
Arguments:  
1 data _struct_  
2 overwrite _struct_  
Add missing keys.  
Example (shorten):  
`validateData({size="col-1",type="text",data={foo=.5}},{data={foo=.3},plugin={content="hello world"}})`  
=> `{size="...",type="...",data={foo=.5},plugin={content="hello world"},class="...",...}`

#### DataAttributeBuilder  
Also in Row  
Arguments:  
1 data _struct_  
Builds attributes from `col.data`'s key.  
Ex: (`col.data = {foo=3,bar=8}`) `DataAttributeBuilder(col.data)` => `value-type-foo="3" value-type-bar="8" `.  

#### PluginAttributeBuilder  
Arguments:  
1 data _struct_  
Same as [DataAttributeBuilder](#dataattributebuilder) but instead of `col.data` it wants `col.plugin` and returns `value-plugin-foo="3" ...`. 

## Row  
```xml
<cfcomponent extends="Row">

	<cffunction name="renderFrontend" access="public" returntype="Array">
		<cfargument name="row" type="struct" required="true">
		<cfargument name="nextType" type="string" required="true">
		<cfargument name="lastType" type="string" required="true">
        
		<cfoutput>
			<cfsavecontent variable="local.o1">
				<div class="row">
			</cfsavecontent>

			<cfsavecontent variable="local.o2">
				</div>
			</cfsavecontent>
		</cfoutput>

		<cfreturn [local.o1,local.o2]>
    </cffunction>

	<cffunction name="renderBackend" access="public" returntype="Array">
		<cfargument name="row" type="struct" required="true">
		<cfargument name="nextType" type="string" required="true">
		<cfargument name="lastType" type="string" required="true">

		<cfoutput>
			<cfsavecontent variable="local.o1">
				<div class="row" value-type="#arguments.row.type#" id="#arguments.row.id#" #attributeBuilder(arguments.row)# #StructKeyExists(arguments.row,"data")?DataAttributeBuilder(arguments.row.data):""#>
			</cfsavecontent>

			<cfsavecontent variable="local.o2">
				</div>
			</cfsavecontent>
		</cfoutput>

		<cfreturn [local.o1,local.o2]>
	</cffunction>

	<cffunction name="onVersion" access="package">
		<cfargument name="data" required="true" type="struct">
		<cfreturn data>
	</cffunction>

	<cffunction name="onDelete" access="public">
		<cfreturn true>
	</cffunction>

</cfcomponent>
```

### renderFrontend  
Required: _false_  
Access: _public_  
Return: _Array(2)_  

Arguments:  
1 row _struct_  
2 nextType _string("")_  
3 lastType _string("")_  

Expected return value:  
_Array[1]_ precontainer _string_  
_Array[2]_ postcontainer _string_  


### renderBackend  
Required: _false_  
Access: _public_  
Return: _Array(2)_  

Arguments:  
1 row _struct_  
2 nextType _string("")_  
3 lastType _string("")_  

Expected return value:  
_Array[1]_ precontainer _string_  
_Array[2]_ postcontainer _string_  

### Row Utils  
Available Row Utils: `attributeBuilder()` & `DataAttributeBuilder()`  
Functionality, see in [Col Utils](#col-utils).
---  
Written by Thomas Ensner
