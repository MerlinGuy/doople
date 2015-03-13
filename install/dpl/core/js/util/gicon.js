//-------------------------------------------------------------------------------

function Geof_toggle_icon(icon_ids, activate_id) {

    this.icon_ids = icon_ids;
    this.activated_id = null;
    if (activate_id || false) {
        this.activate(activate_id);
    }
    var _this = this;
    for (var indx in this.icon_ids) {
        var id = this.icon_ids[indx];
        $("#" + id).click(function(event) {
            _this.toggle(this.id);
        });
    }
}

Geof_toggle_icon.prototype.activate = function(icon_id) {

    if (this.activated_id != null) {
        Gicon.setEnabled(this.activated_id,true);
    }
    if (Gicon.isEnabled(icon_id)) {
        this.activated_id = icon_id;
        Gicon.setActive(this.activated_id);
    }
}

Geof_toggle_icon.prototype.toggle = function(icon_id) {

    if (this.activated_id === icon_id) {
        Gicon.setEnabled(this.activated_id,true);
        this.activated_id = null;
    } else {
        if (this.activated_id != null) {
            Gicon.setEnabled(this.activated_id,true);
        }
        if (Gicon.isEnabled(icon_id)) {
            this.activated_id = icon_id;
            Gicon.setActive(this.activated_id,true);
        }
    }
}

Geof_toggle_icon.setAsToggleButton = function(icon_id, activateCallback, enableCallback) {

    $( '#' + icon_id ).click(function() {
        if (Gicon.isEnabled(icon_id)) {
            Gicon.setActive(icon_id, true);
            if (activateCallback || false) {
                activateCallback();
            }
        } else  {
            Gicon.setEnabled(icon_id, true);
            if (enableCallback || false) {
                enableCallback();
            }
        }
    });
}

Geof_toggle_icon.prototype.getActive = function() {
    return this.activated_id;
}

