package org.geof.encrypt;

import java.math.BigInteger;
import java.security.KeyPair;
import java.security.Security;
import java.sql.ResultSet;
import java.util.HashMap;

import org.bouncycastle.crypto.AsymmetricBlockCipher;
import org.bouncycastle.crypto.encodings.PKCS1Encoding;
import org.bouncycastle.crypto.engines.RSAEngine;
import org.bouncycastle.crypto.params.RSAKeyParameters;
import org.bouncycastle.crypto.params.RSAPrivateCrtKeyParameters;
import org.bouncycastle.jcajce.provider.asymmetric.rsa.BCRSAPrivateCrtKey;
import org.bouncycastle.jcajce.provider.asymmetric.rsa.BCRSAPublicKey;
import org.geof.db.DBInteract;
import org.geof.db.ParameterList;
import org.geof.log.Logger;
import org.geof.request.Request;

public class CipherMgr {

	public final static String MODULUS = "modulus";
	public final static String EXPONENT = "exponent";
	public final static String PEXPONENT = "pexponent";
	public final static String P = "p";
	public final static String Q = "q";
	public final static String DP = "dp";
	public final static String DQ = "dq";
	public final static String QINV = "qinv";
	public final static String AesCipherType = "AES/CCM/NoPadding";

	public final static String _sqlCreateRsa = "INSERT INTO rsaencryption (modulus,exponent,pexponent,p,q,dp,dq,qinv) VALUES (?,?,?,?,?,?,?,?) RETURNING id";

	private HashMap<Integer, AsymmetricBlockCipher> _RsaMap = new HashMap<Integer, AsymmetricBlockCipher>();

	private static CipherMgr _instance = null;

	private CipherMgr() {
		Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
	}

	/**
	 * Returns the singleton instance of Encryption Cipher Manager
	 * 
	 */

	public static void initialize() {
		try {
			if (_instance == null) {
				_instance = new CipherMgr();
				Logger.writeInit("*** CipherMgr.initialized");
			}
		} catch (Exception e) {
			Logger.error(e);
		}
	}
	
	/**
	 *
	 * @return  A the next available database connection from the pool.
	 */
	public static AsymmetricBlockCipher getRsa(Integer id, DBInteract dbi) {
		AsymmetricBlockCipher abc = null;
		if (_instance._RsaMap.containsKey(id)) {
			abc = _instance._RsaMap.get(id);
		} else {
			abc = CipherMgr.getRsaFromStorage(id, dbi);
		}
		return abc;
	}
		
	public static AsymmetricBlockCipher removeRsa(Integer id) {
		return _instance._RsaMap.remove(id);
	}
		
	public static AsymmetricBlockCipher getRsaFromStorage(Integer id, DBInteract dbi) {
		boolean disposeDbi = false;

		try {
			if (dbi == null) {
				dbi = new DBInteract();
				disposeDbi = true;
			}
			Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
			
			String sql = "SELECT modulus,exponent,pexponent,p,q,dp,dq,qinv FROM rsaencryption WHERE id=?";
			ParameterList pl = new ParameterList("rsaencryption");
			pl.add(Request.ID, id);
			ResultSet rs = dbi.getResultSet(sql, pl);
			if (rs.next()) {
				BigInteger modulus = new BigInteger(rs.getString(MODULUS),16);
				BigInteger exponent = new BigInteger(rs.getString(EXPONENT),16);		
				BigInteger pexponent = new BigInteger(rs.getString(PEXPONENT),16);		
				BigInteger p = new BigInteger(rs.getString(P),16);
				BigInteger q = new BigInteger(rs.getString(Q),16);
				BigInteger dP = new BigInteger(rs.getString(DP),16);
				BigInteger dQ = new BigInteger(rs.getString(DQ),16);
				BigInteger qInv = new BigInteger(rs.getString(QINV),16);
			
				RSAKeyParameters prvParams =  new RSAPrivateCrtKeyParameters(modulus, exponent, pexponent, p, q, dP, dQ, qInv);

				AsymmetricBlockCipher eng = new RSAEngine();				
				eng = new PKCS1Encoding(eng);
			    eng.init(false, prvParams);
				_instance._RsaMap.put(id, eng);
			    return eng;
			} else {
				return null;
			}
		} catch (Exception e) {
			Logger.error(e);
			return null;
		} finally {
			if ((disposeDbi) && (dbi != null)) {
				dbi.dispose();
			}
		}
	}

