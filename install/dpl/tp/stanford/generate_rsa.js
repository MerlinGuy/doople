/**
 *
 * Created By: Jeff Boehmer
 * Company: Ft. Collins Research
 * Website: www.ftcollinsresearch.org
 *          www.geofixated.org
 * Date: 1/15/13
 * Time: 12:01 PM
 */

function generateRSA(size, expo) {
    var rsa = new RSAKey();
    rsa.generate( size, expo);
    var newKey = {
        modulus:rsa.n.toString(16),
        exponent:expo,
        p_expo:rsa.d.toString(16),
        p: rsa.p.toString(16),
        q: rsa.q.toString(16),
        dp: rsa.dmp1.toString(16),
        dq:rsa.dmq1.toString(16),
        invq: rsa.coeff.toString(16)
    };
    print(JSON.stringify(newKey));
    return JSON.stringify(newKey);
}

print("Hello World!");
generateRSA(2048, '10001');