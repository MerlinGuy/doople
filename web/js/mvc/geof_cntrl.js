/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 4/8/13
 * Time: 4:36 PM
 */

var Geof = Geof || {};
Geof.cntrl = Geof.cntrl || {};

Geof.cntrl.project = {
    name: 'Project',
    id:'id',
    entity:'project',
    prefix:'proj_',
    selected: null,
    fields: ["id",'name','status','description'],
    defaults: [-1,''],
    exclude:null,
    list_columns: "id,name",
    order_by:"name",
    editConfig: {
        dialogName:'project_edit', divName:'editProject',
        autoOpen: true, minHeight: 220, minWidth: 350,
        resizable: false, modal:true
    },
    title:'Projects',
    list_tmpl: '<li class="ui-widget-content" id="%uuid_%id" data-id="%id">%name</li>',
    option_tmpl: '<option value="%id">%name</option>',
    header_tmpl: '<label class="hdrLabelLeft">Project Name</label><label class="hdrLabelRight"> id</label>',

    link: [
        {
            name:'file',
            type:'link',
            entity:'file_project',
            icon:'img/symbol/file_64.png',
            buttons:[{action:'delete', callback:Geof.cntrl.deleteSublink}],
            read:{
                "entity":"file_project",
                "data":{
//                    "columns":"ugroupid,entityid,createable,readable,updateable,deleteable,executable",
                    "join":[{"entity":"file","join":"parent","columns":"id,originalname"}]
                }
            }
        }
    ],

    initialize: function(){
        var _this = Geof.cntrl.project;
        _this.populateList();
        Gicon.click("btnRefreshProject", _this.populateList);
        Gicon.click("btnNewProject", _this.addNew);
        Gicon.click("btnEditProject", _this.editSelected);
        Gicon.click("btnDiscardProject", _this.delete);
        $(" .subDlgWrapper").tooltip();
    },
    
    populateList:function() {
        Gicon.setActive("btnRefreshProject", true );
        Gicon.setEnabled("btnEditProject", false );
        Gicon.setEnabled("btnDiscardProject", false );
        var _this = Geof.cntrl.project;
        var $items = $('#olProjects');
        $items.empty();
        var cb = function(req) {
            Templatetor.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var selected = $('#olProjects .ui-selected');
                    _this.selected_ids = Geof.model.selectedIds(selected, _this);
                    var len = _this.selected_ids.length;
                    var enabled = len > 0;
                    Gicon.setEnabled("btnEditProject", enabled );
                    Gicon.setEnabled("btnDiscardProject", enabled );
                    Geof.cntrl.enableSublinks(len == 1);
                }
            });
            Gicon.setEnabled("btnRefreshProject", true );
        };
        Geof.model.read(null,_this, cb);
    },
    
    addNew: function () {
        var _this = Geof.cntrl.project;
        Geof.cntrl.showEditDialog(_this, {}, true);
        Gicon.click("edit_proj_save",_this.save);
    },
    
    editSelected: function () {
        var _this = Geof.cntrl.project;
        var list = $("#olProjects .ui-selected");
        var $item = $(list[0]);
        var cb = function(req) {
            Geof.cntrl.showEditDialog(_this, req.data, false);
            Gicon.click("edit_proj_save", Geof.cntrl.project.save);
        };
        Geof.model.readSelected($item, _this, cb);
    },
    
    save: function () {
        var _this = Geof.cntrl.project;
        Gicon.setActive('edit_proj_save',true);
        var fields = Geof.cntrl.getDialogData(_this);
        var update = (fields.id || false) ? fields.id >= 0 : false;
    
        var cb = function () {
            _this.populateList();
            Gicon.setEnabled('edit_proj_save',true);
        };
        var data = {};
        data.fields = fields;
        if (update) {
            Geof.model.update(data, _this, cb);
        } else {
            Geof.model.create(data, _this, cb);
        }
    },
    
    delete: function (){
        var _this = Geof.cntrl.project;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected Projects?");
    }
    
};