	public static KeyPair createRsaKeyPair( boolean saveToDb, DBInteract dbi) {
		boolean disposeDbi = false;

		try {
			if (dbi == null) {
				dbi = new DBInteract();
				disposeDbi = true;
			}
			Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
			
			KeyPair keypair = EncryptUtil.createRsaKeyPair(2048);
			if (saveToDb) {
				BCRSAPrivateCrtKey prvCrtKey = (BCRSAPrivateCrtKey) keypair.getPrivate();
				BCRSAPublicKey pubKey = (BCRSAPublicKey)keypair.getPublic();

				String modulus = pubKey.getModulus().toString(16);
				String exponent =  pubKey.getPublicExponent().toString(16);
	
				String pexponent =  prvCrtKey.getPrivateExponent().toString(16);
				String p =  prvCrtKey.getPrimeP().toString(16);
				String q =  prvCrtKey.getPrimeQ().toString(16);
				String dP =  prvCrtKey.getPrimeExponentP().toString(16);
				String dQ = prvCrtKey.getPrimeExponentQ().toString(16);
				String qinv = prvCrtKey.getCrtCoefficient().toString(16);
	
				ParameterList pl = new ParameterList("");
				
				pl.add(MODULUS, modulus);
				pl.add(EXPONENT, exponent);
				pl.add(PEXPONENT, pexponent);
				pl.add(P, p);
				pl.add(Q, q);
				pl.add(DP, dP);
				pl.add(DQ, dQ);
				pl.add(QINV, qinv);
				dbi.execute(_sqlCreateRsa, pl);
			}
			return keypair;
		} catch (Exception e) {
			Logger.error(e);
			return null;
		} finally {
			if ((disposeDbi) && (dbi != null)) {
				dbi.dispose();
			}
		}
	}

	public static RsaKeyObject createRsaKeyObject( DBInteract dbi) {

		try {
			Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());			
			KeyPair keypair = EncryptUtil.createRsaKeyPair(2048);
			BCRSAPrivateCrtKey prvCrtKey = (BCRSAPrivateCrtKey) keypair.getPrivate();
			BCRSAPublicKey pubKey = (BCRSAPublicKey)keypair.getPublic();

			String modulus = pubKey.getModulus().toString(16);
			String exponent =  pubKey.getPublicExponent().toString(16);

			String pexponent =  prvCrtKey.getPrivateExponent().toString(16);
			String p =  prvCrtKey.getPrimeP().toString(16);
			String q =  prvCrtKey.getPrimeQ().toString(16);
			String dP =  prvCrtKey.getPrimeExponentP().toString(16);
			String dQ = prvCrtKey.getPrimeExponentQ().toString(16);
			String qinv = prvCrtKey.getCrtCoefficient().toString(16);

			ParameterList pl = new ParameterList("");
			
			pl.add(MODULUS, modulus);
			pl.add(EXPONENT, exponent);
			pl.add(PEXPONENT, pexponent);
			pl.add(P, p);
			pl.add(Q, q);
			pl.add(DP, dP);
			pl.add(DQ, dQ);
			pl.add(QINV, qinv);
			
			ResultSet rs = dbi.getResultSet(_sqlCreateRsa, pl);
			rs.next();
			long id = rs.getLong(1);
			return new RsaKeyObject(keypair,id);
			
		} catch (Exception e) {
			Logger.error(e);
			return null;
		} 
	}

	public void dispose() {
		_RsaMap.clear();
		_RsaMap = null;
		_instance = null;
	}

	public static void shutdown() {
		if (_instance != null) {
			_instance.dispose();
		}
	}

	public static int rsaSize() {
		return _instance._RsaMap.size();
	}

}
