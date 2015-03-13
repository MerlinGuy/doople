/**
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 6/26/13
 * Time: 8:24 AM
 */

var Geof = Geof || {};

Geof.timecntrl = {

    div:null,

    width:0,
    height:0,
    barWidth:0,
    barHeight:5,
    mainlayer:null,
    viewbar:null,
    filterbar:null,
    margin:6,

    timeField:null,

    viewdata:[],
    viewY:17,
    viewRadius:7,
    viewLayer:null,
    viewFill:'darkgray',
    viewStroke:'gray',
    selectedFill:'blue',
    viewStart:Number.MAX_VALUE,
    viewEnd:Number.MIN_VALUE,
    viewDuration:0,
    viewRatio:0.0,

    maindata:[],
    filterY:37,
    filterRadius:3,
    filterLayer:null,
    filterFill:'black',
    filterStroke:'black',

    start:Number.MAX_VALUE,
    end:Number.MIN_VALUE,
    duration:0,
    ratio:0.0,

    textLayer:null,
    
    thumbLayer:null,
    thumbRadius:12,
    startThumb:null,
    endThumb:null,
    
    clickCallback:null,
    pointerFunc: function() {document.body.style.cursor = 'pointer';},
    defaultFunc: function() {document.body.style.cursor = 'default';},


    setStage: function(div) {
        var _this = Geof.timecntrl;
        _this.div = $("#" + div)[0];
        _this.width = _this.div.clientWidth;
        _this.height = _this.div.clientHeight;
        _this.barWidth = Math.floor(_this.width * 0.98);
        _this.stage = new Kinetic.Stage({
            container: div,
            width: _this.width,
            height: _this.height
        });

        _this.mainLayer = new Kinetic.Layer();
        _this.stage.add(_this.mainLayer);

        _this.filterLayer = new Kinetic.Layer();
        _this.stage.add(_this.filterLayer);

        _this.viewLayer = new Kinetic.Layer();
        _this.stage.add(_this.viewLayer);

        _this.textLayer = new Kinetic.Layer();
        _this.stage.add(_this.textLayer);

        _this.thumbLayer = new Kinetic.Layer();
        _this.stage.add(_this.thumbLayer);
        Geof.event.addFileListener(_this.selectItem)
    },

    redraw:function() {
        var _this = Geof.timecntrl;
        _this.mainLayer.removeChildren();
        _this.viewLayer.removeChildren();

        _this.viewbar = new Kinetic.Rect({
            x: _this.margin,
            y: _this.viewY -2,
            width: _this.barWidth,
            height: _this.barHeight,
            fill: _this.viewFill,
            stroke: _this.viewStroke,
            strokeWidth: 1,
            cornerRadius:2
        });
        _this.mainLayer.add(_this.viewbar);

        _this.filterbar = new Kinetic.Rect({
            x: _this.margin,
            y: _this.filterY,
            width: _this.barWidth,
            height: 1,
            fill: _this.filterFill,
            stroke: _this.filterStroke,
            strokeWidth: 1
        });
        _this.mainLayer.add(_this.filterbar);

        _this.drawMaindata();
        _this.drawText();
        _this.drawThumbLayer();
        _this.stage.draw();
    },

    resize:function() {
        var _this = Geof.timecntrl;
        _this.width = _this.div.clientWidth;
        _this.height = _this.div.clientHeight;
        _this.barWidth = _this.width - (_this.margin * 2);
        _this.stage.setWidth(_this.width);
        if (_this.viewbar) {
            _this.viewbar.setWidth(_this.barWidth);
            _this.filterbar.setWidth(_this.barWidth);
        }
        _this.redraw();
    },

    setData:function(data, time_field, metadata) {
        var _this = Geof.timecntrl;
        var maindata = [];
        _this.timeField = time_field;
        _this.start = Number.MAX_VALUE;
        _this.end = Number.MIN_VALUE;
        var time;
        var record;

        Object.keys(data).forEach(function(key) {
            record = data[key];
            if (_this.timeField in record) {
                time = DateUtil.parseDate(record[_this.timeField],null,null);
                if (null !== time) {
                    time = time.getTime();
                    if (_this.start > time) {
                        _this.start = time;
                    }
                    if (_this.end < time) {
                        _this.end = time;
                    }
                    maindata[record.id] = {
                        file:record,
                        millis:time,
                        x:0,
                        point:null,
                        metadata:metadata
                    };
                }
            }
        });

        if ( _this.start == _this.end ){
            _this.start -= 30000;
            _this.end  += 30000;
        }

        _this.duration = (_this.end - _this.start) * 1.1;
        _this.start -= (_this.duration * 0.05);
        _this.end = _this.start + _this.duration;
        _this.maindata = maindata;
        _this.redraw();
    },

    drawMaindata:function() {
        var _this = Geof.timecntrl;
        var ratio = _this.barWidth / _this.duration;
        _this.ratio = ratio;
        var start = _this.start;

        var opt = {
            X:0,
            Y:_this.filterY,
            Radius:_this.filterRadius,
            Fill:_this.filterFill,
            Color:_this.filterStroke
        };

        _this.filterLayer.removeChildren();
        var record;
        Object.keys(_this.maindata).forEach(function(key) {
            record = _this.maindata[key];
            opt.X = ((record.millis - start) * ratio) + _this.margin;
            _this.filterLayer.add(_this.createDataPoint(opt));
        });
        _this.filterLayer.draw();
    },

    filterData:function() {
        var _this = Geof.timecntrl;
        if (_this.selected || false) {
            _this.selected.point.setFill(_this.viewFill);
            _this.selected.point.setZIndex(1);
            _this.selected = null;
        }

        var x = _this.startThumb.getX() - _this.margin;
        var start =  x / _this.barWidth * _this.duration + _this.start;

        x = _this.endThumb.getX() - _this.margin;
        var end = x / _this.barWidth * _this.duration + _this.start;

        _this.viewdata = [];
        var record;
        var time;
        Object.keys(_this.maindata).forEach(function(key) {
            record = _this.maindata[key];
            record.point = null;
            time = record.millis;
            if ( time >= start && time <= end) {
                _this.viewdata.push(record);
                if (_this.viewStart > time) {
                    _this.viewStart = time;
                }
                if (_this.viewEnd < time) {
                    _this.viewEnd = time;
                }
            }
        });
        _this.viewStart = start;
        _this.viewEnd = end;
        if ( _this.viewStart == _this.viewEnd ){
            _this.viewStart -= 30000;
            _this.viewEnd  += 30000;
        }
        _this.viewDuration = (_this.viewEnd - _this.viewStart) * 1.1;
        _this.viewRatio = _this.barWidth / _this.viewDuration;
        _this.drawViewdata();
    },

    createDataPoint:function(opt) {
        var point =  new Kinetic.Circle({
            x: opt.X,
            y: opt.Y,
            radius:opt.Radius,
            fill: opt.Fill,
            stroke: opt.Color,
            strokeWidth: 1
        });
        if (opt.Mouseover) {
            point.on("mouseover", opt.Mouseover);
        }
        if (opt.Mouseout) {
            point.on("mouseover", opt.Mouseout);
        }
        if (opt.Click) {
            point.on("click", opt.Click);
        }
        return point;
    },

    drawViewdata:function() {
        var _this = Geof.timecntrl;
        _this.viewLayer.removeChildren();

        var opt= {
            X:0,
            Y:_this.viewY,
            Radius:_this.viewRadius,
            Fill:_this.viewFill,
            Color:_this.viewStroke,
            Mouseover:_this.pointerFunc,
            Mouseout:_this.defaultFunc,
            Click:null
        };

        var first = _this.viewStart;
        var ratio = _this.viewRatio;
        var record;
        var data = _this.viewdata;
        Object.keys(data).forEach(function(key) {
            record = data[key];
            opt.X = ((record.millis - first) * ratio) + _this.margin;
            opt.Click = _this.getClickFunction(record);
            record.point = _this.createDataPoint(opt);
            _this.viewLayer.add(record.point);
        });
        _this.viewLayer.draw();
    },

    drawText:function() {
        var _this = Geof.timecntrl;
        _this.textLayer.removeChildren();
        var text;
        if (_this.start > 0) {
            text = new Kinetic.Text({
                x: _this.margin,
                y: 0,
                text: DateUtil.formatSvrDate(new Date(_this.start)),
                fontSize: 10,
                fontFamily: 'Calibri',
                fill: 'blue'
            });
            _this.textLayer.add(text);
        }

        if (_this.end > 0) {
            text = new Kinetic.Text({
                x: _this.barWidth ,
                y: 0,
                text: DateUtil.formatSvrDate(new Date(_this.end)),
                fontSize: 10,
                fontFamily: 'Calibri',
                fill: 'blue'
            });
            text.setOffset({x:text.getWidth()});
            _this.textLayer.add(text);
        }
        _this.textLayer.draw();
    },

    drawThumbLayer:function() {
        var _this = Geof.timecntrl;
        _this.thumbLayer.removeChildren();
        var y = _this.filterbar.getY() + 2;
        var startThumb = new Kinetic.Wedge({
            x: _this.margin + 4,
            y: y,
            radius: _this.thumbRadius,
            angleDeg: 60,
//            fill: 'lightgreen',
            stroke: 'black',
            strokeWidth: 1,
            rotationDeg: 60,
            draggable:true,
            dragBoundFunc: function(pos) {
                var x = Math.min(pos.x, _this.endThumb.getX() - 14);
                return {
                    x: Math.max(x,_this.margin),
                    y: this.getAbsolutePosition().y
                }
            }
        });
        _this.startThumb = startThumb;

        _this.thumbLayer.add(startThumb);

        startThumb.on('mouseover', _this.pointerFunc);
        startThumb.on('mouseout', _this.defaultFunc);
        startThumb.on('dragend', function() {
            _this.filterData();
        });

        var endThumb = new Kinetic.Wedge({
            x: _this.barWidth,
            y: y,
            radius: _this.thumbRadius,
            angleDeg: 60,
            fill: 'lightblue',
            stroke: 'black',
            strokeWidth: 1,
            rotationDeg: 60,
            draggable:true,
            dragBoundFunc: function(pos) {
                var x = Math.max(pos.x, _this.startThumb.getX() + 14);
                return {
                    x: Math.min(x, _this.barWidth),
                    y: this.getAbsolutePosition().y
                }
            }
        });

        endThumb.on('mouseover', _this.pointerFunc);
        endThumb.on('mouseout', _this.defaultFunc);
        endThumb.on('dragend', function() {
            _this.filterData();
        });
        _this.endThumb = endThumb;

        _this.thumbLayer.add(_this.endThumb);
        _this.thumbLayer.draw();
        _this.filterData();
    },

    getClickFunction:function(record) {
        return function() {
            Geof.event.fireFileListener(record.file.id, record.metadata);
        }
    },

    selectItem:function (id) {
        var _this = Geof.timecntrl;
        if (_this.selected || false) {
            _this.selected.point.setFill(_this.viewFill);
            _this.selected.point.setZIndex(1);
        }
        var item = _this.maindata[id];
        if ((item || false) && (item.point != null)) {
            item.point.setFill(_this.selectedFill);
            item.point.setZIndex(100);
        }
        _this.selected = item;
        _this.viewLayer.draw();
    }

};