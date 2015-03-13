package org.geof.service;

import java.io.IOException;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.Stack;

import org.geof.db.ColumnTrio;
import org.geof.encrypt.EncryptableOutputStream;
import org.geof.log.Logger;
import org.geof.util.ConvertUtil;
import org.geof.util.DateUtil;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The JsonWriter is a Json script specific wrapper around the HTTP response writer used to
 * send responses back to the client for requests. It's main attribute is that responses in
 * the form of Json script do not need to be completed in memory before being serialized out
 * to the requesting client.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class JsonWriter {

	public final static String DQ = "\"";
	public final static String DQCOLON = "\":";
	public final static String DQCOLONDQ = "\":\"";
	public final static String COMMA = ",";
	public final static String OPENBRACK = "[";
	public final static String CLOSEBRACK = "]";
	public final static String OPEN = "{";
	public final static String CLOSE = "}";
	public final static String EMPTY = "";

	public boolean _encode = false;
	public String _comma = EMPTY;

	public final static String HEADER = "geofws";
	public final static String ENCRYPTKEY = "encryptkey";
	public final static String TRANSACTION = "transaction";
	public static final String TCALLBACK = "tcallback";
	public final static String SESSION = "session";
	public final static String REQUESTS = "requests";

	// private final static String LOG = "log";
	public final static String ERROR = "error";
	// private final static String CLOSECOMMA = "},";

	protected EncryptableOutputStream _outStream = null;
	protected Stack<String> _commaStack = new Stack<String>();
	protected Stack<String> _objectStack = new Stack<String>();

	protected String _error = null;

	private boolean DEBUG = false;
	/**
	 * Class constructor
	 */
	public JsonWriter() {
	}

	/**
	 * Class constructor
	 * 
	 * @param writer Writer object used to send the response back to the client.
	 */
	public JsonWriter(EncryptableOutputStream stream) {
		_outStream = stream;
	}

	/**
	 * Sets the _encode flag. If encode is true then strings will be Base64 encoded before
	 * written to the response stream.
	 * 
	 * @param encode
	 */
	public void setEncode(boolean encode) {
		_encode = encode;
	}

	public void setDebug(boolean debug) {
		this.DEBUG = debug;
	}

	public boolean getDebug() {
		return this.DEBUG;
	}

	/**
	 * Writes a string to the response stream
	 * 
	 * @param value String to be written.
	 */
	public void write(String value) {
		try {
			_outStream.write(value);
			if (DEBUG) {
				Logger.debugNoNl(value);
			}
		} catch (Exception e) {
			Logger.error(e);
		}
	}

	/**
	 * This method starts writing the serialized json HTTP response to the user's request.
	 * 
	 * @return Returns true if no error occured, otherwise false
	 */
	public boolean startWrite() {
		try {
			_outStream.write(OPEN);
			if (DEBUG) {
				Logger.debug(OPEN);
			}
			_objectStack.push(CLOSE);
			return true;

		} catch (Exception e) {
			Logger.error("JsonWriter.startWrite ", e);
			return false;
		}
	}

	/**
	 * Calls the underlying Writer's flush method
	 */
	public void flush() {
		try {
//			((PrintWriter)_writer).println("");
			_outStream.flush();
		} catch (Exception e) {
			Logger.error("JsonWriter.flush ", e);
		}
	}

	/**
	 * Sets the _error variable.
	 * 
	 * @param error Text to set the _error to.
	 */
	protected void setError(String error) {
		_error = error;
	}

	/**
	 * Method starts the writing of multiple requests to the response stream
	 * @throws IOException 
	 */
	public void openRequests(boolean encrypt) throws IOException {
		encrypt = encrypt && _outStream.canEncrypt();
		if (encrypt) {
			writeCommaPush();
			writeObjName(REQUESTS);
			openQuote();
			_outStream.encryptOutput(true);
			
		} else {
			openArray(REQUESTS);
		}
	}

	/**
	 * Method writes the closing characters for an open requests block to the response stream
	 * @throws IOException 
	 */
	public void closeRequests() {
		try {
			if (_outStream.isEncrypting()) {
				_outStream.encryptOutput(false);
			}
		} catch (Exception e) {}
		stackPop();
		flush();
			
	}

	/**
	 * This method pops all the remaining closing characters off the _objectStack and writes
	 * them out to the response stream. No other request writes should be made once this is
	 * done.
	 * 
	 * @return
	 */
	protected void completeWrite() {
		while (_objectStack.size() > 0) {
			write(_objectStack.pop());
		}
		if (DEBUG) {
			Logger.debug("\n--------------------------\n");
		}
	}

	public boolean writeJsonPair(String name, Object value) {
		write(_comma);
		write(OPEN);
		try {
			write(DQ);
			write(name == null ? "UNKNOWN" : name);
			write(DQCOLONDQ);
			String str = (value == null ? "" : value.toString());
			write(_encode ? ConvertUtil.encode(str) : str);
			write(DQ);
			_comma = COMMA;
		} catch (Exception e) {
			setError("writePair error");
		}
		write(CLOSE);
		return true;
	}
	/**
	 * Writes a Json formatted Name/Value pair to the response stream
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON string to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, String value) {
		try {
			write(_comma);
			write(DQ);
			write(name == null ? "UNKNOWN" : name);
			write(DQCOLONDQ);
			value = (value == null ? "" : value);
			write(_encode ? ConvertUtil.encode(value) : value);
			write(DQ);
			_comma = COMMA;
			return true;
		} catch (Exception e) {
			Logger.error(e);
			setError("writePair error");
			return false;
		}
	}

	public boolean writePair(String name, String value, boolean encode) {
		try {
			write(_comma);
			write(DQ);
			write(name == null ? "UNKNOWN" : name);
			write(DQCOLONDQ);
			value = (value == null ? "" : value);
			write(encode ? ConvertUtil.encode(value) : value);
			write(DQ);
			_comma = COMMA;
			return true;
		} catch (Exception e) {
			Logger.error(e);
			setError("writePair error");
			return false;
		}
	}

	/**
	 * Writes a Json formatted Name/Value pair to the response stream as a literal and does
	 * not wrap the Value parameter in quotes
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON string to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePairNQ(String name, String value) {
		try {
			write(_comma);
			write(DQ);
			write(name == null ? "UNKNOWN" : name);
			write(DQCOLON);
			write(value);
			_comma = COMMA;
			return true;
		} catch (Exception e) {
			Logger.error(e);
			setError("writePair error");
		}
		return false;
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is an integer
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON integer to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, int value) {
		return writePairNQ(name, String.valueOf(value));
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is a double
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON double to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, Double value) {
		return writePairNQ(name, String.valueOf(value));
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is a float
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON float to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, Float value) {
		return writePairNQ(name, String.valueOf(value));
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is a boolean
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON boolean to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, boolean value) {
		return writePairNQ(name, String.valueOf(value));
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is a long
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON long to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, Long value) {
		return writePairNQ(name, String.valueOf(value));
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is a Date
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON Date to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, java.sql.Date date) {
		String value = date == null ? "" : DateUtil.DateFormat2.format(date);
		return writePair(name, String.valueOf(value));
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is a Sql Time
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON Sql Time to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, java.sql.Time time) {
		return writePair(name, String.valueOf(time));
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is a Sql Timestamp
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON Sql Timestamp to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, java.sql.Timestamp ts) {
		String value = (ts == null) ? "" : DateUtil.DateFormat2.format(ts);
		return writePair(name, value);
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is a JSONObject
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON JSONObject to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, JSONObject jobj) {
		String value = jobj == null ? "" : jobj.toString();
		return writePairNQ(name, String.valueOf(value));
	}

	/**
	 * Writes a Json formatted Name/Value pair where the value is a JSONArray
	 * 
	 * @param name Name of the JSON string object
	 * @param value Value of the JSON JSONArray to write
	 * @return True if no error occurred otherwise false.
	 */
	public boolean writePair(String name, JSONArray jobj) {
		String value = (jobj == null ? "" : jobj.toString());
		return writePairNQ(name, value);
	}

	/**
	 * Writes a comma to the response stream and also sets the _comma variable.
	 */
	public void writeComma() {
		write(_comma);
		_comma = COMMA;
	}

	/**
	 * Writes a comma to the response stream, sets the _comma variable, and pushes a comma to
	 * the commaStack.
	 */
	public void writeCommaPush() {
		write(_comma);
		_comma = COMMA;
		_commaStack.push(_comma);
		_comma = EMPTY;
	}

	/**
	 * Pushes a comma to the commaStack and sets the _comma object to empty.
	 */
	public void pushComma() {
		_commaStack.push(_comma);
		_comma = EMPTY;
	}

	/**
	 * Pops a comma from the _commaStack if it exists and writes that to the response stream
	 */

	public void popComma() {
		_comma = _commaStack.size() > 0 ? _commaStack.pop() : EMPTY;
	}

	/**
	 * Writes the OPEN string to response stream and places the CLOSE string on the
	 * _objectStack.
	 */

	public void writeOpen() {
		write(OPEN);
		stackPush(CLOSE);
	}

	/**
	 * Writes the OPENBRACK string to response stream and places the CLOSEBRACK string on the
	 * _objectStack.
	 */
	public void openBracket() {
		write(OPENBRACK);
		stackPush(CLOSEBRACK);
	}

	public void openQuote() {
		write(DQ);
		stackPush(DQ);
	}
	/**
	 * Method starts writing a new named JSON object to the response stream
	 * 
	 * @param name Name of the new JSON Object to write.
	 */

	public void writeObjName(String name) {
		write(DQ);
		write(name == null ? "UNKNOWN" : name);
		write(DQCOLON);
	}

	/**
	 * Writes a String value to the response stream.
	 * 
	 * @return True if no error occurs otherwise false
	 */

	/****************************************************/
	public boolean writeValue(String value) {
		try {
			writeComma();
			write(DQ);
			value = (value == null ? "" : value);
			write(_encode ? ConvertUtil.encode(value) : value);
			write(DQ);
			return true;
		} catch (Exception e) {
			Logger.error(e);
			setError("writeValue error");
			return false;
		}
	}

	/**
	 * Writes a non-quoted wrapped String to the response stream
	 * 
	 * @param value String to write the response stream
	 * @return Always returns true
	 */

	public boolean writeValueNQ(String value) {
		writeComma();
		write(value);
		return true;
	}

	/**
	 * Writes a integer to the response stream
	 * 
	 * @param value Integer to write the response stream
	 * @return Returns the value returned by writeValueNQ
	 */
	public boolean writeValue(int value) {
		return writeValueNQ(String.valueOf(value));
	}

	/**
	 * Writes a double to the response stream
	 * 
	 * @param value Double to write the response stream
	 * @return Returns the value returned by writeValueNQ
	 */
	public boolean writeValue(Double value) {
		return writeValueNQ(String.valueOf(value));
	}

	/**
	 * Writes a float to the response stream
	 * 
	 * @param value Float to write the response stream
	 * @return Returns the value returned by writeValueNQ
	 */

	public boolean writeValue(Float value) {
		return writeValueNQ(String.valueOf(value));
	}

	/**
	 * Writes a boolean to the response stream
	 * 
	 * @param value Boolean to write the response stream
	 * @return Returns the value returned by writeValueNQ
	 */
	public boolean writeValue(boolean value) {
		return writeValueNQ(String.valueOf(value));
	}

	/**
	 * Writes a long to the response stream
	 * 
	 * @param value Long to write the response stream
	 * @return Returns the value returned by writeValueNQ
	 */

	public boolean writeValue(Long value) {
		return writeValueNQ(String.valueOf(value));
	}

	/**
	 * Writes a Sql Date to the response stream
	 * 
	 * @param value Sql Date to write the response stream
	 * @return Returns the value returned by writeValueNQ
	 */
	public boolean writeValue(java.sql.Date date) {
		String value = date == null ? "" : DateUtil.DateFormat2.format(date);
		return writeValue(String.valueOf(value));
	}

	/**
	 * Writes a Sql Time to the response stream
	 * 
	 * @param value Sql Time to write the response stream
	 * @return Returns the value returned by writeValueNQ
	 */

	public boolean writeValue(java.sql.Time time) {
		return writeValue(String.valueOf(time));
	}

	/**
	 * Writes a Sql Timestamp to the response stream
	 * 
	 * @param value Sql Timestamp to write the response stream
	 * @return Returns the value returned by writeValueNQ
	 */
	public boolean writeValue(java.sql.Timestamp ts) {
		String value = (ts == null) ? "" : DateUtil.DateFormat2.format(ts);
		return writeValue(value);
	}

	/**
	 * Writes a JSONObject to the response stream
	 * 
	 * @param value JSONObject to write the response stream
	 * @return Returns the value returned by writeValueNQ
	 */

	public boolean writeValue(JSONObject jobj) {
		String value = jobj == null ? "" : jobj.toString();
		return writeValueNQ(String.valueOf(value));
	}

	/**
	 * Writes the JSON script format object start text to the response stream
	 * 
	 * @param name Name of the JSONObject to write
	 */

	public void openObject(String name) {
		writeCommaPush();
		write(DQ);
		write(name == null ? "UNKNOWN" : name);
		write(DQCOLON);
		writeOpen();
	}

	/**
	 * Starts the writing of an JSONObject to the response stream
	 */

	public void openObject() {
		writeCommaPush();
		writeOpen();
	}

	/**
	 * Writes the closing text for an JSONObject to the response stream
	 */
	public void closeObject() {
		stackPop();
	}

	/**
	 * Writes the JSON script format for an Array object's start text to the response stream
	 * 
	 * @param name Name of the JSONArray to write
	 */

	public void openArray(String name) {
		writeCommaPush();
		writeObjName(name);
		openBracket();
	}

	/**
	 * Writes the closing text for an JSONArray to the response stream
	 */
	public void closeArray() {
		stackPop();
	}

	/**
	 * Writes the a serialized JSONArray to the response stream
	 * 
	 * @param name Name of the array to write
	 * @param array JSONArray object to serialize to response stream
	 */
	public void writeArray(String name, JSONArray array) {
		writeCommaPush();
		writeObjName(name);
		write(array.toString());
	}

	/**
	 * Writes the a string list to the response stream as an Array
	 * 
	 * @param name Name of the array to write
	 * @param stringList String list to write
	 */
	public void writeArray(String name, String stringList) {
		writeCommaPush();
		writeObjName(name);
		openBracket();
		write(stringList);
		stackPop();
	}

	/**
	 * Pushes a string on the _objectStack to be written out later
	 * 
	 * @param value String value to place on the _objectStack
	 */

	protected void stackPush(String value) {
		_objectStack.push(value);
	}

	/**
	 * Pops a value off the _objectStack and writes it to the response stream
	 */

	protected void stackPop() {
		if (_objectStack.size() > 0) {
			write(_objectStack.pop());
		}
		popComma();
		flush();
	}

	/**
	 * Writes a sql ResultSet object out the response stream as an JSONArray
	 * 
	 * @param arrayname Name of the ResultSet
	 * @param rs ResultSet object to write out the response stream
	 * @param flds List of fields to write to the response stream
	 * @return True if no error occurs
	 */

	public boolean writeResultset(String arrayname, ResultSet rs, String[] flds) {
		openArray(arrayname);
		boolean rtn = writeResultset(rs, flds);
		closeArray();
		_comma = COMMA;
		return rtn;
	}

	/**
	 * Writes a sql ResultSet object out the response stream as an unnamed JSONArray
	 * 
	 * @param rs ResultSet object to write out the response stream
	 * @param flds CSV string of field names to write to the response stream
	 * @return True if no error occurs
	 */

	public boolean writeResultset(ResultSet rs, String flds) {
		try {
			return writeResultset(rs, flds.split(","));
		} catch (Exception e) {
			Logger.error("writeResultset ", e);
			return false;
		}
	}

	/**
	 * Writes a sql ResultSet object out the response stream as an unnamed JSONArray
	 * 
	 * @param rs ResultSet object to write out the response stream
	 * @param flds List of fields to write to the response stream
	 * @return True if no error occurs
	 */
	public boolean writeResultset(ResultSet rs, String[] flds) {
		return writeResultset(rs, flds, false);
	}

	/**
	 * Writes a sql ResultSet object out the response stream as an unnamed JSONArray
	 * 
	 * @param rs ResultSet object to write out the response stream
	 * @param flds List of fields to write to the response stream
	 * @param leaveopen If True then the JSONObject close text will not be written so that
	 * more information can be written later.
	 * @return True if no error occurs
	 */

	public boolean writeResultset(ResultSet rs, String[] flds, boolean leaveopen) {
		try {
			if (rs == null) {
				return false;
			}
			while (rs.next()) {
				writeRecord(rs, flds, leaveopen, ColumnTrio.getList(rs));
			}
			return true;
		} catch (Exception e) {
			Logger.error("writeResultset ", e);
			return false;
		}
	}
	
	public boolean writeResultset(ResultSet rs) {
		try {
			if (rs == null) {
				return false;
			}
			ResultSetMetaData rsmd = rs.getMetaData();
			int colCount = rsmd.getColumnCount() + 1;
			while (rs.next()) {
				openObject();
				for (int indx = 1; indx < colCount; indx++) {
					writeField(rs, rsmd.getColumnName(indx), rsmd.getColumnType(indx), indx);
				}
				closeObject();
			}
			return true;
		} catch (Exception e) {
			Logger.error("writeResultset ", e);
			return false;
		}
	}	

	/**
	 * Writes a sql ResultSet object out the response stream as an unnamed JSONArray.
	 * 
	 * @param rs ResultSet object to write out the response stream
	 * @param flds List of fields to write to the response stream
	 * @param leaveopen If True then the JSONObject close text will not be written so that
	 * more information can be written later.
	 * @param rsmd ResultSetMetaData to use for generating the ColumnTrio list if no cps is
	 * passed in.
	 * @param cps Array of ColumnTrio objects to use for deteriming Resultset column datatypes
	 * @return True if no error occurs
	 */

	public boolean writeResultset(ResultSet rs, String[] fields, boolean leaveOpen, ColumnTrio[] cps) {
		try {
			openObject();
			for (ColumnTrio cp : cps) {
				if (cp.Datatype == java.sql.Types.CHAR) {
					writeValue(rs.getString(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.VARCHAR) {
					writePair(cp.FieldName, rs.getString(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.LONGVARCHAR) {
					writePair(cp.FieldName, rs.getString(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.NUMERIC) {
					writePair(cp.FieldName, rs.getDouble(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.DECIMAL) {
					writePair(cp.FieldName, rs.getDouble(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.BIT) {
					writePair(cp.FieldName, rs.getBoolean(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.TINYINT) {
					writePair(cp.FieldName, rs.getByte(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.SMALLINT) {
					writePair(cp.FieldName, rs.getShort(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.INTEGER) {
					writePair(cp.FieldName, rs.getInt(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.BIGINT) {
					writePair(cp.FieldName, rs.getLong(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.REAL) {
					writePair(cp.FieldName, rs.getFloat(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.FLOAT) {
					writePair(cp.FieldName, rs.getFloat(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.DOUBLE) {
					writePair(cp.FieldName, rs.getDouble(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.DATE) {
					writePair(cp.FieldName, rs.getDate(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.TIME) {
					writePair(cp.FieldName, rs.getTime(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.TIMESTAMP) {
					writePair(cp.FieldName, rs.getTimestamp(cp.Indx));
				} else {
					writePair(cp.FieldName, rs.getString(cp.Indx));
				} 
			}
			if (!leaveOpen) {
				closeObject();
			}
			return true;
		} catch (Exception e) {
			Logger.error("writeRecord ", e);
			return false;
		}
	}
	
	public boolean writeResultSetEncoded(ResultSet rs, String[] encoded) {
		try {
			ResultSetMetaData rsmd = rs.getMetaData();
			ColumnTrio[] ct = ColumnTrio.getList2(rsmd, encoded);
			return writeRecordset(rs,ct);
		} catch (SQLException e) {
			Logger.error("writeRecordset ", e);
			return false;
		}

	}
	
	public boolean writeRecordset(ResultSet rs, ColumnTrio[] list) {
		boolean isOpen = false;
		try {
			int colCount = list.length;
			ColumnTrio cp;
			while (rs.next()) {
				openObject();
				isOpen = true;
				for (int indx = 0; indx < colCount; indx++) {
					cp = list[indx];
					if (cp.isString) {
						writePair(cp.FieldName,rs.getString(cp.Indx),cp.Encode);

					} else {
						if (cp.Datatype == java.sql.Types.NUMERIC) {
							writePair(cp.FieldName, rs.getDouble(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.DECIMAL) {
							writePair(cp.FieldName, rs.getDouble(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.BIT) {
							writePair(cp.FieldName, rs.getBoolean(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.TINYINT) {
							writePair(cp.FieldName, rs.getByte(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.SMALLINT) {
							writePair(cp.FieldName, rs.getShort(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.INTEGER) {
							writePair(cp.FieldName, rs.getInt(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.BIGINT) {
							writePair(cp.FieldName, rs.getLong(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.REAL) {
							writePair(cp.FieldName, rs.getFloat(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.FLOAT) {
							writePair(cp.FieldName, rs.getFloat(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.DOUBLE) {
							writePair(cp.FieldName, rs.getDouble(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.DATE) {
							writePair(cp.FieldName, rs.getDate(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.TIME) {
							writePair(cp.FieldName, rs.getTime(cp.Indx));
						} else if (cp.Datatype == java.sql.Types.TIMESTAMP) {
							writePair(cp.FieldName, rs.getTimestamp(cp.Indx));
						} else {
							writePair(cp.FieldName, rs.getString(cp.Indx), cp.Encode);
						} 
					}
							
				}
				closeObject();
				isOpen = false;
			}
			return true;
		} catch (Exception e) {
			if ( isOpen ) {
				closeObject();
			}
			Logger.error("writeRecordset ", e);
			return false;
		}
	}

	public boolean writeRecord(ResultSet rs, String[] fields, boolean leaveOpen, ColumnTrio[] cps) {
		try {
			openObject();
			for (ColumnTrio cp : cps) {
				if (cp.Datatype == java.sql.Types.CHAR) {
					writeValue(rs.getString(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.VARCHAR) {
					writePair(cp.FieldName, rs.getString(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.LONGVARCHAR) {
					writePair(cp.FieldName, rs.getString(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.NUMERIC) {
					writePair(cp.FieldName, rs.getDouble(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.DECIMAL) {
					writePair(cp.FieldName, rs.getDouble(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.BIT) {
					writePair(cp.FieldName, rs.getBoolean(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.TINYINT) {
					writePair(cp.FieldName, rs.getByte(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.SMALLINT) {
					writePair(cp.FieldName, rs.getShort(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.INTEGER) {
					writePair(cp.FieldName, rs.getInt(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.BIGINT) {
					writePair(cp.FieldName, rs.getLong(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.REAL) {
					writePair(cp.FieldName, rs.getFloat(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.FLOAT) {
					writePair(cp.FieldName, rs.getFloat(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.DOUBLE) {
					writePair(cp.FieldName, rs.getDouble(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.DATE) {
					writePair(cp.FieldName, rs.getDate(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.TIME) {
					writePair(cp.FieldName, rs.getTime(cp.Indx));
				} else if (cp.Datatype == java.sql.Types.TIMESTAMP) {
					writePair(cp.FieldName, rs.getTimestamp(cp.Indx));
				} else {
					writePair(cp.FieldName, rs.getString(cp.Indx));
				} 
			}
			if (!leaveOpen) {
				closeObject();
			}
			return true;
		} catch (Exception e) {
			Logger.error("writeRecord ", e);
			return false;
		}
	}


	public boolean writeField(ResultSet rs, String fieldname, int datatype, int index) {
		try {
			if (datatype == java.sql.Types.CHAR) {
				writeValue(rs.getString(index));
			} else if (datatype == java.sql.Types.VARCHAR) {
				writePair(fieldname, rs.getString(index));
			} else if (datatype == java.sql.Types.LONGVARCHAR) {
				writePair(fieldname, rs.getString(index));
			} else if (datatype == java.sql.Types.NUMERIC) {
				writePair(fieldname, rs.getDouble(index));
			} else if (datatype == java.sql.Types.DECIMAL) {
				writePair(fieldname, rs.getDouble(index));
			} else if (datatype == java.sql.Types.BIT) {
				writePair(fieldname, rs.getBoolean(index));
			} else if (datatype == java.sql.Types.TINYINT) {
				writePair(fieldname, rs.getByte(index));
			} else if (datatype == java.sql.Types.SMALLINT) {
				writePair(fieldname, rs.getShort(index));
			} else if (datatype == java.sql.Types.INTEGER) {
				writePair(fieldname, rs.getInt(index));
			} else if (datatype == java.sql.Types.BIGINT) {
				writePair(fieldname, rs.getLong(index));
			} else if (datatype == java.sql.Types.REAL) {
				writePair(fieldname, rs.getFloat(index));
			} else if (datatype == java.sql.Types.FLOAT) {
				writePair(fieldname, rs.getFloat(index));
			} else if (datatype == java.sql.Types.DOUBLE) {
				writePair(fieldname, rs.getDouble(index));
			} else if (datatype == java.sql.Types.DATE) {
				writePair(fieldname, rs.getDate(index));
			} else if (datatype == java.sql.Types.TIME) {
				writePair(fieldname, rs.getTime(index));
			} else if (datatype == java.sql.Types.TIMESTAMP) {
				writePair(fieldname, rs.getTimestamp(index));
			} else {
				writePair(fieldname, rs.getString(index));
			} 
			return true;
		} catch (Exception e) {
			Logger.error("writeRecord ", e);
			return false;
		}
	}


	/**
	 * Clears any in memory objects for garbage collection
	 */

	public void dispose() {
		if (_outStream != null) {
			try {
				_outStream.close();
			} catch (Exception e) {}
			_outStream = null;
		}
		_commaStack.clear();
		_commaStack = null;
		_objectStack.clear();
		_objectStack = null;
	}

	/**
	 * Writes the contents of the _objectStack to the Log file for debugging purpose.
	 */

	public void DebugStack() {
		int count = _objectStack.size() - 1;
		StringBuilder sb = new StringBuilder();
		for (int indx = count; indx > -1; indx--) {
			sb.append(_objectStack.get(indx));
		}
		Logger.error(sb.toString());
	}

	/**
	 * Writes the contents of the _objectStack to the Log file with text as a prefix for debugging purpose.
	 * @param text  Prefix to write to the log file
	 */

	public void DebugStack(String text) {
		int count = _objectStack.size() - 1;
		StringBuilder sb = new StringBuilder();
		sb.append(text);
		for (int indx = count; indx > -1; indx--) {
			sb.append(_objectStack.get(indx));
		}
		Logger.error(sb.toString());
	}
	
}