Geof.cntrl.tasker = {
    id:'id',
    entity:'tasker',
    prefix:'dbp_',
    fields:['id','lifetime','statusname','status','connected','sessionid','querytime','connstr'],
    defaults:[-1,'','','','','','',''],
    exclude:[],
    list_columns: "id,lifetime,statusname,sessionid",
    order_by:"connected",
    title:'Periodic Task Management',
    list_tmpl:'<li class="ui-widget-content" data-id="%id"><label class="flw100">%lifetime</label><label class="flw100">%statusname</label>' +
        '<label class="flw160"> %connected</label><label class="flw100">%sessionid</label><label class="idRight">%id</label></li>',
    editConfig: {
        dialogName:'edit_tasker', divName:'editTasker',
        autoOpen: true, minHeight: 250, minWidth: 400,
        resizable: false, modal:true
    },

    initialize: function(){
        var _this = Geof.cntrl.tasker;
        Gicon.click("btnRefreshTasker", _this.populateList);
        Gicon.click("btnEditTasker", _this.editSelected);
        Gicon.click("btnDiscardTasker", _this.delete);
        _this.populateList();
    },

    populateList:function() {
        var _this = Geof.cntrl.tasker;
        Gicon.setEnabled("btnEditTasker", false );
        Gicon.setEnabled("btnDiscardTasker", false );
        var $items = $('#olTaskers');
        $items.empty();
        var cb = function(req) {
            Templatetor.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var count = $( ".ui-selected", this).length;
                    Gicon.setEnabled("btnEditTasker", count == 1 );
                    Gicon.setEnabled("btnDiscardTasker", count > 0 );
                }
            });
            Gicon.setEnabled("btnRefreshTasker", true );
        };
        Geof.model.read(null,_this, cb);
    },

    edit: function (req) {
        var _this = Geof.cntrl.tasker;
        var data = (req || false) ? req.data : {};
        Geof.cntrl.showEditDialog(_this, data, false);
        $("#editTasker").tooltip();
        Gicon.click("edit_tasker_discard", _this.delete);
    },

    editSelected: function () {
        var _this = Geof.cntrl.tasker;
        var list = $("#olTaskers .ui-selected");
        if (list.length != 1) {
            Geof.log("fix the editSelected error where the selected count <> 1");
        }
        var $item = $(list[0]);
        Geof.model.readSelected($item, _this, _this.edit);
    },

    save:function () {},
    delete: function(){
        var _this = Geof.cntrl.tasker;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected tasks?");
    }
};

