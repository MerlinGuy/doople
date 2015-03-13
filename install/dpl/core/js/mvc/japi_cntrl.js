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

Geof.increment = 0;

Geof.cntrl = Geof.cntrl || {};

Geof.cntrl.option_tmpl = '<option value="%value" %selected>%text</option>';

Geof.cntrl.childSelectCB = null;
Geof.cntrl.selectedFiles = [];

/*
 This function builds a list of option values as html and replaces the 'Select' control's
 html.

 data : Json array of row data
 selectid : id of the select control to fill with data
 fld_value : row column to use as option value
 text_format : a format field to use instead of standard %text i.e. %lastname, %firstname
 text_cols : an array of row columns to use in text_format replacement
 fld_selected : row field to use for setting the 'selected' option
 selected_value :
 */
Geof.cntrl.fill_select = function(data, selectid, fld_value, text_format, text_cols, fld_selected, selected_value) {
    var html = '';
    var opt = '';
    var row = null;
    var useSelected = fld_selected && selected_value;
    var tmpl = Geof.cntrl.option_tmpl
    if (text_format || false ) {
        tmpl = tmpl.replace('%text', text_format);
    }

    for (var indx in data) {
        row = data[indx];
        opt = tmpl.replace('%value', row[fld_value]);
        var col;
        for (var iCol in text_cols) {
            col = text_cols[iCol];
            opt = opt.replace('%' + col, row[col]);
        }
        if (useSelected && selected_value == row[fld_selected]) {
            opt = opt.replace('%selected', ' selected="true"');
        } else {
            opt = opt.replace('%selected', '');
        }
        html += opt;
    }
    $("#" + selectid).html(html);
};

Geof.cntrl.selectedByType= function(type){
    var selected = Geof.cntrl.selectedFiles;
    var rtn = [];
    if (selected && selected.length > 0) {
        for (var indx=0; indx < selected.length; indx++) {
            var item = selected[indx];
            if (item.filetype == type) {
                rtn.push(item);
            }
        }
    }
    return rtn;
}

Geof.cntrl.showEditDialog = function(cntrl, data, isNew, callback) {
    if (!(data || false)) {
        isNew = true;
        data = {};
    } else if (JsUtil.isArray(data)) {
        data = data[0];
    }
    isNew = (isNew || false);
    var filename = ('filename' in cntrl) ? cntrl.filename : cntrl.entity;

    if (! (filename in Geof.src)) {
        var cb = function() {
            Geof.cntrl.showEditDialog(cntrl,data,isNew,callback);
        };
        var filelist = ('filelist' in cntrl) ? cntrl.filelist : ["list","edit"];
        Geof.Retrieve.getEntity(filename, cb, filelist, cntrl.file_path);
        return;
    }
    var html = Geof.src[filename].edit;
    $("#mainBody").append(html);
    if (isNew) {
        Geof.cntrl.clearDialog(cntrl);
    } else {
        Geof.cntrl.setEditFields(cntrl,data);
    }
    var pos_tag = cntrl.entity + '_dialog_position';
    var pos = localStorage.getItem(pos_tag) || null;
    if ( pos != null) {
        pos = pos.split(",");
        cntrl.editConfig.position = [parseInt(pos[1]),parseInt(pos[0])];
    }

    var $dlg = $("#" + cntrl.editConfig.divName);
    $dlg.dialog(cntrl.editConfig);
    $dlg.on("dialogclose", function() {
        $dlg.remove()
    });

    $dlg.on("dialogdragstop",function(event, ui) {
        localStorage.setItem(pos_tag, ui.position.top + "," + ui.position.left);
    });

    if (callback || false) {
        callback();
    }
};

Geof.cntrl.setEditFields = function(cntrl, data) {
    try {
        Geof.cntrl.clearDialog(cntrl);
        if (!(data || false)) {
            return;
        }
        var fields = cntrl.fields;
        var defaults = cntrl.defaults;
        for (var indx in fields) {
            var fld = fields[indx];
            var $cntrl = $("#" + cntrl.prefix + fld);
            if ($cntrl.length === 0) {
//                Geof.log("undefined field: " + cntrl.prefix + fld);
                continue;
            }

            var value = data[fld];
            if (value === undefined) {
//                Geof.log("Geof.cntrl.setEditFields: no value in data for : " + fld);
                continue;
            }
            var className = Geof.cntrl.getObjectClass($cntrl[0]);
            if (className.indexOf("Label") > -1) {
                $cntrl.text(value);
            } else if (className.indexOf("Select") > -1) {
                $cntrl.val(value.toString());
            } else if (className === "") {
                // try a radio button
                $("input:radio[name=usr_" + fld + "][value='" + value + "']").attr('checked', 'checked');
            }  else {
                $cntrl.val(value);
            }
        }
    } catch (e) {
        alert(e);
    }
};

Geof.cntrl.clearDialog = function(cntrl) {
    var fields = cntrl.fields;
    var defaults = cntrl.defaults;
    for (var indx in fields) {
        var fld = fields[indx];
        var controlName = cntrl.prefix + fld
        var $cntrl = $("#" + controlName);
        var value = defaults[indx];
        var className = Geof.cntrl.getObjectClass($cntrl[0]);
        if (className.indexOf("Label") > -1) {
            $cntrl.text(value);
        } else if (className.indexOf("Select") > -1) {
            $cntrl.val(value);
        } else if (className === '') {
            // try a radio button
            $("input:radio[name=usr_" + fld + "][value='" + value + "']").attr('checked', 'checked');
        }  else {
            $cntrl.val(value);
        }
    }
};

Geof.cntrl.getObjectClass = function (obj) {
    if (obj && obj.constructor && obj.constructor.toString) {
        var arr = obj.constructor.toString().match(/function\s*(\w+)/);
        if (arr && arr.length == 2) {
            return arr[1];
        }
    }
    return "";
};

Geof.cntrl.getDialogData = function(cntrl, include) {
    include = include ||false;
    var fldList = cntrl.fields;
    var value;
    var fields = {};
    for (var indx in fldList) {
        var fld = fldList[indx];
        if ( ! include && JsUtil.has(fld, cntrl.exclude )) {
            continue;
        }
        var controlName = cntrl.prefix + fld
        var $id = $("#" + controlName);
        var className = Geof.cntrl.getObjectClass( $id[0] );
        if (className.indexOf("Label") > -1) {
            value = $id.text();
        } else {
            value = $id.val();
        }
        fields[fld] = value;
    }
    return fields;
};

Geof.cntrl.saveSublink = function(subInfo, btnName) {
    Gicon.setActive(btnName, true);
    var order = 0;
    var trans = new Transaction(Geof.session);
    var entity = subInfo.linkEntity;
    var jReq = GRequest.build(entity, "delete", null, {where:subInfo.where});
    jReq.order = order++;
    trans.addRequest(jReq, null);

    $('#' + subInfo.olName + " .ui-selected").each(function() {
        var data = {fields:{}};
        data.fields[subInfo.parentid] = subInfo.id;
        data.fields[subInfo.childid] = $.data(this,'id');
        jReq = GRequest.build(entity, "create", null, data);
        jReq.order = order++;
        trans.addRequest(jReq, null);
    });
    trans.setLastCallback(function() {
        Gicon.setEnabled(btnName, true);
        Geof.cntrl.parentSelectCB(subInfo.id);
    });
    trans.send();

};

Geof.cntrl.deleteSublink = function(subInfo, btnName) {
    Gicon.setActive(btnName, true);
    var trans = new Transaction(Geof.session);
    var entity = subInfo.linkEntity;
    $('#' + subInfo.olName + " .ui-selected").each(function() {
        var data = {where:{}};
        data.where[subInfo.childid] = $.data(this,'id');
        jReq = GRequest.build(entity, "delete", null, data);
        trans.addRequest(jReq, null);
    });
    trans.setLastCallback(function() {
        Gicon.setEnabled(btnName, true);
        Geof.cntrl.parentSelectCB(subInfo.id);
    });
    trans.send();
}

Geof.cntrl.deleteChild = function(subInfo, btnName) {
    Gicon.setActive(btnName, true);
    var trans = new Transaction(Geof.session);
    $('#' + subInfo.olName + " .ui-selected").each(function() {
        var data = {where:{}};
        data.where[subInfo.cEntity.id] = $.data(this,'id');
        jReq = GRequest.build(subInfo.child, "delete", null, data);
        trans.addRequest(jReq, null);
    });
    trans.setLastCallback(function() {
        Gicon.setEnabled(btnName, true);
        Geof.cntrl.parentSelectCB(subInfo.id);
    });
    trans.send();
}

