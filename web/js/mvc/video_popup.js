/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 4/23/13
 * Time: 5:06 PM
 */

Geof = Geof || {};
Geof.video_popup = null;


function VideoPopup(parent) {
    this.parent = parent;
}

VideoPopup.prototype.showDialog = function (options, noRequery) {
    try{
        var _this = this;
        _this.file = options.file || null;
        _this.callback = options.callback;
        _this.syncCB = options.syncCB;
        _this.closeCB = options.closeCB;

        var dir = Geof.cntrl.storage.storageDir(_this.file.storagelocid, null);
        if (dir == null) {
            if (noRequery) {
                alert("Storage location not found for file");
                return;
            }
            Geof.cntrl.storage.storageDir(_this.file.storagelocid, function() {
                _this.showDialog(options,true);
            });
            return;
        }

        var cb = function(html) {
            var file = _this.file;
            $('#' + _this.parent).append(html);
            var $dlg = $('#videoDialog');

            var vp = document.getElementById('videoPlayerPopup');
            if (!(vp || false)) {
                alert("vp (videoplayer element) Is NULL - VideoPopup.prototype.showDialog");
                return;
            }
            vp.src = Geof.session.svr_addr + '/' + dir + '/' + file.filename;
            vp.load();
            var t = window.setInterval(function(){
                if (vp.readyState > 0) {
                    Geof.cntrl.annotation.resize(true);
//                    var duration = vp.duration.toFixed(3);
//                    $("#videoDuration").val(duration);
                    clearInterval(t);
                    t = null;
                }
            },250);

            if (_this.syncCB || false) {
                vp.addEventListener("timeupdate", function() {
                    _this.syncCB(vp.currentTime);
                }, false);
            }
            var pos = localStorage.getItem('default_video_position') || "20,20";
            pos = pos.split(",");
            var top = parseInt(pos[0]);
            var left = parseInt(pos[1]);

            $dlg.dialog({ autoOpen: false, position:[left, top],
                close: function() {
                    vp.src = ' ';
                    vp.load();
                    $(vp).remove();
                    delete(vp);
                    $dlg.remove();

                    if (t != null) {
                        clearInterval(t);
                        t = null;
                    }
                    if (_this.closeCB || false) {
                        _this.closeCB();
                    }
                    Geof.cntrl.annotation.delay_initialization=false;
                    Geof.cntrl.annotation.got_parent_resize=false;
                },
                dragStop:function(event, ui) {
                    var top = ui.position.top;
                    var left = ui.position.left;
                    localStorage.setItem('default_video_position', top + "," + left);
                },
                modal:false, resizable:true, draggable:true, width:'auto', height:'auto',title:file.originalname
            });

            var aopts = {
                divElement : $("#annotationDiv"),
                ol : 'olAnnotations',
                underlay : 'videoPlayerPopup',
                file : _this.file,
                type : Filetypes.VIDEO,
                toggle_btn:'btnToggleAnnotation',
                isvisible:false,
                videoplayer:vp,
                selected_ids:[]
            };

            JsUtil.merge(options.annotation, aopts, true);

            Geof.cntrl.annotation.setOptions(aopts);

            $dlg.dialog( "open" );
            if (_this.callback || false) {
                _this.callback(vp,_this);
            }
        };
        $.get("view/video_dialog.html", cb);

    } catch (e ) {
        alert(e);
    }

};


