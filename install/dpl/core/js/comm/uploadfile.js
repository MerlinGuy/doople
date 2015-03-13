
var  FU_ACTIVE = 1, FU_INITIALIZED = 2, FU_REGISTERED = 3
    , FU_SENDING = 4, FU_ALL_SENT = 5, FU_COMPLETING = 6, FU_COMPLETE = 7
    , FU_ACTIVATING = 8, FU_ADDING_LINKS = 9, FU_LINKS_ADDED=10,
    FU_SERVER_ACTIVATE = 11, FU_ERROR = -1;//FU_INACTIVE = 0,

//var STATUS_NAMES = [
//        'INACTIVE', 'ACTIVE', 'INITIALIZED', 'REGISTERED', 'SENDING',
//        'ALL_SENT', 'COMPLETING', 'COMPLETE', 'ACTIVATING', 'ADDING_LINKS', 'LINKS_ADDED',
//        'SERVER_ACTIVATE','ERROR'];

var PART_INIT = 0, PART_SENDING = 1, PART_WRITTEN = 2;//, PART_ERROR = -1;
var SERVER_ACTIVATE = "server_activate";

////////////////////////////////////////////////////////////////////////
function Uploadfile(file, index) {
    this.file = file;
    this.size = file.size;
    this.status = FU_INITIALIZED;
    this.index = index;
    this.createdate = file.createdate;
    this.part = [];
    this.sent = [];
    this.error = [];
    this.maxfilepartsize = 2000000;
    this.sendname = null;
    this.endCallback = null;
    this.blocked = false;
    this.paused = false;
    this.cur_step = 0;
    var filesteps = Math.floor(this.size / this.maxfilepartsize);
    if ( (this.size % this.maxfilepartsize) > 0) {
        filesteps++;
    }
    this.base_steps = 3;
    if (this.file.gpsPoint || this.file.gpsTracks || false) {
        this.base_steps++;
    }
    this.total_steps = this.base_steps + filesteps;
    this.filetype = Filetypes.getEntity(file.name);
    this.nextAction = this.createUpload;

//    Geof.log("Uploadfile created index: " + this.index);
}

Uploadfile.prototype.getPartByIndex = function (index) {
    var count = this.sent.length;
    var part = null;
    var indx;
    for (indx = 0; indx < count; indx++) {
        part = this.sent[indx];
        if (part.index === index) {
            return part;
        }
    }
    count = this.part.length;
    for (indx = 0; indx < count; indx++) {
        part = this.part[indx];
        if (part.index === index) {
            return part;
        }
    }
    return null;
};

Uploadfile.prototype.markWritten = function (index) {
    var sent = this.sent[index];
    if (sent || false) {
        sent.status = PART_WRITTEN;
        if (this.allWritten()) {
            this.status = FU_ALL_SENT;
        }
    } else {
        alert("Error Uploadfile.markSent part{} does not contain index " + index);
    }
};

Uploadfile.prototype.allWritten = function () {
    if (this.part.length > 0) {
        return false;
    }
    var count = this.sent.length;
    for (var indx = 0; indx < count; indx++) {
        if (this.sent[indx].status != PART_WRITTEN) {
            return false;
        }
    }
    return true;
};

Uploadfile.prototype.isSendingBlocked = function () {
    if (this.part.length > 0) {
        return false;
    }
    var count = this.sent.length;
    var init = 0;
    var sending = 0;
    for (var indx = 0; indx < count; indx++) {
        var sent = this.sent[indx];
        if (sent.status === PART_INIT) {
            init++;
        } else if (sent.status === PART_SENDING) {
            sending++;
        }
    }
    return (init === 0) && (sending > 0);
};

Uploadfile.prototype.setError = function (error) {
    this.status = FU_ERROR;
    this.error = error;
    Geof.log('Error: [' + this.index + " ] " + this.error);
    this.sendEndCallback();
};

Uploadfile.prototype.sendEndCallback = function () {
    if (this.endCallback != null) {
        this.blocked = this.isSendingBlocked();
        this.endCallback(this.index, this.status, this.total_steps, this.cur_step, this.error);
    }
};