Geof.cntrl.selectLI= function(olName, data, field, callback) {
    Geof.cntrl.deselectAll(olName, null);
    for (var indx in data) {
        $('#' + olName + ' li[data-id="' + data[indx][field] + '"]').addClass('ui-selected');
    }
    if (callback || false) {
        callback();
    }
}

Geof.cntrl.selectAll= function(olName, callback) {
    $('#' + olName + " li").addClass('ui-selected');
    if (callback || false) {
        callback();
    }
}

Geof.cntrl.deselectAll= function(olName, callback) {
    $('#' + olName + " li").removeClass('ui-selected');
    if (callback || false) {
        callback();
    }
}

Geof.cntrl.enableSublinks = function(enabled) {
    if (enabled) {
        $("div .sub_link").switchClass('disabled','enabled');
    } else {
        $("div .sub_link").switchClass('enabled','disabled');
    }
},

Geof.cntrl.parentSelected = function(selected) {
    var enabledSublinks = false;
    if ( selected || false ) {
        var id = undefined;
        if (JsUtil.isArray(selected)) {
            if (selected.length == 1) {
                id = selected[0];
            }
        } else {
            id = selected;
        }
        enabledSublinks = id || false;
        if (Geof.cntrl.parentSelectCB || false) {
            Geof.cntrl.parentSelectCB(id);
        }
    }
    Geof.cntrl.enableSublinks(enabledSublinks);
}

Geof.cntrl.setChildSelectCB = function(olName,childEntity,deselectName) {
    Geof.cntrl.childSelectCB = function() {
        var selected = $('#' + olName +' .ui-selected');
        var ids = Geof.model.selectedIds(selected, childEntity);
        Gicon.setEnabled(deselectName,(ids.length > 0));
    }
    return Geof.cntrl.childSelectCB;
}

Geof.cntrl.getLink = function(entityName, linkName) {
    var entity = Geof.cntrl[entityName];
    if (entity !== undefined) {
        var links = entity.link;
        if (links != undefined) {
            var len = links.length;
            for (var indx=0;indx<len;indx++) {
                if (links[indx].name === linkName) {
                    return links[indx];
                }
            }
        }
    }
    return undefined;
}

/*  ------------------------------------------------------------------------- */
/*  ------------------------------------------------------------------------- */
Geof.cntrl.annotation = {
    id:'id',
    entity:'annotation',
    file_path:'panel/',
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
            Templater.createSOLTmpl (req.data, $items, _this.list_tmpl);
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
            _this.detail_div.append(Templater.mergeTemplate(flds,_this.list_detail_tmpl));

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
            Templater.createSOLTmpl (req.data, $olUsrs, _this.usr_tmpl);
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

Geof.cntrl.audit = {
    id:'id',
    entity:'requestaudit',
    filename:'audit',
    prefix:'adt_',
    fields:['requestname','action','actionas','usrid','sessionid','rundate'],
    defaults:[],
    exclude:[],
    list_columns: "",
    order_by:"rundate desc",
    title:'Request Audit Log',
    list_tmpl:'<li class="ui-widget-content"><label class="flw120">%requestname</label><label class="flw40">%actionname</label>' +
        '<label class="flw60">&nbsp;%actionas</label><label class="flw50">%usrid</label><label class="flw240">%sessionid</label>' +
        '<label class="flw120">%rundate</label></li>',
    link: {},
    editConfig: { },

    initialize: function() {
        var _this = Geof.cntrl.audit;
        Gicon.click("btnRefreshAudit", _this.populateList);
        Gicon.click("btnEditAudit", _this.save);
        $(" .subDlgWrapper").tooltip();
        $("#adt_level").on("change", function() {
            Gicon.setEnabled("btnEditAudit",true);
        });

        var $after = $("#adt_after");
        $after.val(DateUtil.todayPickerDate());
        $after.datetimepicker();
        $("#adt_before").datetimepicker();

        $("#adt_truncate_before").datetimepicker();
        $("#adt_truncate_before").on("change", function() {
            Gicon.setEnabled("btnDiscardAudit",$("#adt_truncate_before").val().length);
        });
        Gicon.click("btnDiscardAudit", _this.delete);
        _this.populateList();
    },

    populateList:function() {
        Gicon.setActive("btnRefreshAudit", true );
        var _this = Geof.cntrl.audit;

        var $items = $('#olAudit');
        $items.empty();
        var cb = function(req) {
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable();
            Gicon.setEnabled("btnRefreshAudit", true );
        }
        var where = [];
        var after = $("#adt_after").val();
        if (after.length > 0) {
            after = DateUtil.getSvrDate(after,"/",":");
            where.push({"column":"rundate","operator":">","value":after});
        }
        var before = $("#adt_before").val();
        if (before.length > 0) {
            before = DateUtil.getSvrDate(before,"/",":");
            where.push({"column":"rundate","operator":"<","value":before});
        }
        var usrid = $("#adt_usrid").val();
        if (usrid.length > 0) {
            where.push({"column":"usrid","operator":"=","value":usrid});
        }
        var sessionid = $("#adt_sessionid").val();
        if (sessionid.length > 0) {
            where.push({"column":"sessionid","operator":"=","value":sessionid});
        };
        Geof.model.read(where,_this, cb, null);
    },

    delete: function (){
        var after = $("#adt_truncate_before").val();
        if (after.length == 0) {
            return;
        }
        var cb = function(doDelete) {
            if (doDelete) {
                var _this = Geof.cntrl.audit;
                Gicon.setActive('btnDiscardAudit',true);
                after = DateUtil.getSvrDate(after,"/",":");
                var where = [{"column":"rundate","operator":"<","value":after}];

                Geof.model.delete(where, _this, function() {
                    Gicon.setEnabled('btnDiscardAudit',true);
                    _this.populateList();
                });
            }
        };
        PanelMgr.showDeleteConfirm("Truncate Request Audit Logs", "Truncate Request Audit Logs?", cb);

    }

};

Geof.cntrl.authcode = {

    id:'id',
    entity:'authcode',
    prefix:'authcode_',
    fields:['id','guid','usrid','startdate','enddate','maxuses','lastused'],
    defaults:[-1,'',-1,null,null,-1,null],
    exclude:['lastused'],
    list_columns: "id,guid,usrid,startdate,enddate",
    order_by:"usrid,startdate,enddate",
    title:'Authorization Codes',
    olclass:'olAuthcode',
    list_tmpl : '<li class="ui-widget-content" id="%%id" data-id="%id">'
        + '<label>Code:</label><label class="data">%guid</label><br>'
        + '<label>User:</label><label class="data">%usrid</label><br>'
        + '<label>Start Date:</label><label class="data">%startdate</label><br>'
        + '<label>End Date:</label><label class="data">%enddate</label></li>',

    editConfig: {
        dialogName:'edit_authcode', divName:'editAuthcode',
        autoOpen: true, minHeight: 290, minWidth: 500,
        resizable: false, modal:true
    },

    initialize: function(){
        var _this = Geof.cntrl.authcode;
        Gicon.click("btnRefreshAuthcode", _this.populateList);
        Gicon.click("btnEditAuthcode", _this.editSelected);
        Gicon.click("btnDiscardAuthcode", _this.delete);
        Gicon.setEnabled("btnNewAuthcode", true );
        Gicon.click("btnNewAuthcode", _this.edit);
        _this.populateList();
    },

    validateNew:function() {
        var is_valid = false;
        if (JsUtil.hasValue("authcode_guid") && JsUtil.hasValue("authcode_usrid")) {
            var max_uses = $("#authcode_maxuses").val();
            var start = DateUtil.parseDate($("#authcode_startdate").val());
            var end = DateUtil.parseDate($("#authcode_enddate").val());
            if ( (start || false) && (end || false)) {
                if (DateUtil.isBefore(start,end)) {
                    is_valid = true;
                }
            }
            if (! is_valid && JsUtil.toInt(max_uses) > 0) {
                is_valid = true;
            }
        }
        Gicon.setEnabled("edit_authcode_save",is_valid);
    },

    populateList:function() {
        var _this = Geof.cntrl.authcode;
        Gicon.setEnabled("btnEditAuthcode", false );
        Gicon.setEnabled("btnDiscardAuthcode", false );
        var $items = $('#olAuthcodes');
        $items.empty();
        var cb = function(req) {
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var enabled = $( ".ui-selected", this).length > 0;
                    Gicon.setEnabled("btnEditAuthcode", enabled );
                    Gicon.setEnabled("btnDiscardAuthcode", enabled );
                }
            });
            Gicon.setEnabled("btnRefreshAuthcode", true );
        };
        Geof.model.read(null,_this, cb);
    },

    edit: function (req) {
        var _this = Geof.cntrl.authcode;

        var data = (req || false) ? req.data : {};
        Geof.cntrl.showEditDialog(_this, data, false);
        Gicon.click("downloadNewAuthcode", _this.requestGuid)
        Gicon.click("edit_authcode_save", _this.save);
        $( "#authcode_startdate" ).datetimepicker();
        $( "#authcode_enddate" ).datetimepicker();
        _this.setUsrList(data);
        $("#editAuthcode").tooltip();
        $(".auth_validate").each(function() {
            $(this).change(Geof.cntrl.authcode.validateNew);
        })

    },

    editSelected: function () {
        var _this = Geof.cntrl.authcode;
        var list = $("#olAuthcodes .ui-selected");
        var $item = $(list[0]);
        Geof.model.readSelected($item, _this, _this.edit);
    },

    requestGuid:function () {
        var cb = function(req) {
            var guid = req[0].data[0]['guid'];
            $('#authcode_guid').val(guid);
            Gicon.setEnabled('downloadNewAuthcode',true);
            Geof.cntrl.authcode.validate();
        };
        Gicon.setActive('downloadNewAuthcode',true);
        var obj = {"entity":"authcode","action":"create","actionas":"create_guid","data":{}};
        TransMgr.sendNow( GRequest.fromJson(obj), cb);
    },

    save:function () {
        var _this = Geof.cntrl.authcode;
        Gicon.setActive('edit_authcode_save',true);
        var fields = Geof.cntrl.getDialogData(_this);

        var update = (fields.id || false) ? fields.id >= 0 : false;

        var cb = function (data,textStatus,jqXHR) {
            _this.populateList();
            Gicon.setEnabled('edit_authcode_save',true);
        };
        var data = {};
        fields['startdate'] = DateUtil.getSvrDate(fields['startdate'],"/",":");
        fields['enddate'] = DateUtil.getSvrDate(fields['enddate'],"/",":");
        data.fields = fields;
        if (update) {
            Geof.model.update(data, _this, cb);
        } else {
            Geof.model.create(data, _this, cb);
        }
    },

    setUsrList:function(data) {
        var usrid = -1;
        if ((data || false) && (data.length == 1)) {
            usrid = data[0].usrid;
        }

        var cb = function(req) {
            var data = req[0].data;
            Geof.cntrl.fill_select(data,'authcode_usrid','id', '%lastname, %firstname',['lastname','firstname'], 'id', usrid);
        };
        var obj = {"entity":"usr","action":"read","data":{"orderby":"lastname, firstname"}};
        TransMgr.sendNow(GRequest.fromJson(obj), cb);
    },

    delete: function(){
        var _this = Geof.cntrl.authcode;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected authorization codes?");
    }
};

