/**
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 11/13/12
 * Time: 8:30 AM
 */

//------------------------------------------------
//------------------------------------------------
function FormFiller(prefix, lookup) {
    this.prefix = prefix;
    this.lookup = lookup;
}

FormFiller.prototype.set = function(data) {
    for (var id in data) {
        this.setControl('#' + this.prefix + id, data[id]);
    }
};

FormFiller.prototype.setCB = function(data) {
    var $cntrl;
    var value;
    var controlId;
    for (var id in data) {
        controlId = '#' + this.prefix + id;
        $cntrl = $(controlId);

        if ($cntrl || false) {
            value = data[id];
            if ((this.lookup != null) && (id in this.lookup)) {
                this.lookup[id](value, this.setControl, controlId);
            } else {
                this.setControl(controlId, value);
            }
        }
    }
};

FormFiller.prototype.setControl = function (controlId, value) {
    var $cntrl = $(controlId);
    var className;

    if ($cntrl || false) {
        className = Geof.cntrl.getObjectClass($cntrl[0]);

        if (className.indexOf("Label") > -1) {
            $cntrl.text(value);

        } else if (className.indexOf("Select") > -1) {
            $cntrl.val(value);

        } else if (className === "") {
            // try a radio button
            var _prefix = this.prefix;
            $("input:radio[name=" + controlId + "][value='" + value + "']").attr('checked', 'checked');

        }  else {
            $cntrl.val(value);
        }
    }

};