// -----------------------------------------------------
//  File upload functions  -----------------------------

Uploadfile.prototype.upload = function () {

    if (( !this.blocked) && this.nextAction) {
        return this.nextAction();
    } else {
        return false;
    }
};

Uploadfile.prototype.createUpload = function () {
    this.blocked = true;

    Geof.log("createUpload " + this.index);
    var file = this.file;

    var createdate = null;
    if (file.gpsTracks) {
        createdate = GpsUtil.getTrackFileStart(file);
        file.geomtype = 1;
    } else if (file.gpsPoint && file.gpsPoint.datetime) {
        createdate = file.gpsPoint.datetime;
        file.geomtype = 0;
    } else {
        file.geomtype = -1;
    }

    if (DateUtil.isValidDate(createdate)) {
        createdate = DateUtil.formatSvrDate(createdate);
    } else if ((createdate == null) || (createdate.length == 0)) {
        createdate = DateUtil.getFileDate(file);
    } else {
        createdate = DateUtil.getSvrDate(createdate);
    }
    file.createdate = createdate;

    if (!(file.filetype || false)) {
        file.filetype = Filetypes.getEnumByExtension(file.name);
    }

    var data = {
        'fields':{
            "originalname":file.name,
            "filesize":file.size,
            "index":this.index,
            'createdate':createdate,
            'geomtype':file.geomtype,
            'filetype':file.filetype
        }
    };
    var rJson = GRequest.build('upload', 'create', null, data);

    var _this = this;
    var cb = function (req) {
        Geof.log("createUploadCB " + _this.index);

        var data = req[0].data[0];
        _this.maxfilepartsize = parseInt((data['maxfilepartsize'] / Geof.cntrl.upload.ENCODE_PERCENT));
        _this.sendname = data['sendname'];
        file.id = data['pkey']['id'];

        var offset = 0;
        var size = Math.min(_this.size, _this.maxfilepartsize);

        var i = 0;

        while (offset < _this.size) {
            var upart = new Uploadpart(offset, size, i);
            _this.part.push(upart);
            offset += size;
            size = Math.min(size, _this.size - offset);
            i++;
        }
        _this.total_steps = _this.base_steps + i;

        Geof.log("------ total_steps " + _this.total_steps);
        _this.cur_step++;
        if (_this.part.length > 0) {
            Geof.log('createUpload callback - going to uploadFilePart');
            _this.status = FU_REGISTERED;
            _this.nextAction = _this.uploadFilePart;
        } else {
            _this.status = FU_ALL_SENT;
            Geof.log('createUpload callback - going to completeUploadStage');
            _this.nextAction = _this.completeUploadStage;
        }
        _this.sendEndCallback();
    };
    TransMgr.sendNow(rJson, cb);
    return true;
};

Uploadfile.prototype.uploadFilePart = function () {
    Geof.log("uploadFilePart " + this.index);

    var part = this.part.shift();
    if (part || false) {
        part.status = PART_SENDING;
        this.sent.push(part);
        this.status = FU_SENDING;

        var _this = this;

        // First we create the callback for the Ajax call which is executed
        // at the end of the FileReader onloaded callback
        var cb = function (req) {
            Geof.log("uploadFilePartCB " + _this.index);
            if (req.error || false) {
                Geof.log("Error: " + req.error);
            }
            var data = req[0].data;
            var written = data['written'];
            var partindx = data['fileindex'];

            Geof.log("uploadPart - reply: [" + _this.index + "," + partindx + "]");

            var fpart = _this.getPartByIndex(partindx);

            if (fpart === null) {
                _this.setError("part not found: " + partindx);
            } else  if (!written) {
                _this.setError("part not written: " + partindx);
            } else {

                _this.markWritten(partindx);
                _this.cur_step++;
                _this.blocked = _this.isSendingBlocked();
                if (_this.part.length == 0) {
                    _this.nextAction = _this.completeUploadStage;
                }

                Geof.log('uploadFilePart Status for [' + _this.index + '] = ' + _this.status);
                _this.sendEndCallback();
            }
        };

        // Now we create the FileReader onloaded callback
        var func = function (evt) {
            var payload = base64.encode(evt.target.result);
//            Geof.log("payload size " + payload.length);
            var req = GRequest.buildDataFields('upload', 'update', null);
            req.data.fields = {
                'index':_this.index,
                'sendname':_this.sendname,
                'fileindex':part.index,
                'filepart':payload
            };
//            Geof.log("uploadPart - sending... [" + _this.index  + "," + part.index + "]");
            TransMgr.sendNow(req, cb);
        };

        var reader = new FileReader();
        reader.onloadend = func;
//        var blob = this.file.webkitSlice(part.start, part.start + part.size);
        var blob = this.file.slice(part.start, part.start + part.size);
        reader.readAsBinaryString(blob);
    }
    this.blocked = this.isSendingBlocked();
    return true;
};

