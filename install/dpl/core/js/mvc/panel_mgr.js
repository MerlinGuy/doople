/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 1/31/13
 * Time: 8:10 AM
 */

var PanelMgr = (function() {

    return {

        htmlLoc : window.location.pathname + 'core/panel/',
        jsLoc :  window.location.pathname + "panel/",
        cntlLoc : "html/cntl/",
        panel_load_id : 0,
        root : window.location.pathname,
        main_overlay:null,
        main_overlay_page:'mainOverlay',
        dlg_wrapper: null,
        dlg_wrapper_page: 'dialogWrapper',
        current_control: null,
        initialized: false,
        initialize_callback: null,
        cached_pages: [],
        dialog_stack: [],
        confirm_html: '<div id="dialog-confirm" title="__title__"><p>__msg__</p></div>',
        progress_html: '<div id="dialog-progress" title="__title__"><div id="progress-bar" class="pbar"></div></div>',
        error_html: '<div id="dialog-error" title="An Error Occurred">'
                        +'<div class="display-line"><label class="stdlabelLrg">Entity:</label><label class="readOnly">%entity</label></div>'
                        +'<div class="display-line"><label class="stdlabelLrg">Action:</label><label class="readOnly">%action</label></div>'
                        +'<div class="display-line"><label class="stdlabelLrg">Msg:</label><label class="readOnly">%msg</label></div></div>',

        open_error_html: '<div id="dialog-error" title="%title">'
            +'<div class="display-line"><label class="stdlabelLrg">Error:</label><label class="readOnly">%msg</label></div></div>',

        button_tmpl : '<span class="ui-icon __icon__ iconLeft" id="_$$___name__" title="__title__"></span>',
        button_tmpl2 : '<span class="ui-icon __icon__ pointer" id="_$$___name__" title="__title__"></span>',
        controllers: {},
        listeners: {'load':[], 'show':[], 'hide':[], 'unload':[]},

        initialize: function() {

            if (PanelMgr.main_overlay == null) {
                var cb = function(html) {
                    PanelMgr.main_overlay = $(html);
                    PanelMgr.main_overlay.appendTo(document.body)
                    PanelMgr.initialize();
                }

                PanelMgr.getHtml(PanelMgr.main_overlay_page, cb);

            } else if (PanelMgr.dlg_wrapper == null) {
                var cb = function(html) {
                    PanelMgr.dlg_wrapper = html;
                    PanelMgr.initialize();
                }

                PanelMgr.getHtml(PanelMgr.dlg_wrapper_page, cb);

            }
            else if (PanelMgr.initialize_callback != null) {
                PanelMgr.initialize_callback();
            }
            PanelMgr.viewDiv = $('#leftViewSlideout');

        },

        getHtml : function (pageName, complete_callback) {
            var path = this.htmlLoc + pageName + '.html?rnd= ' + 'r' + DateUtil.getMilliseconds();;
            $.get(path, complete_callback);
        },

        showDeleteConfirm: function(title, message, callback) {

            var div = this.confirm_html.replace(new RegExp('__title__',"g"), title);
            div = $(div.replace(new RegExp('__msg__',"g"), message));

            $('#mainBody').append( div );

            var delCB = function() {
                $( this ).dialog( "close" );
                $( "#dialog-confirm").remove();
                callback(true);
            };

            var cancelCB = function() {
                $( this ).dialog( "close" );
                $( "#dialog-confirm").remove();
                callback(false);
            }

            $( "#dialog-confirm" ).dialog({
                resizable: false,
                height:220,
                width:440,
                modal: true,
                buttons: {
                    "Delete": delCB,
                    Cancel: cancelCB
                }
            }).css("font-size", "14px");
        },

        showConfirm: function(title, message, callback) {

            var div = this.confirm_html.replace(new RegExp('__title__',"g"), title);
            div = $(div.replace(new RegExp('__msg__',"g"), message));

            $('#mainBody').append( div );

            var delCB = function() {
                $( this ).dialog( "close" );
                $( "#dialog-confirm").remove();
                callback(true);
            };

            var cancelCB = function() {
                $( this ).dialog( "close" );
                $( "#dialog-confirm").remove();
                callback(false);
            }

            $( "#dialog-confirm" ).dialog({
                resizable: false,
                height:220,
                width:440,
                modal: true,
                buttons: {
                    Okay: delCB,
                    Cancel: cancelCB
                }
            }).css("font-size", "14px");
        },

        showProgressBar: function(options) {

            var title = (options.title || "");
            var div = this.progress_html.replace(new RegExp('__title__',"g"), title);

            $('#mainBody').append( div );
            var $dlg = $("#dialog-progress");
            var $bar = $("#progress-bar");

            var cancelFunction = function() {
                $dlg.remove();
                if (options.callback || false) {
                    options.callback(false);
                }
            };

            var btnCode = {};

            if (options.showCancel || false) {
                btnCode.Cancel = cancelFunction;
            }

            $dlg.dialog({
                resizable: false,
                height:100,
                width:440,
                modal: true,
                buttons: btnCode
            }).css("font-size", "14px");

            $bar.progressbar({
                value:options.value || 0,
                max:options.max || 100
            });

            var obj = {
                cancel:cancelFunction,
                setValue:function(newValue) {$bar.progressbar( "option", "value", newValue );}
            }
            return obj;
        },

        showRequestErrorDialog: function( req ) {
            PanelMgr.showErrorDialog(req.entity, req.action,  req.error );
        },

        showErrorDialog: function(entity, action,  error ) {
            var div = this.error_html.replace(new RegExp('%entity',"g"), entity);
            div = div.replace(new RegExp('%action',"g"), action);
            div = div.replace(new RegExp('%msg',"g"), error);

            $('#mainBody').append( div );
            var cancelCB = function() {
                $( this ).dialog( "close" );
                $( "#dialog-error").remove();
            }

            $( "#dialog-error" ).dialog({
                resizable: false,modal: true,
                height:280,width:480,
                buttons: {Cancel: cancelCB}
            }).css("font-size", "14px");
        },

        showError: function(title, msg ) {
            var div = this.open_error_html.replace(new RegExp('%title',"g"), title);
            div = div.replace(new RegExp('%msg',"g"), msg);

            $('#mainBody').append( div );
            var cancelCB = function() {
                $( this ).dialog( "close" );
                $( "#dialog-error").remove();
            }

            $( "#dialog-error" ).dialog({
                resizable: false,modal: true,
                height:280,width:480,
                buttons: {Cancel: cancelCB}
            }).css("font-size", "14px");
        },

        loadDialog : function (control, complete_callback, close_callback) {
            var options = {
                control:control,
                complete_callback:complete_callback,
                close_callback:close_callback};
            this.loadDialogOpts(options);
        },

        loadDialogOpts : function (options) {
            var _this = this;

            var control = options.control;
            var complete_callback = options.complete_callback;
            var close_callback = options.close_callback;
            var config = options.config || false ? options.config : control.editConfig;
            var dialogName = config.dialogName;

            var cb = function($dialog) {
                $("#mainBody").append($dialog);
                var $dlg = $("#" + config.divName);
                $dlg.dialog(config);
                var closeF = function(event, ui) {
                    if (close_callback) {
                        close_callback();
                    }
                    $(this).remove();
                    $dlg.remove();
                }
                $dlg.dialog({close:closeF});
                complete_callback($dialog);
            }

            if (dialogName in _this.cached_pages) {
                cb(_this.cached_pages[dialogName]);

            } else {
                this.getHtml(dialogName, function(html){
                    var $dialog = $(html);
                    _this.cached_pages[dialogName] = $dialog;
                    cb($dialog);
                });
            }
        },

        loadDialogX : function ( cfg) {
            var _this = this;

            var cb = function(html){

                $("#mainBody").append($(html));
                var $dlg = $("#" + cfg.divName);
                $dlg.dialog(cfg);

                var closeF = function(event, ui) {
                    if (cfg.close_callback) {
                        cfg.close_callback();
                    }
                    $dlg.remove();
                }

                $dlg.dialog({close:closeF});
                if (cfg.complete_callback) {
                    cfg.complete_callback($dlg);
                }
            }

            var dir = _this.htmlLoc
            if ('directory' in cfg) {
                dir = cfg.directory;
            }
            var path =  dir + cfg.file + '.html?rnd=r' + DateUtil.getMilliseconds();;
            $.get(path, cb);
        },

        loadDialogY : function ( cfg ) {
            var _this = this;

            var cb = function(html){

                $("#mainBody").append($(html));
                if ('dragbar' in cfg) {
                    var dragbar = "#" + cfg.dragbar;

                    $('#'+ cfg.divName).draggable({handle:dragbar });
                    $(dragbar).mousedown(function() {
                        $(this).css('cursor', 'move');
                    });
                    $(dragbar).mouseup(function() {
                        $(this).css('cursor', 'default');
                    });
                }

                cfg.complete_callback();
            }

            var dir = _this.htmlLoc
            if ('directory' in cfg) {
                dir = cfg.directory;
            }
            var path =  dir + cfg.file + '.html?rnd=r' + DateUtil.getMilliseconds();;
            $.get(path, cb);
        },

        loadListPage : function (entity_name, overlay, complete_callback) {
            $('#' + overlay).empty();

            var ent = Geof.cntrl[entity_name];
            var html = Geof.src[entity_name].list;

            var wrapper = PanelMgr.dlg_wrapper.replace(/_\$\$_/g, ent.prefix);
            wrapper = wrapper.replace(/%entity_name/g,ent.title);
            wrapper = wrapper.replace(/%content/g,html);
            $('#' + overlay).append( wrapper );

            $("#" + ent.prefix + 'closeDialog').on("click", function() {
                Geof.menuctrl.gotoMenu();
            });
            var $subPanel = $('#' + ent.prefix + 'sub_icon_holder');
            var links = ent.link || [];
            var html = '<div>';
            for (var indx in links) {
                var elink = links[indx];
                var ename = elink.name;
                if (! ename in Geof.cntrl) {
                    continue;
                }
                var sublink = entity_name + ',' + ename;
                html += '<div class="sub_link disabled" id="sublink_div_' + ename + '"><span class="pointer">'
                    + '<img src="' + elink.icon + '" class="sub_link" data-sublink="' + sublink + '"/>'
                    + '</span></div>';
            }
            html += '</div>'
            $subPanel.append(html);
            $("span .sub_link").click(PanelMgr.loadSubList);
            if (complete_callback || false ) {
                complete_callback( entity_name );
            }
        },

        loadSubList:function() {

            var sublink = $(this).data('sublink').split(",");

            var info = {}
            info.parent = sublink[0];
            info.child = sublink[1];
            var child = info.child;

            if (Geof.cntrl.lastSubBtn !== undefined) {
                Geof.cntrl.lastSubBtn.switchClass('active','enabled');
            }
            Geof.cntrl.lastSubBtn = $("#sublink_div_" + child);

            var parent = info.parent;
            var pEntity = Geof.cntrl[parent];
            var cEntity = Geof.cntrl[child]

            var pSelected = $("#ol" + JsUtil.capitalize(pEntity.entity) + "s .ui-selected");
            pSelected = Geof.model.selectedIds(pSelected, pEntity);

            info.cEntity = cEntity;
            info.pEntity = pEntity;
            info.olName = 'sub_ol_' + child;

            info.parentid = parent + pEntity.id;
            info.childid = child + cEntity.id;
            info.linkEntity = parent + '_' + child;
            info.id = pSelected || false ? pSelected[0] : -1;
            info.data = {};
            info.where= {};
            var parentid = info.parentid;
            info.where[parentid] = info.id;

            var deselectName = 'btnSub_' +child + 'DeselectAll';
            var selectName = 'btnSub_' +child + 'SelectAll';
            Geof.cntrl.lastSubBtn.switchClass('enabled','active');
            var $subpanel = $("#" + pEntity.prefix + "sub_panel_holder");
            $subpanel.empty();

            var selectCallback = Geof.cntrl.setChildSelectCB(info.olName, cEntity, deselectName);

            // Determine the read and the read callback
            Geof.cntrl.parentSelectCB = null

            var link;
            var linktype = '';
            var buttons = {};
            var link = Geof.cntrl.getLink( parent, child );

            if ('entity' in link) {
                info.linkEntity = link.entity;
            }

            if (link !== undefined) {
                linktype = link.type;
                buttons = link.buttons || [];
                info.read = link.read;
                info.readCallback = link.readCallback;

                if (linktype == 'child') {
                    info.data['where'] = info.where;

                } else if (linktype == 'link') {
                    if (info.readCallback === undefined) {
                        info.linkRead = function(id) {
                            var ldata = {columns:child + cEntity.id};
                            ldata.where = {};
                            ldata.where[info.parentid] = id;
                            var trans = new Transaction(Geof.session);
                            var jReq = GRequest.build(info.linkEntity, "read", null, ldata);
                            trans.addRequest(jReq, function(req) {
                                Geof.cntrl.selectLI(info.olName, req.data, child + 'id',null);
                                selectCallback();
                            });
                            trans.send();
                        }
                    }
                }
            }

            var populateCB = function(req, id) {
                var $items = $('#' + info.olName);
                if (cEntity.olclass !== undefined) {
                    $items.addClass(cEntity.olclass);
                } else {
                    $items.addClass('olSub_pnl_listBlock');
                }
                $items.empty();

                Templater.createSOLTmpl (req.data, $items,  cEntity.list_tmpl);
                $items.selectable({
                    stop: function() { selectCallback(); }
                });

                if (info.linkRead != null) {
                    info.linkRead(id);
                } else if (info.readCallback || false) {
                    info.readCallback(req.data);
                }
            };

            // callback query to fill the sub list
            Geof.cntrl.parentSelectCB = function(id) {
                var trans = new Transaction(Geof.session);
                if (info.read || false) {
                    var ldata = {}
                    ldata.columns = info.read.data.columns;
                    ldata.join = info.read.data.join;
                    ldata.where = {};
                    ldata.where[info.parentid] = id;
                    var jReq = GRequest.build(info.read.entity, "read", null, ldata);

                } else {
                    info.where[parentid] = id;
                    var jReq = GRequest.build(child, "read", null, info.data);
                }
                trans.addRequest(jReq, function(req) {
                    populateCB(req, id);
                });
                trans.send();
            };

            // Get the sublist html and append it to the sub panel
            $.get(PanelMgr.htmlLoc + 'sub_list_block.html', function(html) {

                html = html.replace(new RegExp('%entity',"g"), cEntity.entity);
                html = html.replace(new RegExp('%title',"g"), cEntity.title);
                $subpanel.append(html);

                $("#sub_buttonBar_" + child + " .iconLeft").each(function() {
                    $(this).hide();
                });

                var func = function(btn,name) {
                    var cb = function() {
                        btn.callback(info,name);
                    }
                    return cb;
                }
                for (var indx in buttons) {
                    var btn = buttons[indx];
                    var name = 'btnSub_' + child + JsUtil.capitalize(btn.action);
                    $('#' + name).show();
                    Gicon.click(name, func(btn,name));
                }

                Gicon.click(selectName, function() {Geof.cntrl.selectAll(info.olName, selectCallback)});
                Gicon.click(deselectName, function() {Geof.cntrl.deselectAll(info.olName, selectCallback)});
                Geof.cntrl.parentSelectCB(info.id);
            });
        },

        loadView : function (entity_name) {
            PanelMgr.viewDiv.empty();
            PanelMgr.viewDiv.append( Geof.src[entity_name].view );
            $("#btnclose" + entity_name + "view").on("click", function() {
                Geof.menuctrl.showMenu();
            });
        },

        loadSearchView : function (entity_name, complete_callback) {
            var $view = $('#searchResultsView');
            $view.empty();

            var $entity = $("#" + entity_name + "_viewer");
            var ent = Geof.cntrl[entity_name];
            var html = Geof.src[entity_name].view;
            $view.append( html );

            $("#btnclose" + entity_name + "view").on("click", function() {
                Geof.menuctrl.showMenu();
            });

            if (complete_callback || false ) {
                complete_callback( entity_name );
            }
        },

        showPanel: function(entity_name) {
            var ent = Geof.cntrl[entity_name];
            var pnl = $("#" + ent.prefix + 'dlgWrapper');
            PanelMgr.setResizeChecker(pnl);
        },

        centerPanel: function(control) {
            var body = $("#mainBody");
            var btop = (body.context.height - control.height()) / 2;
            var bleft = (body.context.width - control.width()) / 2;
            control.offset({ top: btop, left: bleft });
        },

        setResizeChecker: function(control) {
            if (control == null){
                control = PanelMgr.current_control
            } else {
                if (control.height() > 200) {
                    return;
                }
            }
            var checker = setInterval( function() {
                if (control.height() > 200) {
                    PanelMgr.centerPanel(control);
                    control.switchClass('hidden', 'shown');
                    window.clearInterval(checker);
                }

            }, 50);
        },

        setViewSize: function(view) {
            var $leftSlide = $("#leftViewSlideout");
            var body = $("#geofui_main");
            var height = $(window).height();
            var $header = $("#divHeaderBar");
            var h_height = height - $header.height() - 8;
            $leftSlide.height(h_height);
            $leftSlide.width(view.width + 8);
        }

    };
})()