Geof.cntrl.configuration = {
    id:'id',
    entity:'configuration',
    filename:'configuration',
    prefix:'cnfg_',
    fields:[],
    defaults:[],
    exclude:[],
    list_columns: "",
    order_by:"",
    title:'Configuration',
    list_tmpl:'<li class="ui-widget-content" data-id="%id"><label class="flw100">%name</label>'
        + '<label class="w320tl">%value</label></li>',
    link: {},
    editConfig: { },

    initialize: function() {
        var _this = Geof.cntrl.configuration;
        _this.populateList();
        Gicon.click("btnRefreshConfiguration", _this.populateList);
        $(" .subDlgWrapper").tooltip();
    },

    populateList:function() {
        Gicon.setActive("btnRefreshConfiguration", true );
        var _this = Geof.cntrl.configuration;

        var $items = $('#olConfiguration');
        $items.empty();
        var cb = function(req) {
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({});
            Gicon.setEnabled("btnRefreshConfiguration", true );
        };
        Geof.model.read(null,_this, cb);
    }
};

Geof.cntrl.dbpool = {
    id:'id',
    entity:'dbpool',
    prefix:'dbp_',
    fields:['id','lifetime','statusname','status','connected','sessionid','querytime','connstr'],
    defaults:[-1,'','','','','','',''],
    exclude:[],
    list_columns: "id,lifetime,statusname,sessionid",
    order_by:"connected",
    title:'Database Pool Connections',
    list_tmpl:'<li class="ui-widget-content" data-id="%id"><label class="flw80">%lifetime</label><label class="flw70">%statusname</label>' +
        '<label class="flw130"> %connected</label><label class="flw220">%sessionid</label><label class="idRight">%id</label></li>',
    editConfig: {
        dialogName:'edit_dbpool', divName:'editDbpool',
        autoOpen: true, minHeight: 250, minWidth: 400,
        resizable: false, modal:true
    },

    initialize: function(){
        var _this = Geof.cntrl.dbpool;
        Gicon.click("btnRefreshDbpool", _this.populateList);
        Gicon.click("btnEditDbpool", _this.editSelected);
        Gicon.click("btnDiscardDbpool", _this.delete);
        _this.populateList();
    },

    populateList:function() {
        var _this = Geof.cntrl.dbpool;
        Gicon.setEnabled("btnEditDbpool", false );
        Gicon.setEnabled("btnDiscardDbpool", false );
        var $items = $('#olDbpools');
        $items.empty();
        var cb = function(req) {
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var count = $( ".ui-selected", this).length;
                    Gicon.setEnabled("btnEditDbpool", count == 1 );
                    Gicon.setEnabled("btnDiscardDbpool", count > 0 );
                }
            });
            Gicon.setEnabled("btnRefreshDbpool", true );
        };
        Geof.model.read(null,_this, cb);
    },

    edit: function (req) {
        var _this = Geof.cntrl.dbpool;
        var data = (req || false) ? req.data : {};
        Geof.cntrl.showEditDialog(_this, data, false);
        $("#editDbpool").tooltip();
        Gicon.click("edit_dbpool_discard", _this.delete);
    },

    editSelected: function () {
        var _this = Geof.cntrl.dbpool;
        var list = $("#olDbpools .ui-selected");
        if (list.length != 1) {
            Geof.log("fix the editSelected error where the selected count <> 1");
        }
        var $item = $(list[0]);
        Geof.model.readSelected($item, _this, _this.edit);
    },

    save:function () {},
    delete: function(){
        var _this = Geof.cntrl.dbpool;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected db connection?");
    }
};

Geof.cntrl.encryption = {
    id:'id',
    entity:'rsaencryption',
    filename:'encryption',
    prefix:'enc_',
    fields:['id' ,'modulus','exponent','pexponent','p','q','dp','dq','qinv','createdate'],
    defaults:[],
    exclude:[],
    list_columns: "id,createdate",
    edit_columns: "id ,modulus,exponent,pexponent,p,q,dp,dq,qinv,createdate",
    order_by:"createdate desc",
    title:'RSA Encryption Keys',
    list_tmpl:'<li class="ui-widget-content" data-id="%id"><label class="flw60">%id</label><label class="flw160">%createdate</label></li>',
    editConfig: {
        dialogName:'edit_encryption', divName:'editEncryption',
        autoOpen: true, minHeight: 550, minWidth: 600,
        resizable: false, modal:true
    },

    initialize: function(){
        var _this = Geof.cntrl.encryption;
        Gicon.click("btnNewEncryption", _this.save);
        Gicon.click("btnRefreshEncryption", _this.populateList);
        Gicon.click("btnViewEncryption", _this.editSelected);
        Gicon.click("btnDiscardEncryption", _this.delete);
        _this.populateList();
    },

    populateList:function() {
        var _this = Geof.cntrl.encryption;
        Gicon.setEnabled("btnViewEncryption", false );
        Gicon.setEnabled("btnDiscardEncryption", false );
        var $items = $('#olRsaencryptions');
        $items.empty();
        var cb = function(req) {
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var count = $( ".ui-selected", this).length;
                    Gicon.setEnabled("btnViewEncryption", count == 1 );
                    Gicon.setEnabled("btnDiscardEncryption", count > 0 );
                }
            });
            Gicon.setEnabled("btnRefreshEncryption", true );
        };
        Geof.model.read(null,_this, cb);
    },

    edit: function (req) {
        var _this = Geof.cntrl.encryption;
        var data = (req || false) ? req.data : {};
        Geof.cntrl.showEditDialog(_this, data, false);
        $("#editEncryption").tooltip();
        Gicon.click("edit_encryption_discard", _this.delete);
    },

    editSelected: function () {
        var _this = Geof.cntrl.encryption;
        var list = $("#olEncryption .ui-selected");
        if (list.length != 1) {
            Geof.log("fix the editSelected error where the selected count <> 1");
        }
        var $item = $(list[0]);
        Geof.model.readSelected($item, _this, _this.edit);
    },

    save:function () {
        var _this = Geof.cntrl.encryption;
        Gicon.setActive('btnNewEncryption',true);

        var cb = function (req,textStatus,jqXHR) {
            _this.populateList();
            Gicon.setEnabled('btnNewEncryption',true);
        };
        Geof.model.create({}, _this, cb);

    },

    delete: function(){
        var _this = Geof.cntrl.encryption;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected encryption keys?");
    }
};

