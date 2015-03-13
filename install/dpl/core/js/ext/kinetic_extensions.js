/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 1/28/13
 * Time: 1:06 PM
 */

var Geof = Geof || {};
Geof.img_dir = "img/symbol/";
Geof.img_gray_dir = "img/symbolgray/";

Kinetic.setPointer = function (obj) {
    // add cursor styling
    obj.on("mouseover", function () {
        document.body.style.cursor = "pointer";
    });
    obj.on("mouseout", function () {
        document.body.style.cursor = "default";
    });
};

Geof.PairCalc = function (config) {
    this.fromObj = config.fromObj;
    this.toObj = config.toObj;
    this.maxWidth = JsUtil.js_or(config.maxWidth, 25);
    this.setWidth = JsUtil.js_or(config.setWidth, null);
    this.width = .1;
};

Geof.PairCalc.prototype.calc = function () {
    var pos1 = this.fromObj.getCenter();
    var pos2 = this.toObj.getCenter();

    var dx = pos2.x - pos1.x;
    var dy = pos2.y - pos1.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var percent1 = this.toObj.getRadius() / len + .02;
    var percent2 = this.fromObj.getRadius() / len + .02;

    var dxD = dx * percent1 + pos1.x;
    var dyD = dy * percent2 + pos1.y;

    len *= (1 - (percent1 + percent2));

    var width = this.setWidth == null ? Math.min((this.width * len), this.maxWidth) : this.setWidth;

    return {'dx':dx, 'dy':dy, 'len':len, 'dxD':dxD, 'dyD':dyD, 'width':width};
};

Geof.getKineticRenderer = function (type) {

    if (type === "arrow") {
        return function (canvas, pc) {
            var r = pc.calc();

            var tail = (this.config.tail || false) ? this.config.tail : .75;

            var ctx = canvas.getContext();
            ctx.save();
            ctx.strokeStyle = this.strokeStyle;
            ctx.lineWidth = this.lineWidth;

            var length = Math.max(tail * r.len, r.len - (r.width * 5));

            ctx.translate(r.dxD, r.dyD);
            ctx.rotate(Math.atan2(r.dy, r.dx));

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -r.width);
            ctx.lineTo(length, -r.width);
            ctx.lineTo(length, -( 2 * r.width));
            ctx.lineTo(r.len, 0);
            ctx.lineTo(length, ( 2 * r.width));
            ctx.lineTo(length, r.width);
            ctx.lineTo(0, r.width);
            ctx.lineTo(0, -r.width);

            ctx.closePath();
            ctx.stroke();
            ctx.restore();
            canvas.fillStroke(this);
        }

    } else if (type == 'block') {
        return function (canvas, pc) {
            var r = pc.calc();

            var ctx = canvas.getContext();
            ctx.save();
            ctx.strokeStyle = this.strokeStyle;
            ctx.lineWidth = this.lineWidth;

            ctx.translate(r.dxD, r.dyD);
            ctx.rotate(Math.atan2(r.dy, r.dx));

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -r.width);
            ctx.lineTo(r.len, -r.width);
            ctx.lineTo(r.len, r.width);
            ctx.lineTo(0, r.width);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
            canvas.fillStroke(this);

        }
    } else if (type == 'circle') {
        return function (canvas, pc) {
            var r = pc.calc();

            var ctx = canvas.getContext();
            ctx.save();
            ctx.strokeStyle = this.strokeStyle;
            ctx.lineWidth = this.lineWidth;

            ctx.translate(r.dxD, r.dyD);
            ctx.rotate(Math.atan2(r.dy, r.dx));

            var radius = this.lineWidth * 1.5;
            var spacer = Math.max(radius / 2, 6);
            var x = radius + 2;
            var y = radius / 2;

            while (x < r.len - 1) {

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
                ctx.stroke();
                x += (radius * 2) + spacer;
                if ((x + (radius * 2)) >= r.len) {
                    x += (r.len - x) / 6;
                }
            }

            ctx.restore();
            canvas.fillStroke(this);
        }
    } else if (type == 'square') {
        return function (canvas, pc) {
            var r = pc.calc();
            var ctx = canvas.getContext();
            ctx.save();
            ctx.strokeStyle = this.strokeStyle;
            ctx.lineWidth = this.lineWidth;

            ctx.translate(r.dxD, r.dyD);
            ctx.rotate(Math.atan2(r.dy, r.dx));

            var height = this.lineWidth * 2;
            var spacer = Math.max(height / 2, 6);
            //noinspection JSSuspiciousNameCombination
            var width = height;
            var x = 2;
            var y = -this.lineWidth;

            while (x < r.len - 1) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + height);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x + width, y);
                ctx.lineTo(x, y);
                ctx.closePath();
                ctx.stroke();
                x += width + spacer;
                if ((x + width) >= r.len) {
                    width = r.len - x - 1;
                }
            }

            ctx.restore();
            canvas.fillStroke(this);
        }
    } else {
        return function (canvas, pc) {
            var r = pc.calc();
            var ctx = canvas.getContext();
            ctx.save();
            ctx.strokeStyle = this.strokeStyle;
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';

            ctx.translate(r.dxD, r.dyD);
            ctx.rotate(Math.atan2(r.dy, r.dx));

            var y = (this.lineWidth / 2);
            var x = 4;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (r.len - 6), y);
            ctx.stroke();
            ctx.restore();
            canvas.fillStroke(this);

        }
    }
};

