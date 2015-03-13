package org.geof.util;

import java.sql.Timestamp;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

//import org.geof.gps.data.TimeFrame;
import org.geof.log.Logger;

/**
 * Util class used to provide Date formatting objects.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class DateUtil {
	public static final String DATEFORMAT = "MM-dd-yy HH:mm:ss";
	public static SimpleDateFormat DateFormat = new SimpleDateFormat(DATEFORMAT);

	public static final String DATEFORMAT2 = "MM-dd-yyyy HH:mm:ss";
	public static SimpleDateFormat DateFormat2 = new SimpleDateFormat(DATEFORMAT2);

	public static final String DF_HHMMSS = "HH:mm:ss";
	public static SimpleDateFormat DF_HMS = new SimpleDateFormat(DF_HHMMSS);

	public static final String TSDATEFORMAT = "yyyy-MM-dd HH:mm:ss";
	public static SimpleDateFormat TSDateFormat = new SimpleDateFormat(TSDATEFORMAT);

	public static final String iso8601 = "yyyy-MM-dd'T'HH:mm:ssZ";
	public static SimpleDateFormat DFISO8601 = new SimpleDateFormat(iso8601);

	public static final String FLATFORMAT = "yyyyMMddHHmmss";
	public static SimpleDateFormat DateFormatFlat = new SimpleDateFormat(FLATFORMAT);

	public static final String GMTOffest = "Z";
	public static SimpleDateFormat _dfGMToffset = new SimpleDateFormat(GMTOffest);
	
	public static DateFormat TimeFormat = new SimpleDateFormat("HH:mm:ss");


	public static String tsformat(Date date) {
		return TSDateFormat.format(date);
	}
	public static String nowStr() {
		return TSDateFormat.format(new Date());
	}
	public static String timeNow() {
		return TimeFormat.format(new Date());
	}
	public static String dateTimeNow() {
		return DateFormat2.format(new Date());
	}

	public static Date add(Date date, long milliseconds) {
		return new Date(date.getTime() + milliseconds);
	}
	
	public static Date subtract(Date date, long milliseconds) {
		return new Date(date.getTime() - milliseconds);
	}
	
	public static boolean lessThan(Date date1, Date date2) {
		return date1.getTime() < date2.getTime();
	}

	public static boolean greaterThan(Date date1, Date date2) {
		return date1.getTime() > date2.getTime();
	}
	
	public static Date clone(Date date) {
		return new Date(date.getTime());
	}
	
	public static Date parse(String strDate) {
		try {
			return TSDateFormat.parse(strDate);
		} catch (ParseException e) {
			Logger.error(e);
			return null;
		}
	}
	public static Timestamp getTimestamp(Long milliseconds) {
		if (milliseconds == null) {
			milliseconds = (new Date()).getTime();
		}
		return new Timestamp(milliseconds);
	}
	
	public static Timestamp getTimestamp(Long milliseconds, int days, int hours, int minutes, long seconds) {
		if (milliseconds == null) {
			milliseconds = (new Date()).getTime();
		}
		milliseconds += (seconds
					+ minutes * 60
					+ hours * 60 * 60
					+ days * 60 * 60 * 24);
		return new Timestamp(milliseconds);
	}
	
	/**
	 * Converts the passed in parameter in to a Timestamp object
	 * 
	 * @param value String containing the timestamp to convert
	 * @return Convert Timestamp value
	 */
	public static Timestamp parseTimestamp(String value) {
		try {
			return new Timestamp(DateUtil.TSDateFormat.parse(value).getTime());
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	/**
	 * Helper Method for converting milliseconds to a formatted String  HH:MM:SS
	 * @param millis  Milliseconds to convert to a formatted string
	 * @return  Formatted String 
	 */
	
	public static String getTimespan(long millis) {
		
		long diffsecs = millis / 1000;
		long hours = diffsecs / 3600;
		String shours = prefix(hours, 2);
		
		diffsecs -= hours * 3600;
		long mins = diffsecs / 60;
		String smins = prefix(mins,2);
		
		diffsecs -= mins * 60;
		String ssecs = prefix(diffsecs,2);
		
		return shours + ":" + smins + ":" + ssecs;
	}
	
	public static boolean isValid(String strDate) {
		try {
			TSDateFormat.parse(strDate);
            return true;
        } catch (ParseException e) {
            return false;
        }
	}
	
	public static String prefix(long num, int width) {
		String strnum = String.valueOf(num);
		while (strnum.length() < width) {
			strnum = "0" + strnum;
		}
		return strnum;
	}
	
}