Geof.cntrl.entity = {
    id:'id',
    entity:'entity',
    prefix:'ent_',
    fields: ["name",'id','loadtime','status','entitytype','indatabase'],
    defaults: ['',-1,0,0,0,1],
    exclude:null,
    list_columns: "id,name,indatabase",
    order_by:"name",
    title:'Entity',
    link: [
        {
            name:'entityfield',
            type:'child',
            entity:'entityfield',
            icon:'img/symbol/Database.png',
            buttons:[
                {action:'save',callback:function(info,name) {Geof.cntrl.entity.saveEntityField(info,name)}}
            ],
            readCallback:function(data) { Geof.cntrl.entityfield.setLiCheckboxes(data); }
        }
    ],
    editConfig: {
        dialogName:'entity_list', divName:'entity_list',
        autoOpen: true, minHeight: 280, minWidth: 540,
        resizable: false, modal:true
    },
    icon:'keys',

    stati: ["missing",'okay','changed','dropped','not_table','error'],
    list_tmpl: '<li class="ui-widget-content" data-id="%id" data-name="%name">%name'
        +'<label class="idRight w14">%id</label><label class="idRight status60 font10">%status</label></li>',

    initialize: function() {
        var _this = Geof.cntrl.entity;
        _this.populateList();
        Gicon.click("btnFixEntity", _this.fix);
        Gicon.click("btnRefreshEntity", _this.populateList);
        $(" .subDlgWrapper").tooltip();
    },

    populateList:function() {
        var _this = Geof.cntrl.entity;
        Gicon.setActive('btnRefreshEntity',true);
        var $items = $('#olEntities');
        $items.empty();
        var cb = function(req) {
            Templater.createEntityList (req.data, $items, _this.list_tmpl, _this.stati);
            $items.selectable({
                stop: function() {
                    var selected = $('#olEntities .ui-selected');
                    var selected_ids = Geof.model.selectedIds(selected, _this);
                    Geof.cntrl.parentSelected(selected_ids);
                }
            });
            Gicon.setEnabled('btnRefreshEntity',true);
        };
        Geof.model.read(null,_this, cb);
    },

    addNew: function () {
        var _this = Geof.cntrl.entity;
        Geof.cntrl.showEditDialog(_this, {}, false);
    },

    editSelected: function () { },

    fix:function() {
        Gicon.setActive('btnFixEntity',true);
        var _this = Geof.cntrl.entity;
        var trans = new Transaction(Geof.session);
        var jReq = GRequest.build(_this.entity, 'update','fix',{});
        trans.addRequest(jReq, function() {
            Gicon.setEnabled('btnFixEntity',true);
            _this.populateList();
        });
        trans.send();
    },

    saveEntityField:function(info, name) {
        Gicon.setActive(name,true);
        var _this = Geof.cntrl.entity;

        var trans = new Transaction(Geof.session);
        $('#sub_ol_entityfield li').each(function() {
            var _this = $(this);
            var id =  _this.data('id');
            var fld = _this.data('fld');

            var fields = {
                isspatial:false,
                isdefault:false,
                istemporal:false
            };

            for (var indx in fields) {
                fields[indx] = $("#" + id + "_" + fld + "_" + indx).is(':checked');
            }
            var data = {
                'fields':fields,
                'where':{
                    entityid:id,
                    fieldname:fld
                }
            }
            jReq = GRequest.build('entityfield','update',null,data);
            trans.addRequest(jReq, null);
        });
        trans.setLastCallback(function() {
            Gicon.setEnabled(name,true);
            Geof.cntrl.parentSelected(info.id);
        });
        trans.send();
    },

    save: function () { },

    delete: function (){}
};

Geof.cntrl.entityfield = {
    id:'id',
    entity:'entityfield',
    prefix:'ef_',
    fields: ["fieldname",'entityid','isdefault','ispkey','datatype','isrequired','isauto','isspatial','istemporal'],
    defaults: ['',-1,false,false,0,false,false,false,false],
    exclude:null,
    list_columns: "entityid.fieldname,isdefault,ispkey,datatype,isrequired,isauto,isspatial,istemporal",
    order_by:"fieldname",
    title:'<label class="hdrLabelLeft2">Field</label>'
        + '<label class="hdrLblRSm">Temporal</label><label class="hdrLblRSm">Spatial&nbsp;</label>'
        + '<label class="hdrLblRSm">Auto&nbsp;&nbsp;</label><label class="hdrLblRSm">Required&nbsp;&nbsp;</label>'
        + '<label class="hdrLblRSm">Datatype</label><label class="hdrLblRSm">Pkey&nbsp;&nbsp;</label>'
        + '<label class="hdrLblRSm">Default&nbsp;&nbsp;</label>',

    editConfig: {},
    icon:'Database',
    list_tmpl: '<li class="ui-widget-content" data-id="%entityid" data-fld="%fieldname">%fieldname'
        + '<input type="checkbox" class="permCol" id="%entityid_%fieldname_istemporal">'
        + '<input type="checkbox" class="permCol" id="%entityid_%fieldname_isspatial">'
        + '<input type="checkbox" class="permCol" id="%entityid_%fieldname_isauto" disabled="disabled" >'
        + '<input type="checkbox" class="permCol" id="%entityid_%fieldname_isrequired" disabled="disabled" >'
        + '<input class="permCol2" readonly id="%entityid_%fieldname_datatype"/>'
        + '<input type="checkbox" class="permCol" id="%entityid_%fieldname_ispkey" disabled="disabled" >'
        + '<input type="checkbox" class="permCol" id="%entityid_%fieldname_isdefault"></li>',

    initialize: function() {
        Geof.cntrl.entityfield.populateList();
        $(" .subDlgWrapper").tooltip();
    },

    populateList:function() {
        var _this = Geof.cntrl.entityfield;
        var $items = $('#olEntityfields');
        $items.empty();
        var cb = function(req) {
            $items.selectable();
        };
        Geof.model.read(null,_this, cb);
    },

    setLiCheckboxes:function(  data ) {
        var opts = "isdefault,ispkey,datatype,isrequired,isauto,isspatial,istemporal".split(',');
        for (var indx in data) {
            var row = data[indx];
            for (var i in opts) {
                var fld = opts[i];
                var selector = "#" + row.entityid + "_" + row.fieldname + "_" + fld;
                var cntl = $(selector);
                if (fld == 'datatype') {
                    cntl.val(Datatype.getType(row[fld]));
                } else {
                    cntl.prop('checked', row[fld]);
                }
            }
        }
    },

    addNew: function () {},

    editSelected: function () { },

    save: function () { },

    delete: function (){}
};

Geof.cntrl.file = {
    id:'id',
    entity:'file',
    prefix:'note_',
    fields:['id','filename','fileext','filesize','originalname','status','checksumval','createdate','notes','storagelocid','viewid','filetype','geomtype','duration'],
    defaults:[-1,'','',0,'',-1,0,null,'',-1,-1,-1,-1,-1],
    exclude:[],
    list_columns: "id,originalname,status",
    full_list_columns: 'id,filename,fileext,filesize,originalname,status,checksumval,createdate,notes,storagelocid,viewid,filetype,geomtype,duration',
    order_by:"id",
    title:'Files',
    list_tmpl:'<li class="ui-widget-content" data-id="%id"><label class="floatLeft font9">%originalname</label></li>',

    editConfig: {
        dialogName:'edit_file', divName:'editFile',
        autoOpen: true, minHeight: 350, minWidth: 360,
        resizable: false, modal:false
    },

    getFile:function(fileid,callback) {
        var cb = function(req) {
            var data = req.data;
            if (callback || false) {
                if (data !== undefined && data.length == 1) {
                    callback(data[0]);
                } else {
                    callback(null);
                }
            }
        }
        Geof.model.readOptions({
            entity:'file',
            where:{id:fileid},
            columns:Geof.cntrl.file.full_list_columns,
            callback:cb
        });
    }
}

