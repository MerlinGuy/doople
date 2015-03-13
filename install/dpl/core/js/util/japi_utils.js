/**
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 11/16/12
 * Time: 8:02 AM
 */
Geof = Geof || {};

Geof.center_in_body = function ($dlg) {
    var wleft = ($(window).width() / 2) - ($dlg.width() / 2);
    var wtop = ($(window).height() / 2) - ($dlg.height() / 2);
    $dlg.css({top:wtop, left:wleft});
    $dlg.show();
};

Geof.can = function(entity, action) {
    if (Geof.security || false ) {
        if (Geof.permissions || false) {
            if (entity in Geof.permissions && action in GRequest) {
                return Geof.permissions[entity][GRequest[action]] == 1;
            }
            return false;
        }
        return false;
    }
    return true;
};

Geof.log = function(obj) {
    console.log(obj);
};

var JsUtil = (function () {
    return {
        isArray:function (obj) {
            return (Object.prototype.toString.call(obj) === '[object Array]');
        },

        isString:function (obj) {
            return (Object.prototype.toString.call(obj) == '[object String]');
        },

        isObject:function (obj) {
            if (obj || false) {
                return typeof obj === 'object'
            } else {
                return false;
            }
        },
        splice:function (aray, item) {
            var len = aray.length;
            for (var indx = 0; indx < len; indx++) {
                if (aray[indx] == item) {
                    aray.splice(indx, 1);
                }
            }
        },
        isDate:function (obj) {
            return (obj instanceof Date);
        },
        spliceAfter:function (aray, item) {
            var len = aray.length;
            for (var indx = 0; indx < len; indx++) {
                if (aray[indx] == item) {
                    aray.splice(indx + 1);
                }
            }
        },
        has:function (val, arry) {
            for (var indx in arry) {
                if (arry[indx] === val) {
                    return true;
                }
            }
            return false;
        },
        spliceByValue:function (array, val) {
            var count = array.length;
            for (var i = 0; i < count; i++) {
                if (array[i] == val) {
                    array.splice(i, 1);
                    break;
                }
            }
        },
        removeChild:function (childId) {
            var c = document.getElementById(childId);
            if (c && c.parentNode) {
                c.parentNode.removeChild(c);
            }
        },
        capitalize:function (s) {
            return s[0].toUpperCase() + s.slice(1);
        },

        changeField:function (obj, field, func) {
            if (JsUtil.isArray(obj)) {
                for (var indx in obj) {
                    JsUtil.changeField(obj[indx], field, func);
                }
            } else {
                if (field in obj) {
                    obj[field] = func(obj[field]);
                }
            }
        },

        appendField:function (obj, addField, field, func) {
            if (JsUtil.isArray(obj)) {
                for (var indx in obj) {
                    JsUtil.appendField(obj[indx], addField, field, func);
                }
            } else {
                if (field in obj) {
                    obj[addField] = func(obj[field]);
                }
            }
        },
        merge:function (from, to, inTo) {
            if (from === undefined || to === undefined) {
                return;
            }

            for (var indx in from) {
                if (inTo) {
                    if (indx in to) {
                        to[indx] = from[indx];
                    }
                } else {
                    to[indx] = from[indx];
                }
            }
        },
        numberToHex:function (c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        },
        rgbToHex:function (r, g, b) {
            return "#" + JsUtil.numberToHex(r) + JsUtil.numberToHex(g) + JsUtil.numberToHex(b);
        },
        toInt:function (str, dft) {
            var num = parseInt(str);
            if (isNaN(num)) {
                if (dft || false) {
                    num = dft;
                } else {
                    num = null;
                }
            }
            return num;
        },
        getName:function (obj, value) {
            for (var indx in obj) {
                if (obj[indx] == value) {
                    return indx;
                }
            }
        },
        js_or:function (obj, value) {
            return obj || false ? obj : value;
        },
        objToArray:function (obj) {
            var aray = [];
            for (var indx in obj) {
                aray.push(obj[indx]);
            }
            return aray;
        },
        hasValue:function (fieldName) {
            return $("#" + fieldName).val().length > 0;
        }

    };
})();