Uploadfile.prototype.completeUploadStage = function () {
    Geof.log("completeUploadStage " + this.index);
    this.blocked = true;
    this.status = FU_COMPLETING;

    var data = {
        'fields':{
            'index':this.index,
            'sendname':this.sendname
        },
        'where':{
            'id':this.file.id
        }
    };

    var req = GRequest.build('upload', 'update', "complete", data);

    var _this = this;
    var cb = function () {
        Geof.log("completeUploadStageCB - reply: [" + _this.index + "]");
        _this.status = FU_COMPLETE;
        _this.nextAction = _this.addLinks;
        _this.blocked = false;
        _this.cur_step++;
        _this.sendEndCallback();
    };

    TransMgr.sendNow(req, cb);
};

Uploadfile.prototype.addLinks = function () {
    Geof.log("adding Links " + this.index);
    this.blocked = true;
    this.status = FU_ADDING_LINKS;
    var file = this.file;
    var fileid = file.id;
    var trans = new Transaction(Geof.session);
    var order = 0;
    var data;

    if (file.keywords || false) {
        for (var keyword in file.keywords) {
            data = {
                'fields':{'keyword':keyword},
                'link':{'entity':'file', 'id':fileid
                }
            };
            var reqKeyword = GRequest.build('keyword', 'create', null, data);
            reqKeyword.order = order++;
            trans.addRequest(reqKeyword, null);
        }
    }
    if (file.projectids || false) {
        var projectids = file.projectids;
        for (var indx=0; indx < projectids.length;indx++) {
            var pid = projectids[indx];
            data = {
                'fields':{'fileid':fileid, 'projectid':pid}
            };
            var reqLink = GRequest.build('file_project', 'create', null, data);
            reqLink.order = order++;
            trans.addRequest(reqLink, null);
        }
    }
    file[SERVER_ACTIVATE] = false;
    if (this.getGpsType(file) != -1) {
        this.setGpsRequests(file, trans, order);
    }

    if (file.filetype == Filetypes.PHOTO) {
        data = {'fields':{}, 'where':{'id':fileid}};
        var reqThumbnail = GRequest.build('file', 'update', 'thumbnail', data);
        reqThumbnail.order = order;
        trans.addRequest(reqThumbnail, reqThumbnail);
        file[SERVER_ACTIVATE] = true;
    }

    if (trans.requests.length == 0) {
        this.setFileActive();
    } else {
        var nextAction = null;
        var _this = this;

        if (file[SERVER_ACTIVATE]) {
            _this.status = FU_SERVER_ACTIVATE;
            nextAction = null;

        } else {
            _this.status = FU_LINKS_ADDED;
            nextAction = _this.setFileActive;
        }

        var cb = function () {
            _this.nextAction = nextAction;
            _this.cur_step++;
            _this.sendEndCallback();
        };
        trans.setLastCallback(cb);
        trans.send();
    }
};

