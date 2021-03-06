/**
 * Frontwise grid editor plugin.
 * @event webIQGridEditor:change (resetChangedTimer)
 * @event webIQGridEditor:changed (called on ChangedTimer runout of time)
 * @event webIQGridEditor:block (prevents the current change event)
 * @requires sortable
 * @argument {Object} $ jQuery
 * @argument {boolean} debug enable debugger-mode
*/
(function( $ , debug = false){
/* DEV Functions */
/** trace current Line with a message @argument {string} msg prints into console the message and the line inwhich called */
// function trace(msg){try{throw new Error()}catch(e){console.log(`Tracking Occured${msg?` for "${msg}"`:''}: `,e.stack.split('\n')[2].replace(/^\W+at\W(?:[^(]*\((.*)\)|(.*))$/gm,'$1$2')/* .replace(/([^(]*|\tat )\((.*)\)?/g,'$1') */);}}

/** @namespace grideditor */
$g = function( options ) {
    let stack=$.fn.gridEditor.stack;
    let softError=$.fn.gridEditor.softError;
    function clamp(input, min, max) {
        return Math.min(max, Math.max(min, input));
    }
    /** grideditor 
     * @type {Object}
     */
    var self = this;
    var grideditor = self.data('grideditor');
    var enableSave=true;
    /** Methods **/
    function handleMainArguments(args){
        if (args[0] == 'getHtml') {
            if (grideditor) {
                grideditor.deinit();
                let html = self.html();
                grideditor.init();
                return html;
            } else {
                return self.html();
            }
        }
        
        if(args[0] == 'getJSON') {
            if (grideditor) {
                return grideditor.getJSON();
            } else {
                return "{}";
            }
        }
        
        if (args[0] == 'remove') {
            if (grideditor) {
                grideditor.remove();
            }
            return;
        }
        return;
    }
    if(typeof arguments[0] == "string"){
        return handleMainArguments(arguments);
    }
    /* bec. we still are going, there should be an Initiation */
    var settings = $.extend({
        'new_row_layouts'   : [ // Column layouts for add row buttons
                                ["12"],
                                ["6","6"],
                                ["4","4","4"],
                                ["3","3","3","3"],
                                ["2","2","2","2","2","2"],
                                ["2","8","2"],
                                ["4","8"],
                                ["8","4"]
                            ],
        'row_classes'       : [], // [{ label: 'Example class', cssClass: 'example-class'}],
        'col_classes'       : [], // [{ label: 'Example class', cssClass: 'example-class'}],
        'col_tools'         : [],
        'row_tools'         : [],
        'custom_filter'     : '',
        'idleTime'          : 1000,
        'plugins'           : {}, // custom settings for col/row modules
        'lang'              : 'en',
        'default_col_plugin': Object.keys(jQuery.fn.gridEditor.columnPlugins)[0],
        'default_row_plugin': Object.keys(jQuery.fn.gridEditor.rowPlugins)[0],
        'valid_col_sizes'   : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        'breakpointOrder'   : ["","sm","md","lg","xl"], // bt 4
        'breakpoints'       : [{"col":"lg","type":"Desktop","width":"none"},{"col":"sm","type":"Tablet","width":"800px"},{"col":"","type":"Smartphone","width":"400px"}],
    }, options);
    // breakpoints sorted after size desc.
    // avaliable bp: breakpoints ordered by breakpointOrder

    /** Initialize plugin 
     * @class  */
    const plugins = {
        col:{
            /** get specific ColumnPlugin */
            get:function(type) {
                if($g.columnPlugins[type]==undefined){throw new Error(`unknown Grideditor Column Plugin '${type}'. Include the plugin you require.`)}
                return $g.columnPlugins[type];
            },
            /** get all ColumnPlugins */
            getAll:function() {
                return $g.columnPlugins;
            },
            /** init a ColumnPlugin */
            init: function(element, option={}){
                if(option.isFromServer == undefined){option.isFromServer=false}
                if(option.initByPaste == undefined){option.initByPaste=false}
                let plugin = $(element).parent().attr('value-type');
                console.log("plugins.col.initOne: %s",plugin);
                var colPlugin = plugins.col.get(plugin);
                if (colPlugin) {
                    $(element).addClass('ge-rte-active', true);
                    try{
                        if(option.initByPaste && colPlugin.onPaste!=undefined){
                            colPlugin.onPaste(settings, $(element), option.isFromServer)
                        } else {
                            colPlugin.init(settings, $(element), option.isFromServer);
                        }
                        $(element).attr("data-ge-content-type",plugin);
                    }
                    catch(e){
                        console.error(`initiation for plugin '${plugin}' failed!`,e);
                        indicateError(`initiation for plugin '${plugin}' failed! ${e&&e.message||e||''}`,`Error`,stack());
                    }
                }
            }
        },
        row:{
            /** get specific RowPlugin */
            get:function(type) {
                if($g.rowPlugins[type]==undefined){throw new Error(`unknown Grideditor Row Plugin '${type}'. Include the plugin you require.`)}
                return $g.rowPlugins[type];
            },
            /** get all RowPlugins */
            getAll:function() {
                return $g.rowPlugins;
            }
        },
        remove: function (element,resMe,rejMe,col=false){
            Promise.all(element.children(".row,.column").map(function(index, child){
                return new Promise(function(res,rej){
                    plugins.remove($(child),res,rej,!col);
                })
            })).then(function(){
                if(col){
                    let colPlugin = $(element).find('.ge-content').attr('data-ge-content-type');
                    $.ajax({
                        url: 'cfc/grid/grid.cfc',
                        data: {
                            method: 'onDelete',
                            data: JSON.stringify(plugins.col.get(colPlugin).parse(settings,$(element).find('.ge-content'))),
                            plugin: colPlugin,
                            gridKey: self.data('grid-key')
                        },
                        dataType: 'json',
                        success: function(data){
                            if(data == true) {
                                element.remove();
                                resMe();
                            } else {
                                rejMe();
                            }
                        },
                        error: rejMe
                    })
                } else {
                    element.remove();
                    resMe();
                }
            }).catch(function(){
                console.log("stoped");
            });
        }
    };

    function initOnTo(baseIndex, baseElem) {
        baseElem = $(baseElem);
        var canvas,
            mainControls,
            wrapper,
            addRowGroup,
            htmlTextArea,
            lastChange = 0
        ;
        // search for General Inconsistence
        console.assert(settings.breakpoints.map(function(a){return a.col}).filter(function(a){return settings.breakpointOrder.indexOf(a)==-1}).length==0,"breakpoints[].col invalid for ordering, for custom ordering use breakpointOrder[]");

        /** Contains functions and variables for class/breakpoints */
        const classes = {
            /** Add a '-' if argument is not empty
             * @param {string} a suffix of columnClass 
             * @returns {string} argument with or without a '-' suffix */
            ad : function(a){return a+(a==""?"":"-")},

            /** Usable Column classes 
             * @type {string[]} */
            colClasses: undefined,

            /** Index of the column class we are manipulating currently. Index of *classes.colClasses* 
             * @type {number} */
            curColClassIndex : 0,

            /** fullwith value of column
             * @type {number} */
            MAX_COL_SIZE : 12,
        };
        Object.defineProperty(classes,"colClasses",{value:settings.breakpoints.map(function(a){return`col-${classes.ad(a.col)}`})})
        //#region clipboard
        const ls = {
            key: location.host.split('.').reverse().join('.')+'.grideditor.clipboard',
            value: {},
            get: function(){this.value=JSON.parse(localStorage.getItem(this.key))},
            set: function(x){if(x!=undefined){this.value=x};localStorage.setItem(this.key,JSON.stringify(this.value))},
            pasteTo: function(element){
                $.ajax({
                    url:"cfc/grid/grid.cfc",
                    data:{
                        method:"renderPaste",
                        type: ls.type,
                        data: ls.value.data
                    },
                    success: function(data){
                        let prototypeElement = $(data);
                        prototypeElement.appendTo(element);
                        if(ls.type == "col"){
                            prototypeElement.addClass("column")
                        } else if (ls.type == "row"){
                            prototypeElement.addClass("row")
                        }
                        colCalc.addAllColClasses(prototypeElement);
                        controls.applyToRows(prototypeElement);
                        controls.applyToCols(prototypeElement);
                        controls.makeSortable(prototypeElement);
                        prototypeElement.find(".ge-content").each(function(){
                            plugins.col.init(this, {isFromServer:true,initByPaste:true});
                        });
                        self.trigger("webIQGridEditor:change");
                    },
                    error: function(reason){
                        console.error(reason);
                        softError(reason);
                    }
                })
            }
        };
        Object.defineProperty(ls, "type", {get:function(){return this.value.type}});
        Object.defineProperty(ls, "data", {get:function(){return JSON.parse(this.value.data)}});
        ls.get();

        // #endregion clipboard
        //#region createContolls
        const controls = {
            applyToRows:function(element=canvas) {
                element.find('.row').addBack('.row').each(function() {
                    var row = $(this);
                    if (row.find('> .ge-tools-drawer').length) { return; }

                    var drawer = $('<div class="ge-tools-drawer" />').prependTo(row);
                    let more = $('<div class=\"dropdown-menu\" />');

                    controls.createTool(drawer, $g.translateSelf(settings.lang,'move'), 'ge-move', 'fa fa-arrows-alt');
                    controls.createTool(drawer, $g.translateSelf(settings.lang,'settings'), '', 'fa fa-cog', function() {
                        details.toggle();
                    });
                    controls.createTool(more, $g.translateSelf(settings.lang,'col_add'), 'ge-add-column', 'fa fa-plus-circle', function() {
                        let a = colCalc.createColumn(12);
                        a.appendTo(row);
                        plugins.col.get(settings.default_col_plugin).init(settings,a.find(".ge-content"));
                        init();
                    });
                    controls.createTool(more, $g.translateSelf(settings.lang,'col_copy'), '', 'fa fa-clipboard', function(){
                        let __c = JSON.stringify(JSON.parse(getJSON(row,true)).rows[0]);
                        ls.set({type:'row',data:__c});
                    });
                    controls.createTool(more, $g.translateSelf(settings.lang,'col_paste'), '', 'fa fa-paste', function(){
                        if(ls.type=="col"){
                            ls.pasteTo(row);
                        }
                    })
                    controls.createTool(more, $g.translateSelf(settings.lang,'row_remove'), '', 'fa fa-trash-alt', function() {
                        if (window.confirm($g.translateSelf(settings.lang,'row_remove_confirm'))) {
                            plugins.remove(row,function(){self.trigger("webIQGridEditor:change")},function(){},false);
                        }
                    });
                    drawer.append($('<div class=\"btn-group\"><a type=\"button\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\"><i class=\"fas fa-caret-down\"></i></a></div>').append(more))
                    let plugin = plugins.row.getAll();
                    let rowTools = {
                        "name":"type",
                        "type":"dropdown",
                        "options": Object.keys(plugin).map(function(a){
                            let b=plugins.row.get(a);
                            let label=(b.tr&&b.tr(settings.lang,"pluginName"))||a;
                            return plugin[a].internal ? {
                                "name":a,
                                "label":(label=="untranslated[\""+settings.lang+"\"][\"pluginName\"]"?a:label),
                                "settings":plugin[a].internal
                            }:{
                                "name":a,
                                "label":(label=="untranslated[\""+settings.lang+"\"][\"pluginName\"]"?a:label)
                            }
                        })
                    };
                    var details = controls.createDetails(row, settings.row_classes, [...settings.row_tools,rowTools]).appendTo(drawer);
                    
                });
            },
            applyToCols:function (element=canvas) {
                element.find('.column').addBack('.column').each(function() {
                    var col = $(this);
                    if (col.find('> .ge-tools-drawer').length) { return; }

                    var drawer = $('<div class="ge-tools-drawer" />').prependTo(col);
                    let more = $("<div class=\"dropdown-menu\"></div>");

                    controls.createTool(drawer, $g.translateSelf(settings.lang,'move'), 'ge-move', 'fa fa-arrows-alt');

                    controls.createTool(drawer, $g.translateSelf(settings.lang,'smaller'), 'ge-decrease-col-width', 'fa fa-minus', function(e) {
                        var colSizes = settings.valid_col_sizes;
                        var curColClass = classes.colClasses[classes.curColClassIndex];
                        var curColSizeIndex = colSizes.indexOf(colCalc.getColSize(col, curColClass));
                        var newSize = colSizes[clamp(curColSizeIndex - 1, 0, colSizes.length - 1)];
                        if (e.shiftKey) {
                            newSize = colSizes[0];
                        }
                        colCalc.setColSize(col, curColClass, Math.max(newSize, 1));
                        self.trigger("webIQGridEditor:change");
                    });

                    controls.createTool(drawer, $g.translateSelf(settings.lang,'bigger'), 'ge-increase-col-width', 'fa fa-plus', function(e) {
                        var colSizes = settings.valid_col_sizes;
                        var curColClass = classes.colClasses[classes.curColClassIndex];
                        var curColSizeIndex = colSizes.indexOf(colCalc.getColSize(col, curColClass));
                        var newColSizeIndex = clamp(curColSizeIndex + 1, 0, colSizes.length - 1);
                        var newSize = colSizes[newColSizeIndex];
                        if (e.shiftKey) {
                            newSize = colCalc.getColumnSpare(col.parent(),col);
                            let a = colSizes.indexOf(newSize);
                            if(a==-1){
                                let b = 0;
                                colSizes.forEach(function(c){if(c<newSize){b=c}}); // if size is not valid, go to next down
                                if(b==0){colSizes.reverse().forEach(function(c){if(c>newSize){b=c}})}; // or wider
                                newSize = b;
                            }
                        }
                        
                        colCalc.setColSize(col, curColClass, Math.min(newSize, classes.MAX_COL_SIZE));
                        self.trigger("webIQGridEditor:change");
                    });

                    controls.createTool(drawer, $g.translateSelf(settings.lang,'settings'), '', 'fa fa-cog', function() {
                        details.toggle();
                    });

                    controls.createTool(more, $g.translateSelf(settings.lang,'row_add'), 'ge-add-row', 'fa fa-plus-circle', function() {
                        var row = colCalc.createRow();
                        col.append(row);
                        let a = colCalc.createColumn(12);
                        row.append(a);
                        plugins.col.get(settings.default_col_plugin).init(settings,a.find(".ge-content"))
                        
                        init();
                    });

                    controls.createTool(more, $g.translateSelf(settings.lang,'row_copy'), '','fas fa-copy',function(){
                        let __c = getJSON(col,true);
                        ls.set({type:'col',data:__c});
                    })

                    controls.createTool(more, $g.translateSelf(settings.lang,'row_paste'), '', 'fas fa-paste', function(){
                        if(ls.type=='row') {
                            console.log("paste row: ",ls.data);
                            ls.pasteTo(col);
                        }
                    })

                    controls.createTool(more, $g.translateSelf(settings.lang,'col_remove'), '', 'fa fa-trash-alt', function() {
                        if (window.confirm($g.translateSelf(settings.lang,'col_remove_confirm'))) {
                            plugins.remove(col,function(){self.trigger("webIQGridEditor:change")},function(){},true);
                        }
                    });
                    drawer.append($("<div class=\"btn-group\"><a class=\"ge-add-row\" type=\"button\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\"><i class=\"fas fa-caret-down\"></i></a></div>").append(more));
                    let plugin = plugins.col.getAll()
                    let col_tools = {"name":"type","type":"dropdown","options":Object.keys(plugin).map(function(a){let b=plugins.col.get(a);let label=(b.tr&&b.tr(settings.lang,"pluginName"))||a;return {"name":a,"label":(label=="untranslated[\""+settings.lang+"\"][\"pluginName\"]"?a:label),"settings":plugin[a].settings}||a})}
                    var details = controls.createDetails(col, settings.col_classes, [...settings.col_tools,col_tools]).appendTo(drawer);
                });
            },
            createTool: function (drawer, title, className, iconClass, eventHandlers) {
                var tool = $('<a title="' + title + '" class="' + className + '"><i class="' + iconClass + '"></i> '+(drawer.hasClass("dropdown-menu")?title:'')+'</a>')
                    .appendTo(drawer)
                ;
                if (typeof eventHandlers == 'function') {
                    tool.on('click', eventHandlers);
                }
                if (typeof eventHandlers == 'object') {
                    $.each(eventHandlers, function(name, func) {
                        tool.on(name, func);
                    });
                }
                return tool;
            },
            createDetails: function(container, cssClasses, customSettings = []) {
                var detailsDiv = $('<div class="ge-details" />');
                var classGroup = $('<div class="btn-group float-right" />').appendTo(detailsDiv);
                
                cssClasses.forEach(function(colClass) {
                    colClass.default=!!colClass.default;
                    if(!((colClass.cssClass && !colClass.default) || (colClass.inverted && colClass.default))){
                        console.error("col_classes or row_classes settings with label \"%s\" is not a valid option. Not solving will lead to corruption. (Error was thrown!)",colClass.label);
                        throw -1;
                    }
                    var btn = $('<a class="btn btn-sm btn-default" />')
                        .html(colClass.label)
                        .attr('title', colClass.title ? colClass.title : 'Toggle "' + colClass.label + '" styling')
                        .on('click', function() {
                            btn.toggleClass('active btn-primary');
                            if(colClass.cssClass){
                                container.toggleClass(colClass.cssClass, btn.hasClass('active'));
                            }
                            if(colClass.inverted){
                                container.toggleClass(colClass.inverted, !btn.hasClass('active'));
                            }
                            self.trigger("webIQGridEditor:change");
                        })
                        .appendTo(classGroup)
                    ;
                    if( !((colClass.cssClass && container.hasClass(colClass.cssClass)) || (colClass.inverted && container.hasClass(colClass.inverted))) ){
                        if(colClass.default){
                            if(colClass.cssClass){container.toggleClass(colClass.cssClass,!0);}
                        } else {
                            if(colClass.inverted){container.toggleClass(colClass.inverted,!0);}
                        }
                    };
                    if((colClass.cssClass && container.hasClass(colClass.cssClass)) || (colClass.inverted && !container.hasClass(colClass.inverted))){
                        btn.toggleClass("active btn-primary", true);
                    }
                });
                function g(p,n){
                    return `${p}-${n}`;
                }
                function buildFrom(x,parent='value'){
                    let y = undefined;
                    switch(x.type) {
                        case "dropdown":
                            y = $(`${x.label?`<label for="${x.name}">${x.label}:`:""}<select class="form-control form-control-sm" ${parent != '' ? ` parent='${parent}'` : ''} name="${x.name}">${x.options.map(function (r) { return `<option${container.attr(g(parent,x.name)) == (r.name||r) ? " selected" : ""} value='${r.name||r}'>${r.label||r.name||r}</option>`}).join('')}</select>${x.label?"</label>":""}`).on('change',function(isInit=false){
                                detailsDiv.find(`[parent=${parent + "-" + x.name}]`).replaceWith(); // Clean Subelements
                                // unset all previous changes
                                if(!isInit){
                                    Array.from(container.get(0).attributes).filter(function (f) { return f.name.startsWith(g(parent, x.name) + `-`) }).forEach(function (d) {
                                        container.removeAttr(d.name);
                                    });
                                }
                                let o = $(this);
                                container.attr(g(parent,x.name), o.val()); // Set Background value
                                ((x.options.filter(function(b){return (b.name||b)==o.val()})[0]||{}).settings||[]).forEach(function(c){buildFrom(c,g(parent, x.name))}); // Rebuild Subelements
                            });
                            break;
                        case "switch":
                            if (container.attr(g(parent, x.name)) == undefined) { container.attr(g(parent, x.name), x.default == undefined ? false : x.default)}; // use default-value
                            y = $(`<a${parent != '' ? ` parent='${ parent }'` : ''} class="btn btn-sm btn-default" />`)
                                .html(x.name)
                                .toggleClass('active btn-primary', container.attr(g(parent, x.name)) == "true")
                                .on('click', function () {
                                    $(this).toggleClass('active btn-primary');
                                    container.attr(g(parent, x.name), $(this).hasClass('active'));
                                    y.trigger("change");
                                });
                            break;
                        case "input":
                            y = $(`<input${parent != '' ? ` parent='${parent}'` : ''} placeholder="${x.placeholder||x.name}" type="${x.inputtype||'text'}" value="${container.attr(g(parent, x.name))||x.default||''}"/>`)
                                .change(function(){
                                    container.attr(g(parent, x.name),$(this).val());
                                });
                            break;
                        default:
                            throw new Error(`Detail Settings ElementType '${x.type}' unknown!`);
                            break;
                    }
                    y.appendTo(detailsDiv);
                    y.trigger('change', [true]);
                    y.on('change',function(){self.trigger("webIQGridEditor:change")});
                    return y;
                }
                customSettings.forEach(function(elementSettings){
                    buildFrom(elementSettings);
                });
                detailsDiv.find("[parent='value'][name='type']").on('change',function(){
                    if(container.hasClass('column')){
                        // step 1: deinit() old plugin
                        plugins.col.get(container.find('.ge-content').attr('data-ge-content-type')).deinit(settings, container.find('.ge-content'));
                        // step 2: DELETE CONTENT (plugin preperation)
                        container.find('.ge-content').html('');
                        // step 3: init new module
                        plugins.col.init(container.find('.ge-content'));
                    }
                });
                return detailsDiv;
            },
            makeSortable: function (element=canvas) {
                element.find('.row').addBack('.row').sortable({
                    items: '> .column',
                    connectWith: '.ge-canvas .row',
                    handle: '> .ge-tools-drawer .ge-move',
                    start: sortStart,
                    stop: sortStop,
                    tolerance: 'pointer',
                    helper: 'clone',
                });
                element.add(element.find('.column').addBack('.column')).sortable({
                    items: '> .row, > .ge-content',
                    connectsWith: '.ge-canvas, .ge-canvas .column',
                    handle: '> .ge-tools-drawer .ge-move',
                    start: sortStart,
                    stop: sortStop,
                    helper: 'clone',
                });
                function sortStart(e, ui) {
                    self.trigger("webIQGridEditor:block");
                    ui.placeholder.css({ height: ui.item.outerHeight()});
                }
                function sortStop(e, ui) {
                    self.trigger("webIQGridEditor:change");
                }
    
                element.find('.column').addBack('.column').resizable({
                    handles: "e",
                    resize: function(ev,ui){
                        const s = {cc:{}};
                        s.mW = ui.element.parent().get(0).getBoundingClientRect().width;
                        s.cW = ui.size.width;
                        s.MX = classes.MAX_COL_SIZE;
                        s.cc.all = classes.colClasses;
                        s.cc.key = classes.colClasses[classes.curColClassIndex];
                        
                        try{s.cc.index = ui.element.attr('class').split(' ').filter(function(a){return a.match(`^${s.cc.key}\\d+$`)!=null})[0].match('\\d+')[0];
                        } catch(e){debugger}
                        const r = {};
                        r.apr = s.cW / (s.mW / s.MX);
                        r.est = Math.round(r.apr);
                        r.closestTo = function(value,list){
                            let index = list.indexOf(value);
                            if (index==-1){
                                let low = (list.filter(function(v){return v>value})[0]);
                                let upper = (list.filter(function(v){return v<value}).pop())||s.MX;
                                if(!(low && upper)){return low||upper;}
                                return upper-value < value-low?upper:low;
                            } else {
                                return list[index];
                            }
                        }
                        let x = r.closestTo(r.est,settings.valid_col_sizes);
                        if(x!=s.cc.index){
                            ui.element.removeClass(s.cc.key+s.cc.index);
                            ui.element.addClass(s.cc.key+x);
                        }
                    },
                    stop: function(ev,ui){
                        ui.element.removeAttr('style');
                        self.trigger("webIQGridEditor:changed");
                    }
                })
            }
        };
        Object.defineProperty(controls, "removeSortable",{value:function (c) {
            c.add(c.find('.column')).add(c.find('.row')).sortable('destroy');
        }});
        //#endregion

        //#region column calculation
        const colCalc = {
            getColumnSpare:function (row,col) {
                return classes.MAX_COL_SIZE - colCalc.getColumnSizes(row,col);
            },
            getColumnSizes:function(row,col) {
                var layout = classes.colClasses[classes.curColClassIndex];
                var size = 0; // current line
                let result = 0; // max length
                let calc = false;
                row.children('[class*="'+layout+'"]').each(function(i){
                    let me = colCalc.getColSize($(this),layout);
                    let curr = col.is(this);
                    if(curr){calc=true;result-=me;}
                    if(calc&&size+me>12&&curr){size=0;}
                    if(calc&&size+me>12&&!curr){result+=size;}
                    if(size+me>12){size=0;if(calc){calc=false;return false}}
                    size += me;
                });
                if(calc&&size!=0){result+=size;}
                return result;
            },
            addAllColClasses: function (element=canvas) {
                element.find('.column, div[class*="col-"]').addBack('.column, div[class*="col-"]').each(function() {
                    var col = $(this);
                    var size = 2;
                    var sizes = colCalc.getColSizes(col);
                    if (sizes.length) {
                        size = sizes[0].size;
                    }
                    var elemClass = col.attr('class');
                    classes.colClasses.forEach(function(colClass) {
                        if (elemClass.indexOf(colClass) == -1) {
                            col.addClass(colClass + size);
                        }
                    });
                    col.addClass('column');
                });
            },
            /**
             * Return the column size for colClass, or a size from a different
             * class if it was not found.
             * Returns null if no size whatsoever was found.
             */
            getColSize: function (col, colClass) {
                var sizes = colCalc.getColSizes(col);
                for (var i = 0; i < sizes.length; i++) {
                    if (sizes[i].colClass == colClass) {
                        return sizes[i].size;
                    }
                }
                if (sizes.length) {
                    return sizes[0].size;
                }
                return null;
            },
            getColSizes: function (col) {
                var result = [];
                classes.colClasses.forEach(function(colClass) {
                    var re = new RegExp(colClass + '(\\d+)', 'i');
                    if (re.test(col.attr('class'))) {
                        result.push({
                            colClass: colClass,
                            size: parseInt(re.exec(col.attr('class'))[1])
                        });
                    }
                });
                return result;
            },
            setColSize: function (col, colClass, size) {
                var re = new RegExp('(' + colClass + '(\\d+))', 'i');
                var reResult = re.exec(col.attr('class'));
                if (reResult && parseInt(reResult[2]) !== size) {
                    col.switchClass(reResult[1], colClass + size, 50);
                } else {
                    col.addClass(colClass + size);
                }
            }
        };
        Object.defineProperty(colCalc, "createRow",{value:function() {
            return $(`<div class="row" value-type="${settings.default_row_plugin}"/>`);
        }});
        Object.defineProperty(colCalc, "createColumn",{value:function(size) {// size : number
            let a = $('<div/>')
                .addClass(classes.colClasses.map(function(c){return c+size;}).join(' '))
                .attr("value-type",settings.default_col_plugin)
                .append(createDefaultContentWrapper().html(""));
            return a;
        }});
        //#endregion

        // Wrap content of baseElem in <newRow>, if it is non-bootstrap
        (function wrapChildrenForBootstrap(){
            if (baseElem.children().length && !baseElem.find('div.row').length) {
                var children = baseElem.children();
                var newRow = $('<div class="row"><div class="col-lg-12"/></div>').appendTo(baseElem);
                newRow.find('.col-lg-12').append(children);
            }
        })()

        function setup() {
            /* Setup canvas */
            canvas = baseElem.addClass('ge-canvas');
            htmlTextArea = $('<textarea class="ge-html-output"/>').insertBefore(canvas);
            /* Create main controls*/
            mainControls = $('<div class="ge-mainControls" />').insertBefore(htmlTextArea);
            wrapper = $('<div class="ge-wrapper ge-top" />').appendTo(mainControls);
            // Add row
            addRowGroup = $('<div class="ge-addRowGroup btn-group" />').appendTo(wrapper);

            //#region width / breakpoint
            // sort out items that are in the breakpoints
            let bpo = settings.breakpointOrder.map(function(a, b) {
                return [a, b]
            }).filter(function(a) {
                return settings.breakpoints.filter(function(b) {
                    return b.col == a[0]
                }).length
            }).sort(function(a, b) {
                return a[1] > b[1]
            }).map(function(a) {
                return classes.ad(a[0])
            })

            let nextHigher;
            function f(a){return function(b){return b.match(`^${a}\\d*$`)}}
            /* bring a[] in order of b[] */
            function align(a, b) {
                return b.map(function(c) {
                    return [c, a.find(f(c))]
                }).filter(function(c) {
                    return c[1]
                }).map(function(c) {
                    return c[1]
                })
            }
            // get highest value of all entries
            let highestOfGroup = settings.new_row_layouts.map(function(a){
                return a.map(function(b){
                    let l=b.split(' ');
                    nextHigher=align(l,bpo)[0].match(/\d*/g).join('');
                    let result = bpo.map(function(c){
                        return c+(nextHigher=l.find(f(c))||nextHigher).match(/\d*/g).join('');
                    }).map(function(c){return`col-${c}`}).join(' ');
                    return result
                })
            });
            $.each(highestOfGroup, function(j, layout) {
                var btn = $('<a class="btn btn-sm btn-primary" />')
                    .attr('title', $g.translateSelf(settings.lang,'row_add'))
                    .on('click', function() {
                        var row = colCalc.createRow().appendTo(canvas);
                        layout.forEach(function(i) {
                            /* replace */
                            let a = colCalc.createColumn(1).attr('class','').addClass(i);
                            a.appendTo(row);
                            plugins.col.get(settings.default_col_plugin).init(settings,a.find(".ge-content"));
                        });
                        init();
                        self.trigger("webIQGridEditor:change");
                        if (row[0].scrollIntoView) row[0].scrollIntoView({behavior: 'smooth'});
                    })
                    .appendTo(addRowGroup)
                ;

                btn.append('<i class="fa fa-plus"></i>');

                var icon = '<div class="row ge-row-icon">';
                layout.forEach(function(i) {
                    icon += `<div class="column ${i}" display="${i.split(' ').reverse()[0].match(/\d*/g,`$1`).join('')}"/>`;
                });
                icon += '</div>';
                btn.append(icon);
            });

            // Buttons on right
            var layoutDropdown = $('<div class="dropdown pull-right ge-layout-mode">' +
                `<button type="button" class="btn btn-sm btn-primary dropdown-toggle" data-toggle="dropdown">${settings.breakpoints[0].type}</button>` +
                    '<div class="dropdown-menu" role="menu">' +
                        (settings.breakpoints.map(function(a){return`<a class="dropdown-item" data-breakpoint="${a.width}" title="${a.type}">${a.type}</a>`}).join(''))+
                    '</div>' +
                '</div>')
                .on('click', 'a', function() {
                    var a = $(this);
                    switchLayout(a.index(),a);
                    layoutDropdown.find('button').text(a.text());
                })
                .appendTo(wrapper)
            ;
            mainControls.css({"position":"sticky","top":"0","z-index":"1"})
            //#endregion

            // call firstInit for ColumnPlugins
            console.groupCollapsed("init");
            Promise.allSettled(Object.keys(plugins.col.getAll()).map(function(a){
                return new Promise(function(resolve,reject){
                    if(!plugins.col.get(a).firstInit){return resolve({"value":"","plugin":a})};
                    plugins.col.get(a).firstInit(function(b){resolve({"value":b,"plugin":a})},function(b){reject({"reason":b,"plugin":a})},settings);
                });
            })).then(function(a){
                a.forEach(function(b){
                    if(b.status=="fulfilled"){
                        if(plugins.col.get(b.value.plugin).element==undefined){
                            indicateError("expected plugin '"+b.value.plugin+"' to own a 'element' property.",'plugin error',stack(-1));
                            return;
                        }
                        plugins.col.get(b.value.plugin).element
                            .on('webIQGridEditor:change',function(){self.trigger("webIQGridEditor:change")})
                            .on('webIQGridEditor:block',function(){self.trigger("webIQGridEditor:block")});
                        console.log(`first initiation of plugin '${b.value.plugin}' was successful. ${b.value.value||''}`)
                    } else if(b.status=="rejected"){
                        console.error(`firstInit() of plugin '${b.reason.plugin}' has failed. ${b.reason.reason||''}`);
                        indicateError(`firstInit() of plugin '${b.reason.plugin}' has failed. ${b.reason.reason||''}`,"plugin error",stack(-1));
                    }
                })
                if(!a.filter(function(c){return c.status=="rejected"}).length){
                    canvas.find('.ge-content').each(function(){
                        plugins.col.init(this,{isFromServer:true});
                    });
                }
                console.groupEnd();
            })
        }
        
        function init() {
            runFilter(true);
            canvas.addClass('ge-editing');
            colCalc.addAllColClasses();
            controls.applyToRows();
            controls.applyToCols();
            controls.makeSortable();
            switchLayout(classes.curColClassIndex);
        }

        function deinit() { // is not called
            canvas.removeClass('ge-editing');
            canvas.find('.ge-content').removeClass('ge-rte-active');
            controls.removeSortable(canvas);
            canvas.find('.ge-tools-drawer').remove();
        }
        
        function remove() {
            deinit();
            mainControls.remove();
            htmlTextArea.remove();
            canvas.off('click', '.ge-content', plugins.col.init);
            canvas.removeData('grideditor');
        }

        function getHTML(){
            return canvas.html();
        }

        /**
         * Run custom content filter on init and deinit
         */
        function runFilter(isInit) {
            if (settings.custom_filter.length) {
                $.each(settings.custom_filter, function(key, func) {
                    if (typeof func == 'string') {
                        func = window[func];
                    }

                    func(canvas, isInit);
                });
            }
        }

        function createDefaultContentWrapper() {
            return $('<div/>')
                .addClass('ge-content ge-content-type-' + settings.default_col_plugin)
                .attr('data-ge-content-type', settings.default_col_plugin)
            ;
        }

        function switchLayout(colClassIndex,colClassButton) {
            classes.curColClassIndex = colClassIndex;
            canvas.css({margin:"0px auto",maxWidth:colClassButton?colClassButton.data('breakpoint'):settings.breakpoints[0].width});
            
            settings.breakpoints.forEach(function(cssClass, i) {
                canvas.toggleClass(cssClass.col!=""?`ge-layout-${cssClass.col}`:"ge-layout-xs", i == colClassIndex);
            });
        }

        function getJSON(element=null,copy=false){
            if(element == null){
                element = canvas.children();
            }
            runFilter();
            function parseCols(col) {
                let key = 'value-type-';
                rows=Array.from(col.children);rows=rows.filter(function(b){return b.classList.contains("row")});if(rows.length!=0){rows=parseRows(rows).rows;}
                let l = {
                    "size": Array.from(col.classList).filter(function(b){return b.startsWith("col-")}).join(' '),
                    "class": settings.col_classes.map(function(a){return [a.cssClass,a.inverted];}).flat().filter(function(a){return col.classList.contains(a);}).join(' '),
                    "type": col.getAttribute("value-type"),
                    "data": Array.from(col.attributes).filter(function(b){return b.name.startsWith(key)}).reduce(function(p,b){return Object.assign(p,{[b.name.substr(key.length)]:b.value})},{}),
                    "plugin": {},
                    "rows": rows
                };
                /*attributes*/Object.assign(l, Array.from(col.attributes).filter(function(a){return a.name.match(/^value-(?!type)/g)}).map(function(a){return {"name":a.name.replace(/^value-(.*)$/g,"$1"),"value":a.value}}).reduce(function(a,b){a[b.name]=b.value;return a},{}));
                /*plugin*/if($(col).find('.ge-content')!=null&&plugins.col.get($(col).find('.ge-content').attr('data-ge-content-type'))!=undefined){let p=plugins.col.get($(col).find('.ge-content').attr('data-ge-content-type'));let q=p[copy&&p.onCopy?"onCopy":"parse"](settings,$(col).find('.ge-content'));Object.assign(l.plugin,q===true?p.parse(settings,$(col).find('.ge-content')):q)}
                if (l.rows.length == 0) {delete l.rows}else{l.data.position=Array.from(col.children).filter(function(a){return a.classList.contains("row")||a.classList.contains("ge-content")}).map(function(a,i){return[i,a.classList.contains("row")]}).filter(function(a){return!a[1]})[0][0]}
                if (Object.keys(l.plugin).length == 0) {delete l.plugin}
                if (Object.keys(l.data).length == 0) {delete l.data}
                return l;
            }
            function parseRows(x){
                let key = 'value-type-';
                return { "rows": x.map(function(row){
                    let l = {
                        "id": row.getAttribute("id"),
                        "class": settings.row_classes.map(function(a){return [a.cssClass,a.inverted];}).flat().filter(function(a){return row.classList.contains(a);}).join(' '),
                        "type": row.getAttribute("value-type"),
                        "data": Array.from(row.attributes).filter(function(b){return b.name.startsWith(key)}).reduce(function(p,b){return Object.assign(p,{[b.name.substr(key.length)]:b.value})},{}),
                        "cols": Array.from(row.children).filter(function(a){return !a.classList.contains("ge-tools-drawer")}).map(function(b){return parseCols(b)})||[],
                    }
                    /*attributes*/Object.assign(l, Array.from(row.attributes).filter(function(a){return a.name.match(/^value-(?!type)/g)}).map(function(a){return {"name":a.name.replace(/^value-(.*)$/g,"$1"),"value":a.value}}).reduce(function(a,b){a[b.name]=b.value;return a},{}));
                    if (Object.keys(l.data).length == 0) {delete l.data}
                    return l;
                }) }
            }
            let v,a=element.get().filter(function(b){return !(b instanceof Text)}) // filter all TextElements between html (\n)
            if($(a).hasClass("row")){
                v=parseRows(a);
            } else if ($(a).hasClass("column")) {
                v=parseCols(a[0]);
            } else {
                softError("tried to parse neither row nor column")
            }
            if(v == undefined){
                softError(...a);
            }
            return JSON.stringify(v);
        }

        (function gridEditor_data(){
            baseElem.data('grideditor', {
                init: init,
                deinit: deinit,
                remove: remove,
                getHTML: getHTML,
                getJSON: getJSON,
                indicateError: indicateError,
            });
        })()

        //#region ERROR HANDLING
        function isMyFault(a){
            type = JSON.stringify(a.reason||a.message);
            console.warn("Caugth ",a);
            a.preventDefault();
            let protoStack=undefined;
            if(a.reason&&a.reason.stack){
                protoStack=a.reason.stack.split("\n");
            }
            indicateError(type,a,protoStack);
        }
        function indicateError(message,error,stack){
            // create blackhole to prevent everything.
            enableSave=false;
            self.trigger("webIQGridEditor:block");
            self.trigger("error");
            self.off();
            // display an prototype looking Errorlog
            if(!self.hasClass("alert-danger")){
                self.attr("class","")
                self.addClass("alert alert-danger");
                self.parent().find(".ge-mainControls").replaceWith('');
                self.html("<p><sup>jquery.grideditor.js</sup><br><strong>An Error Occured. Please contact the Administrator.</strong></p>");"</p><p>";
            }
            $(`<p>${error&&error.type||error||'unknown type'}: ${message.toString()}</p>${stack?`<ul>${stack.map(function(a){return `<li>${a.replace("<","&lt;").replace(">","&gt;")}</li>`;}).join('')}</ul>`:(error&&error.error&&error.error.stack?error.error.stack.replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("\n","<br>"):'')}`).appendTo(self);
        };
        window.addEventListener('unhandledrejection',isMyFault,{capture:true});"rejection";
        window.addEventListener('error',isMyFault,{capture:true});"error";
        //#endregion
        //#region EVENT HANDLING
        self.on('webIQGridEditor:block',function(){
            clearTimeout(lastChange);
        })
        self.on('webIQGridEditor:change',function(){
            if(enableSave == false){clearTimeout(lastChange);return;}
            if(lastChange != 0){
                clearTimeout(lastChange);
            }
            lastChange=setTimeout(function(a){if(enableSave==false){return;};self.trigger("webIQGridEditor:changed")}, settings.idleTime,enableSave);
        });
        //#endregion
        setup();
        init();

    };
    self.each(initOnTo)
    return self;
};
$g.translation={
    "en":{
        col_add:"Add column",
        col_copy:"Copy column",
        col_paste:"Paste column",
        col_remove:"Remove column",
        col_remove_confirm:"Delete column?",
        row_add:"Add row",
        row_copy:"Copy row",
        row_paste:"Paste row",
        row_remove:"Remove row",
        row_remove_confirm:"Delete row?",
        settings:"Settings",
        move:"Move",
        smaller:"Make column narrower (hold shift for min)",
        bigger:"Make column wider (hold shift for max)",
    }
};
$g.columnPlugins = {};
$g.rowPlugins = {};
$g.translate=function(lang,identity,type){
    let a;if(!type){a=this}else{a=type};
    return a[lang]&&a[lang][identity]||a['en']&&a['en'][identity]||`untranslated["${lang}"]["${identity}"]`;
}
$g.translateSelf=function(lang,identity){
    return this.translate.call(this.translation,lang,identity);
}
$g.silent=function(...a){if(debug){console.log(`called from: ${stack(1)}`,...a)}}
$g.softError=function(...a){console.log('Error Occured:',a);alert(['Error Occured:',...a].join(' '));}
$g.stack=function(fromtop=0){let a;try{throw new Error()}catch(e){a=e.stack.split('\n').filter(function(b,i){return i>fromtop+2}).map(function(b){return b.replace(/^\W+at\W(?:[^(]*\((.*)\)|(.*))$/gm,'$1$2')});}return a;}
})( jQuery , true );
$.fn.gridEditor=$g;