function FuncQueue() {
    this.queue = [];
    var _this = this;

    this.push = function(func) {
        _this.queue.push(func);
    };

    this.pop = function() {
        if (_this.queue.length > 0) {
            _this.queue.pop()();
        }
    };

    this.start = function() {
        _this.pop();
    };

    this.jump = function(indx) {
        var len = _this.queue.length;
        if (len > indx) {
            var splic = indx + 1;
            if (len > splic) {
                _this.queue.splice(splic, len - splic)
            }
            _this.pop()
        }
    }
}

var GLocal = (function () {
    return {
        set:function (field, value) {
            localStorage.setItem(field, value.toString());
        },
        get:function (field, dftvalue) {
            return localStorage.getItem(field) || dftvalue;
        },
        getBoolean:function (field) {
            return localStorage.getItem(field) === 'true';
        },
        setBoolean:function (field, value) {
            localStorage.setItem(field, value === true ? 'true' : 'false');
        },
        getJson:function (field) {
            var value = localStorage.getItem(field);
            if (value && value.length > 0) {
                try {
                    return JSON.parse(value);
                } catch (e) {
                    return undefined;
                }
            } else {
                return undefined;
            }
        },
        setJson:function (field, value) {
            if (value != null && typeof value == 'object') {
                localStorage.setItem(field, JSON.stringify(value));
            }
        },
        getInt:function (field) {
            var value = localStorage.getItem(field);
            try {
                return parseInt(value);
            } catch (e) {
                return undefined;
            }
        },
        getFloat:function (field) {
            var value = localStorage.getItem(field);
            try {
                return parseFloat(value);
            } catch (e) {
                return undefined;
            }
        }

    };
})();

var JFormat = (function () {

    return {
        TAB:'\t',
        LF:'\r',
        format:function (jsonStr) {

            var str = jsonStr;
            if (jsonStr instanceof Object) {
                str = JSON.stringify(jsonStr);
            }

            var len = str.length;
            var output = '';
            var tabcnt = 0;
            var chr = '';
            var loc = 0;
            var lastchr = '';
            var inquote = false;

            while (loc < len) {
                chr = str.charAt(loc);
                if (chr == '"') {
                    inquote = !inquote;
                }
                if (chr == '{' || chr == '[') {
                    output += chr + JFormat.LF;
                    tabcnt++;
                    output += JFormat.getTabs(tabcnt);

                } else if (chr == '}' || chr == ']') {
                    tabcnt--;
                    output += JFormat.LF + JFormat.getTabs(tabcnt) + chr;

                } else if ((chr == ',') && (!inquote)) {
                    output += chr + JFormat.LF;
                    output += JFormat.getTabs(tabcnt);
                } else {
                    output += chr;
                }
                loc++;
                lastchr = chr;
            }
            return output;
        },

        lpad:function (str, pad, len) {
            for (var i = 0; i < len; i++) {
                str = pad + str;
            }
            return str.slice(len * -1);
        },

        fixed:function (val, places, dft) {
            if (val || false) {
                return parseFloat(val).toFixed(places);
            } else {
                return dft;
            }
        },

        getTabs:function (cnt) {
            var rtn = '';
            for (var I = 0; I < cnt; I++) {
//                rtn += '&nbsp;&nbsp;&nbsp;&nbsp;';
                rtn += JFormat.TAB;
            }
            return rtn;
        },

        decodeRequests:function (data) {
            var req
            for (var key in data.requests) {
                req = data.requests[key];
                if (req.encode) {
                    req.data = JFormat.decodeJsonObject(req.data);
                }
            }
        },

        decodeJsonObject:function (obj) {
            if (typeof obj == "string") {
                try {
                    return base64.decode(obj);
                } catch (e) {
                    return obj;
                }
            } else var item;
            if (obj instanceof Array) {
                for (key in obj) {
                    item = obj[key];
                    obj[key] = JFormat.decodeJsonObject(item);
                }
                return obj;

            } else { // not sure try and decode
                try {
                    return base64.decode(obj);
                } catch (e) {
                    return obj;
                }
            }
        }
    }
})();