Geof.cntrl.logger = {
    id:'id',
    entity:'logger',
    filename:'logger',
    prefix:'lgr_',
    fields:['level','filepath','content'],
    defaults:[],
    exclude:[],
    list_columns: "",
    order_by:"",
    title:'Logger',
    list_tmpl:'',
    link: {},
    editConfig: { },

    initialize: function() {
        var _this = Geof.cntrl.logger;
        _this.populateList();
        Gicon.click("btnRefreshLogger", _this.populateList);
        Gicon.click("btnEditLogger", _this.save);
        Gicon.click("btnDiscardLogger", _this.delete);
        $(" .subDlgWrapper").tooltip();
        $("#lgr_level").on("change", function() {
            Gicon.setEnabled("btnEditLogger",true);
        })
        $("#lgr_file").on("change", function() {
            Gicon.setEnabled("btnDiscardLogger", ($(this).val() == 'geof.log'));
            _this.populateList();
        })
    },

    populateList:function() {
        Gicon.setActive("btnRefreshLogger", true );
        var _this = Geof.cntrl.logger;

        var filename = $('#lgr_file').val();
        var where = {'filename':filename};
        var cb = function(req) {
            var data = req.data;
            if ((data || false)&& (data.length == 1)) {
                data = data[0];
                var text = '';
                for (var indx in data.content) {
                    text = text + base64.decode( data.content[indx] ) + "\n";
                }
                $('#lgr_content').val(text);
                $('#lgr_level').val(data.level);
            }

            Gicon.setEnabled("btnRefreshLogger", true );
        };
        Geof.model.readAs(where,"settings",_this, cb);
    },

    save: function () {
        var _this = Geof.cntrl.logger;
        Gicon.setActive('btnEditLogger',true);

        var cb = function (data,textStatus,jqXHR) {
            _this.populateList();
            Gicon.setEnabled('btnEditLogger',true);
        };
        var data = {'level':$("#lgr_level").val(),'fields':{'id':-1}};
        Geof.model.update(data, _this, cb);
    },

    delete: function (){
        var cb = function() {
            Gicon.setActive('btnDiscardLogger',true);
            var obj = {"entity":"logger","action":"delete", "data":{}};
            TransMgr.sendNow(GRequest.fromJson(obj), function() {
                Gicon.setEnabled('btnDiscardLogger',true);
                Geof.cntrl.logger.populateList();
            });

        }
        PanelMgr.showConfirm("Truncate Server Logs", "Truncate Logs?", cb);
    }
};

Geof.cntrl.permission = {
    id:'id',
    entity:'permission',
    prefix:'perm_',
    fields: ['id','name'],
    defaults: ['',''],
    exclude:null,
    list_columns:"id,name",
    order_by:"name",
    title:'<label class="hdrLabelLeft">Permission</label>'
        + '<label class="hdrLblRSm">Execute&nbsp;</label><label class="hdrLblRSm">Delete&nbsp;</label>'
        + '<label class="hdrLblRSm">Update&nbsp;&nbsp;&nbsp;</label><label class="hdrLblRSm">Read&nbsp;&nbsp;&nbsp;</label>'
        + '<label class="hdrLblRSm">Create&nbsp;&nbsp;&nbsp;</label>',
    editConfig: {},
    icon:'keys',
    list_tmpl: '<li class="ui-widget-content" data-id="%entityid">%name'
        + '<input type="checkbox" class="permCol" id="%entityid_executable"><input type="checkbox" class="permCol" id="%entityid_deleteable">'
        + '<input type="checkbox" class="permCol" id="%entityid_updateable"><input type="checkbox" class="permCol" id="%entityid_readable">'
        + '<input type="checkbox" class="permCol" id="%entityid_createable"></li>',

    setLiCheckboxes:function(  data ) {
        var opts = ["createable","readable","updateable","deleteable","executable"];
        for (var indx in data) {
            var id = data[indx].entityid;
            for (var i in opts) {
                $("#" + id + "_" + opts[i]).prop('checked', data[indx][opts[i]]);
            }
        }
    },

    addLiCheckboxes:function(  entityids ) {
        var opts = ["createable","readable","updateable","deleteable","executable"];
        for (var indx in entityids) {
            var id = entityids[indx];
            for (var i in opts) {
                $("#" + id + "_" + opts[i]).prop('checked', data[indx][opts[i]]);
            }
        }
    }

};

Geof.cntrl.notification = {
    id:'id',
    entity:'notification',
    prefix:'note_',
    fields:['id','message','level','usrid','notificationid','createdate','type'],
    defaults:[-1,'',0, -1,null,null],
    exclude:[],
    list_columns: "id,message,level,type",
    types:{'System':0,'Annotation':1,'Local':2},
    levels:{'Low':0,'Medium':1,'High':2,'Alert':3},
    order_by:"id",
    title:'Notifications',
    list_tmpl:'<li class="ui-widget-content" data-id="%id"><label class="floatLeft font9">%message</label><label class="idRight font9">%id</label></li>',

    full_list_tmpl : '<li class="ui-widget-content" id="linotify%id" data-id="%id">'
        + '<label class="idLeft">%createdate</label><label class="idLeft ml14">From: %lastname, %firstname</label>'
        + '<label class="idRightF9">[%id]</label>'
        + '<label class="idRightF9 mr14">%lvl</label>%typeblock<label class="idRightF9 mr4">Type:</label><br>'
        + '<input type="checkbox" data-id="%id" class="cbNotifyPop"/>'
        + '<textarea class="notifyPopup notifyNormal" id="taNofity%id" disabled>%message</textarea>'
        +'</li>',

    type_blocks:[
        '<label class="idRightF9 mr14" data-id="%id">System Generated</label>',
        '<label class="nota_anno idRightF9 mr14" data-id="%id">Annotation</label>',
        '<label class="idRightF9 mr14" data-id="%id">Local</label>'
    ],

    editConfig: {
        dialogName:'edit_notification', divName:'editNotification',
        autoOpen: true, minHeight: 350, minWidth: 360,
        resizable: false, modal:false
    },

    getTypeName:function(value) {
        var types = Geof.cntrl.notification.types;
        for (var indx in types) {
            if (types[indx] == value) {
                return indx;
            }
        }
    }
};

