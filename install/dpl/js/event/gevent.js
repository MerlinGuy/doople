/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 6/26/13
 * Time: 1:02 PM
 */

var Geof = Geof || {};

Geof.event = {
    
    fileListener : [],
    addFileListener : function(callback) {
        Geof.event.fileListener.push(callback);
    },
    removeFileListener : function(callback) {
        JsUtil.spliceByValue(Geof.event.fileListener,callback);
    },
    fireFileListener : function(id) {
//        Geof.log(id + " - file selected");
        var listener = Geof.event.fileListener;
        for (var indx in listener) {
                listener[indx](id);
        }
    },
    mapListener : [],
    addMapListener : function(callback) {
        Geof.event.mapListener.push(callback);
    },
    removeMapListener : function(callback) {
        JsUtil.spliceByValue(Geof.event.mapListener,callback);
    },
    fireMapListener : function(id) {
        var listener = Geof.event.mapListener;
        for (var indx in listener) {
            listener[indx](id);
        }
    },

    clear:function() {
        Geof.event.fileListener.length = 0;
        delete  Geof.event.fileListener;
        Geof.event.fileListener = [];

        Geof.event.mapListener.length = 0;
        delete Geof.event.mapListener;
        Geof.event.mapListener = [];
    }

};