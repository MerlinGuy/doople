/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 1/16/13
 * Time: 8:52 AM
 */
SjclAes.DEFAULT_KEY_SIZE = 128;
SjclAes.DEFAULT_AUTH_STRENGTH = 64;
SjclAes.DEFAULT_CIPHER_MODE = 'ccm';

function SjclAes(keysize, authstrength, ciphermode) {

    if (keysize || false) {
        this.keysize = parseInt(keysize); // key size 128,196,256
    } else {
        this.keysize = SjclAes.DEFAULT_KEY_SIZE;
    }

    if (authstrength || false) {
        this.authstrength = parseInt(authstrength); // 64, 96, 128
    } else {
        this.authstrength = SjclAes.DEFAULT_AUTH_STRENGTH;
    }

    if (ciphermode || false) {
        this.ciphermode = ciphermode; // 'ccm' or 'ocb2'
    } else {
        this.ciphermode = SjclAes.DEFAULT_CIPHER_MODE;
    }

    this.iv = null;

    var p = {
        iter:1000,
        mode:'ccm',
        ts:this.authstrength,
        ks:this.keysize,
        salt:sjcl.random.randomWords(2,0)
    };
    var tmp = sjcl.misc.cachedPbkdf2(Geof.session.usr.password, p);
    this.key = tmp.key.slice(0, this.keysize / 32 );
    this.salt = tmp.salt;
    this.aes = null;
    this.mode = sjcl.mode[this.ciphermode];
}

SjclAes.prototype.encrypt = function (plaintext) {

    p = {
        adata:'',
        iter:1000, // salt iterations for key generation
        mode:this.ciphermode, // ccm or ocb2
        ts:this.authstrength, //authentication strength 64,96,128
        ks:this.keysize, // key size 128,196,256
        iv:sjcl.random.randomWords(2, 0)
    };

    var encryptkey;
    if (this.key == null) {
        p.salt = sjcl.random.randomWords(2, 0);
        encryptkey = this.password;
    } else {
        encryptkey = this.key;
    }

    var rp = {};
    var ciphertext = sjcl.encrypt(encryptkey, plaintext, p, rp);
//    var ciphertext = sjcl.encrypt(encryptkey, plaintext, p, rp).replace(/,/g,",\n");

    // rp now holds the iv, salt, and key
    this.iv = rp.iv;
    this.key = rp.key;
//    return JSON.parse(ciphertext).ct;
    return ciphertext.match(/"ct":"([^"]*)"/)[1];
};

/* Decrypt a message */
SjclAes.prototype.decrypt = function (ciphertext, iv) {
    if ((ciphertext == null) || (ciphertext.length == 0)) {
        return "";
    }
//    var rp = {};
    iv = sjcl.codec.hex.toBits(iv);
//    Geof.log("iv: " + iv);
//    ciphertext = sjcl.codec.hex.toBits(ciphertext);
    ciphertext = sjcl.codec.base64.toBits(ciphertext);
//    Geof.log("hex encrypted: " + sjcl.codec.hex.fromBits(ciphertext));
    if (this.aes == null) {
        //noinspection JSPotentiallyInvalidConstructorUsage
        this.aes = new sjcl.cipher.aes(this.key);
    }
    var plaintext;
    try {
        var plainBits = this.mode.decrypt(this.aes, ciphertext, iv, '', this.authstrength);
        plaintext = sjcl.codec.utf8String.fromBits(plainBits);
//        Geof.log("decrypted : " + plaintext);
        return plaintext;
    } catch (e) {
        alert(e);
//        Geof.log(e);
        return null;
    }
};

SjclAes.prototype.decryptStringArray = function (ciphertexts, iv, delimiter) {
    try {
        if ((delimiter === null) || (typeof delimiter === "undefined")) {
            delimiter = ',';
        }
        var decrypted = '';
        var encrypted = ciphertexts.split(delimiter);
        var block;
        for (var i =0; i < encrypted.length; i++) {
            block = encrypted[i];
            if (block.length > 0) {
                decrypted += this.decrypt(block, iv);
            }
        }
        return decrypted;
    } catch (e) {
        alert(e);
        return undefined;
    }
};


SjclAes.prototype.getIvAsHex = function () {
    if (this.iv != null) {
        return sjcl.codec.hex.fromBits(this.iv);
    } else {
        return null;
    }
};

SjclAes.prototype.getKeyAsHex = function () {
    if (this.key != null) {
        return sjcl.codec.hex.fromBits(this.key);
    } else {
        return null;
    }
};

//SjclAes.prototype.getRandomId = function (size) {
//    var wordCount = (size || false) ? size : 4;
//    return sjcl.codec.hex.fromBits(sjcl.random.randomWords(wordCount, 0));
//
//};

SjclAes.hashSHA256 = function (text) {
    var hashedBits = sjcl.hash.sha256.hash(text);
    return sjcl.codec.hex.fromBits(hashedBits);
};