Geof.cntrl.profile = {
    id:'id',
    entity:'usr',
    prefix:'profile_',
    fields:['id','loginname','password','firstname','lastname','initials','email','notes','lastattempt'],
    defaults:['-1','','','','','','','',''],
    exclude:['lastattempt'],
    list_columns: "id,firstname,lastname",
    order_by:"lastname, firstname",
    title:'User',
    link: [],
    filename:'profile',
    filelist:['edit'],
    editConfig: {
        dialogName:'user_edit', divName:'editUsr',
        autoOpen: true, minHeight: 400, minWidth:480,
        resizable: false, modal:true
    },

    initialize: function() { },

    edit: function () {
        var _this = Geof.cntrl.profile;
        var shared_cb = function() {
            Gicon.click("btnRequestRSA", _this.get_rsa_data);
            Gicon.click("btnDeleteRSA", _this.clear_local_rsa);
            Gicon.click("btnRefreshRSA", _this.get_local_rsa);
            Gicon.click("btnImportRsa", _this.import_rsa);
            $("#import_rsa_key").blur(function() {
                var enabled = false;
                try {
                    JSON.parse($(this).val());
                    enabled = true;
                } catch (e) {             }
                Gicon.setEnabled('btnImportRsa',enabled);
            });

            Gcontrol.checkbox('auto_rsa_renewal', _this.save_rsa_renewal, 'auto_rsa_renewal');
            _this.get_local_rsa();
        }

        if (Geof.logged_in) {
            var cb = function(req) {
                Geof.cntrl.showEditDialog(_this, req.data, false, function() {
                    Gicon.click("btnProfileSave", _this.save);
                    Gicon.click("edit_profile_updatepwd", _this.change_pwd);
                    Gicon.click("btnEmailRSA", _this.email_rsa);
                    shared_cb();
                    $( "#profile_tabs" ).accordion();
                    Geof.session.usr.email =  req.data[0].email;
                });
            };
            Geof.model.readRecord(Geof.session.usr.usrid, _this, cb);
        } else {
            Geof.cntrl.showEditDialog(_this, {}, false, function() {
                Gicon.setEnabled("btnProfileSave", false);
                Gicon.setEnabled("edit_profile_updatepwd", false);
                Gicon.setEnabled("btnRequestRSA",false);
                Gicon.click("btnEmailRSA", _this.show_import_dialog);
                shared_cb();
                $( "#profile_tabs" ).accordion({active:1,disabled:true});
            });
        }
    },

    save: function () {
        var _this = Geof.cntrl.profile;
        Gicon.setActive('btnProfileSave',true);
        var fields = Geof.cntrl.getDialogData(_this);
        var update = (fields.id || false) ? fields.id >= 0 : false;
        var cb = function () {
            Gicon.setEnabled('btnProfileSave',true);
        };
        var data = {};
        Geof.session.usr.email = fields.email;
        data.fields = fields;
        fields.clearcode = Geof.session.getClearcode();
        data.where = {id:Geof.session.usr.usrid};
        if (update) {
            Geof.model.update(data, _this, cb);
        }
    },

    change_pwd: function (){
        var _this = Geof.cntrl.profile;
        $("#profile_error").text('');
        var pwd1 = $("#profile_password").val();
        var pwd2 = $("#profile_password2").val();
        if (pwd1.length < 8) {
            PanelMgr.showError("Password Error","Password length is 8+ characters");
            return;
        }
        if (pwd1 != pwd2) {
            PanelMgr.showError("Password Error","Confirm password does not match");
            return;
        }
        Gicon.setActive('edit_profile_updatepwd',true);
        var cb = function(req) {
            Gicon.setEnabled('edit_profile_updatepwd',true);
            var error = req[0].error;
            if (error || false) {
                $("#profile_error").text(error);
            }
        }
        var clearcode = Geof.session.getClearcode();
        var data = {
            fields:{password:pwd1,'clearcode':clearcode},
            where: {id:Geof.session.usr.usrid}
        }
        var obj = {"entity":"usr","action":"update","actionas":"password","data":data};
        TransMgr.sendNow( GRequest.fromJson(obj), cb);
    },

    get_local_rsa: function() {
        Gicon.setActive('btnRefreshRSA',true);
        $("#rsa_id").text("");
        $("#rsa_modulus").val("");
        $("#rsa_exponent").val("");
        var rsa = Geof.session.getRsaKeyLocal();
        if (rsa != null) {
            $("#rsa_id").text(rsa.id);
            $("#rsa_modulus").val(rsa.modulus);
            $("#rsa_exponent").val(rsa.exponent);
        }
        Gicon.setEnabled('btnRefreshRSA',true);
    },

    email_rsa: function() {
        var _this = Geof.cntrl.profile;
        Gicon.setActive('btnEmailRSA',true);
        var cb = function() {
            Gicon.setEnabled('btnEmailRSA',true);
        }
        var obj = {"entity":"rsaencryption","action":"read","actionas":"rsaemail","data":{}};
        TransMgr.sendNow( GRequest.fromJson(obj), cb);
    },

    get_rsa_data: function() {
        var _this = Geof.cntrl.profile;
        Gicon.setActive('btnRequestRSA',true);
        var cb = function(req) {
            Gicon.setEnabled('btnRequestRSA',true);
            req = req[0];
            if ('data' in req) {
                var rsa_key = req.data[0];
                Geof.session.saveRsaKeyLocal(rsa_key);
                _this.get_local_rsa();
            }
        }
        var obj = {"entity":"rsaencryption","action":"read","actionas":"rsaencryption","data":{}};
        TransMgr.sendNow(GRequest.fromJson(obj), cb);

        var auto_renew = Geof.session.getRsaRenewal();
        $("#auto_rsa_renewal").prop('checked', auto_renew);
    },

    save_rsa_renewal:function() {
        var auto_renew = $("#auto_rsa_renewal").is(':checked')
        Geof.session.saveRsaRenewal(auto_renew);
    },

    clear_local_rsa: function() {
        var cb = function(do_delete) {
            Geof.session.clearLocalRsaKey();
            $("#rsa_id").text("");
            $("#rsa_modulus").val("");
            $("#rsa_exponent").val("");
            Geof.session.clearLocalRsaKey();
            Geof.cntrl.profile.get_local_rsa();
        }
        PanelMgr.showDeleteConfirm(
            "Delete RSA Key",
            "Confirm deletion of RSA Key", cb);
    },

    import_rsa:function() {
        Gicon.setActive('btnImportRsa',true);
        value = JSON.parse($("#import_rsa_key").val());
        Geof.session.saveRsaKeyLocal(value);
        Geof.cntrl.profile.get_local_rsa();
        Gicon.setEnabled('btnImportRsa',true);
    },

    show_import_dialog:function() {
        var $dlg = null
        var checkfields = function() {
            var enabled = $("#rsaemail_email").val().length > 0
            Gicon.setEnabled("btnEmailRSA2",enabled);
        }

        var closeCB = function(){ };

        var rtnCB = function(result) {
            Gicon.setEnabled('btnEmailRSA2', true);
            try {
                var result = JSON.parse(result);
                if ('state' in result) {
                    $dlg.dialog("close");
                } else if ('error' in result) {
                    alert(result.error);
                }
            } catch (e) {
                alert(e);
            }
        }

        var sendFunc = function() {
            Gicon.setActive('btnEmailRSA2', true);
            var url =  window.location.origin + "/geof/geof?clearcode=";
            url += Geof.session.getClearcode($("#rsaemail_email").val());
            $.get(url)
                .success(rtnCB)
                .error(function(jqXHR, textStatus, errorThrown) {
                    Gicon.setEnabled('btnEmailRSA2', true);
                    alert(errorThrown)
                });
        }

        var completeCB = function(dlg){
            $("#rsaemail_email").blur(checkfields);
            Gicon.click("btnEmailRSA2", sendFunc)
            $dlg = dlg
            $dlg.show();
        };
        var config = {
            file:'rsa_email', divName:'rsa_email',
            autoOpen: true, minHeight: 200, minWidth:400,
            resizable: false, modal:true
        }
        PanelMgr.loadDialogX(config,completeCB,closeCB);
    }

};

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
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var selected = $('#olProjects .ui-selected');
                    var selected_ids = Geof.model.selectedIds(selected, _this);
                    var enabled = selected_ids.length > 0;
                    Gicon.setEnabled("btnEditProject", enabled );
                    Gicon.setEnabled("btnDiscardProject", enabled );
                    Geof.cntrl.parentSelected(selected_ids);
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

Geof.cntrl.session = {
    id:'sessionid',
    entity:'session',
    prefix:'session_',
    fields:['sessionid','lastaccessed','created','userid','active','login','la_seconds'],
    defaults:[-1,'','','','','',''],
    exclude:[],
    list_columns: "sessionid,login,created,active,lastaccessed",
    order_by:"lastaccessed",
    title:'Active Sessions',
    list_tmpl:'<li class="ui-widget-content" data-sessionid="%sessionid"><label class="flw80">%login</label><label class="flw100">%created</label>' +
        '<label class="flw60"> %active</label><label class="flw95">%lastaccessed</label><label class="idRight">%sessionid</label></li>',
    editConfig: {
        dialogName:'edit_session', divName:'editSession',
        autoOpen: true, minHeight: 250, minWidth: 500,
        resizable: false, modal:true
    },

    initialize: function(){
        var _this = Geof.cntrl.session;
        Gicon.click("btnRefreshSession", _this.populateList);
        Gicon.click("btnEditSession", _this.editSelected);
        Gicon.click("btnDiscardSession", _this.delete);
        _this.populateList();
    },

    populateList:function() {
        var _this = Geof.cntrl.session;
        Gicon.setEnabled("btnEditSession", false );
        Gicon.setEnabled("btnDiscardSession", false );
        var $items = $('#olSessions');
        $items.empty();
        var cb = function(req) {
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var count = $( ".ui-selected", this).length;
                    Gicon.setEnabled("btnEditSession", count == 1 );
                    Gicon.setEnabled("btnDiscardSession", count > 0 );
                }
            });
            Gicon.setEnabled("btnRefreshSession", true );
        };
        Geof.model.read(null,_this, cb);
    },

    edit: function (req) {
        var _this = Geof.cntrl.session;
        var data = (req || false) ? req.data : {};
        Geof.cntrl.showEditDialog(_this, data, false);
        $("#editSession").tooltip();
        Gicon.click("edit_session_discard", _this.delete);
    },

    editSelected: function () {
        var _this = Geof.cntrl.session;
        var list = $("#olSessions .ui-selected");
        var $item = $(list[0]);
        Geof.model.readSelected($item, _this, _this.edit);
    },

    save:function () {},
    delete: function(){
        var _this = Geof.cntrl.session;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected sessions(s)?");
    }
};

