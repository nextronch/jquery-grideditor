(function($,$g) {
    let self = $g.columnPlugins.plugin = { // Enter here your plugin name (!UNIQUE!)
        variable:undefined, // OPTIONAL: Add plugin Variables
        url: 'cfc/grid/ColPlugin.cfc',
        t:{"all":{"field1":"Translation For All Languages (used if Language does not have a Translation)"},"de":{"field2":"Übersetzung für Deutsch"},"en":{"field2":"Translation for English"}}, // OPTIONAL: Add somme Translations
        tr:function(l,a){return $g.translate.call(this.t,l,a)}, // OPTIONAL: add custom Functions to shorten the later calls
        initialContent: '{"type":"","name":"","id":"-1"}', // define your inital content / object
        element: $('<eventController />'),
        firstInit: function(resolve,reject){ // STATIC, OPTIONAL: this will always be called on the initiation of an Grideditor. Uses Promise to wait for Response (ajax purpose)
            // do stuff to setup the [plugin] object
            $.ajax({
                "url": self.url,
                "method":"GET",
                "data":{
                    "method":"getVariable"
                },
                "dataType":"json",
                "success":function(data){
                    self.variable = data; // set [plugin.<variable>] to recieved Content
                    resolve(); // REQUIRED: call resolve(unusedData) to return that the Plugin is Done
                },
                "error":function(reason){
                    reject(reason); // OPTIONAL: call reject(reason) to return that an Error Occured. will post to Console.
                }
            });
                
        },
        init: function(settings, contentArea, isFromServer){ // STATIC, REQUIRED: this function gets the Settings entered by the initiation and the an single Element to append the Editor
            
            if (self.variable == undefined){ // optional: variable Validation
                throw new Error("( =c=) ajax too late for Plugin!");
            }
            
            // -=[ Append your Editor initiation code here ]=- 
            
            // here an example
            contentArea = $(contentArea); // upgrade 'contentArea' to jQuery
            let defaults = JSON.parse(contentArea.find('[name=plugin]').val()||self.initialContent); // take the data from the Server delivered Element (input[name=plugin]) or use the initalContent (new Element)
            let b = /* create a HTML template */`
                <table>
                    <tr>
                        <td><span>${self.tr(settings.lang, "field1")/* Use plugin functions (look above [tr]). ex: Translate */}:</span></td>
                        <td><select name="type"${/* tip: use for data containing elements a [name] attribute */!1}>${self.variable.map(function(a){return`<option value="${a}"${(defaults.type==a?'selected':'')}>${a}</option>`}).join('')/* create any dynamic content */}</select></td>
                    </tr>
                    <tr>
                        <td><span>${self.tr('en', "field2")}:</span></td>
                        <td><input type="text" name="name" placeholder="${self.tr(settings.lang,"name")}" value="${defaults.name}"></td>
                    </tr>
                    <tr>
                        <td><span>${self.tr('de', "field2")}:</span></td>
                        <td><span name="id">${defaults.id}</span></td>
                    </tr>
                </table>`;
            /* REQUIRED, STATIC: [plugin.element] */
            $(b).each(function(_,a){ /* loop through each Element in the Template */
                $(a).appendTo(contentArea); // Append current Element to Editor View

                // optional: add listener to data containing elements (may for somme changes in the background)
                if(!a.attr('name')){return} // Filter non listener out
                // add to ALL elements an listener to trigger the Event
                $(a).on('change',function(){self.element.trigger('webIQGridEditor:change')}) // optional: bind an 'webIQGridEditor:change' Event to indicate an Change.
                // IMPORTANT: needs to be triggered on the [plugin.element] object. listeners in the background listen to that exact object
                // IMPORTANT: if changes occur use the 'webIQGridEditor:change' Event to save. (will send 'webIQGridEditor:changed' to initiation after 2 seconds idle)
            });

            // OPTIONAL: append events to specific Elements. ex: hide in Editor View unusable Elements
            contentArea.find("[name=type]").on('change',function(){
                if(contentArea.find('[name=id]').val())
                contentArea.find('[name=id]').toggleClass('hidden');
                self.element.trigger('webIQGridEditor:change'); 
            });
            // OPTIONAL: 'isFromServer' argument is TRUE if the init is called DURING initiation with Data from the Server
            

            // OPTIONAL: add post deliverer
            if(defaults.id==-1 && !isFromServer){ // test for the data if it is created by a ADD click
                contentArea.find("[name=id]").html("loading...") // give visual feedback
                // Load data with Promise 
                new Promise(function(resolve,reject){
                    $.ajax({
                        "url": self.url,
                        "method":"GET",
                        "data":{
                            "method":"nextId"
                        },
                        "dataType":"json",
                        "success":function(data){
                            resolve(data);
                        },
                        "error":function(request,status,error){
                            reject(`An Error of type '${status}' occured: ${error}`);
                        }
                    })
                }).then(function(result){
                    // blend from 'loading...' to content 
                    contentArea.find("[name=id]").fadeOut(100,function(){
                        $(this).html(result);
                        $(this).fadeIn(100);
                    })
                }).catch(function(reason){
                    // replace with a described error
                    contentArea.find("[name=id]").html(reason.toString());
                })
            }
        },
        deinit: function(settings, contentArea){ // STATIC,REQUIRED: this function gets called, if the Editor View is not needet at that Element
            contentArea
                .html('')
                .off()
                .attr('class','ge-content')
            // final goal: get the contentArea ready for the next plugin (leave as found)
        },
        parse: function(settings, contentArea){ // STATIC,REQUIRED: this function is called everytime the changes has occured and an save needs to be made
            // convert the plugin data into the same structure as the "initContent" and the Server Element "input[name=plugin]"
            return  {
                "type":contentArea.find("[name=type]").val(),
                "name":contentArea.find("[name=name]").val(),
                "id":contentArea.find("[name=id]").html(),
            }
        },
        onCopy: function(settings, contentArea){ // STATIC, OPTIONAL: this function gets called, when the Copy button is clicked somewhere
            // return true, if the parse function should be used instead.
            // return plain Object {} to use that data instead
            // return false, if copy is not possible on this plugin. 
            return $.extend(
                {},
                self.parse(settings, contentArea),
                {
                    id: -1
                }
            );
        },
        onPaste: function(settings, contentArea, isFromServer){ // STATIC, OPTIONAL: this function gets called after a server request, caused by a click on the paste button
            // this should work like init(), just with copied data. 
        }
    };
})(jQuery,jQuery.fn.gridEditor);