/////////////////////////////////////////////////////////
// Connector
/////////////////////////////////////////////////////////

Kinetic.Connector = function (config) {
    this.config = config;
    this.pc = new Geof.PairCalc(config);
    this.renderer = Geof.getKineticRenderer(config.renderType);
    this.clickFunc =  JsUtil.js_or(config.click, null);
    this.layer = config.layer;
    this._initConnector(config);
    this.fromObj = config.fromObj;
    this.toObj = config.toObj;

    this.fromObj.connectors.push(this);
    this.toObj.connectors.push(this);
    config.layer.add(this);
    Kinetic.setPointer(this);
};

Kinetic.Connector.prototype._initConnector = function(config) {

    this.lineWidth = JsUtil.js_or( config.lineWidth, 5);
    this.strokeStyle = JsUtil.js_or(  config.stroke , "silver");
    if (config.status || false) {
        this.strokeStyle = Geof.UiIcon.stati[config.status];
    }

    // call super constructor
    Kinetic.Shape.call(this, config);
    this.shapeType = 'Connector';
    this._setDrawFuncs();

    this.on("click", function() {
        if (this.clickFunc != null) {
            this.clickFunc(this);
        }
    });
};

Kinetic.Connector.prototype.getEnd = function (thisEnd) {
    if (this.fromObj === thisEnd) {
        return this.toObj;
    } else if (this.toObj === thisEnd) {
        return this.fromObj;
    } else {
        return null;
    }
};


Kinetic.Connector.prototype.drawFunc = function (canvas) {
    this.renderer(canvas, this.pc);
};

Kinetic.Connector.prototype.drawHitFunc = function (canvas) {
    this.renderer(canvas, this.pc);
};

Kinetic.Connector.prototype.setStatus = function (status) {
    this.strokeStyle = Geof.UiIcon.stati[status];
    this.layer.draw();
};

Kinetic.Connector.prototype.getId = function () {
    return this._id;
};

Kinetic.Connector.prototype.getConnectors = function () {
    return {'from':this.pc.fromObj, 'to':this.pc.toObj};
};

Kinetic.Connector.prototype.getStatus = function() {
    return this.status;
};

Kinetic.Connector.prototype.setStatus = function(status) {
    this.status = status;
    this.strokeStyle = Geof.UiIcon.stati[status];
    if (this.layer) {
        this.layer.draw();
    }
};

Kinetic.Connector.prototype.setClick = function (func) {
    this.clickFunc = func;
};

Kinetic.Util.extend(Kinetic.Connector, Kinetic.Shape);

/////////////////////////////////////////////////////////
// Icon Image
/////////////////////////////////////////////////////////


Geof.UiIcon = function (config, layer, connectorLayer) {
    this.config = config;
    this.circle = null;
    this.image = null;
    this.text = null;
    this.group = null;
    this.name = config.name || "";
    this.title = config.title || "";
    this.draggable = config.draggable || false;
    layer = layer || config.layer;
    connectorLayer = connectorLayer || config.connectorLayer;

    this.radius = config.radius || Geof.UiIcon.dftRadius;
    this.strokeWidth = config.strokeWidth || Geof.UiIcon.dftStrokeWidth;
    this.status = config.status || "enabled";
    this.stroke = Geof.UiIcon.stati[this.status];
    this.layer = layer;
    this.connectorLayer = connectorLayer;
    this.connectedTo = config.connectedTo;
    this.connectors = [];

    if (config.text_loc == 'top') {
        this.text_loc = -this.radius - 20;
    } else {
        this.text_loc = this.radius + 4;
    }

    this.imageSrc = Geof.img_dir + config.imageSrc;
    if (config.isMap || false && config.click) {
        this.clickFunc = config.click;
    } else {
        this.clickFunc = function () {
//            Geof.menuctrl.change({type:config.type,name:config.name});
            Geof.menuctrl.change(config);
        }
    }
    this.dblclickFunc = config.dblclick || null;

    this.x = config.x;
    this.y = config.y;
    this.showText = config.showText || true;
    this.init(this, layer);
};

