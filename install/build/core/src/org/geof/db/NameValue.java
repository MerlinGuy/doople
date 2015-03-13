package org.geof.db;

import java.sql.ResultSet;
import java.sql.SQLException;

import org.geof.log.Logger;
import org.geof.util.DateUtil;

/**
 * Helper class for dealing with Name/Value pairs with the application
 * 
 * @author Jeff Boehmer
 * @comanpay  Ft Collins Research, LLC.
 * @url	www.ftcollinsresearch.org
 *
 */
public class NameValue {
	public final static String AND = " AND ";
	public final static String OR = " OR ";
	public final static String GT = " > ";
	public final static String LT = " < ";
	public final static String GTE = " >= ";
	public final static String LTE = " <= ";
	public final static String NE = " <> ";
	public final static String EQUAL = " = ";
	
	public String Name = null;
	public Object Value = null;
	public int Datatype = 0;
//	public String AndOr = null;
//	public String Comparator = null;
	
	/**
	 * Class constructor
	 * 
	 * @param name  Name or Key of the instance
	 * @param value  Value of the instance
	 * @param datatype  Datatype of the value field
	 */
	public NameValue(String name, Object value, int datatype) {
		Name = name;
		Value = value;
		Datatype = datatype;
//		AndOr = AND;
//		Comparator = EQUAL;
	}
	
	/**
	 * @return  Returns a formatted string of the NameValue variables
	 */
	public String toString() {
		return Name + " : " + Value.toString() + " : " + Datatype ; //+ " : " + AndOr + " : " + Comparator;
//		return AndOr + Name + Comparator +  Value.toString() + "  (datatype: " + Datatype + ")";
	}
	
	/**
	 * Returns a NameValue object extracted from the current row of a database row
	 * @param rs  ResultSet to retrieve the object value from 
	 * @param indx  Record column to get the value from.
	 * @param datatype  Datatype of the column.
	 * @param fieldname  Name to use for the new NameValue object
	 * @return  Returns a NameValue object extracted from the current row of a database row
	 */
	public static NameValue getNameValue(ResultSet rs, int indx, int datatype, String fieldname) {
		try {
			Object value = null;
			if (datatype == java.sql.Types.CHAR) {
				value = rs.getString(indx);
			} else if (datatype == java.sql.Types.VARCHAR) {
				value = rs.getString(indx);
			} else if (datatype == java.sql.Types.LONGVARCHAR) {
				value = rs.getString(indx);
			} else if (datatype == java.sql.Types.NUMERIC) {
				value = rs.getFloat(indx);
			} else if (datatype == java.sql.Types.DECIMAL) {
				value = rs.getFloat(indx);
			} else if (datatype == java.sql.Types.BIT) {
				value = rs.getBoolean(indx);
			} else if (datatype == java.sql.Types.TINYINT) {
				value = rs.getInt(indx);
			} else if (datatype == java.sql.Types.SMALLINT) {
				value = rs.getShort(indx);
			} else if (datatype == java.sql.Types.INTEGER) {
				value = rs.getInt(indx);
			} else if (datatype == java.sql.Types.BIGINT) {
				value = rs.getLong(indx);
			} else if (datatype == java.sql.Types.REAL) {
				value = rs.getFloat(indx);
			} else if (datatype == java.sql.Types.FLOAT) {
				value = rs.getFloat(indx);
			} else if (datatype == java.sql.Types.DOUBLE) {
				value = rs.getDouble(indx);
			} else if (datatype == java.sql.Types.DATE) {
				value = DateUtil.DateFormat.format(rs.getDate(indx));
			} else if (datatype == java.sql.Types.TIME) {
				value = rs.getTime(indx);
			} else if (datatype == java.sql.Types.TIMESTAMP) {
				value = rs.getTimestamp(indx);
			}
			return new NameValue(fieldname, value, datatype);
		} catch (SQLException e) {
			Logger.error(e);
			return null;
		}
	}

}
