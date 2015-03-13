package org.geof.log;

import java.util.*;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.RandomAccessFile;

/**
 * This class is used to read the current contents of the log file.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class LogReader {

	private static final int CHUCKSIZE = 2048;

	/**
	 * Returns the last n-number of lines from the log file
	 * @param fileName  Log file to read
	 * @param lineCount  Number of lines from the end of the file to return
	 * @return  Returns an ArrayList of the last n-number of lines from the log file
	 */
	public static ArrayList<String> tail(File file, int lineCount) {
		return tail(file, lineCount, CHUCKSIZE);
	}

	/**
	 * Internal method used to read the last n-lines of the log file
	 * @param bytearray  A byte[] which holds a segment of data read from the end of the log file
	 * @param lineCount  Number of lines to return
	 * @param aLines  ArrayList used to return the requested log file lines
	 * @return  Returns true if the all the lines requested were available otherwise false. 
	 */
	private static boolean parseLinesFromLast(byte[] bytearray, int lineCount, ArrayList<String> aLines) {
		String lastNChars = new String(bytearray);
		StringBuffer sb = new StringBuffer(lastNChars);
		lastNChars = sb.reverse().toString();
		StringTokenizer tokens = new StringTokenizer(lastNChars, "\n");
		while (tokens.hasMoreTokens()) {
			StringBuffer sbLine = new StringBuffer((String) tokens.nextToken());
			aLines.add(sbLine.reverse().toString());
			if (aLines.size() == lineCount) {
				return true;// indicates we got 'lineCount' lines
			}
		}
		return false; // indicates didn't read 'lineCount' lines
	}

	/**
	 * Reads a requested number of lines from the end of a log file
	 * @param fileName  Full path to the log file to read
	 * @param lineCount  Number of lines to read from the end of the file
	 * @param chunkSize  Size of the chunks to read from the file.
	 * @return  Returns an ArrayList of log file lines from the end of the file
	 */
	public static ArrayList<String> tail(File file, int lineCount, int chunkSize) {
		RandomAccessFile raf = null;
		ArrayList<String> aLines = new ArrayList<String>();

		try {
			raf = new RandomAccessFile(file, "r");
			int delta = 0;
			long curPos = raf.length() - 1;
			long fromPos;
			byte[] bytearray;
			int lastIndex;
			while (true) {
				fromPos = curPos - chunkSize;
				if (fromPos <= 0) {
					raf.seek(0);
					bytearray = new byte[(int) curPos];
					raf.readFully(bytearray);
					parseLinesFromLast(bytearray, lineCount, aLines);
					break;
				} else {
					raf.seek(fromPos);
					bytearray = new byte[chunkSize];
					raf.readFully(bytearray);
					if (parseLinesFromLast(bytearray, lineCount, aLines)) {
						break;
					}
					lastIndex = aLines.size() - 1;
					delta = ((String) aLines.get(lastIndex)).length();
					aLines.remove(lastIndex);
					curPos = fromPos + delta;
				}
			}
			Collections.reverse(aLines);
			return aLines;
		} catch (Exception e) {
			Logger.error("LogReader.tail - " + e.getMessage());
			return null;
		} finally {
			if (raf != null) {
				try {
					raf.close();
				} catch (Exception e) {}
			}
		}
	}

	/**
	 * Reads the entire log file into an ArrayList of String objects and returns them.
	 * @param fileName  The full path to the log file to read
	 * @return  Returns the entire file as lines in an ArrayList of String.
	 */
	public static ArrayList<String> readFile(File file) {

		BufferedReader reader = null;
		ArrayList<String> aLines = new ArrayList<String>();
		try {
			reader = new BufferedReader(new FileReader(file));
			while (reader.ready()) {
				aLines.add(reader.readLine());
			}
			return aLines;
		} catch (Exception e) {
			Logger.error("LogReader.readFile - " + e.getMessage());
			return null;

		} finally {
			if (reader != null) {
				try {
					reader.close();
				} catch (Exception eio) {}
			}
		}
	}
	
}