Geof.UiIcon.prototype.init = function (_this, layer) {
    var circle_params = {
        x:0, y:0,
        radius:_this.radius,
        stroke:_this.stroke,
        strokeWidth:_this.strokeWidth
    };

    _this.circle = new Kinetic.Circle(circle_params);

    _this.group = new Kinetic.Group({
        name:_this.name,
        draggable:this.draggable
    });

    _this.group.icon = _this;

    var imageObj = new Image();
    imageObj.onload = function () {
        var userImg = new Kinetic.Image({
            x:-(this.naturalWidth / 2),
            y:-(this.naturalHeight / 2),
            image:imageObj,
            width:this.naturalWidth,
            height:this.naturalHeight
        });

        _this.group.add(userImg);
        layer.draw();
    };
    imageObj.src = _this.imageSrc;

    _this.text = new Kinetic.Text({
        x:0,
        y:this.text_loc,
        text:_this.title,
        fontSize:18,
        fontFamily:'Calibri',
        fill:_this.stroke,
        opacity:_this.showText ? 1 : 0.0
    });

    _this.text.setOffset({
        x:this.text.getWidth() / 2
    });

    _this.group.add(_this.circle);
    _this.group.add(_this.text);
    layer.add(_this.group);

    _this.group.on('mouseover', function () {
        if (!_this.showText) {
            _this.text.transitionTo({
                opacity:0.95,
                duration:.8,
                easing:"ease-in"
            });
        }
        document.body.style.cursor = "pointer";
    });
    _this.group.on("mouseout", function () {
        if (!_this.showText) {
            _this.text.transitionTo({
                opacity:0.0,
                duration:.8,
                easing:"ease-out"
            });
        }
        document.body.style.cursor = "default";
    });

    _this.group.on("dragmove", function () {
        _this.drawConnectors();
    });

    _this.group.on("click", function () {
        if (_this.clickFunc != null && _this.status != 'disabled') {
            _this.clickFunc(_this);
        }
    });

    _this.group.on("dblclick", function () {
        if (_this.dblclickFunc != null) {
            _this.dblclickFunc(_this);
        }
    });
    _this.setPosition(this.x, this.y);

    var childs = layer.getChildren();
    for (var c in childs) {
        var child = childs[c], icon;
        var icon = child.icon;
        if ((icon || false) && (icon.connectedTo || false)) {
            for (var t in icon.connectedTo) {
                var cto = icon.connectedTo[t];
                if (cto.to == _this.name) {
                    icon.addConnector(_this, cto.type, "disabled");
                }
            }
        }
    }
};

Geof.UiIcon.dftRadius = 42;
Geof.UiIcon.dftStrokeWidth = 2;

Geof.UiIcon.stati = {
    "disabled":"#ababab",
    "enabled":"#0062B3",
    "activated":"#005e00"
};

Geof.UiIcon.lesserStatus = function (s1, s2) {
    if ((s1 == 'disabled') || (s2 == 'disabled')) {
        return 'disabled';
    } else if ((s1 == 'enabled') || (s2 == 'enabled')) {
        return 'enabled';
    } else if ((s1 == 'activated') && (s1 == 'activated')) {
        return s1;
    } else {
        return 'disabled';
    }
};

Geof.UiIcon.prototype.setPosition = function (x, y) {
    this.group.setPosition(x, y);
};

Geof.UiIcon.prototype.getPosition = function () {
    return this.group.getPosition();
};

Geof.UiIcon.prototype.getCenter = function () {
    return { 'x':this.group.attrs.x,
        'y':this.group.attrs.y  };
};

Geof.UiIcon.prototype.getRadius = function() {
    return this.radius;
};

Geof.UiIcon.prototype.getRadius = function() {
    return this.radius;
};

Geof.UiIcon.prototype.getStatus = function() {
    return this.status;
};

Geof.UiIcon.prototype.getEntity = function() {
    return this.entity;
};

Geof.UiIcon.prototype.setDraggable = function(draggable) {
    this.draggable = draggable;
    this.group.setDraggable(this.draggable);
};

Geof.UiIcon.prototype.setStatus = function(status) {
    this.status = status;
    this.strokeStyle = Geof.UiIcon.stati[status];
    this.circle.setStroke(this.strokeStyle);
    this.group.draw();
    for ( var c in this.connectors) {
        var cntr = this.connectors[c];
        var thatEnd = cntr.getEnd(this);
        if (thatEnd != null) {
            var cstatus = Geof.UiIcon.lesserStatus(status, thatEnd.getStatus());
            cntr.setStatus(cstatus);
        }
    }
};

Geof.UiIcon.prototype.setClick = function (func) {
    this.clickFunc = func;
};

Geof.UiIcon.prototype.setDblClick = function (func) {
    this.dblclickFunc = func;
};

Geof.UiIcon.prototype.getConnectors = function (func) {
    return this.connectors;
};

Geof.UiIcon.prototype.addConnector = function(target, rendertype, status) {
    var connStatus = (status || false) ? status : "disabled";
    var config = {
        fromObj:this,
        toObj:target,
        setWidth:5,
        renderType:rendertype,
        status:connStatus,
        layer:this.connectorLayer
    };
    new Kinetic.Connector(config);
};

Geof.UiIcon.prototype.drawConnectors = function() {
    this.connectorLayer.draw();
};


