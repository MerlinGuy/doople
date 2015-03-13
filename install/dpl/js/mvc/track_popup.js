/**
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 5/15/13
 * Time: 10:03 AM
 */

Geof = Geof || {};
Geof.track_popup = null;

function TrackPopup(parent) {
    this.parent = parent;
    this.track = null;
    this.stage = null;
    this.itemLayer = null;
    this.kWidth = 0;
    this.kHeight = 0;
    this.fullData = null;
    this.startPos = 0;
    this.endPos = 0;
    this.GMap = null;
    this.dialog = null
}

TrackPopup.prototype.reset = function() {
    this.track = null;
    this.stage = null;
    this.itemLayer = null;
    this.kWidth = 0;
    this.kHeight = 0;
    this.GMap = null;
    this.dialog = null;
    this.fullData = null;
    this.startPos = 0;
    this.endPos = 0;
};

TrackPopup.prototype.createTrackDialog = function (modal, callback, closeCB) {
    var _this = this;
    _this.reset();
    var _modal = (modal == null) ? true : modal;

    var cb = function(html) {
        $('#' + _this.parent).append(html);
        var $dlg = $('#trackDialog');
        _this.dialog = $dlg;

        $dlg.dialog({ autoOpen: false,
            close: function() {
                if (closeCB || false) {
                    closeCB();
                }
                _this.dialog.remove();
                _this.dialog = null;
            },
            resizeStop: function () {
                google.maps.event.trigger(_this.GMap.map, 'resize');
            },
            modal:_modal, resizable:false, draggable:true, width:'600', height:'700', position:'top'
        });

        $dlg.dialog( "open" );

        _this.initialize_gmap(_this);
        _this.initializeGrid();
        var $container = $('#canvasTrackProfile')[0];
        _this.kWidth = $container.clientWidth - 2;
        _this.kHeight = $container.clientHeight - 4;

        var $slider1 = $("#sliderTrackProfile1");
        var $slider2 = $("#sliderTrackProfile2");

        $slider1.slider({
            range:true,
            stop:function(event, ui) {
                var start = ui.values[0];
                var end = ui.values[1];

                $slider2.slider( "option", "min", start );
                $slider2.slider( "option", "max", end );
                $slider2.slider( "option", "values", ui.values );
                _this.setDataDisplay(start, end, _this);
            }
        });

        $slider2 .slider({
            range:true,
            stop:function(event, ui) {
                var start = ui.values[0];
                var end = ui.values[1];
                _this.setDataDisplay(start, end, _this);
            }
        });

       _this.stage = new Kinetic.Stage({
            container: 'canvasTrackProfile',
            width: _this.kWidth,
            height: _this.kHeight
        });

        _this.itemLayer = new Kinetic.Layer();
        _this.stage.add(_this.itemLayer);

        $('#tvRefreshDataView').click( function() {
            _this.setHistogram(_this);
        });

        $('#btnTVConfineTrack').click( function() {
            _this.toogleConfineToMap(_this);
        });

        Gicon.click('btnTVShowMap',function() {
            _this.toogleMapList(_this);
        });
        Gicon.click('btnTVShowList',function() {
            _this.toogleMapList(_this);
        });

        $('.buttonBar').tooltip();
        if (callback || false) {
            callback(_this);
        }
    };
    $.get("view/track_dialog.html", cb);
};

TrackPopup.prototype.setDataDisplay= function(start,end, _this) {
    _this = _this || this;
    if (Gicon.isActive('btnTVShowMap')) {
        _this.drawHistogram(start,end);
    } else {
        _this.setGridData(start, end);
    }
};

TrackPopup.prototype.toogleMapList = function(_this) {
    if (Gicon.isActive('btnTVShowMap')) {
        Gicon.setEnabled('btnTVShowMap',true);
        Gicon.setActive('btnTVShowList',true);
        $('#tvMapHolder').hide();
        $('#tvListHolder').show();
    } else {
        Gicon.setActive('btnTVShowMap',true);
        Gicon.setEnabled('btnTVShowList',true);
        $('#tvListHolder').hide();
        $('#tvMapHolder').show();
    }
    _this.setDataDisplay(_this.startPos,_this.endPos,_this);
};

TrackPopup.prototype.initializeGrid = function() {

    var colModel = [
        {'name':"time",'label':"Date/Time",'sortable':false,'width':272, align:"left"},
        {'name':"latitude",'label':"Latitude",'sortable':false,'width':86, align:"right"},
        {'name':"longitude",'label':"Longitude",'sortable':false,'width':90, align:"right"},
        {'name':"rate",'label':"Rate",'sortable':false,'width':44, align:"right"}
    ];

    var grid = $("#tvTrackData");

    grid.jqGrid({
        caption: "Track Data",
        datatype:'local',
        colModel:colModel,
        sortable:false,
        gridview:true,
        altRows:true,
        ignoreCase:true,
        height:370,
        onSelectRow:null,
        multiselect:true,
        rowNum:16,
        viewrecords: true,
        pager:'#tvTrackDataPager'
    });

    var width = $('#tvListHolder').width() - 4;
    grid.jqGrid('setGridWidth',width);
    grid.find('.jqgfirstrow').height(0);
};

