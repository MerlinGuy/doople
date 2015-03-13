package org.geof.encrypt;

import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.Security;
import java.security.spec.RSAKeyGenParameterSpec;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.apache.commons.codec.binary.Base64;
import org.bouncycastle.crypto.digests.MD5Digest;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.util.encoders.Hex;
import org.geof.log.Logger;

public class EncryptUtil {

	public final static int DEFUALT_RSA_SIZE = 1024;
	public final static int DEFAULT_KEY_LENGTH = 128;
	public final static String DEFUALT_EXPONENT = "10001";
	public final static String AES_CIPHER_TYPE = "AES/CCM/NoPadding";
	
	public static String hashAndHex(String pwd) {
		byte[] input = pwd.getBytes();
		MD5Digest md5 = new MD5Digest();
		md5.update(input, 0, input.length);
		byte[] digest = new byte[md5.getDigestSize()];
		md5.doFinal(digest, 0);
		return new String(Hex.encode(digest));
	}
	
	public static String[] hashAndHexBC(String pwd) {
		try {
			Security.addProvider(new BouncyCastleProvider());

			SecureRandom random = new SecureRandom();
			byte salt[] = new byte[20];
			random.nextBytes(salt);
			byte[] input = pwd.getBytes();
			
			byte[] result = new byte[salt.length + input.length];
			System.arraycopy(salt, 0, result, 0, salt.length);
			System.arraycopy(input, 0, result, salt.length, input.length);
			
			MessageDigest mda = MessageDigest.getInstance("SHA-512", "BC");
			byte[] digest = mda.digest(result);
			String[] pair = new String[2];
			pair[0] = new String(Hex.encode(salt));
			pair[1] = new String(Hex.encode(digest));
			return pair;
			
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	public static String hash256(String text) {
		try {
			Security.addProvider(new BouncyCastleProvider());			
			MessageDigest mda = MessageDigest.getInstance("SHA-256", "BC");
			byte[] digest = mda.digest(text.getBytes("UTF-8"));
			return new String(Hex.encode(digest));
			
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	public static String getPasswordDigest(String pwd, String str_salt) {
		try {
			Security.addProvider(new BouncyCastleProvider());
			
			byte[] salt = Hex.decode(str_salt.getBytes());			
			byte[] input = pwd.getBytes();
			
			byte[] result = new byte[salt.length + input.length];
			System.arraycopy(salt, 0, result, 0, salt.length);
			System.arraycopy(input, 0, result, salt.length, input.length);
			
			MessageDigest mda = MessageDigest.getInstance("SHA-512", "BC");
			return new String(Hex.encode(mda.digest(result)));
			
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	public static KeyPair createRsaKeyPair(Integer size) {
		try {
			size = (size == null) ? DEFUALT_RSA_SIZE : size;
			Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
			KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA", "BC");
			
			RSAKeyGenParameterSpec spec = new RSAKeyGenParameterSpec( size, new BigInteger(DEFUALT_EXPONENT, 16)); 
			generator.initialize(spec);
			return generator.generateKeyPair();
			
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}
	
	public static String encryptAes(String key, String iv, String plainText ) throws Exception {		
		Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());

		int key_len = DEFAULT_KEY_LENGTH / 8;
		
		while (key.length() < key_len) {
			key += key;
		}
		byte[] keyBytes = key.substring(0, key_len).getBytes();
		
		SecretKeySpec aeskey = new SecretKeySpec(keyBytes, "AES");
    	Cipher in = Cipher.getInstance(EncryptUtil.AES_CIPHER_TYPE, "BC"); 
        IvParameterSpec ivSpec =  new IvParameterSpec(iv.getBytes());
        in.init(Cipher.ENCRYPT_MODE, aeskey, ivSpec);
        byte[] cipherBytes = in.doFinal(plainText.getBytes());
        return new String(Hex.encode(cipherBytes));
	}

	public static String decryptAes(SecretKeySpec sks, String hex_iv, String plainText ) throws Exception {		
		Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
		
		byte[] iv = Hex.decode(hex_iv);
        Cipher cipher = Cipher.getInstance(EncryptUtil.AES_CIPHER_TYPE, "BC"); 
        cipher.init(Cipher.DECRYPT_MODE, sks, new IvParameterSpec(iv));
        byte[] encbytes = (new Base64()).decode(plainText);
        return  new String(cipher.doFinal(encbytes));
	}

    
}
