package org.geof.encrypt;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Security;
import java.security.spec.RSAPrivateKeySpec;
import java.security.spec.RSAPublicKeySpec;

import org.bouncycastle.crypto.AsymmetricBlockCipher;
import org.bouncycastle.crypto.encodings.PKCS1Encoding;
import org.bouncycastle.crypto.engines.RSAEngine;
import org.bouncycastle.crypto.params.AsymmetricKeyParameter;
import org.bouncycastle.crypto.util.PrivateKeyFactory;
import org.bouncycastle.crypto.util.PublicKeyFactory;
import org.bouncycastle.util.encoders.Base64;
import org.geof.log.Logger;
import org.geof.util.ConvertUtil;

public class RsaKeyPair {

	public static final BigInteger DEFAULT_EXPONENT = new BigInteger("10001");
	/*
	 * NOTE: Private and Public keys are not necessarily from the same key pair
	 */
	private byte[] _encodedPrivateKey = null; // encoded
	private byte[] _encodedPublicKey = null; // encoded
	private AsymmetricKeyParameter _privateKey = null;
	private AsymmetricKeyParameter _publicKey = null;
	private AsymmetricBlockCipher _publicCipher = null;
	private AsymmetricBlockCipher _privateCipher = null;

	public RsaKeyPair() {
		Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
	}

	public void initialize(String publicKey, String privateKey) {
		initPublic(publicKey);
		initPrivate(privateKey);
	}

	public void initPublic(String publicKey) {
		if (publicKey != null) {
			this._encodedPublicKey =  Base64.decode(publicKey);
			this._publicKey = getPublicKey(this._encodedPublicKey);
			this._publicCipher = new PKCS1Encoding(new RSAEngine());
			this._publicCipher.init(true, this._publicKey);

		}
	}

	public void initPrivate(String privateKey) {
		if (privateKey != null) {
			this._encodedPrivateKey = Base64.decode(privateKey);
			this._privateKey = getPrivateKey(this._encodedPrivateKey);
			this._privateCipher = new PKCS1Encoding(new RSAEngine());
			this._privateCipher.init(false, this._privateKey);
		}
	}

	public String decrypt_rsa(String inputdata) {
		try {
			byte[] ba = ConvertUtil.hexStringToByteArray(inputdata);
			return new String(this._privateCipher.processBlock(ba, 0, ba.length));
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	public String encrypt(String inputData) {

		String encryptedData = null;
		try {
			byte[] ba = inputData.getBytes();
			byte[] hexEncoded = this._publicCipher.processBlock(ba, 0, ba.length);
			encryptedData = ConvertUtil.getHexString(hexEncoded);
		} catch (Exception e) {
			System.out.println(e);
		}
		return encryptedData;
	}

	public static PublicKey createRsaPublicKey(BigInteger modulus, BigInteger exponent) {
		try {
			if (exponent == null) {
				exponent = DEFAULT_EXPONENT;
			}
			RSAPublicKeySpec keySpec = new RSAPublicKeySpec(modulus, exponent);
			return KeyFactory.getInstance("RSA").generatePublic(keySpec);
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	public static PrivateKey createRsaPrivateKey(BigInteger modulus, BigInteger exponent) {
		try {
			if (exponent == null) {
				exponent = DEFAULT_EXPONENT;
			}
			RSAPrivateKeySpec keySpec = new RSAPrivateKeySpec(modulus, exponent);
			return KeyFactory.getInstance("RSA").generatePrivate(keySpec);
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	public static AsymmetricKeyParameter getPrivateKey(byte[] key) {
		try {
			return (AsymmetricKeyParameter) PrivateKeyFactory.createKey(key);
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	public static AsymmetricKeyParameter getPublicKey(byte[] key) {
		try {
			return (AsymmetricKeyParameter) PublicKeyFactory.createKey(key);
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	public String encodedPublicString() {
		if (this._encodedPublicKey != null) {
			return new String(this._encodedPublicKey);
		} else {
			return null;
		}
	}

	public String encodedPrivateString() {
		if (this._encodedPrivateKey != null) {
			return new String(_encodedPrivateKey);
		} else {
			return null;
		}
	}
}