var Datatype = (function () {

    var _datatypes = {
        'BOOLEAN':'16',
        'CHAR':'1',
        'CLOB':'2005',
        'DATALINK':'70',
        'DATE':'91',
        'DECIMAL':'3',
        'DISTINCT':'2001',
        'DOUBLE':'8',
        'FLOAT':'6',
        'INTEGER':'4',
        'JAVA_OBJECT':'2000',
        'LONGNVARCHAR':'-16',
        'LONGVARBINARY':'-4',
        'LONGVARCHAR':'-1',
        'NCHAR':'-15',
        'NCLOB':'2011',
        'NULL':'0',
        'NUMERIC':'2',
        'NVARCHAR':'-9',
        'SPATIAL':'1111',
        'REAL':'7',
        'REF':'2006',
        'ROWID':'-8',
        'SMALLINT':'5',
        'SQLXML':'2009',
        'STRUCT':'2002',
        'TIME':'92',
        'TIMESTAMP':'93',
        'TINYINT':'-6',
        'VARBINARY':'-3',
        'VARCHAR':'12', 'TRUE/FALSE':'-7'
    };

    var _rev_datatypes = {
        '16':'BOOLEAN', '1':'CHAR', '2005':'CLOB', '70':'DATALINK', '91':'DATE', '3':'DECIMAL', '2001':'DISTINCT', '8':'DOUBLE', '6':'FLOAT', '4':'INTEGER', '2000':'JAVA_OBJECT', '-16':'LONGNVARCHAR', '-4':'LONGVARBINARY', '-1':'LONGVARCHAR', '-15':'NCHAR', '2011':'NCLOB', '0':'NULL', '2':'NUMERIC', '-9':'NVARCHAR', '1111':'SPATIAL', '7':'REAL', '2006':'REF', '-8':'ROWID', '5':'SMALLINT', '2009':'SQLXML', '2002':'STRUCT', '92':'TIME', '93':'TIMESTAMP', '-6':'TINYINT', '-3':'VARBINARY', '12':'VARCHAR', '-7':'TRUE/FALSE'
    };


    return {

        getType:function (value) {
            if (!value in _rev_datatypes) {
                Geof.log("getType not found for " + value);
            }

            return _rev_datatypes[value];
        },

        getConstant:function (name) {
            var key = name.toUpperCase();
            return _datatypes[key];
        }
    }
})();

var PhraseParser = (function () {

    return {

        parse:function (text, encode) {

            encode = encode || false;
            var phrases = [];
            var phrase = '';

            var inQuotes = false;
            var isEscaped = false;
            var COMMA = ',';
            var DQ = '"';
            var SPACE = ' ';
            var ESCAPE = '\\';
            var TAB = '\t';

            var length = text.length;
            var chr = null;

            for (var indx = 0; indx < length; indx++) {
                chr = text[indx];

                if (isEscaped) {
                    phrase += chr;
                    isEscaped = false;
                    continue;
                }

                if (chr === ESCAPE) {
                    isEscaped = true;
                    continue;
                }

                if (inQuotes) {
                    if (chr === DQ) {
                        inQuotes = false;
                        PhraseParser.addPhrase(phrases, phrase, encode);
                        phrase = "";
                    } else {
                        phrase += chr;
                    }
                } else if (chr === TAB || chr === SPACE || chr === COMMA) {
                    PhraseParser.addPhrase(phrases, phrase, encode);
                    phrase = "";
                } else if (chr === DQ) {
                    inQuotes = true;
                    PhraseParser.addPhrase(phrases, phrase, encode);
                    phrase = "";
                } else {
                    phrase += chr;
                }
            }
            PhraseParser.addPhrase(phrases, phrase, encode);
            return phrases;
        },

        addPhrase:function (phrases, phrase, encode) {
            if (phrase.length > 0) {
                if (encode || false) {
                    phrase = base64.encode(phrase);
                }
                phrases.push(phrase);
            }
        },

        format:function (phrases) {
            var str = '';
            var count = phrases.length;
            for (var indx = 0; indx < count; indx++) {
                str += '\"' + phrases[indx].replace(new RegExp('\"', "g"), "\\\"") + '\" ';
            }
            if (str.length > 0) {
                str = str.substr(0, str.length - 1);
            }
            return str;
        },

        encode:function (phrases) {
            return base64.encode(PhraseParser.format(phrases));
        }
    }

})();

