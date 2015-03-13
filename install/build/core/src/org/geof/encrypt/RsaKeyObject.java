package org.geof.encrypt;

import org.bouncycastle.jcajce.provider.asymmetric.rsa.BCRSAPrivateCrtKey;
import org.bouncycastle.jcajce.provider.asymmetric.rsa.BCRSAPublicKey;
import org.json.JSONObject;

import java.security.KeyPair;

public class RsaKeyObject {

	public KeyPair _keypair = null;
	public String modulus = null;
	public String exponent = null;
	public String pexponent = null;
	public String p = null;
	public String q = null;
	public String dP = null;
	public String dQ = null;
	public String qinv = null;
	public long id = -1;
	
	public RsaKeyObject(KeyPair keypair, long id){
		_keypair = keypair;
		BCRSAPrivateCrtKey prvCrtKey = (BCRSAPrivateCrtKey) keypair.getPrivate();
		BCRSAPublicKey pubKey = (BCRSAPublicKey)keypair.getPublic();
		modulus = pubKey.getModulus().toString(16);
		exponent =  pubKey.getPublicExponent().toString(16);
		pexponent =  prvCrtKey.getPrivateExponent().toString(16);
		p =  prvCrtKey.getPrimeP().toString(16);
		q =  prvCrtKey.getPrimeQ().toString(16);
		dP =  prvCrtKey.getPrimeExponentP().toString(16);
		dQ = prvCrtKey.getPrimeExponentQ().toString(16);
		qinv = prvCrtKey.getCrtCoefficient().toString(16);
		this.id = id;
	}
	
	public JSONObject toJSONObject() throws Exception {
		JSONObject json = new JSONObject();
		json.put("id", this.id);
		json.put("modulus", this.modulus);
		json.put("exponent", this.exponent);
		json.put("pexponent", this.pexponent);
		json.put("p", this.p);
		json.put("q", this.q);
		json.put("dP", this.dP);
		json.put("dQ", this.dQ);
		json.put("qinv", this.qinv);
		
		return json;
	}
	public JSONObject toJsonPublic() throws Exception {
		JSONObject json = new JSONObject();
		json.put("id", this.id);
		json.put("modulus", this.modulus);
		json.put("exponent", this.exponent);
		return json;
	}
}
