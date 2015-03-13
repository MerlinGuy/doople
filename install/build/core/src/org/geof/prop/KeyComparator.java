package org.geof.prop;

import java.util.Arrays;
import java.util.Comparator;

/**
 * Helper class used to sort an array of Strings
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class KeyComparator implements Comparator<String> {

	/**
	 * Compares two strings
	 * 
	 * @param o1 First string to compare
	 * @param o2 Second string to compare
	 * @return Returns an integer value as a comparison for sorting two strings
	 */
	public int compare(String o1, String o2) {
		String s1 = o1.toString();
		String s2 = o2.toString();
		int counter = 0;
		for (counter = 0; counter < s1.length() && !Character.isDigit(s1.charAt(counter)); counter++)
			;
		String temp1 = s1.substring(counter);
		s1 = s1.substring(0, counter);
		for (counter = 0; counter < s2.length() && !Character.isDigit(s2.charAt(counter)); counter++)
			;
		String temp2 = s2.substring(counter);
		s2 = s2.substring(0, counter);
		int max = (temp1.length() > temp2.length()) ? temp1.length() : temp2.length();
		char[] pad = new char[max - temp1.length()];
		Arrays.fill(pad, (char) 48);
		temp1 = String.valueOf(pad) + temp1;
		pad = new char[max - temp2.length()];
		Arrays.fill(pad, (char) 48);
		temp2 = String.valueOf(pad) + temp2;
		s1 = s1 + temp1;
		s2 = s2 + temp2;
		return (s1.compareTo(s2));
	}

	/**
	 * 
	 * @param o1 First string to compare
	 * @param o2 Second string to compare
	 * @return True if the two strings are considered equal otherwise false
	 */
	public boolean equals(String o1, String o2) {
		String s1 = o1.toString();
		String s2 = o2.toString();
		return (s1.equals(s2));
	}

}