Uploadfile.prototype.setGpsRequests = function (file, transaction, order) {
    var fileid = file.id;
    var createdate = null;
    var data, reqLink;
    var gpsType = this.getGpsType(file);

    if (gpsType == 0) {
        var point = file.gpsPoint;
        if ((point.datetime != null) && (DateUtil.formatSvrDate(point.datetime))) {
            createdate = DateUtil.formatSvrDate(point.datetime);
        }

        data = {
            'fields':{
                'longitude':point.longitude,
                'latitude':point.latitude,
                'utcdate':createdate,
                'altitude':point.altitude,
                'azimuth':point.azimuth
            }
        };
        var reqGps = GRequest.build('point', 'create', null, data);
        reqGps.order = order++;
        transaction.addRequest(reqGps, null);
        data = {
            "reference":"fields",
            'fields':{'fileid':fileid, '$pointid':reqGps.requestid + ",id"}
        };
        reqLink = GRequest.build('file_point', 'create', null, data);
        reqLink.order = order;
        transaction.addRequest(reqLink, null);

    } else if (gpsType === 1) {

        var tracks = this.file.gpsTracks;

        var track = tracks[0];
        var bounds = track.bounds;
        var line = {};
        var points = track.points;
        var times = track.times;
        line['pointcount'] = points.length;
        if (bounds || false) {
            line['minlat'] = bounds.minlat;
            line['minlon'] = bounds.minlon;
            line['maxlat'] = bounds.maxlat;
            line['maxlon'] = bounds.maxlon;
        }

        line['startdate'] = DateUtil.formatSvrDate(times[0]);
        var last = times[times.length - 1];
        line['enddate'] = DateUtil.formatSvrDate(last);
        line['description'] = '';
        var reqLine = GRequest.build("line", "create", null, {'fields':line});
        order += 1;

        transaction.addRequest(reqLine, null);

        data = {
            "reference":"fields",
            'fields':{'fileid':fileid, '$lineid':reqLine.requestid + ",id"}
        };
        reqLink = GRequest.build('file_line', 'create', null, data);
        reqLink.order = order++;
        transaction.addRequest(reqLink, null);

        var lp, row;
        var rows = [];
        var len = points.length;
        for (var indx = 0; indx < len; indx++) {
            lp = points[indx];
            row = lp.longitude + ',' + lp.latitude
                + ',' + DateUtil.formatSvrDate(times[indx])
                + ',' + (lp.altitude || 0.0) + ',' + (lp.distance || 0.0)
                + ',' + (lp.azimuth || 0.0);
            rows.push(row);
        }
        data = {
            'fields':{
                'fileid':fileid,
                'linepoints':rows
            }
        };
        var reqPoints = GRequest.build("linepoint", "create", "compressed", data);
        reqPoints.order = order + 1;
        transaction.addRequest(reqPoints, null);
        file[SERVER_ACTIVATE] = true;
    }
};

Uploadfile.prototype.setFileActive = function () {
    Geof.log("setFileActive " + this.index);
    this.blocked = true;
    this.status = FU_ACTIVATING;
    var fileid = this.file.id;
    var trans = new Transaction(Geof.session);

    var data = {'fields':{'id':fileid, 'status':FU_ACTIVE}, 'where':{'id':fileid}};
    var req = GRequest.build('file', 'update', null, data);
    var _this = this;

    var cb = function () {
        _this.status = FU_ACTIVE;
        _this.nextAction = null;
        _this.cur_step = _this.total_steps;
        _this.sendEndCallback();
    };
    trans.addRequest(req, cb);
    trans.send();
    return true;
};

Uploadfile.prototype.getGpsType = function (file) {
    var gpsTracks = file.gpsTracks;
    if (gpsTracks || false) {
        if (gpsTracks.length > 0) {
            return 1;
        }
    }
    var gpsPoint = file.gpsPoint;
    if (gpsPoint || false) {
        if ((gpsPoint.latitude || false ) && (gpsPoint.latitude || false )) {
            return 0;
        }
    }
    return -1;
};

////////////////////////////////////////////////////////////////////////
function Uploadpart(start, size, index) {
    this.start = start;
    this.size = size;
    this.status = PART_INIT;
    this.index = index;
}