/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 1/3/13
 * Time: 8:22 AM
 */


var Geof_data = (function() {
    return {

        filter: function(data, pattern, columns) {

            var matching = [];
            if (data == null || data.length === 0) {
                return matching;
            }

            if ( Object.prototype.toString.call( columns ) !== '[object Array]' ) {
                Object.keys(data[0]);
            }

            var regex = new RegExp(pattern, 'gi');
            var row;
            for (var key in data) {
                row = data[key];
                for (var indx in columns) {
                    var colValue = row[columns[indx]].toString();
                    if (colValue.match(regex) != null) {
                        matching.push(row);
                        break;
                    }
                }
            }
            return matching;
        },

        constrain: function (data, where, firstOnly) {

            firstOnly = (firstOnly || false) ? true : false;

            var matching = [];
            if (data == null || data.length === 0) {
                return matching;
            }

            var row;
            for (var indx in data) {
                row = data[indx];
                var matched = true
                var where_val, value;
                for (var key in where) {
                    if (key in row) {
                        where_val = where[key];
                        value = row[key];
                        //check to see if the where field is a value or an array
                        if (Object.prototype.toString.call( where_val ) !== '[object Array]') {
                            if ( value !== where_val ) {
                                matched = false;
                                break;
                            }
                        } else {
                            var v_match = false;
                            for (var v_indx in where_val) {
                                if (value === where_val[v_indx]) {
                                    v_match = true;
                                    break;
                                }
                            }
                            matched = v_match;
                        }

                    } else {
                        return matching;
                    }
                }
                if (matched) {
                    matching.push(row);
                    if (firstOnly) {
                        return matching;
                    }
                }
            }
            return matching;
        }
    };
})()