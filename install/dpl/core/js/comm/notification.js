
var Geof = Geof || {};

Geof.notifier = {
    interval : 60,
    index : 0,
    callbacks : [],
    id : null,
    isRunning : false,
    local_events : [],
    last_local : -1,
    dialog:null,

    cfg : {
        file:'notification_dialog',
        directory:'core/panel/',
        divName:'popupNotifications',
        autoOpen: true, minHeight: 500, minWidth:500,
        resizable: false, modal:true
    },

    setControl : function(button, refresh_interval) {
        var _this = Geof.notifier;
        if (refresh_interval || false) {
            _this.interval = refresh_interval;
        }

        var cfg = Geof.notifier.cfg;

        cfg.close_callback = function() {
            $("#" + cfg.divName).hide();
        };

        cfg.complete_callback = function() {
            _this.dialog =  $("#" + cfg.divName);
            Gicon.click(button,_this.showNotifications, Gicon.DISABLED);
            Gicon.click('btnNotifyDeselect',_this.funcDeselectAll);
            Gicon.click('btnNotifySelect', _this.funcSelectAll);
            Gicon.click('btnNotifyMarkRead', _this.funcMarkread);
            Gicon.click('btnNotifyRefresh', _this.funcRefresh);
            Gicon.click('btnNotifyClose', cfg.close_callback);
            _this.start();

            var opts = {
                id:'btnNotifyRun',
                offIcon:'icon_geof_play_enable',
                onIcon:'icon_geof_pause_enable',
                onState:Gicon.ENABLE,
                onCallout:Geof.notifier.start,
                offCallout:Geof.notifier.stop
            };

            Gicon.switchDepend(opts, true);

            _this.dialog.tooltip();
        };

        PanelMgr.loadDialogY( cfg );
    },

    start : function() {
        var _this = Geof.notifier;
        _this.stop();
        _this.id = setInterval(_this.read,_this.interval * 1000);
        _this.read();
        _this.isRunning = true;
    },

    stop : function() {
        var _this = Geof.notifier;
        if (_this.id != null) {
            clearInterval(_this.id);
            _this.id = null;
        }
        _this.isRunning = false;
    },

    show:function() {
        Geof.notifier.dialog.show();
    },

    hide:function() {
        Geof.notifier.dialog.hide();
    },

    addLocal : function( msg, level, type) {
        var _this = Geof.notifier;
        var notif = {id:_this.last_local--};
        notif.createdate = new Date();
        notif.message = msg;
        notif.level = level;
        notif.type = type;
        if (Geof.session.usr || false) {
            notif.firstname = Geof.session.usr.firstname;
            notif.lastname = Geof.session.usr.lastname;
        } else {
            notif.firstname = 'current';
            notif.lastname = 'user';
        }
        _this.local_events.push(notif);
        _this.setIconStatus();
    },

    readShow : function() {
        Geof.notifier.read(true);
    },

    read : function(showDetails) {
        if (! Geof.logged_in || TransMgr.paused) {
            return;
        }
        var _this = Geof.notifier;
        var curState = Gicon.getState('iconNotifications');
        Gicon.setActive('iconNotifications',true);
        var cb = function(req) {
            Gicon.setValueIcon(curState, 'iconNotifications', true);
            _this.queryData = (req.data === undefined) ? [] : req.data;
            _this.setIconStatus();
            if (showDetails || false) {
                _this.showNotifications();
            }
        };
        var options = {
            entity:'usr_notification',
            where:{usrid:Geof.session.usr.usrid,readdate:'IS NULL'},
            join:[
                {
                    entity:"notification",
                    join:"parent",
                    columns:Geof.cntrl.notification.fields.join()
                },
                {
                    entity:"usr",
                    join:"parent",
                    columns:"firstname,lastname"
                }
            ],
            callback:cb
        };
        Geof.model.readOptions(options);
    },

    setIconStatus : function() {
        var _this = Geof.notifier;

        var data = _this.sort(_this.queryData,_this.local_events);
        var group = _this.group(data);
        $('#lblNotificationCount').text(group.count);

        var state = Gicon.DISABLED;
        if (group.levels[3] > 0) {
            state = Gicon.ALERT;
        } else if (group.count > 0) {
            state = Gicon.ENABLE;
        }
        Gicon.setValueIcon(state, 'iconNotifications', true);
    },

    showNotifications : function( ) {
        var _this = Geof.notifier;
        var li;
        var $ol = $('#olNotifyItems');
        $ol.empty();

        var data = _this.sort(_this.queryData,_this.local_events);
        Gicon.setEnabled('btnNotifySelect',data.length > 0);

        var row;
        var cntrl = Geof.cntrl.notification;
        for (var indx=0;indx < data.length;indx++) {
            row = data[indx];
            li = cntrl.full_list_tmpl.replace(new RegExp('%typeblock',"g"), cntrl.type_blocks[row.type]);
            li = Templater.mergeTemplate(row, li);
            if (row.level == Geof.cntrl.notification.levels.Alert) {
                li = li.replace(new RegExp('notifyNormal',"g"),'notifyAlert');
            }
            li = li.replace(new RegExp('%lvl',"g"), JsUtil.getName(cntrl.levels,row.level));
            $ol.prepend(li);
        }

        $(".nota_anno").click(function() {
            _this.showAnnotation($(this).data('id'))
        });

        var $icon = $("#iconNotifications");
        var offset = $icon.position();
        var ddtop = offset.top + $icon.height() - 6;
        $(".cbNotifyPop").change(_this.handleSelection);

        var $popup = $("#popupNotifications" );
        $popup.css({top: ddtop, left: offset.left -568, position:'absolute'});
        $popup.draggable({handle:'#notificationButtonBar'});
        var $notifBar = $('#notificationButtonBar');
        $notifBar.mousedown(function() {
            $(this).css('cursor', 'move');
        });
        $notifBar.mouseup(function() {
            $(this).css('cursor', 'default');
        });
        _this.handleSelection();
        $popup.show();

        Gicon.setEnabled('btnNotifyRefresh', true);
    },

    showAnnotation : function(id) {
        //get Annotation for notification
        var annotationid = null;

        var cbAnno = function(file) {
            if (file == null) {
                return;
            }
            var options = {
                'file':file,
                'annotation':{
                    isvisible:true,
                    selected_ids:[annotationid]
                }
            };
//            $("#popupNotifications").hide();
            Filetypes.showPopup2(options);
        };

        var cb = function(req) {
            var data = req.data[0];
            annotationid = data['annotationid'];
            Geof.cntrl.annotation.getFile(annotationid, cbAnno);
        };

        var options = {
            entity:'notification_annotation',
            where:{notificationid:id},
            columns:'annotationid',
            callback:cb
        };
        Geof.model.readOptions(options);

    },

    sort : function(data1, data2) {
        if (data1 === undefined) {
            data1 = [];
        }
        if (data2 === undefined) {
            data2 = [];
        }
        var merged = data1.concat(data2);
        merged.sort(Geof.notifier.sortFunc);
        return merged;
    },

    group : function(data) {
        var group = {'count':0,'levels':[0,0,0,0]};
        if (data || false) {
            group.count = data.length;
            for (var indx=0;indx < data.length;indx++) {
                var lvl = data[indx].level;
                group.levels[lvl] = group.levels[lvl] + 1;
            }
        }
        return group;
    },

    fireCallbacks : function(req) {
        for (var indx=0;indx < this.callbacks.length;indx++) {
            this.callbacks[indx](req);
        }
    },

    addCallback : function(callback) {
        this.callbacks.push(callback);
    },

    removeCallback : function(callback) {
        var len = this.callbacks.length;
        for (var indx=0; indx < len; indx++) {
            if (this.callbacks[indx] == callback) {
                this.callbacks.splice(indx,1);
            }
        }
    },

    handleSelection : function() {
        var hasSelected = $('.cbNotifyPop').filter(":checked").length > 0;
        Gicon.setEnabled('btnNotifyDeselect',hasSelected);
        Gicon.setEnabled('btnNotifyMarkRead',hasSelected);
    },

    funcDeselectAll : function() {
        $('.cbNotifyPop').prop('checked', false);
        Geof.notifier.handleSelection();
    },

    funcSelectAll : function() {
        $('.cbNotifyPop').prop('checked', true);
        Geof.notifier.handleSelection();
    },

    funcMarkread : function() {
        var _this = Geof.notifier;
        var trans = new Transaction(Geof.session);
        var data;
        var hasSendable = false;

        $('.cbNotifyPop').filter(":checked").each(function() {
            var id = $(this).data('id');
            if ( id > 0) {
                data = {'where':{'notificationid':id}};
                trans.addRequest(GRequest.build('notification','update','read',data), null);
                hasSendable = true;
            } else {
                var e = _this.local_events;
                for (var indx=0;indx < e.length;indx++) {
                    if (e[indx].id == id) {
                        _this.local_events.splice(indx,1);
                    }
                }
            }
        });
        if (hasSendable) {
            trans.setLastCallback(Geof.notifier.readShow);
            trans.send();
        } else {
            Geof.notifier.readShow();
        }
    },

    funcRefresh : function() {
        var _this = Geof.notifier;
        Gicon.setActive('btnNotifyRefresh', true);
        _this.read(true);
    },

    sortFunc : function(a,b) {
        if (JsUtil.isString(a.createdate)) {
            a.createdate = DateUtil.parseDate(a.createdate);
        }
        if (JsUtil.isString(b.createdate)) {
            b.createdate = DateUtil.parseDate(b.createdate);
        }
        return a.createdate.getTime() - b.createdate.getTime();
    }
};
