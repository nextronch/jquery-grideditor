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
function trace(msg){try{throw new Error()}catch(e){console.log(`Tracking Occured${msg?` for "${msg}"`:''}: `,e.stack.split('\n')[2].replace(/^\W+at\W(?:[^(]*\((.*)\)|(.*))$/gm,'$1$2')/* .replace(/([^(]*|\tat )\((.*)\)?/g,'$1') */);}}

/** @namespace grideditor */
$.fn.gridEditor = function( options ) {
    stack=$.fn.gridEditor.stack;
    softError=$.fn.gridEditor.softError;
    /** grideditor 
     * @type {grideditor}
     */
    var self = this;
    var grideditor = self.data('grideditor');
    var enableSave=true;
    /** Methods **/
    if (arguments[0] == 'getHtml') {
        if (grideditor) {
            grideditor.deinit();
            var html = self.html();
            grideditor.init();
            return html;
        } else {
            return self.html();
        }
    }
    
    if(arguments[0] == 'getJSON') {
        if (grideditor) {
            return grideditor.getJSON();
        } else {
            return "{}";
        }
    }
    
    if (arguments[0] == 'remove') {
        if (grideditor) {
            grideditor.remove();
        }
        return;
    } 
    /** Initialize plugin */

    function getColPlugin(type) {
        if($.fn.gridEditor.columnPlugins[type]==undefined){throw new Error(`unknown Grideditor Column Plugin '${type}'. Include the plugin you require.`)}
        return $.fn.gridEditor.columnPlugins[type];
    }
    function getColPlugins() {
        return $.fn.gridEditor.columnPlugins;
    }
    function getRowPlugins() {
        return $.fn.gridEditor.rowPlugins;
    }

    self.each(function(baseIndex, baseElem) {
        baseElem = $(baseElem);
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
            'lang'              : 'all',
            'default_col_plugin': Object.keys(jQuery.fn.gridEditor.columnPlugins)[0],
            'default_row_plugin': Object.keys(jQuery.fn.gridEditor.rowPlugins)[0],
            'valid_col_sizes'   : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            'breakpointOrder'   : ["","sm","md","lg","xl"], // bt 4
            'breakpoints'       : [{"col":"lg","type":"Desktop","width":"none"},{"col":"sm","type":"Tablet","width":"800px"},{"col":"","type":"Smartphone","width":"400px"}]
        }, options);
        // breakpoints sortet after size desc.
        // avaliable bp: breakpoints ordered by breakpointOrder

        var canvas,
            mainControls,
            wrapper,
            addRowGroup,
            htmlTextArea
        ;
        // search for General Inconsistence
        console.assert(settings.breakpoints.map(function(a){return a.col}).filter(function(a){return settings.breakpointOrder.indexOf(a)==-1}).length==0,"breakpoints[].col invalid for ordering, for custom ordering use breakpointOrder[]");
        // continue
        function ad(a){return a+(a==""?"":"-")}
        var colClasses = settings.breakpoints.map(function(a){return`col-${ad(a.col)}`});
        var curColClassIndex = 0; // Index of the column class we are manipulating currently
        var MAX_COL_SIZE = 12;
        var lastChange = 0;

        // Wrap content if it is non-bootstrap
        if (baseElem.children().length && !baseElem.find('div.row').length) {
            var children = baseElem.children();
            var newRow = $('<div class="row"><div class="col-lg-12"/></div>').appendTo(baseElem);
            newRow.find('.col-lg-12').append(children);
        }

        setup();
        init();

        function setup() {
            /* Setup canvas */
            canvas = baseElem.addClass('ge-canvas');
            
            htmlTextArea = $('<textarea class="ge-html-output"/>').insertBefore(canvas);

            /* Create main controls*/
            mainControls = $('<div class="ge-mainControls" />').insertBefore(htmlTextArea);
            wrapper = $('<div class="ge-wrapper ge-top" />').appendTo(mainControls);

            // Add row
            addRowGroup = $('<div class="ge-addRowGroup btn-group" />').appendTo(wrapper);

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
                return ad(a[0])
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
            // console.log(highestOfGroup)
            $.each(highestOfGroup, function(j, layout) {
                // debugger;
                var btn = $('<a class="btn btn-sm btn-primary" />')
                    .attr('title', 'Add row')
                    .on('click', function() {
                        var row = createRow().appendTo(canvas);
                        layout.forEach(function(i) {
                            /* replace */
                            let a = createColumn(1).attr('class','').addClass(i);
                            a.appendTo(row);
                            getColPlugin(settings.default_col_plugin).init(settings,a.find(".ge-content"));
                        });
                        init();
                        self.trigger("webIQGridEditor:change");
                        if (row[0].scrollIntoView) row[0].scrollIntoView({behavior: 'smooth'});
                    })
                    .appendTo(addRowGroup)
                ;

                btn.append('<i class="fa fa-plus"></i>');

                var layoutName = layout.join(' - ');
                var icon = '<div class="row ge-row-icon">';
                let max = "";
                layout.forEach(function(i) {
                    icon += `<div class="column ${i}" display="${i.split(' ').reverse()[0].match(/\d*/g,`$1`).join('')}"/>`;
                });
                // debugger;
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
            var btnGroup = $('<div class="btn-group pull-right"/>')
                .appendTo(wrapper)
            ;

            // Make controls fixed on scroll
            // $(window).on('scroll', onScroll);
            mainControls.css({"position":"sticky","top":"0","z-index":"1"})
           
            console.groupCollapsed("init");
            // call firstInit for Plugins
            Promise.allSettled(Object.keys(getColPlugins()).map(function(a){
                return new Promise(function(resolve,reject){
                    if(!getColPlugin(a).firstInit){return resolve({"value":"","plugin":a})};
                    getColPlugin(a).firstInit(function(b){resolve({"value":b,"plugin":a})},function(b){reject({"reason":b,"plugin":a})},settings);
                });
            })).then(function(a){
                a.forEach(function(b){
                    if(b.status=="fulfilled"){
                        console.log(`first initiation of plugin '${b.value.plugin}' was successful. ${b.value.value||''}`)
                    } else if(b.status=="rejected"){
                        console.error(`firstInit() of plugin '${b.reason.plugin}' has failed. ${b.reason.reason||''}`);
                        indicateError(`firstInit() of plugin '${b.reason.plugin}' has failed. ${b.reason.reason||''}`,"plugin error",stack(-1));
                    }
                })
                if(!a.filter(function(c){return c.status=="rejected"}).length){
                    canvas.find('.ge-content').each(function(){
                        initColPlugin.call(this,true);
                    });
                }
                console.groupEnd();
            })
        }
        
        
        function onScroll(e) {
            var $window = $(window);
            
            if (
                $window.scrollTop() > mainControls.offset().top &&
                $window.scrollTop() < canvas.offset().top + canvas.height()
            ) {
                if (wrapper.hasClass('ge-top')) {
                    wrapper
                        .css({
                            left: wrapper.offset().left,
                            width: wrapper.outerWidth(),
                        })
                        .removeClass('ge-top')
                        .addClass('ge-fixed')
                    ;
                }
            } else {
                if (wrapper.hasClass('ge-fixed')) {
                    wrapper.css({ left: '', width: '' }).removeClass('ge-fixed').addClass('ge-top')
                    ;
                }
            }
        }
        
        function initColPlugin(isFromServer=false) {
            // if ($(this).hasClass('ge-rte-active')) { return; }
            let plugin = $(this).parent().attr('value-type');
            console.log("initColPlugin: %s",plugin);
            var colPlugin = getColPlugin(plugin);
            if (colPlugin) {
                $(this).addClass('ge-rte-active', true);
                try{
                    colPlugin.init(settings, $(this), isFromServer);
                    colPlugin.element.on('webIQGridEditor:change',function(){self.trigger("webIQGridEditor:change")});
                    colPlugin.element.on('webIQGridEditor:block',function(){self.trigger("webIQGridEditor:block")});
                    $(this).attr("data-ge-content-type",plugin);
                }
                catch(e){
                    console.error(`initiation for plugin '${plugin}' failed!`,e);
                    indicateError(`initiation for plugin '${plugin}' failed! ${e&&e.message||e||''}`,`Error`,stack());
                }
            }
        }

        function reset() {
            deinit();
            init();
        }

        function init() {
            runFilter(true);
            canvas.addClass('ge-editing');
            addAllColClasses();
            wrapContent();
            createRowControls();
            createColControls();
            makeSortable();
            switchLayout(curColClassIndex);
        }

        function deinit() { // is not called
            canvas.removeClass('ge-editing');
            // let clonedObject = canvas.clone();
            // var contents = canvas.find('.ge-content').removeClass('ge-rte-active').each(function(_,o) {
            //     var content = $(o);
            //     getRTE(content.parent().attr('value-type')).deinit(settings, content);
            // });
            // runFilter(false);
            canvas.find('.ge-content').removeClass('ge-rte-active');
            removeSortable(canvas);
            canvas.find('.ge-tools-drawer').remove();
        }
        
        function remove() {
            deinit();
            mainControls.remove();
            htmlTextArea.remove();
            $(window).off('scroll', onScroll);
            canvas.off('click', '.ge-content', initColPlugin);
            canvas.removeData('grideditor');
        }

        function getHTML(){
            return canvas.html();
        }
        //#region clipboard
        ls = {
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
                        // debugger;
                        let prototypeElement = $(data);
                        prototypeElement.appendTo(element);
                        // debugger;
                        if(ls.type == "col"){
                            prototypeElement.addClass("column")
                        } else if (ls.type == "row"){
                            prototypeElement.addClass("row")
                        }
                        addAllColClasses(prototypeElement);
                        createRowControls(prototypeElement);
                        createColControls(prototypeElement);
                        makeSortable(prototypeElement);
                        prototypeElement.find(".ge-content").each(function(){
                            initColPlugin.call(this, true);
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

        // const LS_KEY = location.host.split('.').reverse().join('.')+'.grideditor.clipboard';
        // function copyToLS(type,data){
        //     localStorage.setItem(LS_KEY,JSON.stringify({type:type,data:data}));
        // }
        // function whatIsInLS(){
        //     return pasteFromLS().type;
        // }
        // function pasteFromLS(){
        //     return JSON.parse(localStorage.getItem(LS_KEY)||null);
        // }
        // function formatToPaste(){}
        // _G_cca.push(new ChromeClickAction({"whatIsInLS":function(){console.log(whatIsInLS())},"pasteFromLS":function(){console.log(pasteFromLS())}}))
        // #endregion clipboard

        function deleteColOrRow(element,resMe,rejMe,col=false){
            Promise.all(element.children(".row,.column").map(function(index, child){
                return new Promise(function(res,rej){
                    deleteColOrRow($(child),res,rej,!col);
                })
            })).then(function(){
                if(col){
                    let colPlugin = $(element).find('.ge-content').attr('data-ge-content-type');
                    $.ajax({
                        // § server path
                        url: 'cfc/grid/col'+colPlugin+'.cfc',
                        data: {
                            method: 'onDelete',
                            data: JSON.stringify(getColPlugin(colPlugin).parse(settings,$(element).find('.ge-content')))
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

        function createRowControls(element=canvas) {
            element.find('.row').addBack('.row').each(function() {
                var row = $(this);
                if (row.find('> .ge-tools-drawer').length) { return; }

                var drawer = $('<div class="ge-tools-drawer" />').prependTo(row);
                let more = $('<div class=\"dropdown-menu\" />');

                createTool(drawer, 'Move', 'ge-move', 'fa fa-arrows-alt');
                createTool(drawer, 'Settings', '', 'fa fa-cog', function() {
                    details.toggle();
                });
                createTool(more, 'Add column', 'ge-add-column', 'fa fa-plus-circle', function() {
                    let a = createColumn(12);
                    a.appendTo(row);
                    // row.append(a);
                    getColPlugin(settings.default_col_plugin).init(settings,a.find(".ge-content"));
                    console.log("Has been appied")
                    init();
                    // self.trigger("webIQGridEditor:change");
                });
                createTool(more, 'Copy row', '', 'fa fa-clipboard', function(){
                    // __d = getJSON(row);
                    // console.log(__d);
                    let __c = JSON.stringify(JSON.parse(getJSON(row,true)).rows[0]);
                    ls.set({type:'row',data:__c});
                    // * create external function to take over when copying
                    // let plugin = getColPlugin($(col).find('.ge-content').attr('data-ge-content-type'));
                    // __c = plugin.onCopy(settings,$(col).find('.ge-content'));
                    // if(__c == false){
                    //     return "aborted copy";
                    // }
                    // if(__c == true){
                    //     __c = plugin.parse(settings,$(col).find('.ge-content'));
                    // }
                    // __t = 'col';
                    // __p = $(col).find('.ge-content').attr('data-ge-content-type');
                    // copyToLS(__t,{plugin:__p,data:__c})
                    // * __c plugin>CONFIG
                    // * __t plugin>COL/ROW TYPE
                    // * __p plugin
                    // * {plugin:__p,type:__t,data:__c}
                    // * debugger;
                });
                createTool(more, 'Paste Col', '', 'fa fa-paste', function(){
                    if(ls.type=="col"){
                        // how would i do that
                        console.log("paste col: ",ls.data);
                        // let _c = function(data){
                        //     .append($(data));
                        //     console.info("success??");
                        // }
                        ls.pasteTo(row);
                    }
                })
                createTool(more, 'Remove row', '', 'fa fa-trash-alt', function() {
                    if (window.confirm('Delete row?')) {
                        deleteColOrRow(row,function(){self.trigger("webIQGridEditor:change")},function(){},false);
                        
                        // row.slideUp(function() {
                        //     row.remove();
                        // });
                        // self.trigger("webIQGridEditor:change");
                    }
                });
                drawer.append($('<div class=\"btn-group\"><a type=\"button\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\"><i class=\"fas fa-caret-down\"></i></a></div>').append(more))
                // <!--- § create rows --->
                // {"name":"type","type":"dropdown","options":["default",{"name":"accordion","settings":[{"name":"open","type":"switch","default":0},{"name":"title","type":"input"}]},{"name":"box","settings":[{"name":"color","type":"dropdown","options":["red","blue"]}]}]}
                let plugins = getRowPlugins();
                let rowTools = {"name":"type","type":"dropdown","options":Object.keys(plugins).map(function(a){return plugins[a].internal?{"name":a,"settings":plugins[a].internal}:a})}
                var details = createDetails(row, settings.row_classes, [...settings.row_tools,rowTools]).appendTo(drawer);
                
            });
        }

        function createColControls(element=canvas) {
            element.find('.column').addBack('.column').each(function() {
                var col = $(this);
                if (col.find('> .ge-tools-drawer').length) { return; }

                var drawer = $('<div class="ge-tools-drawer" />').prependTo(col);
                let more = $("<div class=\"dropdown-menu\"></div>");

                createTool(drawer, 'Move', 'ge-move', 'fa fa-arrows-alt');

                createTool(drawer, 'Make column narrower\n(hold shift for min)', 'ge-decrease-col-width', 'fa fa-minus', function(e) {
                    var colSizes = settings.valid_col_sizes;
                    var curColClass = colClasses[curColClassIndex];
                    var curColSizeIndex = colSizes.indexOf(getColSize(col, curColClass));
                    var newSize = colSizes[clamp(curColSizeIndex - 1, 0, colSizes.length - 1)];
                    if (e.shiftKey) {
                        newSize = colSizes[0];
                    }
                    setColSize(col, curColClass, Math.max(newSize, 1));
                    self.trigger("webIQGridEditor:change");
                });

                createTool(drawer, 'Make column wider\n(hold shift for max)', 'ge-increase-col-width', 'fa fa-plus', function(e) {
                    var colSizes = settings.valid_col_sizes;
                    var curColClass = colClasses[curColClassIndex];
                    var curColSizeIndex = colSizes.indexOf(getColSize(col, curColClass));
                    var newColSizeIndex = clamp(curColSizeIndex + 1, 0, colSizes.length - 1);
                    var newSize = colSizes[newColSizeIndex];
                    if (e.shiftKey) {
                        newSize = getColumnSpare(col.parent(),col);
                        let a = colSizes.indexOf(newSize);
                        if(a==-1){
                            let b = 0;
                            colSizes.forEach(function(c){if(c<newSize){b=c}}); // if size is not valid, go to next down
                            if(b==0){colSizes.reverse().forEach(function(c){if(c>newSize){b=c}})}; // or wider
                            newSize = b;
                        }
                    }
                    
                    setColSize(col, curColClass, Math.min(newSize, MAX_COL_SIZE));
                    self.trigger("webIQGridEditor:change");
                });

                createTool(drawer, 'Settings', '', 'fa fa-cog', function() {
                    details.toggle();
                });

                createTool(more, 'Add row', 'ge-add-row', 'fa fa-plus-circle', function() {
                    var row = createRow();
                    col.append(row);
                    let a = createColumn(12);
                    row.append(a);
                    getColPlugin(settings.default_col_plugin).init(settings,a.find(".ge-content"))
                    
                    init();
                    // self.trigger("webIQGridEditor:change");
                });

                createTool(more, 'Copy col', '','fas fa-copy',function(){
                    // console.log(col);
                    // console.log(__c);
                    let __c = getJSON(col,true);
                    ls.set({type:'col',data:__c});
                    // let plugin = getColPlugin($(col).find('.ge-content').attr('data-ge-content-type'));
                    // __c = plugin.onCopy(settings,$(col).find('.ge-content'));
                    // if(__c == false){
                    //     return "aborted copy";
                    // }
                    // if(__c == true){
                    //     __c = plugin.parse(settings,$(col).find('.ge-content'));
                    // }
                    // __t = 'col';
                    // __p = $(col).find('.ge-content').attr('data-ge-content-type');
                    // copyToLS(__t,{plugin:__p,data:__c})
                    // * __c plugin>CONFIG
                    // * __t plugin>COL/ROW TYPE
                    // * __p plugin
                    // * {plugin:__p,type:__t,data:__c}
                    // * debugger;
                })

                createTool(more, 'Paste row', '', 'fas fa-paste', function(){
                    if(ls.type=='row') {
                        console.log("paste row: ",ls.data);
                        ls.pasteTo(col);
                    }
                })

                createTool(more, 'Remove col', '', 'fa fa-trash-alt', function() {
                    if (window.confirm('Delete column?')) {
                        deleteColOrRow(col,function(){self.trigger("webIQGridEditor:change")},function(){},true);
                        // col.animate({
                        //     opacity: 'hide',
                        //     width: 'hide',
                        //     height: 'hide'
                        // }, 400, function() {
                        // });
                    }
                });

                drawer.append($("<div class=\"btn-group\"><a class=\"ge-add-row\" type=\"button\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\"><i class=\"fas fa-caret-down\"></i></a></div>").append(more));

                let plugins = getColPlugins()
                let col_tools = {"name":"type","type":"dropdown","options":Object.keys(plugins).map(function(a){return {"name":a,"settings":plugins[a].settings}||a})}
                console.log("yes?");
                try{FLK==1;debugger}catch(e){}
                var details = createDetails(col, settings.col_classes, [...settings.col_tools,col_tools]).appendTo(drawer);
            });
        }

        function getColumnSpare(row,col) {
            return MAX_COL_SIZE - getColumnSizes(row,col);
        }

        function getColumnSizes(row,col) {
            var layout = colClasses[curColClassIndex];
            var size = 0; // current line
            let result = 0; // max length
            let calc = false;
            row.children('[class*="'+layout+'"]').each(function(i){
                let me = getColSize($(this),layout);
                let curr = col.is(this);
                if(curr){calc=true;result-=me;}
                if(calc&&size+me>12&&curr){size=0;}
                if(calc&&size+me>12&&!curr){result+=size;}
                if(size+me>12){size=0;if(calc){calc=false;return false}}
                size += me;
            });
            if(calc&&size!=0){result+=size;}
            return result;
        }

        function createTool(drawer, title, className, iconClass, eventHandlers) {
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
        }

        function createDetails(container, cssClasses, customSettings = []) {
            var detailsDiv = $('<div class="ge-details" />');

            var classGroup = $('<div class="btn-group" />').appendTo(detailsDiv);
            cssClasses.forEach(function(rowClass) {
                var btn = $('<a class="btn btn-sm btn-default" />')
                    .html(rowClass.label)
                    .attr('title', rowClass.title ? rowClass.title : 'Toggle "' + rowClass.label + '" styling')
                    .toggleClass('active btn-primary', container.hasClass(rowClass.cssClass))
                    .on('click', function() {
                        btn.toggleClass('active btn-primary');
                        container.toggleClass(rowClass.cssClass, btn.hasClass('active'));
                    })
                    .appendTo(classGroup)
                ;
            });
            function g(p,n){
                return `${p}-${n}`;
            }
            function buildFrom(x,parent='value'){
                let y = undefined;
                switch(x.type) {
                    case "dropdown":
                        y = $(`<select${parent != '' ? ` parent='${parent}'` : ''} name="${x.name}">${x.options.map(function (r) { return `<option${container.attr(g(parent,x.name)) == (r.name||r) ? " selected" : ""} value='${r.name||r}'>${r.name||r}</option>`}).join('')}</select>`).on('change',function(isInit=false){
                            detailsDiv.find(`[parent=${parent + "-" + x.name}]`).replaceWith(); // Clean Subelements
                            // unset all previous changes
                            if(!isInit){
                                Array.from(container.get(0).attributes).filter(function (f) { return f.name.startsWith(g(parent, x.name) + `-`) }).forEach(function (d) {
                                    container.removeAttr(d.name);
                                });
                            }
                            let o = $(this);
                            container.attr(g(parent,x.name), o.val()); // Set Background value
                            (x.options.filter(function(b){return (b.name||b)==o.val()})[0].settings||[]).forEach(function(c){buildFrom(c,g(parent, x.name))}); // Rebuild Subelements
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
                    getColPlugin(container.find('.ge-content').attr('data-ge-content-type')).deinit(settings, container.find('.ge-content'));
                    // step 2: DELETE CONTENT (plugin preperation)
                    container.find('.ge-content').html('');
                    // step 3: init new module
                    initColPlugin.call(container.find('.ge-content'))
                }
            });
            return detailsDiv;
        }

        function addAllColClasses(element=canvas) {
            element.find('.column, div[class*="col-"]').addBack('.column, div[class*="col-"]').each(function() {
                var col = $(this);

                var size = 2;
                var sizes = getColSizes(col);
                if (sizes.length) {
                    size = sizes[0].size;
                }

                var elemClass = col.attr('class');
                colClasses.forEach(function(colClass) {
                    if (elemClass.indexOf(colClass) == -1) {
                        col.addClass(colClass + size);
                    }
                });

                col.addClass('column');
            });
        }
        /**
         * Return the column size for colClass, or a size from a different
         * class if it was not found.
         * Returns null if no size whatsoever was found.
         */
        function getColSize(col, colClass) {
            var sizes = getColSizes(col);
            for (var i = 0; i < sizes.length; i++) {
                if (sizes[i].colClass == colClass) {
                    return sizes[i].size;
                }
            }
            if (sizes.length) {
                return sizes[0].size;
            }
            return null;
        }

        function getColSizes(col) {
            var result = [];
            colClasses.forEach(function(colClass) {
                var re = new RegExp(colClass + '(\\d+)', 'i');
                if (re.test(col.attr('class'))) {
                    result.push({
                        colClass: colClass,
                        size: parseInt(re.exec(col.attr('class'))[1])
                    });
                }
            });
            return result;
        }

        function setColSize(col, colClass, size) {
            var re = new RegExp('(' + colClass + '(\\d+))', 'i');
            var reResult = re.exec(col.attr('class'));
            if (reResult && parseInt(reResult[2]) !== size) {
                col.switchClass(reResult[1], colClass + size, 50);
            } else {
                col.addClass(colClass + size);
            }
        }

        function makeSortable(element=canvas) {
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
        }

        function removeSortable(c) {
            c.add(c.find('.column')).add(c.find('.row')).sortable('destroy');
        }

        function createRow() {
            return $(`<div class="row" value-type="${settings.default_row_plugin}"/>`);
        }

        function createColumn(size) {// size : number
            // console.log(stack(0));
            let a = $('<div/>')
                .addClass(colClasses.map(function(c){return c+size;}).join(' '))
                .attr("value-type",settings.default_col_plugin)
                .append(createDefaultContentWrapper().html(""));
            return a;
                // .find(".ge-content").attr("data-ge-content-type",settings.default_col_plugin)
                // .append(createDefaultContentWrapper().html(getColPlugin(settings.content_types).initialContent||""))//richtig weil default module genommen wird
            ;
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

        /**
         * Wrap column content in <div class="ge-content"> where neccesary
         */
        function wrapContent(elements=canvas) {
            return; // no error!?!?
            elements.find('.column').each(function() {
                var col = $(this);
                var contents = $();
                col.children().each(function() {
                    var child = $(this);
                    if (child.is('.row, .ge-tools-drawer, .ge-content')) {
                        // doWrap(contents);
                    } else {
                        contents = contents.add(child);
                    }
                });
                // doWrap(contents); // do it always?
            });
        }

        function doWrap(contents) { // disabled
            if (contents.length) {
                var container = createDefaultContentWrapper().insertAfter(contents.last());
                contents.appendTo(container);
                contents = $();
            }
        }

        function createDefaultContentWrapper() {
            return $('<div/>')
                .addClass('ge-content ge-content-type-' + settings.default_col_plugin)
                .attr('data-ge-content-type', settings.default_col_plugin)
            ;
        }

        function switchLayout(colClassIndex,colClassButton) {
            curColClassIndex = colClassIndex;
            canvas.css({margin:"0px auto",maxWidth:colClassButton?colClassButton.data('breakpoint'):settings.breakpoints[0].width});
            
            settings.breakpoints.forEach(function(cssClass, i) {
                canvas.toggleClass(cssClass.col!=""?`ge-layout-${cssClass.col}`:"ge-layout-xs", i == colClassIndex);
            });
        }
        
        function clamp(input, min, max) {
            return Math.min(max, Math.max(min, input));
        }

        function getJSON(element=null,copy=false){
            if(element == null){
                element = canvas.children();
            }
            runFilter();
            function parseCols(col) {
                let key = 'value-type-';
                // let plugin = 'value-plugin-';
                // console.log("col",col,col.children)
                rows=Array.from(col.children);rows=rows.filter(function(b){return b.classList.contains("row")});if(rows.length!=0){rows=parseRows(rows).rows;}
                let l = {
                    "size": Array.from(col.classList).filter(function(b){return b.startsWith("col-")}).join(' '),
                    "type": col.getAttribute("value-type"),
                    "data": Array.from(col.attributes).filter(function(b){return b.name.startsWith(key)}).reduce(function(p,b){return Object.assign(p,{[b.name.substr(key.length)]:b.value})},{}),
                    // "plugin": Array.from(col.attributes).filter(function(b){return b.name.startsWith(plugin)}).reduce(function(p,b){return Object.assign(p,{[b.name.substr(plugin.length)]:b.value})},{}),
                    "plugin": {},
                    "rows": rows
                };
                /*attributes*/Object.assign(l, Array.from(col.attributes).filter(function(a){return a.name.match(/^value-(?!type)/g)}).map(function(a){return {"name":a.name.replace(/^value-(.*)$/g,"$1"),"value":a.value}}).reduce(function(a,b){a[b.name]=b.value;return a},{}));
                /*plugin*/if($(col).find('.ge-content')!=null&&getColPlugin($(col).find('.ge-content').attr('data-ge-content-type'))!=undefined){let p=getColPlugin($(col).find('.ge-content').attr('data-ge-content-type'));let q=p[copy&&p.onCopy?"onCopy":"parse"](settings,$(col).find('.ge-content'));Object.assign(l.plugin,q===true?p.parse(settings,$(col).find('.ge-content')):q)}
                if (l.rows.length == 0) {delete l.rows}else{l.data.position=Array.from(col.children).filter(function(a){return a.classList.contains("row")||a.classList.contains("ge-content")}).map(function(a,i){return[i,a.classList.contains("row")]}).filter(function(a){return!a[1]})[0][0]}
                if (Object.keys(l.plugin).length == 0) {delete l.plugin}
                if (Object.keys(l.data).length == 0) {delete l.data}
                return l;
            }
            function parseRows(x){
                let key = 'value-type-';
                return { "rows": x.map(function(row){
                    // console.log("row",row,row.children)
                    let l = {
                        "id": row.getAttribute("id"),
                        "type": row.getAttribute("value-type"),
                        "data": Array.from(row.attributes).filter(function(b){return b.name.startsWith(key)}).reduce(function(p,b){return Object.assign(p,{[b.name.substr(key.length)]:b.value})},{}),
                        "cols": Array.from(row.children).filter(function(a){return !a.classList.contains("ge-tools-drawer")}).map(function(b){return parseCols(b)})||[],
                    }
                    /*attributes*/Object.assign(l, Array.from(row.attributes).filter(function(a){return a.name.match(/^value-(?!type)/g)}).map(function(a){return {"name":a.name.replace(/^value-(.*)$/g,"$1"),"value":a.value}}).reduce(function(a,b){a[b.name]=b.value;return a},{}));
                    if (Object.keys(l.data).length == 0) {delete l.data}
                    return l;
                }) }
            }
            // let a=$(html).get().filter(function(b){return !(b instanceof Text)}) // filter all TextElements between html (\n)
            let v,a=element.get().filter(function(b){return !(b instanceof Text)}) // filter all TextElements between html (\n)
            if($(a).hasClass("row")){
                v=parseRows(a);
            } else if ($(a).hasClass("column")) {
                // if(a.length > 1){a=a[0]}
                v=parseCols(a[0]);
            } else {
                softError("tried to parse neither row nor column")
            }
            if(v == undefined){
                softError(...a);
            }
            
            return JSON.stringify(v);
        }

        baseElem.data('grideditor', {
            init: init,
            deinit: deinit,
            remove: remove,
            getHTML: getHTML,
            getJSON: getJSON,
            indicateError: indicateError,
        });

        /* ERROR HANDLING */
        window.addEventListener('unhandledrejection',isMyFault,{capture:true});"rejection";
        window.addEventListener('error',isMyFault,{capture:true});"error";
        function isMyFault(a){
            type = JSON.stringify(a.reason||a.message);
            console.warn("Caugth ",a);
            a.preventDefault();
            indicateError(type,a);
        }
        function indicateError(message,error,stack){
            // create blackhole to prevent everything.
            enableSave=false;
            self.off();
            self.trigger("webIQGridEditor:block");
            self.trigger("error");
            // display an prototype looking Errorlog
            if(!self.hasClass("alert-danger")){
                self.attr("class","")
                self.addClass("alert alert-danger");
                self.parent().find(".ge-mainControls").replaceWith('');
                self.html("<p><sup>jquery.grideditor.js</sup><br><strong>An Error Occured. Please contact the Administrator.</strong></p>");"</p><p>";
            }
            $(`<p>${error&&error.type||error||'unknown type'}: ${message.toString()}</p>${stack?`<ul>${stack.map(function(a){return `<li>${a.replace("<","&lt;").replace(">","&gt;")}</li>`;}).join('')}</ul>`:(error&&error.error&&error.error.stack?error.error.stack.replace("<","&lt;").replace(">","&gt;").replace("\n","<br>"):'')}`).appendTo(self);
        }

        /* EVENT HANDLING */
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
    });

    return self;

};

$.fn.gridEditor.columnPlugins = {};
$.fn.gridEditor.rowPlugins = {};
$.fn.gridEditor.translate=function(lang,identity,type){
    let a;if(!type){a=this}else{a=type};
    return a[lang]&&a[lang][identity]||a['all']&&a['all'][identity]||`untranslated["${lang}"]["${identity}"]`;
}
$.fn.gridEditor.silent=function(...a){if(debug){console.log(`called from: ${stack(1)}`,...a)}}
$.fn.gridEditor.softError=function(...a){console.log('Error Occured:',a);alert(['Error Occured:',...a].join(' '));}
$.fn.gridEditor.stack=function(fromtop=0){let a;try{throw new Error()}catch(e){a=e.stack.split('\n').filter(function(b,i){return i>fromtop+2}).map(function(b){return b.replace(/^\W+at\W(?:[^(]*\((.*)\)|(.*))$/gm,'$1$2')});}return a;}
})( jQuery , true );