var DateUtil = (function () {

    return {
        dateFromFilename:function (filename) {
            //split off extension.
            filename = filename.split('.')[0];

            var indx = filename.indexOf('_');
            if (indx === -1) {
                // unknown format
                return null
            }

            var pieces = filename.split('_');
            if (pieces.length > 3) {
                // unknown format
                return null;
            }

            var date = pieces[0];
            indx = date.indexOf('-');
            if (indx === -1) {
                if (date.length === 8) {
                    date = date.substr(0, 4) + '-' + date.substr(4, 2) + '-' + date.substr(6, 2);
                } else {
                    // unknown format
                    return null;
                }
            } else {
                date = pieces[0].split('-');
                if (date.length === 3) {
                    if ((date[0].length === 4) && (date[1].length === 2) && (date[2].length === 2)) {
                        // format okay as is
                        date = pieces[0];
                    } else {
                        // unknown format
                        return null;
                    }
                } else {
                    // unknown format
                    return null;
                }
            }

            var time = pieces[1].split(':');
            if (time.length === 3) {
                // assume HH:MM:SS
                time = pieces[1];
            } else {
                indx = pieces[1].indexOf('-');
                if (indx === -1) {
                    time = pieces[1];
                    if (time.length === 6) {
                        // assume HHMMSS
                        time = time.substr(0, 2) + ':' + time.substr(2, 2) + ':' + time.substr(4, 2);
                    } else {
                        // unknown format
                        return null;
                    }

                } else {
                    time = pieces[1].split('-');
                    if (time.length === 3) {
                        // assume format HH-MM-SS
                        time = pieces[1].replace(new RegExp('-', "g"), ':');
                    } else {
                        // unknown format
                        return null;
                    }
                }
            }
            return date + ' ' + time;

        },

        getSvrDate:function (datetime, dateSep, timeSep) {
            if (datetime == null || datetime.length == 0) {
                return null;
            }
            try {
                var delim = datetime.indexOf("T") > -1 ? "T" : " ";
                var indx = datetime.indexOf("Z");
                var isGMT = false;
                if (indx > -1) {
                    //TODO: handle zulu time marker
                    datetime = datetime.substring(0, indx);
                    isGMT = true;
                }

                var parts = datetime.split(delim);
                if (parts.length != 2) {
                    return null;
                }
                var dateSep = dateSep || '-';
                var date = parts[0].split(dateSep);
                if (date.length != 3) {
                    return null;
                }
                var year = null;
                var month = null;
                var day = null;
                if (dateSep == '-') {
                    if (date[2].length == 4) {
                        day = date[1];
                        month = date[0];
                        year = date[2];
                    } else {
                        year = date[0];
                        month = date[1];
                        day = date[2];
                    }
                } else {
                    day = date[1];
                    month = date[0];
                    year = date[2];
                }

                var timeSep = timeSep || ':';
                var time = parts[1].split(timeSep);

                if (time.length < 2) {
                    return null;
                }
                var hour = time[0];
                var minute = time[1];
                var second = '00';
                if (time.length == 3) {
                    second = parseInt(time[2]);
                }

                return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;

            } catch (exception) {
                return null;
            }
        },

        isValidSvrDate:function (datetime, dateSep, timeSep) {
            if (datetime == null || datetime.length == 0) {
                return false;
            }
            try {
                var parts = datetime.split(' ');
                if (parts.length != 2) {
                    return false;
                }
                var dateSep = dateSep || '-';
                var date = parts[0].split(dateSep);
                if (date.length != 3) {
                    return false;
                }
                var year = null;
                var month = null;
                var day = null;
                if (dateSep == '-') {
                    year = parseInt(date[0]);
                    month = parseInt(date[1]);
                    day = parseInt(date[2]);
                } else {
                    day = parseInt(date[0]);
                    month = parseInt(date[1]);
                    year = parseInt(date[2]);
                }

                var timeSep = timeSep || ':';
                var time = parts[1].split(timeSep);

                if (time.length < 2) {
                    return false;
                }
                var hour = parseInt(time[0]);
                var minute = parseInt(time[1]);
                var second = 0;
                if (time.length == 3) {
                    second = parseInt(time[2]);
                }

                var d = new Date(year, month, day, hour, minute, second);
                if (isNaN(d)) {
                    return false;
                } else {
                    if (year != d.getFullYear()) {
                        return false;
                    }
                    if (month != d.getMonth()) {
                        return false;
                    }
                    if (day != d.getDate()) {
                        return false;
                    }
                    if (hour != d.getHours()) {
                        return false;
                    }
                    if (minute != d.getMinutes()) {
                        return false;
                    }
                    if (second != d.getSeconds()) {
                        return false;
                    }
                }

                return true;
            } catch (exception) {
                return false;
            }
        },

        parseDate:function (datetime, dateSep, timeSep) {
            if (datetime == null || datetime.length == 0) {
                return null;
            }
            if (JsUtil.isDate(datetime)) {
                return datetime;
            }
            try {
                var delim = datetime.indexOf("T") > -1 ? "T" : " ";
                var indx = datetime.indexOf("Z");
                var isGMT = false;
                if (indx > -1) {
                    //TODO: handle zulu time marker
                    datetime = datetime.substring(0, indx);
                    isGMT = true;
                }

                var parts = datetime.split(delim);
                if (parts.length < 2) {
                    return false;
                }
                var dateSep = dateSep || '-';
                if (parts[0].indexOf('-') > 0) {
                    dateSep = '-';
                } else if (parts[0].indexOf('/') > 0) {
                    dateSep = '/';
                } else if (parts[0].indexOf('_') > 0) {
                    dateSep = '_';
                }
                var date = parts[0].split(dateSep);
                if (date.length < 3) {
                    return false;
                }

                var year = parseInt(date[0]);
                var month = parseInt(date[1]);
                var day = parseInt(date[2]);
                if (day > 31) {
                    year = parseInt(date[2]);
                    month = parseInt(date[0]);
                    day = parseInt(date[1]);
                }

                var timeSep = timeSep || ':';
                var time = parts[1].split(timeSep);
                if (time.length < 2) {
                    return false;
                }
                var hour = parseInt(time[0]);
                var minute = parseInt(time[1]);
                var second = 0;
                if (time.legnth > 2) {
                    second = parseInt(time[2]);
                }

                var date = new Date(year, month - 1, day, hour, minute, second);
                if (isGMT) {
                    // TODO handle the GMT switch here.

                }
                return date;
            } catch (exception) {
                return null;
            }
        },

        parseToPickerDate:function (datetime) {
            if (datetime.indexOf(':') == -1) {
                return null;
            }
            if (datetime.indexOf('/') > -1) {
                datetime = DateUtil.parseDate(datetime, '/', ':');
            } else if (datetime.indexOf('-') > -1) {
                datetime = DateUtil.parseDate(datetime, '-', ':');
            } else {
                return null;
            }
            return DateUtil.toPickerDate(datetime);
        },

        formatSvrDate:function (datetime) {
            if (datetime == null) {
                return '';
            }
            if (JsUtil.isString(datetime)) {
                datetime = DateUtil.parseDate(datetime);
            }
            if (!DateUtil.isValidDate(datetime)) {
                return '';
            }
            try {
                var year = datetime.getFullYear();
                var month = "0" + (datetime.getMonth() + 1);
                month = month.slice(-2);
                var day = "0" + datetime.getDate();
                day = day.slice(-2);
                var hour = "0" + datetime.getHours();
                hour = hour.slice(-2);
                var minute = "0" + datetime.getMinutes();
                minute = minute.slice(-2);
                var second = "0" + datetime.getSeconds();
                second = second.slice(-2);
                var millisecond = "000" + datetime.getMilliseconds();
                millisecond = millisecond.slice(3);
                return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second + "." + millisecond;

            } catch (exception) {
                return '';
            }
        },

        todaySvrDate:function () {
            var datetime = new Date();
            try {
                var year = datetime.getFullYear();
                var month = "0" + (datetime.getMonth() + 1);
                month = month.slice(-2);
                var day = "0" + datetime.getDate();
                day = day.slice(-2);
                return year + "-" + month + "-" + day + " 00:00:00";
            } catch (exception) {
                return '';
            }
        },

        todayPickerDate:function () {
            return DateUtil.toPickerDate(new Date());
        },

        toPickerDate:function (datetime, showTime) {
            try {
                var year = datetime.getFullYear();
                var month = "0" + (datetime.getMonth() + 1);
                month = month.slice(-2);
                var day = "0" + datetime.getDate();
                day = day.slice(-2);
                var date = month + "/" + day + "/" + year
                if (showTime || false) {
                    return date + " " + ("0" + datetime.getHours()).slice(-2)
                        + ":" + ("0" + datetime.getMinutes()).slice(-2)
                        + ":" + ("0" + datetime.getSeconds()).slice(-2);
                } else {
                    return date + " 00:00";
                }
            } catch (exception) {
                return '';
            }
        },

        currentTime:function (millis) {
            var time = new Date();
            var hr = '0' + time.getHours();
            hr = hr.substr(hr.length - 2);
            var mn = '0' + time.getMinutes();
            mn = mn.substr(mn.length - 2);
            var sec = '0' + time.getSeconds();
            sec = sec.substr(sec.length - 2);
            var rtn = hr + ':' + mn + ":" + sec;
            if (millis) {
                var ms = '000' + time.getMilliseconds();
                rtn += "." + ms.substr(ms.length - 3);
            }
            return rtn;
        },

        getNowSvrDate:function () {
            return DateUtil.formatSvrDate(new Date());
        },

        getMilliseconds:function (format) {
            var rtn = (new Date()).getTime();
            if (format || false) {
                if (format === 's') {
                    rtn = Math.round(rtn / 1000);
                } else if (format === 'm') {
                    rtn = Math.round(rtn / 60000);
                } else if (format === 'h') {
                    rtn = Math.round(rtn / 3600000);
                } else if (format === 'd') {
                    rtn = Math.round(rtn / (3600000 * 24));
                }
            }
            return rtn;
        },

        getFileDate:function (file) {
            var filedate = file.lastModifiedDate;
            var parseDate = DateUtil.getSvrDate(DateUtil.dateFromFilename(file.name));
            if (parseDate != null) {
                return parseDate;
            }
            return filedate;
        },

        isValidDate:function (date) {
            if (date || false) {
                if (Object.prototype.toString.call(date) == "[object Date]") {
                    return !isNaN(date.getTime());
                }
            }
            return false;
        },

        convertToGMT:function (date) {
            return new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
        },

        getMaxDate:function (date1, date2) {
            if (date1 || false) {
                if (date2 || false) {
                    return date1.getTime() > date2.getTime() ? date1 : date2;
                } else {
                    return null;
                }
            } else {
                return date2 || false ? date2 : null;
            }
        },

        getMinDate:function (date1, date2) {
            if (date1 || false) {
                if (date2 || false) {
                    return date1.getTime() < date2.getTime() ? date1 : date2;
                } else {
                    return null;
                }
            } else {
                return date2 || false ? date2 : null;
            }
        },

        isBefore:function (date1, date2) {
            return DateUtil.getMinDate(date1, date2) == date1;
        },

        getDateDiff:function (date1, date2) {
            if ((date1 || false) && (date2 || false)) {
                return date1.getTime() - date2.getTime();
            } else {
                return 0;
            }
        }
    }
})();

