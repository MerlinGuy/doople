
var Filetypes = (function () {

    //noinspection JSUnusedGlobalSymbols
    return {
        types:{
            'photo':['jpeg', 'jpg', 'png', 'gif', 'tif', 'bmp'],
            'video':['mov', 'mpg', 'mps', 'vob', 'mp4', 'webm'],
            'audio':['mp2', 'mp3', 'ra', 'wma', 'wav', 'm4a', 'mid'],
            'track':['gpx', 'kml', 'kmz', 'nmea', 'csv'],
            'shape':['shp', 'shz', 'dbf'],
            'document':['doc', 'docx', 'xls', 'xlsx', 'txt', 'odt']
        },
        readers:{
            'kmz':'KmzReader',
            'kml':'KmzReader',
            'gpx':'GpxReader',
            'csv':'CsvReader'
        },

        PHOTO:0, VIDEO:1, AUDIO:2, DOCUMENT:3, SHAPE:4, TRACK:5,

        media_names:['Photo', 'Video', 'Audio', 'Doc', 'Shape', 'Track'],


        getEntity:function (extension) {
            var types = Filetypes.types;
            var name = null;
            Object.keys(types).forEach(function (key) {
                if (name == null) {
                    var entity = types[key];
                    for (var indx = 0; indx < entity.length; indx++) {
                        if (entity[indx] === extension) {
                            name = key;
                            break;
                        }
                    }
                }
            });
            return name;
        },

        getEnum:function (extension) {
            var name = Filetypes.getEntity(extension);
            if (name != null) {
                return Filetypes[name.toUpperCase()];
            }
            return null;
        },

        getExtensions:function (entity) {
            if (entity in Filetypes.types) {
                return Filetypes.types[entity];
            } else {
                return [];
            }
        },

        getTypeByExtension:function (filename) {
            var ext = FileUtil.getExtension(filename).toLowerCase();
            if (ext == null) {
                return null;
            }
            return Filetypes.getEntity(ext);
        },

        getEnumByExtension:function (filename) {
            var ext = FileUtil.getExtension(filename).toLowerCase();
            if (ext == null) {
                return null;
            }
            return Filetypes.getEnum(ext);
        },

        getReader:function (filename) {
            var ext = FileUtil.getExtension(filename);
            if (ext == null) {
                return null;
            }
            if (ext in Filetypes.readers) {
                return Filetypes.readers[ext];
            } else {
                return null;
            }
        },

        showPopup2:function (options) {
            var file = options.file || false;
            if (file) {
                if (file.filetype == 0) {
                    Geof.photo_popup.showDialog(options);

                } else if (file.filetype == 1) {
                    Geof.video_popup.showDialog(options);
                }
            }
        },

        showPopup:function (file, options) {
            options = options || {};
            options.file = file;

            if (file || false) {
                if (file.filetype == 0) {
                    Geof.photo_popup.showDialog(options);

                } else if (file.filetype == 1) {
                    Geof.video_popup.showDialog(options);
                }
            }
        },
        showPopupById:function (fileid, options) {
            var file = Geof.cntrl.search.getResultsFile(fileid);
            Filetypes.showPopup(file, options);
        }
    }

})();

