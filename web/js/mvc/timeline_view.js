
Geof.cntrl.timeline = {
    name:"timeline",
    Timeline_urlPrefix : 'tp/timeline/src/webapp/api/',
    Timeline_parameters : 'bundle=false',
    SimileAjax_urlPrefix : 'tp/timeline/src/ajax/api/',
    
    resizeTimerID : null,
    timeline : null,
    eventSource : null,
    timelineBands : 'timeline_bands',
    timelineBandsSaved : null,
    bandInfos : null,
    orig_showBubble:null,
    
    percents : [['100%'],['75%','25%'],['60%','25%','15%']],
    intervalPixels : [100,150,200],

    initialize:function() {
        var _this = Geof.cntrl.timeline;
        
        Gicon.click("btnTimelineMoveFirst",function() {
            _this.moveFirst();
        });

        Gicon.click("btnTimelineMoveLast",function() {
            _this.moveLast();
        });

        Gicon.click("btnTimelineSettings",_this.showTimelineSettings);

        Gicon.click("btnCloseTimelineSettings",function() {
            $('#timelineSettings').hide();
        });
    
        Gicon.click("btnSaveTimelineBands",_this.saveBandInfo);

        _this.eventSource = new Timeline.DefaultEventSource();
        var js_encoded = localStorage.getItem(_this.timelineBands);
        if (js_encoded != null) {
            var json = base64.decode(js_encoded);
            _this.timelineBandsSaved = JSON.parse(json);
        }
        _this.createBandInfos();
        _this.orig_showBubble = Timeline.OriginalEventPainter.prototype._showBubble;
        Timeline.OriginalEventPainter.prototype._showBubble = _this.eventClick;
        _this.loadList();
    },

    resize:function() {
        if (Geof.cntrl.timeline.timeline || false) {
            var tlWidth = $('#leftViewSlideout').width() -12;
            $("#buttonBar").width(tlWidth);
            Geof.cntrl.timeline.timeline.layout();
        }
    },

    moveFirst:function() {
        var _this = Geof.cntrl.timeline;
        if (_this.timeline || false ) {
            _this.timeline.getBand(0).setCenterVisibleDate(_this.eventSource.getEarliestDate());
        }
    },

    moveLast:function() {
        var _this = Geof.cntrl.timeline;
        if (_this.timeline || false ) {
            _this.timeline.getBand(0).setCenterVisibleDate(_this.eventSource.getLatestDate());
        }
    },

    eventClick:function(x,y,evt) {
        Filetypes.showPopup(Geof.cntrl.search.getResultsFile(evt.json.id));
    },

    createBandInfos: function() {
        var _this = Geof.cntrl.timeline;
        if (_this.timelineBandsSaved != null) {
            var bis = [];
            var key;
            var json;
            var bi;
            var js = _this.timelineBandsSaved;
            var keys = Object.keys(js);
            var pixels = 50;

            for (var indx in keys) {
                key = keys[indx];
                json = js[key];
                var pieces = key.split("_");
                if ((pieces[1] == 'interval') && (! json.disabled)){
                    pixels += 50;
                    bi = {
                        width: "",
                        trackHeight:    0.5,
                        trackGap:       0.2,
                        intervalUnit: parseInt(json.value),
                        intervalPixels: _this.intervalPixels[bis.length],
                        eventSource: null
                    }
                    bis.push(bi);
                }
            }
            var count = bis.length;
            var percents = _this.percents[count-1];

            for (var indx = 0; indx< count; indx++) {
                bi = bis[indx];
                bi.width = percents[indx];
                bi.showEventText = (indx == 0);
            }
            _this.bandInfos = bis;

        } else {
            _this.bandInfos = [
                {
                    width:          "60%",
                    intervalUnit:   Timeline.DateTime.HOUR,
                    intervalPixels: 100,
                    eventSource: null
                },
                {
                    showEventText:  false,
                    trackHeight:    0.5,
                    trackGap:       0.2,
                    width:          "25%",
                    intervalUnit:   Timeline.DateTime.DAY,
                    intervalPixels: 150,
                    eventSource: null
                },
                {
                    showEventText:  false,

                    trackHeight:    0.5,
                    trackGap:       0.2,
                    width:          "15%",
                    intervalUnit:   Timeline.DateTime.MONTH,
                    intervalPixels: 200,
                    eventSource: null
                }
            ];
        }
    },

    showTimelineSettings:function () {
        var _this = Geof.cntrl.timeline;
        /* "tl_interval_1":{"disabled":false,"value":"4"},"tl_enable_1":{"checked":true}  */
        if (_this.timelineBandsSaved != null) {
            var js = _this.timelineBandsSaved;
            var keys = Object.keys(js);
            for (var indx in keys) {
                var key = keys[indx];
                var $obj = $('#' + key);
                var json = js[key];

                if (key.indexOf('interval') > -1) {
                    if (json.disabled) {
                        $obj.attr('disabled', true);
                    }
                    $obj.val(json.value);
                } else if (key.indexOf('enable') > -1) {
                    $obj.attr('checked', json.checked);
                }
            }
        }
        var offset = $('#btnTimelineSettings').offset();
        var $settings = $('#timelineSettings');
        $settings.css({ "top": offset.top - 4, "left":  offset.left - 8});
        $('#timelineSettings').show();

    },

    saveBandInfo: function () {
        var _this = Geof.cntrl.timeline;

        var js = {};
        for (var indx=1; indx < 4; indx++) {
            var sid = 'tl_interval_' + indx;
            var eid = 'tl_enable_' + indx;
            js[sid] = {};
            js[eid] = {};
            var $select = $('#' + sid);
            js[sid].disabled = $select.attr('disabled')?true:false;
            js[sid].value = $select.val();
            var $checkbox = $('#' + eid);
            js[eid].checked = $checkbox.attr('checked')?true:false;
        }
        _this.timelineBandsSaved = js;
        var js_encoded = base64.encode(JSON.stringify(js));
        localStorage.setItem(_this.timelineBands, js_encoded);
        $('#timelineSettings').hide();

    },

    setTimelineBandEnabled: function (ele) {
        var _this = Geof.cntrl.timeline;
        var enabled = $(ele).attr('checked');
        var pieces = ele.id.split('_')
        var index = pieces[pieces.length-1];
        var $select = $('#tl_interval_' + index);

        if (enabled) {
            $select.removeAttr('disabled');
        } else {
            $select.attr('disabled', true)
        }
    },

    loadList:function (results, refreshAction){
        var _this = Geof.cntrl.timeline;

        if (results || false) {
            _this.data = results;
        } else {
            _this.data = Geof.cntrl.search.results;
        }
        if (refreshAction || false) {
            _this.refresh = refreshAction;
        } else {
            _this.refresh = Geof.cntrl.search.execute;
        }
        var data = _this.data;
        _this.eventSource.clear();
        if ((!(data||false)) || data.length == 0) {
            Gicon.setEnabled("btnTimelineMoveFirst", false);
            Gicon.setEnabled("btnTimelineMoveLast", false);
            return;
        }
        Gicon.setEnabled("btnTimelineMoveFirst", true);
        Gicon.setEnabled("btnTimelineMoveLast", true);

        for (var indx in data) {
            var rec = data[indx];
            var event = {
                'eventID': rec.id,
                'text': rec.originalname,
                'description': ""
            }
            var startdate = DateUtil.parseDate(rec.createdate);
            if (rec.geomtype == 1) {
                if (rec.startdate) {
                    startdate = DateUtil.parseDate(rec.startdate);
                }
                event['end'] = DateUtil.parseDate(rec.enddate);
                event['color'] = 'gray';
            } else {
                if (rec.utcdate || false) {
                    startdate = DateUtil.parseDate(rec.utcdate);
                } else  if (!( startdate || false)) {
                    startdate = DateUtil.parseDate(rec.originalname);
                }
                event['color'] = 'blue';
                event['image'] = Geof.session.url + '?size=2&id=' + rec.id + '&sessionid=' + Geof.session.sessionId;
            }
            event['start'] = startdate;
            event = new Timeline.DefaultEventSource.Event(event);
            event.json = rec;
            _this.eventSource.add(event);
        }

        var bandinfos = [];
        var count = _this.bandInfos.length;
        var bi;
        for (var indx = 0; indx < count; indx++) {
            bi = Timeline.createBandInfo(_this.bandInfos[indx])
            bi.eventSource = _this.eventSource;
            if (indx > 0) {
                bi.syncWith = indx - 1;
                bi.highlight = true;
            }
            bandinfos.push( bi );
        }

        var div = document.getElementById("timeline");
        _this.timeline = Timeline.create(div, bandinfos);
        _this.timeline.layout();
        _this.moveFirst();

    }

}


