
var Geof = Geof || {};

Geof.Retrieve = {

    uniqueid:0,
    directory:window.location.pathname + 'core/panel/',
    viewdir:window.location.pathname + 'view/',
    cntldir:window.location.pathname + 'cntl/',

    getEntity:function (entity_name, callback, html, file_path) {

        if (!(Geof.src[entity_name] || false)) {
            Geof.src[entity_name] = {};
        }

        var path = file_path === undefined ? Geof.Retrieve.directory : file_path;
        var fqueue = new FuncQueue();
        if (callback) {
            fqueue.push(callback);
        }

        html.forEach(function (ext) {
            var file = path + entity_name + "_" + ext + ".html";
            var func = function () {
                var cb = function (src) {
//                    Geof.log("... loaded " + file + ": " + src.length);
                    Geof.src[entity_name][ext] = src;
                    fqueue.pop();
                };
                $.get(file, cb);
            };
            fqueue.push(func);
        });
        fqueue.start();
    },
    getView:function (entity_name, callback) {

        if (Geof.src[entity_name] || false) {
            callback();
            return;
        }

        var file = Geof.Retrieve.viewdir + entity_name + "_view.html";
        $.get(file, function (src) {
//            Geof.log("... loaded " + file + ": " + src.length);
            Geof.src[entity_name] = {};
            Geof.src[entity_name]["view"] = src;
            callback();
        });
    },

    getHtml:function (filename, callback) {
        var file = Geof.Retrieve.viewdir + filename;
        $.get(file, function (src) {
            callback(src);
        });
    },
    getInsert:function (filename, callback) {
        var file = Geof.Retrieve.viewdir + filename + ".html";
        $.get(file, function (src) {
            callback(src);
        });
    }
};