var ActionTimer = function () {
    this.start = null;
    this.seconds = null;
};

ActionTimer.prototype.start = function () {
    this.start = new Date();
    this.seconds = this.start / 1000;
    Geof.log("ActionTimer.started at " + this.start.toLocaleTimeString());
};

ActionTimer.prototype.mark = function (name) {
    var datetime = new Date();
    var seconds = datetime / 1000;
    Geof.log("mark " + name + " : " + (seconds - this.seconds));
};

var Templater = (function () {
    return {

        createSOLTmpl:function (data, $parent, template) {
            // Selectable Ordered List
            for (var indx in data) {
                var row = data[indx];
                $parent.append(Templater.mergeTemplate(row, template));
            }
            return $parent;
        },

        createEntityList:function (data, $parent, template, stati) {
            // Selectable Ordered List
            for (var indx in data) {
                var row = data[indx];
                $parent.append(Templater.mergeEntityTemplate(row, template, stati));
            }
            return $parent;
        },

        createEntityFieldList:function (data, $parent) {
            $parent.empty();
            var innerHtml = '';
            for (var key in data) {
                $parent.append(Templater.createEntityFieldLineitem(data[key]));
            }
            return $parent;
        },

        createEntityFieldLineitem:function (efield) {
            var disabled = 'disabled="disabled"';
            var fname = efield.fieldname;
            var html = '<li class="ui-widget-content" id="' + fname + '">' + fname;

//            this.colNames = {'isdefault':0,'ispkey':1,'datatype':2,'isrequired':3,'isauto':4,'isspatial':5,'istemporal':6};
            html += Templater.mergeEfCbTmpl(efield.fieldname, 6, efield.columns[6], '')
                + Templater.mergeEfCbTmpl(efield.fieldname, 5, efield.columns[5], '')
                + Templater.mergeEfCbTmpl(efield.fieldname, 4, efield.columns[4], disabled)
                + Templater.mergeEfCbTmpl(efield.fieldname, 3, efield.columns[3], disabled)
                + '<LABEL class="entityfieldLabel">' + Datatype.getType(efield.columns[2]) + '</LABEL>'
                + Templater.mergeEfCbTmpl(efield.fieldname, 1, efield.columns[1], disabled)
                + Templater.mergeEfCbTmpl(efield.fieldname, 0, efield.columns[0], '');

            html += '</li>';
            return html;
        },

        mergeEfCbTmpl:function (fieldname, indx, ischecked, disabled) {
            var ckd = ischecked ? 'checked="checked"' : '';
            var rtn = rtn.replace(new RegExp('%fieldname', "g"), fieldname);
            var rtn = rtn.replace(new RegExp('%indx', "g"), indx);
            var rtn = rtn.replace(new RegExp('%chkd', "g"), ckd);
            var rtn = rtn.replace(new RegExp('%disabled', "g"), disabled);
            return rtn;
        },

        mergeSessionTemplate:function (row, template) {
            var rtn = template.replace(new RegExp('%sid', "g"), Geof.session.sessionId);
            for (var key in row) {
                rtn = rtn.replace(new RegExp('%' + key, "g"), row[key]);
            }
            return rtn;
        },

        mergeTemplate:function (row, template) {
            var rtn = template;
            for (var key in row) {
                rtn = rtn.replace(new RegExp('%' + key, "g"), row[key]);
            }
            return rtn;
        },

        mergeEntityTemplate:function (row, template, stati) {
            var rtn = template;
            for (var key in row) {
                rtn = rtn.replace(new RegExp('%' + key, "g"), row[key]);
                rtn = rtn.replace(new RegExp('%status', "g"), stati[row['status']]);
            }
            return rtn;
        },

        createOptions:function (uuid, rows, template) {
            var rtn = '';
            for (var rowIndex in rows) {
                var row = rows[rowIndex];
                var option = template;
                if (uuid != null) {
                    option = template.replace(new RegExp('%uuid', "g"), uuid);
                }
                for (var key in row) {
                    option = option.replace(new RegExp('%' + key, "g"), row[key]);
                }
                rtn += option;
            }
            return rtn;
        }

    };
})();