//----------------------------------------------------------
var Gicon = (function() {
    return {
        states: "active|enable|alert",
        ACTIVE: "active",
        ENABLE: "enable",
        ALERT: "alert",
        DISABLED: "disabled",
        base: "icon_geof_",

        isValueIcon:  function(value, id) {
            var cntl = $("#" + id);
            if (! (cntl || false )) {
                Geof.log("Gicon.isValueIcon error - can't locate " + id);
                return;
            }
            var classList = cntl.attr('class').split(/\s+/);
            for (var indx in classList) {
                var klass = classList[indx];
                if (klass.indexOf(Gicon.base) == 0) {
                    var last = klass.lastIndexOf("_") + 1;
                    if (last === 0) {
                        return false;
                    };
                    return klass.substring(last) === value;
                }
            }
            return false;
        },

        setValueIcon: function (value, id, enable) {
            try {
                var cntl = $("#" + id);
                var classList = cntl.attr('class').split(/\s+/);
                for (var indx in classList) {
                    var klass = classList[indx];
                    if (klass.indexOf(Gicon.base) == 0) {
                        var indx = klass.lastIndexOf("_") + 1;
                        var last = klass.substring(indx);
//                        if ( last === 'active' || last == 'enable' || last == 'alert') {
                        var newClass = klass;
                        if ( last.match(Gicon.states)) {
                            newClass = klass.substring(0, indx - 1);
                        }
                        if (enable && (value != Gicon.DISABLED)) {
                            newClass += "_" + value;
                        }
                        if (klass != newClass) {
                            $("#" + id).switchClass(klass, newClass);
                        }
                        return true;
                    }
                }
            } catch (e) {
                Geof.log("Gicon.setValueIcon error - can't locate " + id);
            }
            return false;
        },

        getIcon:function(id) {
            var cntl = $("#" + id);
            var classList = cntl.attr('class').split(/\s+/);
            for (var indx in classList) {
                var klass = classList[indx];
                if (klass.indexOf(Gicon.base) == 0) {
                    return klass;
                }
            }
            return null;
        },

        getState: function(id) {
            var list = $("#" + id).attr('class').split(/\s+/);
            for (var indx in list) {
                var val = list[indx];
                if (val.indexOf(Gicon.base) == 0) {
                    var last = val.substring(val.lastIndexOf("_") + 1);
                    return last.match(Gicon.states) ? last : Gicon.DISABLED;
                }
            }
        },

        isEnabled: function(id) {
            return Gicon.isValueIcon("enable", id);
        },

        setEnabled: function(id, enabled) {
            return Gicon.setValueIcon("enable", id, enabled);
        },

        isActive: function (id) {
            return Gicon.isValueIcon("active", id);
        },

        setActive: function (id, activate) {
            return Gicon.setValueIcon("active", id, activate);
        },

        toggleActive: function (id, activate) {
            if (activate) {
                return Gicon.setValueIcon("active", id, true);
            } else {
                return Gicon.setValueIcon("enable", id, true);
            }
        },

        isAlert: function (id) {
            return Gicon.isValueIcon("alert", id);
        },

        setAlert: function (id, alert) {
            return Gicon.setValueIcon("alert", id, alert);
        },

        is: function (id, state) {
            if (state.match(Gicon.states)) {
                return Gicon.isValueIcon(state, id);
            } else {
                return false;
            }
        },

        set: function (id, state, setOn) {
            if (state.match(Gicon.states)) {
                Gicon.setValueIcon(state, id, setOn);
            }
        },

        setClick:function(control, callback) {
            $("#" + control).click(function() {
                if (Gicon.isValueIcon(Gicon.ENABLE, control)) {
                    callback();
                }
            });
        },

        click:function(control, callback, notState) {
            var cb = function() {
                var state = Gicon.getState(control);
                if ((notState && state != notState) || (state == Gicon.ENABLE)) {
                    callback();
                }
            }
            $("#" + control).click( cb );
        },

        toggle:function(id, callback) {
            $('#' + id).click(function() {
                var enabled = Gicon.isValueIcon("enable", id);
                if (enabled) {
                    Gicon.setValueIcon("active", id, true);
                } else {
                    Gicon.setValueIcon("enable", id, true);
                }
                if (callback) {
                    callback(!enabled);
                }
            });
        },

        switch: function (id, oldIcon, newIcon) {
            $("#" + id).switchClass(oldIcon, newIcon);
        },

        switchFunction: function (opts) {

            var id = opts.id;
            var icon = $("#" + id);
            var onState = opts.onState;
            var onIcon = opts.onIcon;
            var offIcon = opts.offIcon;
            var callback = opts.callback;

            icon.click( function() {
                var value = Gicon.getState(id) == onState;
                if (value) {
                    icon.switchClass(offIcon, onIcon);
                } else {
                    icon.switchClass( onIcon, offIcon );
                }
                if (callback) {
                    callback(value);
                }
            });
        },

        switchDepend: function (opts, state) {

            var id = opts.id;
            var icon = $("#" + id);
            var onState = opts.onState;
            var onIcon = opts.onIcon;
            var offIcon = opts.offIcon;
            var onCallout = opts.onCallout;
            var offCallout = opts.offCallout;

            icon.setState = function(isOn) {
                if (isOn) {
                    icon.switchClass(offIcon, onIcon);
                } else {
                    icon.switchClass( onIcon, offIcon );
                }
            };

            if (state || false ) {
                icon.setState(state)
            }
            icon.click( function() {
                var isOn = Gicon.getIcon(id) == onIcon;
                if (isOn) {
                    offCallout();
                } else {
                    onCallout();
                }
                icon.setState(! isOn);
            });

            return icon;
        }

    };
})()

//----------------------------------------------------------
var Gcontrol = (function() {
    return {
        checkbox:function(id, callback, localdata) {
            var cntl = $("#" + id);
            var checked = GLocal.getBoolean(localdata);
            cntl.prop('checked',checked);

            var cb = function() {
                checked = cntl.is(':checked');
                localStorage.setItem(localdata, checked.toString())
                if (callback) {
                    callback(checked);
                }
            }
            cntl.click(cb);
        }
    };
})()

//----------------------------------------------------------
function getObjectClass(obj) {
    if (obj && obj.constructor && obj.constructor.toString) {
        var arr = obj.constructor.toString().match(
            /function\s*(\w+)/);

        if (arr && arr.length == 2) {
            return arr[1];
        }
    }
    return "";
}