Geof.cntrl.annotation = {
    id:'id',
    entity:'annotation',
    prefix:'anno_',
    fields:['id','title','description','fileid','longitude','latitude','startoffset','endoffset','x','y','ratiox','ratioy','type'],
    defaults:[-1,'','',-1,null,null,null,null,null,null,null,null,-1],
    exclude:[],
    list_columns: "id,title",
    order_by:"id",
    title:'Annotations',

    list_tmpl:'<li class="ui-widget-content" data-id="%id"><label class="floatLeft font9">%title</label>' +
        '<div id="annotation_detail%id"></div></li>',

    list_detail_tmpl:'<textarea class="annotation_msg" disabled="disabled">%description</textarea>',

    usr_tmpl:'<li class="ui-widget-content" data-id="%id">%lastname, %firstname<label class="idRight">%id</label></li>',

    editConfig: {
        dialogName:'edit_annotation', divName:'editAnnotation',
        autoOpen: true, minHeight: 350, minWidth: 360,
        resizable: false, modal:false
    },

    divElement:null,
    ol:null,
    underlay:null, // the image, video, or map to dray on
    drawCanvas:null,
    detail_div:null,
    selected: null,
    record: null,
    file:null,
    type:-1,
    sectionWidth:246,
    toggle_btn:'btnToggleAnnotation',
    delay_initialization:false,
    got_parent_resize:false,
    selected_ids:[],
    videoplayer:null,

    setOptions:function(options) {
        var _this = Geof.cntrl.annotation;
        for (var parameter in options) {
            if (parameter in _this) {
                _this[parameter] = options[parameter];
            }
        }
        if (_this.toggle_btn != null) {
            Gicon.click(_this.toggle_btn,_this.toogleDiv, Gicon.DISABLED);
        }
        if (options.isvisible || false) {
            _this.show()
        }
    },

    toogleDiv:function() {
        var _this = Geof.cntrl.annotation;
        if (_this.divElement.is(":visible")) {
            _this.hide();
        } else {
            _this.show();
        }
    },

    show:function() {
//        Geof.log('show');
        var _this = Geof.cntrl.annotation;
        if ( ! _this.divElement.is(":visible")) {
            _this.divElement.show();
            Gicon.setActive(_this.toggle_btn, true);
            if (_this.got_parent_resize) {
                _this.initialize();
            } else {
                _this.delay_initialization = true;
            }
            if (_this.videoplayer != null) {
                _this.videoplayer.removeAttribute("controls")
            }
        }
    },

    hide:function() {
        var _this = Geof.cntrl.annotation;
        if (_this.divElement.is(":visible")) {
            _this.divElement.hide();
            Gicon.setEnabled(_this.toggle_btn, true);
            if ( _this.drawCanvas || false) {
                _this.drawCanvas.remove();
            }
            if (_this.videoplayer != null) {
                _this.videoplayer.setAttribute("controls","controls")
            }
        }
    },
    
    initialize: function() {
//        Geof.log('initialize');
        var _this = Geof.cntrl.annotation;
        Gicon.click("btnRefreshAnnotation", _this.populateList);
        Gicon.click("btnNewAnnotation", function() {_this.edit(true)});
        Gicon.click("btnEditAnnotation", function() {_this.edit(false)});
        Gicon.click("btnDiscardAnnotation", _this.delete);
        _this.createCanvas();
        _this.populateList();
    },

    resize:function(from_parent) {
//        Geof.log('resize');
        var _this = Geof.cntrl.annotation;
        if (from_parent || false) {
            _this.got_parent_resize = true;
        }
        var divHeight = _this.divElement.parent().height() - 56;
        _this.divElement.height(divHeight);
        $('#' + _this.ol).height(divHeight-1);
        if (_this.delay_initialization) {
            _this.delay_initialization = false;
            _this.initialize();
        }
    },

    populateList:function() {
        var _this = Geof.cntrl.annotation;
        Gicon.setEnabled("btnDiscardAnnotation", false );
        Gicon.setEnabled("btnEditAnnotation", false );
        var $items = $('#' + _this.ol);
        $items.empty();
        var cb = function(req) {
            Templatetor.createSOLTmpl (req.data, $items, _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    _this.selected = $(".ui-selected", this);
                    var count = _this.selected.length;
                    Gicon.setEnabled("btnDiscardAnnotation", count > 0 );
                    Gicon.setEnabled("btnEditAnnotation", count == 1 );
                    if (count == 1) {
                        _this.getItem(null);
                    }
                }
            });

            _this.selected = [];
            for (var indx in _this.selected_ids) {
                $("li[data-id='" + _this.selected_ids[indx] +"']").each( function() {
                    _this.selected.push(this);
                    $(this).addClass('ui-selected');
                });
            }
            if(_this.selected_ids.length == 1) {
                Gicon.setEnabled("btnEditAnnotation",true );
                _this.getItem(null);
            }
            _this.selected_ids = [];
        };

        Geof.model.read({fileid:_this.file.id},_this,cb,null);
    },

    getItem:function(callback) {
//        Geof.log('getItem');
        var _this = Geof.cntrl.annotation;
        var $item = $(_this.selected[0]);
        Geof.cntrl.annotation.clearCanvas();
        if (_this.detail_div != null) {
            _this.detail_div.empty();
        }
        var annotationid = $item.data('id');

        Geof.model.readSelected($item, _this, function(req) {
            _this.record = {};
            //TODO: perhaps bring back the usr_notification records
            var flds = req.data[0];
            _this.record.fields = flds;
            _this.detail_div = $("#annotation_detail" + annotationid);
            _this.detail_div.append(Templatetor.mergeDftTemplate(flds,_this.list_detail_tmpl));

            if (flds.type == Filetypes.PHOTO) {
                var $canvas = $('#' + _this.drawCanvas.id);
                var x = flds.ratiox * $canvas.width();
                var y = flds.ratioy * $canvas.height();
                _this.drawMarker(x,y);
            } else if (flds.type == Filetypes.VIDEO){
                _this.initializeVideo();
            }
        });
    },

    edit: function (isNew) {
        var _this = Geof.cntrl.annotation;
        if (isNew) {
            _this.record = {};
            var rec = _this.record;
            rec.fields = Geof.model.getFields(_this);
            rec.fields.fileid = _this.file.id;
            rec.fields.type = _this.type;
//            rec.usrs = [];
        }
        Geof.cntrl.showEditDialog(_this, (isNew ? null :_this.record.fields ), isNew, _this.initializeEdit);
    },

    initializeEdit:function() {
        var _this = Geof.cntrl.annotation;
        $('#anno_title').blur(_this.validateUI);
        Gicon.click('edit_anno_save',_this.save);

        if (_this.record.fields.type == Filetypes.VIDEO) {
            _this.initializeVideo();
        }

        var cb = function(req) {
            var $olUsrs = $("#annotationUsrs");
            $olUsrs.empty();
            Templatetor.createSOLTmpl (req.data, $olUsrs, _this.usr_tmpl);
            $olUsrs.selectable({
                stop: function() {
                _this.validateUI();
                }
            });
        }
        Geof.model.read(null,Geof.cntrl.usr, cb);
    },

    initializeVideo:function() {
        var _this = Geof.cntrl.annotation;
        var vp =  _this.videoplayer;
        var duration = vp.duration.toFixed(3);
        duration = Math.round(duration * 10);

        var $startoffset = $("#anno_startoffset");
        var $endoffset = $("#anno_endoffset");

        var $slider = $("#sliderVideoAnnotation");
        _this.lastStart = 0;
        _this.lastEnd = duration;

        var flds = _this.record.fields;

        $slider.slider({
            range:true,
            min:0,
            max: duration,
            values:[0,duration],
            lastStart:0,
            lastEnd:duration,
            stop:function(event, ui) {
                var start = ui.values[0];
                var end = ui.values[1];
                if (start != _this.lastStart) {
                    _this.lastStart = start;
                    var value = (start / 10).toFixed(2);
                    vp.currentTime = value;
                    $startoffset.val(value);
                } else {
                    _this.lastEnd = end;
                    var value = (end / 10).toFixed(2);
                    vp.currentTime = value;
                    $endoffset.val(value);
                }
            }
        });

        $endoffset.change(function() {
            var values = $slider.slider( "option", "values" );
            values[1] = parseFloat($(this).val() * 10)
            $slider.slider("option",'values', values );
            vp.currentTime = $(this).val();
        })
        $startoffset.change(function() {
            var values = $slider.slider( "option", "values" );
            values[0] = parseFloat($(this).val() * 10)
            $slider.slider("option",'values', values );
            vp.currentTime = $(this).val();
        })

        $("#videoAnnotationSection").switchClass('hidden','shown');

        vp.addEventListener("ended", function() {
            $("#videoplay").switchClass('icon_geof_pausevideo','icon_geof_playvideo');
        }, false);

        vp.addEventListener("timeupdate", function() {
            $("#anno_timepudate").val(vp.currentTime.toFixed(2));
            if (flds.endoffset > 0 &&  vp.currentTime >= flds.endoffset) {
//                vp.pause();
                vp.currentTime = flds.startoffset;
            }
        }, false);

        $('#videoplay').click(function() {
            if (vp.paused) {
                $("#videoplay").switchClass('icon_geof_playvideo','icon_geof_pausevideo');
                vp.play();
            } else {
                $("#videoplay").switchClass('icon_geof_pausevideo','icon_geof_playvideo');
                vp.pause();
            }
        });
        var flds = _this.record.fields;
        var values = [
            flds.startoffset * 10 || 0,
            flds.endoffset * 10 || (duration * 10)
        ]
        $slider.slider("option",'values', values );
        vp.currentTime = flds.startoffset;
    },

    save:function () {
        var _this = Geof.cntrl.annotation;
        Gicon.setActive('edit_anno_save',true);
        var fields = _this.record.fields;
        fields.title = $('#anno_title').val();
        fields.description = $('#anno_description').val();

        var startoffset = JsUtil.toInt($('#anno_startoffset').val(), -1);
        fields.startoffset = startoffset;
        var endoffset = JsUtil.toInt($('#anno_endoffset').val(), -1);
        fields.endoffset = endoffset;

        var data = {'fields':Geof.model.copyFields(_this, fields)};
        var trans = new Transaction(Geof.session);
        var order = 0;
        var action = 'create';
        var annotationid = data.fields.id;
        if ((annotationid || false) && (annotationid > -1)) {
            action = 'update';
            data.where = {id:annotationid};
        } else {
            annotationid = null;
        }
        var reqAnn = GRequest.build('annotation',action, null, data);
        reqAnn.order = order++;
        trans.addRequest(reqAnn, null);

        var usrs = [];
        $("#annotationUsrs .ui-selected").each(function() {
            usrs.push($(this).data('id'));
        });

        if (usrs.length > 0) {

            var data = {
                fields:{
                    usrid:Geof.session.usr.usrid,
                    message:$('#anno_notification_message').val(),
                    level:$('#anno_notification_level').val(),
                    type:Geof.cntrl.notification.types.Annotation
                }
            };

            var reqNot = GRequest.build('notification','create', null, data);
            reqNot.order = order++;
            trans.addRequest(reqNot, null);

            var data = {
                "reference":"fields",
                'fields':{'$notificationid':reqNot.requestid + ',id'}
            }
            if (annotationid == null) {
                data.fields['$annotationid'] = reqAnn.requestid + ',id'
            } else {
                data.fields['annotationid'] = annotationid;
            }

            var reqLink = GRequest.build('notification_annotation','create', null, data);
            reqLink.order = order++;
            trans.addRequest(reqLink, null);

            for (var indx in usrs ) {
                var data = {
                    "reference":"fields",
                    'fields':{'usrid':usrs[indx],'$notificationid':reqNot.requestid + ',id'}
                }
                var reqLink = GRequest.build('usr_notification','create', null, data);
                reqLink.order = order++;
                trans.addRequest(reqLink, null);
            }
        }
        trans.setLastCallback(function(req) {
            Gicon.setEnabled('edit_anno_save',true);
            _this.populateList();
        });
        trans.send();
    },

    delete: function(){
        var _this = Geof.cntrl.annotation;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected annotations?");
    },

    drawMarker: function(x,y) {
//        Geof.log('drawMarker');
        var ctx = Geof.cntrl.annotation.clearCanvas();
        ctx.strokeStyle = '#46b400';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 10 ,0,(2*Math.PI), false);
        ctx.stroke();
    },

    clearCanvas:function() {
        var canvas = Geof.cntrl.annotation.drawCanvas;
        var ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return ctx;
    },

    setLatLng: function(latitude, longitude) {
        var _this = Geof.cntrl.annotation;
        _this.data.latitude = latitude;
        _this.data.longitude = longitude;
    },

    createCanvas:function() {
//        Geof.log('createCanvas');
        var _this = Geof.cntrl.annotation;
        if (_this.underlay) {
            var underlay = $('#' + _this.underlay);
            var parent = underlay.parent();
            var drawCanvas = document.createElement('canvas');
            _this.drawCanvas = drawCanvas;
            drawCanvas.id = 'annotation_canvas';
            drawCanvas.height = underlay.height();
            drawCanvas.width = underlay.width();
            parent.append(drawCanvas);

            var $canvas = $('#' + drawCanvas.id);
            var position = underlay.position();
            $canvas.css({
                'left':position.left,
                'top':position.top
            });
            $canvas.addClass('annotation');

            $canvas.click(function(evt) {
                var offset = $canvas.offset();
                var x = (evt.clientX - offset.left);
                var y = (evt.clientY - offset.top);
                _this.drawMarker( x, y);
                var flds = _this.record.fields;
                flds.ratiox = (evt.clientX - offset.left) / $canvas.width();
                flds.ratioy = (evt.clientY - offset.top) / $canvas.height();
            });
        }
    },

    validateUI:function() {
        Gicon.setEnabled('edit_anno_save', $('#anno_title').val().length);
    },

    getFile:function(annotationid, callback) {
        if (callback === undefined) {
            return;
        }
        var cb = function(req) {
            var data = req.data;
            if (data !== undefined && data.length == 1) {
                Geof.cntrl.file.getFile(data[0].fileid,callback);
            } else {
                callback(null);
            }
        }
        var options = {
            entity:'annotation',
            where:{id:annotationid},
            columns:'fileid',
            callback:cb
        }
        Geof.model.readOptions(options);
    }

};