var FileUtil = (function () {

    return {
        requestFS:(window.requestFileSystem || window.webkitRequestFileSystem || window.mozRequestFileSystem ),
        file:null,
        filename:null,
        directory:null,
        successCB:null,
        failCB:null,

        onerror:function (message) {
            alert(message);
        },

        createTempFile:function (filename, directory, successCB, failCB, size) {
            if (!(size || false)) {
                size = 4 * 1024 * 1024;
            }
            FileUtil.directory = (directory || false) ? directory : null;
            FileUtil.filename = (filename || false) ? filename : "tmp.dat";
            FileUtil.requestFS(window.TEMPORARY, size, FileUtil.gotFileSystem, failCB);
        },

        gotFileSystem:function (fileSystem) {
            if (FileUtil.directory == null) {
                fileSystem.root.getFile(FileUtil.filename, {create:true}, FileUtil.gotFile);
            } else {
                fileSystem.root.getDirectory(FileUtil.directory, {create:true}, FileUtil.gotDirectory);
            }
        },

        gotDirectory:function (dirEntry) {
            dirEntry.getFile(FileUtil.filename, {create:true, exclusive:true}, FileUtil.gotFile);
        },

        gotFile:function (fileEntry) {
            FileUtil.successCB(fileEntry);
        },

        writeTempFile:function (file, callback, failcallback) {
            FileUtil.file = file;
            FileUtil.successCB = callback;
            FileUtil.createTempFile(null, null, FileUtil.writeTempFileCB, failcallback);
        },

        writeTempFileCB:function (fileEntry) {
            var writer = new zip.FileWriter(fileEntry);
            FileUtil.file.getData(writer, FileUtil.successCB, null);
        },

        unzip:function (file, successCB) {
            zip.createReader(new zip.BlobReader(file), function (zipReader) {
                zipReader.getEntries(successCB);
            }, FileUtil.onerror);
        },
        getExtension:function (filename) {
            var indx = filename.lastIndexOf(".") + 1;
            if ((indx === 0) || ( indx == filename.length)) {
                return null;
            }
            return filename.substring(indx);
        },
        extensionEq:function (filename, ext) {
            if ((filename || false) && (ext || false) && (ext.length > 0) && (filename.length > 0)) {
                var indx = filename.lastIndexOf(".") + 1;
                if (indx > 0) {
                    return filename.substring(indx).toLowerCase() == ext.toLowerCase();
                }
            }
            return false;
        },

        getVideoDuration:function (file, callback) {
            var html = '<video id="video_duration_tmp" controls class="hidden" />';
            $('body').append(html);
            var vid = document.getElementById("video_duration_tmp");
            vid.autoplay = false;
            vid.loop = false;
            vid.style.display = "none";

            vid.addEventListener("loadeddata", function () {
                // Let's wait another 100ms just in case?
                setTimeout(function () {
                    var duration = vid.duration;
//                    vid.src = ' ';
//                    vid.load();
                    $("#video_duration_tmp").remove();
                    if (callback || false) {
                        callback(duration);
                    } else {
                        file.duration = duration;
                    }
                });

            }, false);

            vid.src = URL.createObjectURL(file);
            vid.load();
        },

        setMediaPlugin:function (file, elementid, callback) {
            // Only process image files.
            var $element = $('#' + elementid);
            var func = null;
            if (file.type.match('image.*')) {
                func = (function (theFile) {
                    return function (e) {
                        var img = Geof.cntrl.upload.image_tmpl.replace(new RegExp('%filename', "g"), escape(theFile.name));
                        $element.html(img.replace(new RegExp('%result', "g"), e.target.result));
                    };
                })(file);
            } else if (file.type.match('video.*')) {
                func = (function (theFile) {
                    return function (e) {
                        $element.html(Geof.cntrl.upload.video_tmpl);
                        var vp = document.getElementById('uplPreviewVideo');
                        vp.src = URL.createObjectURL(theFile);
                        var cb = function () {
                            setTimeout(function () {
                                file.duration = vp.duration;
                                if (callback) {
                                    callback(file);
                                }
                            });
                        }
                        vp.addEventListener("loadeddata", cb, false);
                        vp.load();
                    };
                })(file);
            }
            if (func != null) {
                var reader = new FileReader();
                reader.onload = func;
                reader.readAsDataURL(file);
            }
        }
    }

})();