Geof.cntrl.storage = {
    id:'id',
    entity:'storageloc',
    filename:'storage',
    prefix:'strg_',
    fields:['id','quota','filecount','canstream','description','systemdir','name','active','statusid','usedspace'],
    defaults:['-1',0,0,false,'','','','',false,0,0],
    exclude:["filecount",""],
    list_columns: "id,name,usedspace,quota",
    order_by:"name,filecount",
    title:'Storage',
    list_tmpl:'<li class="ui-widget-content" data-id="%id"><label class="flw100">%name</label>'
        + '<label class="w80tr">%usedspace</label><label class="w80tr">%quota</label><label class="w120tr">%id</label></li>',
    link: {},
    storagelocs:{},
    editConfig: {
        dialogName:'storage_edit', divName:'editStorage',
        autoOpen: true, minHeight: 380, minWidth: 460,
        resizable: false, modal:true
    },

    initialize: function() {
        var _this = Geof.cntrl.storage;
        _this.populateList();
        Gicon.click("btnRefreshStorage", _this.populateList);
        Gicon.click("btnNewStorage", _this.addNew);
        Gicon.click("btnEditStorage", _this.editSelected);
        Gicon.click("btnDiscardStorage", _this.delete);
        $(" .subDlgWrapper").tooltip();
    },

    populateList:function() {
        Gicon.setActive("btnRefreshStorage", true );
        Gicon.setEnabled("btnEditStorage", false );
        Gicon.setEnabled("btnDiscardStorage", false );
        var _this = Geof.cntrl.storage;
        var $items = $('#olStorage');
        $items.empty();
        var cb = function(req) {
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var enabled = $( ".ui-selected", this).length > 0;
                    Gicon.setEnabled("btnEditStorage", enabled );
                    Gicon.setEnabled("btnDiscardStorage", enabled );
                }
            });
            Gicon.setEnabled("btnRefreshStorage", true );
        };
        Geof.model.read(null,_this, cb);
    },

    addNew: function () {
        Geof.cntrl.storage.showEditDialog();
    },

    editSelected: function () {
        var _this = Geof.cntrl.storage;
        var list = $("#olStorage .ui-selected");
        if (list.length != 1) {
            Geof.log("fix the editSelected error where the selected count <> 1");
        }
        var $item = $(list[0]);
        Geof.model.readSelected($item, _this, Geof.cntrl.storage.showEditDialog);
    },

    showEditDialog:function(req) {
        var isNew = ! (req || false);
        var data = isNew ? {}: req.data ;
        var _this = Geof.cntrl.storage;
        Geof.cntrl.showEditDialog(_this, data, isNew);
        $("#strg_systemdir").prop('disabled', !isNew);
        Gicon.click("edit_strg_save",_this.save);
        Gicon.click("validateSystemDir",_this.validateSystemDir);
        $(" .ui-icon").tooltip();
    },

    save: function () {
        var _this = Geof.cntrl.storage;
        Gicon.setActive('edit_strg_save',true);
        var fields = Geof.cntrl.getDialogData(_this);
        var update = (fields.id || false) ? fields.id >= 0 : false;

        var cb = function () {
            _this.populateList();
            Gicon.setEnabled('edit_strg_save',true);
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
        var _this = Geof.cntrl.storage;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected storage locations?");
    },

    validateSystemDir:function () {
        var cb = function(req) {
            var data = req[0];
            var error = '';
            if ('error' in data) {
                error = data.error;
            }
            var $systemdir = $("#strg_systemdir");
            if (error.length > 0) {
                $systemdir.switchClass("font12Green","font12Red");
                $systemdir.switchClass("font12","font12Red");
                PanelMgr.showErrorDialog("StorageLoc","Validate System Directory",  error );
            } else {
                $systemdir.switchClass("font12Red","font12Green");
                $systemdir.switchClass("font12","font12Green");
            }
            Gicon.setEnabled('validateSystemDir',true);
        };
        Gicon.setActive('validateSystemDir',true);
        var senddata = {
            "validate":{
                "directory":true,
                "name":false
            },
            "fields":{
                "systemdir": $("#strg_systemdir").val()
            }
        };
        var obj = {"entity":"storageloc","action":"read","actionas":"validate","data":senddata};
        TransMgr.sendNow(GRequest.fromJson(obj), cb);
    },

    storageName: function(storageid, cb) {
        if (cb || false) {
            var rtn = function(sloc) {
                cb((sloc !== undefined) ? sloc.name : "Unknown");
            }
            Geof.cntrl.storage.getStoragelocs(rtn, storageid);
        } else {
            var sloc = Geof.cntrl.storage.storagelocs[storageid]
            return (sloc || false) ? sloc.name : "Unknown";
        }
    },

    storageDir: function(storageid, cb) {
        var rtn = function(sloc) {
            var dir = null;
            if (sloc !== undefined) {
                dir = sloc.systemdir.substring(sloc.systemdir.lastIndexOf("/") + 1);
            }
            cb(dir);
        }
        if (cb || false) {
            Geof.cntrl.storage.getStoragelocs(rtn, storageid);
        }else {
            var sloc = Geof.cntrl.storage.storagelocs[storageid];
            var dir = null;
            if (sloc !== undefined) {
                dir = sloc.systemdir.substring(sloc.systemdir.lastIndexOf("/") + 1);
            }
            return dir;
        }
    },

    getStoragelocs:function(cb, storageid) {
        if (storageid in Geof.cntrl.storage.storagelocs) {
            cb(Geof.cntrl.storage.storagelocs[storageid]);
        } else {
            var slocs = {};

            var gReq = GRequest.fromJson({"entity":"storageloc","action":"read","data":{}});
            TransMgr.sendNow( gReq, function(req) {
                var data = req[0].data;
                for ( var indx in data) {
                    var storage = data[indx]
                    slocs[storage.id] = data[indx];
                }
                Geof.cntrl.storage.storagelocs = slocs;
                cb(slocs[storageid]);
            });
        }
    }

};

Geof.cntrl.usr = {
    id:'id',
    entity:'usr',
    prefix:'usr_',
    fields:['id','loginname','password','firstname','lastname','initials','email','notes','statusid','attempts','lastattempt'],
    defaults:['-1','','','','','','','',0,0,''],
    exclude:['lastattempt'],
    list_columns: "id,firstname,lastname",
    order_by:"lastname, firstname",
    title:'User',
    list_tmpl:'<li class="ui-widget-content" data-id="%id">%lastname, %firstname<label class="idRight">%id</label></li>',
    link: [
        {
            name:'ugroup',
            type:'link',
            entity:'usr_ugroup',
            icon:'img/symbol/Groups-64.png',
            buttons:[{action:'save',callback:Geof.cntrl.saveSublink}]
        },
        {
            name:'authcode',
            type:'child',
            icon:'img/symbol/Certificate.png',
            buttons:[{action:'delete', callback:Geof.cntrl.deleteChild}]
        }
    ],
    editConfig: {
        dialogName:'user_edit', divName:'editUsr',
        autoOpen: true, minHeight: 340, minWidth:500,
        resizable: false, modal:true
    },

    initialize: function() {
        var _this = Geof.cntrl.usr;
        _this.populateList();
        Gicon.click("btnRefreshUsr", _this.populateList);
        Gicon.click("btnNewUsr", _this.addNew);
        Gicon.click("btnEditUsr", _this.editSelected);
        Gicon.click("btnDiscardUsr", _this.delete);
        Gicon.click("btnSendRsa", _this.confirmSendRsa);

        $(" .subDlgWrapper").tooltip();
    },

    populateList:function() {
        Gicon.setActive("btnRefreshUsr", true );
        Gicon.setEnabled("btnEditUsr", false );
        Gicon.setEnabled("btnDiscardUsr", false );
        Gicon.setEnabled("btnSendRsa", false );
        var _this = Geof.cntrl.usr;
        var $items = $('#olUsrs');
        $items.empty();
        var cb = function(req) {
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var selected = $('#olUsrs .ui-selected');
                    var selected_ids = Geof.model.selectedIds(selected, _this);
                    var enabled = selected_ids.length > 0;
                    Gicon.setEnabled("btnEditUsr", enabled );
                    Gicon.setEnabled("btnDiscardUsr", enabled );
                    Gicon.setEnabled("btnSendRsa", enabled );
                    Geof.cntrl.parentSelected(selected_ids);
                }
            });
            Gicon.setEnabled("btnRefreshUsr", true );
        };
        Geof.model.read(null,_this, cb);
    },

    addNew: function () {
        var _this = Geof.cntrl.usr;
        Geof.cntrl.showEditDialog(_this, {}, true);
        Gicon.click("edit_usr_save",_this.save);
    },

    editSelected: function () {
        var _this = Geof.cntrl.usr;
        var list = $("#olUsrs .ui-selected");
        var $item = $(list[0]);
        var cb = function(req) {
            Geof.cntrl.showEditDialog(_this, req.data, false);
            Gicon.click("edit_usr_save", Geof.cntrl.usr.save);
            Gicon.click("edit_usr_updatepwd", Geof.cntrl.usr.change_pwd);
        };
        Geof.model.readSelected($item, _this, cb);
    },

    save: function () {
        var _this = Geof.cntrl.usr;
        Gicon.setActive('edit_usr_save',true);
        var fields = Geof.cntrl.getDialogData(_this);
        var update = (fields.id || false) ? fields.id >= 0 : false;

        var cb = function () {
            _this.populateList();
            Gicon.setEnabled('edit_usr_save',true);
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
        var _this = Geof.cntrl.usr;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected users?");
    },

    confirmSendRsa:function() {
        PanelMgr.showConfirm(
            "Confirm Rsa Email",
            "Email Rsa key to selected users?",
            function(send) {
                if (send) {
                    Geof.cntrl.usr.sendRsa();
                }
            }
        );
    },

    sendRsa:function() {
        var _this = Geof.cntrl.usr;
        Gicon.setActive("btnSendRsa", true);
        var cb = function(req) {
            Gicon.setEnabled("btnSendRsa", true);
        }
        var ids = _this.selected_ids;
        var trans = new Transaction(Geof.session);
        var order = 0;
        for (var indx in ids) {
            var data = {where:{usrid:ids[indx]}};
            var jReq = GRequest.build('rsaencryption','execute','rsaemail',data);
            jReq.order = order++;
            trans.addRequest(jReq, null);
        }
        trans.setLastCallback(cb);
        trans.send()
    },

    change_pwd: function (){
        var _this = Geof.cntrl.usr;
        $("#usr_error").text('');
        var pwd1 = $("#usr_password").val();
        var pwd2 = $("#usr_password2").val();
        if (pwd1.length < 8) {
            PanelMgr.showError("Password Error","Password length is 8+ characters");
            return;
        }
        if (pwd1 != pwd2) {
            PanelMgr.showError("Password Error","Confirm password does not match");
            return;
        }
        Gicon.setActive('edit_usr_updatepwd',true);
        var cb = function(req) {
            Gicon.setEnabled('edit_usr_updatepwd',true);
            if (req.error || false) {
                $("#usr_error").text(req.error);
            }
        }
        var data = {
            fields:{password:pwd1},
            where: {id:$("#usr_id").text()}
        }
        var obj = {"entity":"usr","action":"update","actionas":"password","data":data};
        TransMgr.sendNow( GRequest.fromJson(obj), cb);
    }

};

