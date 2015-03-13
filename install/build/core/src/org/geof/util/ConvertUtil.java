package org.geof.util;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

import org.apache.commons.codec.binary.Base64;


public class ConvertUtil {

	/**
	 * Converts a long value to a Hex value
	 * @param l Long value to convert
	 * @return  Returns hex value converted from long
	 */
	public static byte[] longToHex(final long l) {
		long v = l & 0xFFFFFFFFFFFFFFFFL;

		byte[] result = new byte[16];
		Arrays.fill(result, 0, result.length, (byte) 0);

		for (int i = 0; i < result.length; i += 2) {
			byte b = (byte) ((v & 0xFF00000000000000L) >> 56);

			byte b2 = (byte) (b & 0x0F);
			byte b1 = (byte) ((b >> 4) & 0x0F);

			if (b1 > 9)
				b1 += 39;
			b1 += 48;

			if (b2 > 9)
				b2 += 39;
			b2 += 48;

			result[i] = (byte) (b1 & 0xFF);
			result[i + 1] = (byte) (b2 & 0xFF);

			v <<= 8;
		}

		return result;
	}

    public static String getHexString(byte[] b) throws Exception {
        String result = "";
        for (int i=0; i < b.length; i++) {
            result +=
                Integer.toString( ( b[i] & 0xff ) + 0x100, 16).substring( 1 );
        }
        return result;
    }
 
    public static byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                    + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }
 
    public static String decode(String value) {
    	return new String(Base64.decodeBase64(value.getBytes()));
    }
    public static String encode(String value) {
    	return new String(Base64.encodeBase64(value.getBytes()));
    }
    
    public static String[] toArray(Set<String> set) {
    	return set.toArray(new String[set.size()]);
    }
    
    public static String toCsv(Set<String> set, String prefix) {
		String rtn = "";
		String prf = "," + (prefix != null ? prefix + "." : "");
		for ( String fld : set ) {
			rtn += prf + fld;
		}
		return rtn.substring(1);
    }
    
    public static String toCsv(List<String> set, String prefix) {
		String rtn = "";
		String prf = "," + (prefix != null ? prefix + "." : "");
		for ( String fld : set ) {
			rtn += prf + fld;
		}
		return rtn.substring(1);
    }
    
    public static String toCsv(String[] aray, String prefix) {
		String rtn = "";
		String prf = "," + (prefix != null ? prefix + "." : "");
		for ( String fld : aray ) {
			rtn += prf + fld;
		}
		return rtn.substring(1);
    }
    
}
