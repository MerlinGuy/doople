var Geof = Geof || {};
Geof.recorder = {

    item:[],
    local_events:[],
    replyCallback:null,
    prefix:'rcdr',
    dialog:null,

    cfg:{
        file:'recorder_dialog',
        directory:'core/panel/',
        divName:'recorder_dialog',
        dragbar:'recordButtonBar',
        button:null
    },

    liTemplate:'<li class="ui-widget-content" id="rcdr%id" data-id="%id">'
        + '<label class="idLeft">%title</label><label class="idRightF7">%id</label><br>'
        + '<label class="idLeft">%stime</label><label id="rcdr%idrtime" class="idRightF7">%rtime</label>'
        + '</li>',


    setupButtonEvents:function () {
        var _this = Geof.recorder;
        _this.dialog = $('#' + Geof.recorder.cfg.divName);

        var cbDiscard = function () {
            var $items = $("#olRecorderItems");
            var $selected = $items.find(".ui-selected");
            $selected.each(function () {
                var li = $(this);
                _this.removeRecord(li.data('id'));
                li.remove();
            });
            _this.setDiscardState($items.find("li").length > 0);
            Gicon.setEnabled('recorderBtnDiscard', false);
        };

        Gicon.click("recorderBtnDiscard", cbDiscard);
        Gicon.click("recorderBtnDiscardAll", _this.clear);

        Gcontrol.checkbox('showNotifys', _this.sendAllItems, "show_notifys");

        Gicon.click("closeRecorderDialog", function () {
            _this.dialog.hide()
        });

        var cbStop = function () {
            var $selected = $(".ui-selected", this);
            var selectCount = $selected.length;
            var enabled = selectCount > 0;
            Gicon.setEnabled('recorderBtnDiscard', enabled);
            if (selectCount == 1) {
                var key = $($selected[0]).data('id');
                var record = _this.getRecord(key);
                if (record || false) {
                    var sent = JSON.stringify(record.sent);
                    $("#divSendJson").html(JFormat.format(sent));
                    var reply = JSON.stringify(record.reply);
                    var fmt = JFormat.format(reply);
                    $('#replytest').html(fmt);
                }
            }
        };
        $('#olRecorderItems').selectable({stop:cbStop});

        if (_this.cfg.button) {
            Gicon.click(_this.cfg.button, _this.show, true);
        }
    },

    setControl:function (button) {
        var _this = Geof.recorder;
        _this.cfg.button = button;
        _this.cfg.complete_callback = _this.setupButtonEvents;
        PanelMgr.loadDialogY(_this.cfg);
    },

    show:function () {
        var dialog = Geof.recorder.dialog;
        dialog.show();
        Geof.center_in_body(dialog);
    },

    setDiscardState:function (enabled) {
        Gicon.setEnabled('recorderBtnDiscardAll', enabled);
    },

    addSent:function (sent) {
        //        Geof.log("Recorder.addSent...");
        var _this = Geof.recorder;

        if (typeof sent == 'string') {
            sent = JSON.parse(sent)
        }
        var key = sent.tid;
        var stime = DateUtil.currentTime(true);
        var rtime = '00:00:00';
        var record = {'id':key, 'sent':sent, 'reply':null, 'stime':stime, rtime:rtime, 'data':sent, 'title':'unknown'};
        var req1 = sent.requests[0];
        if (req1 || false) {
            if (req1.actionas && req1.actionas.length > 0) {
                record.title = req1.entity + '.' + req1.action + ':' + req1.actionas;
            } else {
                record.title = req1.entity + '.' + req1.action;
            }
        }
        _this.item[key] = record;
        _this.addItemToList(record);
        _this.setDiscardState($("#olRecorderItems").find("li").length > 0);
    },

    addItemToList:function (record) {
        var _this = Geof.recorder;
        if (!record.title.match("usr_notification.read") || $("#showNotifys").is(":checked")) {
            var li = Templater.mergeTemplate(record, _this.liTemplate);
            $('#olRecorderItems').prepend(li);
        }
    },

    sendAllItems:function () {
        var _this = Geof.recorder;
        $('#olRecorderItems').empty();
        for (var indx=0;indx < _this.item.length;indx++) {
            _this.addItemToList(_this.item[indx]);
        }
        _this.setDiscardState($("#olRecorderItems").find("li").length > 0);
    },

    addReply:function (reply) {
        var _this = Geof.recorder;
        if (typeof reply == 'string') {
            reply = JSON.parse(reply);
        }

        _this.decodeRequest(reply);

        var record = _this.item[reply.tid];
        if (record || false) {
            record.reply = reply;
            record.rtime = DateUtil.currentTime(true);
            if (_this.replyCallback != null) {
                _this.replyCallback(record);
            }
        }
    },

//    replyCallback:function (record) {
//        var _this = Geof.recorder;
//        var id = record.id;
//        var key = '#' + _this.prefix + id + 'rtime';
//        var lblRtime = $(key);
//        if (lblRtime || false) {
//            lblRtime.html(DateUtil.currentTime(true));
//        }
//    },

    getRecord:function (key) {
        var _this = Geof.recorder;
        if (key in _this.item) {
            return _this.item[key];
        } else {
            return null;
        }
    },

    removeRecord:function (key) {
        if (key || false) {
            var list = Geof.recorder.item;
            key = key.toString();
            if (key in list) {
                list.splice(key, 1);
            }
        }
    },

    size:function () {
        return Geof.recorder.item.length;
    },

    clear:function () {
        Geof.recorder.item = [];
        $("#olRecorderItems").empty();
        Geof.recorder.setDiscardState(false);
        Gicon.setEnabled('recorderBtnDiscard', false);
    },

    decodeRequest:function (data) {
        var req;
        var requests = data.requests;
        var rtn = undefined;
        for (var dIndex=0;dIndex < requests.length;dIndex++) {
            req = requests[dIndex];
            if (req.encode) {
                var obj = req.data;
                if (typeof obj == "string") {
                    rtn = base64.decode(obj);
                } else if (obj instanceof Array) {
                    for (var indx = 0; indx < obj.length; indx++) {
                        obj[indx] = JFormat.decodeJsonObject( obj[indx]);
                    }
                    rtn = obj;

                } else { // not sure try and decode
                    rtn = base64.decode(obj);
                }
                break;
            }
        }
        return rtn;
    }
};