TrackPopup.prototype.toogleConfineToMap = function(_this) {
    if (Gicon.isActive('btnTVConfineTrack')) {
        Gicon.setEnabled('btnTVConfineTrack',true);
        _this.track = _this.originalTrack;
        _this.setTrack(_this.track);
    } else {
        Gicon.setActive('btnTVConfineTrack',true);
        var bounds = _this.GMap.getGoogleBounds();
        var track = _this.originalTrack || _this.track;
        var subtrack = GpsUtil.getBoundedTrack(track,bounds);
        if (! (_this.originalTrack || false)) {
            _this.originalTrack = _this.track;
        }
        _this.setTrack(subtrack);
    }
};

TrackPopup.prototype.setGridData = function(start, end) {
    Geof.log('setGridData start: ' + start + ', end: ' + end);
    this.startPos = start;
    this.endPos = end;

    var items = this.fullData.items;
    var points = this.track.points;
    var times = this.track.times;

    var dPoints = [];
    for (var indx=start;indx<end;indx++) {
        var row = {
            'time':times[indx],
            'latitude':points[indx].latitude,
            'longitude':points[indx].longitude,
            'rate':items[indx]
        };
        dPoints.push(row);
    }
    var $trackdata = $("#tvTrackData");
    $trackdata.jqGrid('clearGridData',true).trigger('reloadGrid');
    $trackdata.setGridParam({ data: dPoints, rowNum: 16 }).trigger('reloadGrid');
};

TrackPopup.prototype.drawHistogram = function(start, end) {
    this.startPos = start;
    this.endPos = end;

    var items = this.fullData.items;
    var wPcnt = this.kWidth / (end - start);
    var yHeight = this.kHeight - 18;
    var hPcnt = yHeight / this.fullData.max;
    var yAdjust = this.kHeight;

    var dPoints = [];
    var x = 0;
    for (var indx=start;indx<end;indx++) {
        dPoints.push([x * wPcnt, yAdjust - (items[indx] * hPcnt)]);
        x++;
    }

    this.itemLayer.removeChildren();

    var itemLine = new Kinetic.Line({
        points: dPoints,
        stroke: 'blue',
        strokeWidth: 2,
        lineJoin:'round'
    });

    this.itemLayer.add(itemLine);

    var text = new Kinetic.Text({
        x: 30,
        y: 0,
        text: 'Points: ' + dPoints.length,
        fontSize: 12,
        fontFamily: 'sans-serif',
        fill: 'red',
        width: 120,
        padding: 0,
        align: 'left'
    });
    this.itemLayer.add(text);

    var gStart = this.track.times[start];
    var gEnd = this.track.times[end];

    text = new Kinetic.Text({
        x: 230,
        y: 0,
        text: gStart.toLocaleString() + " -- " + gEnd.toLocaleString(),
        fontSize: 12,
        fontFamily: 'sans-serif',
        fill: 'red',
        width: 280,
        padding: 0,
        align: 'right'
    });
    this.itemLayer.add(text);

    this.itemLayer.draw();

    this.GMap.clearMarkers();
    var gPoints = GpsUtil.getGooglePoints(this.track, start, end);
    this.GMap.addTrack(gPoints, {});
    this.GMap.zoomToMarkers();
};

TrackPopup.prototype.setTrack = function(track) {
    this.track = track;
    var len = track.points.length-1;
    Geof.log("point.length " + (len + 1));
    var $slider1 = $("#sliderTrackProfile1");
    $slider1.slider( "option", "min", 0 );
    $slider1.slider( "option", "max", len );
    $slider1.slider( "option", "values", [ 0, len ] );
    var $slider2 = $("#sliderTrackProfile2");
    $slider2.slider( "option", "min", 0 );
    $slider2.slider( "option", "max", len );
    $slider2.slider( "option", "values", [ 0, len ] );
    this.startPos = 0;
    this.endPos = len;
    this.setHistogram(this);
};

TrackPopup.prototype.setHistogram = function(_this) {
    _this = _this || this;
    _this.fullData = null;

    var limit = parseFloat($("#tvDataLimit").val());
    var datatype = $("#tvDataType").val();
    if (datatype == 0) {
        _this.fullData = GpsUtil.trackSpeeds(_this.track, limit);
    } else {
        _this.fullData = GpsUtil.trackTimes(_this.track, limit);
    }
    Geof.log("item count: " + _this.fullData.items.length);
    _this.setDataDisplay(_this.startPos, _this.endPos,_this);
};


TrackPopup.prototype.initialize_gmap = function(_this) {
    var gmap_center = null;
    var gmap_zoom = null;
    var gmap_typeId = google.maps.MapTypeId.ROADMAP;

    var center_zoom = localStorage.getItem('map_center_zoom');
    if (center_zoom || false) {
        var val = center_zoom.split(',');
        gmap_center = new google.maps.LatLng(parseFloat(val[0]),parseFloat(val[1]));
        gmap_zoom = parseInt(val[2]);
    }

    var $map = $("#tvMapHolder")[0];
    _this.GMap = new GoogleMap($map, gmap_center, gmap_zoom, gmap_typeId);

    _this.GMap.clearMarkers();
};
