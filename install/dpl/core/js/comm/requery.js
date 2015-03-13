/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 8/1/13
 * Time: 7:13 AM
 */
//-------------------------------------------
Requery.defaultInterval = 3000;
Requery.index = 0;

function Requery( callback, run_stop_callback, interval ) {
    if (interval === undefined) {
        interval = Requery.defaultInterval;
    }
    this.interval = interval ;
    this.uploads = [];
    this.interval_id = null;
    this.isRunning = false;
    this.callback = callback;
    this.run_stop_callback = run_stop_callback;
}

Requery.prototype.start = function (run_immediate) {
    if (this.isRunning) {
        return;
    }
    var _this = this;
    var func = function () {
        _this.read(_this);
    };
    this.stop();
    this.interval_id = setInterval(func, this.interval);
    if (run_immediate || false) {
        func();
    }
    this.isRunning = true;
    if (this.run_stop_callback) {
        this.run_stop_callback(this.isRunning);
    }
};

Requery.prototype.stop = function () {
    if (this.interval_id != null) {
        clearInterval(this.interval_id);
        this.interval_id = null;
    }
    this.isRunning = false;
    if (this.run_stop_callback) {
        this.run_stop_callback(this.isRunning);
    }
};

Requery.prototype.read = function (_this) {
    if (_this.count() > 0) {
        var cb = function (req) {
            if (_this.callback) {
                _this.callback(req);
            }
        };
        var sendnames = _this.getSendnames().join();
        Geof.model.readOptions({
            entity:'upload',
            where:{'sendnames':sendnames},
            callback:cb
        });
    }
};

Requery.prototype.remove = function (sendname) {
    var tuple = this.get(sendname);
    if (tuple !== undefined) {
        this.uploads.splice(tuple[0], 1);
        return tuple[1];
    }
    return undefined;
};

Requery.prototype.get = function (sendname) {
    var uploads = this.uploads;
    var upload;
    for (var indx =0;indx < uploads.length; indx++) {
        upload = uploads[indx];
        if (upload.sendname == sendname) {
            return [indx, upload];
        }
    }
    return undefined;
};

Requery.prototype.getSendnames = function () {
    var uploads = this.uploads;
    var rtn = [];
    for (var indx =0;indx < uploads.length; indx++) {
        rtn.push(uploads[indx].sendname);
    }
    return rtn;
};

Requery.prototype.add = function (upload) {
    this.uploads.push(upload);
};

Requery.prototype.count = function () {
    return this.uploads.length;
};