var FileInfo = (function () {
    var _status = ['offline', 'online', 'upload'];
    var _filetype = ['photo', 'video', 'audio', 'document', 'shape', 'track'];
    var _view = ['0 deg', '90 deg', '180 deg', '270 deg'];
    var _registered = {};
//    var _storage = {};
//    var _storageDir = {};

    return {

        getFiletype:function (value, cb, controlId) {
            if (cb || false) {
                cb(controlId, _filetype[value])
            } else {
                return _filetype[value];
            }
        },

        getStatus:function (value, cb, controlId) {
            if (cb || false) {
                cb(controlId, _status[value])
            } else {
                return _status[value];
            }
        },

        getView:function (value, cb, controlId) {
            if (cb || false) {
                cb(controlId, _view[value < 0 ? 0 : value])
            } else {
                return _view[value < 0 ? 0 : value];
            }
        },

        getRegistered:function (value, cb, controlId) {
            if (cb || false) {
                if (value in _registered) {
                    cb(controlId, _registered[value]);
                } else {
                    var svrdb = function (req) {
                        var data = req[0].data[0];
                        var usrname = data['lastname'] + ', ' + data['firstname'];
                        _registered[value] = usrname;
                        cb(controlId, usrname);
                    };
                    var obj = {"entity":"usr", "action":"read", "data":{"where":{"id":value}}};
                    TransMgr.sendNow(GRequest.fromJson(obj), svrdb);
                }
            } else {
                return (value in _registered) ? _registered[value] : "Unknown";
            }
        },

        getStorageName:function (value, cb, controlId) {
            var name = Geof.cntrl.storage.storageName(value, null);
            cb(controlId, name);
        }

    }
})();