Geof.cntrl.ugroup = {
    id:'id',
    entity:'ugroup',
    prefix:'grp_',
    fields: ['id','name','description'],
    defaults: ['-1','',''],
    exclude:[],
    list_columns: "id,name,description",
    order_by:"name",
    title:'User Groups',
    link: [
        {
            name:'usr',
            type:'link',
            entity:'usr_ugroup',
            icon:'img/symbol/usr-64.png',
            buttons:[{action:'save',callback:Geof.cntrl.saveSublink}]
        },
        {
            name:'permission',
            type:'link',
            entity:'ugroup_entity',
            icon:'img/symbol/keys.png',
            buttons:[
                {action:'save',callback:function(info,name) {Geof.cntrl.ugroup.savePermission(info,name)}},
                {action:'delete',callback:function(info,name) {Geof.cntrl.ugroup.deletePermission(info,name)}},
                {action:'add',callback:function(info,name) {Geof.cntrl.ugroup.showEntityDialog(info,name)}}
            ],
            read:{
                "entity":"ugroup_entity",
                "data":{
                    "columns":"ugroupid,entityid,createable,readable,updateable,deleteable,executable",
                    "join":[{"entity":"entity","join":"parent","columns":"name"}]
                }
            },
            readCallback:function(data) {
                Geof.cntrl.permission.setLiCheckboxes(data);
            }
        }
    ],

    editConfig: {
        dialogName:'edit_group', divName:'editGroup',
        autoOpen: true, minHeight: 280, minWidth: 380,
        resizable: false, modal:true
    },
    icon:'usergroup',
    list_tmpl: '<li class="ui-widget-content" data-id="%id">%name<label class="idRight">%id</label></li>',

    initialize: function() {
        var _this = Geof.cntrl.ugroup;
        _this.populateList();
        Gicon.click("btnRefreshGrp", _this.populateList);
        Gicon.click("btnNewGrp", _this.addNew);
        Gicon.click("btnEditGrp", _this.editSelected);
        Gicon.click("btnDiscardGrp", _this.delete);
        $(" .subDlgWrapper").tooltip();
    },

    populateList:function() {
        Gicon.setActive("btnRefreshGrp", true );
        Gicon.setEnabled("btnEditGrp", false );
        Gicon.setEnabled("btnDiscardGrp", false );
        var _this = Geof.cntrl.ugroup;
        var $items = $('#olUgroups');
        $items.empty();
        var cb = function(req) {
            Templater.createSOLTmpl (req.data, $items,  _this.list_tmpl);
            $items.selectable({
                stop: function() {
                    var selected = $('#olUgroups .ui-selected');
                    var selected_ids = Geof.model.selectedIds(selected, _this);
                    var enabled = selected_ids.length > 0;
                    Gicon.setEnabled("btnEditGrp", enabled );
                    Gicon.setEnabled("btnDiscardGrp", enabled );
                    Geof.cntrl.parentSelected(selected_ids);
                }
            });
            Gicon.setEnabled("btnRefreshGrp", true );
        }
        Geof.model.read(null,_this, cb);
    },

    addNew: function () {
        var _this = Geof.cntrl.ugroup;
        Geof.cntrl.showEditDialog(_this, {}, false);
        Gicon.click("edit_grp_save",_this.save);
    },

    editSelected: function () {
        var _this = Geof.cntrl.ugroup;
        var list = $("#olUgroups .ui-selected");
        var $item = $(list[0]);
        var cb = function(req) {
            Geof.cntrl.showEditDialog(_this, req.data, false);
            Gicon.click("edit_grp_save", Geof.cntrl.ugroup.save);
        };
        Geof.model.readSelected($item, _this, cb);
    },

    save: function () {
        var _this = Geof.cntrl.ugroup;
        Gicon.setActive('edit_group_save',true);
        var fields = Geof.cntrl.getDialogData(_this);
        var update = (fields.id || false) ? fields.id >= 0 : false;

        var cb = function (data,textStatus,jqXHR) {
            _this.populateList();
            Gicon.setEnabled('edit_group_save',true);
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
        var _this = Geof.cntrl.ugroup;
        Geof.model.deleteList2( _this, _this.populateList, "Delete selected user groups?");
    },

    showEntityDialog:function() {
        var _this = Geof.cntrl.ugroup;
        var complete_callback = function(dlgEntity) {
            _this.dlgEntity = dlgEntity;
            _this.dlgEntity.dialog('open');

            var $items = $('#olEntities');
            $items.empty();
            var cb = function(req) {
                Templater.createSOLTmpl (req.data, $items,  Geof.cntrl.entity.list_tmpl);
                $items.selectable({});
            }
            Geof.model.read(null,Geof.cntrl.entity, cb);
        }
        var close_callback = function() {
            var tmpl = Geof.cntrl.permission.list_tmpl;
            $('#olEntities .ui-selected').each(function() {
                var $this = $(this);
                var id = $this.data('id');
                if ( $('#sub_ol_permission li[data-id="' + id + '"]').length == 0) {
                    var li = tmpl.replace(new RegExp('%entityid',"g"), id);
                    li = li.replace('%name',$this.data('name'));
                    $('#sub_ol_permission').append(li);
                }
            });
        }
        var options = {
            control:Geof.cntrl.entity,
            config:{
                title:'Set User Group Permissions',
                dialogName:'entity_list', divName:'entity_list',
                autoOpen: true, minHeight: 280, width: 342,
                resizable: false, modal:true
            },
            complete_callback:complete_callback,
            close_callback:close_callback
        }
        PanelMgr.loadDialogOpts(options);
    },

    savePermission:function(info, name) {
        Gicon.setActive(name,true);
        var _this = Geof.cntrl.ugroup;
        var ugroupid = info.id;
        var trans = new Transaction(Geof.session);
        var order = 0;
        var jReq = GRequest.build('ugroup_entity','delete',null,{where:{'ugroupid':ugroupid}});
        jReq.order = order++;
        trans.addRequest(jReq, null);
        $('#sub_ol_permission li').each(function() {
            var fields = {'ugroupid':ugroupid,entityid:-1,createable:false,readable:false,updateable:false,deleteable:false,executable:false};
            var _this = $(this);
            fields.entityid = _this.data('id');
            var cbs = _this.children();
            cbs.each(function() {
                var val = this.id.split('_');
                fields[val[1]] = $(this).is(':checked');
            });
            jReq = GRequest.build('ugroup_entity','create',null,{'fields':fields});
            jReq.order = order++;
            trans.addRequest(jReq, null);
        });
        trans.setLastCallback(function() {
            Gicon.setEnabled(name,true);
            Geof.cntrl.parentSelected(info.id);
        });
        trans.send();
    },

    deletePermission:function(info,name) {
        Gicon.setActive(name,true);

        var trans = new Transaction(Geof.session);
        $('#sub_ol_permission .ui-selected').each(function() {
            var entityid = $(this).data('id');
            var jReq = GRequest.build('ugroup_entity','delete',null,{where:{'ugroupid':info.id,'entityid':entityid}});
            trans.addRequest(jReq, null);
        });
        trans.setLastCallback(function() {
            Gicon.setEnabled(name,true);
            Geof.cntrl.parentSelected(info.id);
        });
        trans.send();

    }
};

