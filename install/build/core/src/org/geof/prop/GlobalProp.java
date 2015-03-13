package org.geof.prop;

import java.io.File;
import java.io.FileInputStream;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Properties;

import org.geof.db.DBInteract;
import org.geof.log.Logger;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Parent class and static properties holder and source for all Globally accessed application
 * properties.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class GlobalProp {

	private final static String sql = "SELECT name,value FROM serverconfig";
	private HashMap<String, String> _properties = new HashMap<String, String>();
	private boolean _hasError = false;
	private String _errorMsg = null;
	
	private static final GlobalProp _instance = new GlobalProp();
	private static final List<?> NO_PRINT = Arrays.asList("pwd","password");
	
	private GlobalProp(){}

	public static GlobalProp instance() {
		return _instance;
	}
	
	/**
	 * This Method reads in all the server properties stored in the server config file.  
	 * Usually this file is named init.prop
	 * 
	 * @param filepath  Full path to property file
	 * @return  True if the initialization method succeeded otherwise false if an error occurrs.
	 */

	public boolean populate(String filepath) {
		File file = new File(filepath);
		if (! file.exists()) {
			return false;
		}
		return populate(file);
	}
	
	public boolean populate(File file) {
		FileInputStream fis = null;
		boolean rtn = false;

		try {
			if (file.exists()) {
				fis = new FileInputStream(file);
				Properties pf = new Properties();
				pf.load(fis);
				Enumeration<?> names = pf.propertyNames();
				while	(names.hasMoreElements()) {
					String name = (String)names.nextElement();
					put(name.toLowerCase(),pf.getProperty(name));
				}
			}
			rtn = true;
		} catch (Exception e) {
		} finally {
			if (fis != null) {
				try { fis.close(); } catch (Exception e) { }
			}
		}
		return rtn;
	}
	
	/**
	 * This Method reads in all the properties stored in the serverconfig table of the
	 * application's database
	 * 
	 * @param dbConn  DBConnection object to use for database access.
	 * @return  True if the initialization method succeeded otherwise false if an error occurrs.
	 */
	public boolean populate(DBInteract dbi) {
		boolean rtn = false;
		if (dbi == null) {
			Logger.error("GlobalProp.initialize : dbi = null");
			return rtn;
		}
		ResultSet rs = null;
		try {
			
			rs = dbi.getResultSet(sql, null);
			if (rs != null) {
				while (rs.next()) {
					put(rs.getString(1), rs.getString(2));
				}
				rs.close();
			} else {
				Logger.error("GlobalProp.initialize: Resultset is null");
			}
			rtn = true;
		} catch (Exception e) {
			Logger.error(e);
		}
		return rtn;
	}
	
	/**
	 * Adds a new property to the _properties list
	 * 
	 * @param key Property key name
	 * @param value Property value
	 * @return Returns the old value if the property was prevously set otherwise null
	 */
	public String put(String key, String value) {
		String oldValue = (hasKey(key) ? get(key) : null);
		_instance._properties.put(key, value);
		return oldValue;
	}

	/**
	 * Returns the property value associated to the key
	 * 
	 * @param key Name of the property to retieve
	 * @return Returns the property value if the key exists in the property list otherwise it
	 * returns null
	 */
	public String get(String key) {
		return _instance._properties.containsKey(key) ? _instance._properties.get(key) : null;
	}

	public static String getProperty(String key){
		if (_instance != null) {
			return _instance.get(key);
		} else {
			return null;
		}
	}
	
	/**
	 * Returns the String property value associated to the key
	 * 
	 * @param key Name of the property to retieve
	 * @param dftValue The default value to return if the property key does not exist in the
	 * list
	 * @return Returns the property value if the key exists in the property list otherwise it
	 * returns the passed in default string value
	 */
	public String get(String key, String dftValue) {
		return _instance._properties.containsKey(key) ? _instance._properties.get(key) : dftValue;
	}

	/**
	 * Returns the int property value associated to the key
	 * 
	 * @param key Name of the property to retieve
	 * @param dftValue The default value to return if the property key does not exist in the
	 * list
	 * @return Returns the property value if the key exists in the property list otherwise it
	 * returns the passed in default it value
	 */
	public int getInt(String key, int dftValue) {
		if (_instance._properties.containsKey(key)) {
			try {
				return Integer.parseInt(_instance._properties.get(key));
			} catch (Exception e) {}
		}
		return dftValue;
	}

	/**
	 * Returns the boolean property value associated to the key
	 * 
	 * @param key Name of the property to retieve
	 * @param dftValue The default value to return if the property key does not exist in the
	 * list
	 * @return Returns the property value if the key exists in the property list otherwise it
	 * returns the passed in default boolean value
	 */
	public boolean getBool(String key, boolean dftValue) {
		if (_instance._properties.containsKey(key)) {
			try {
				return Boolean.parseBoolean(_instance._properties.get(key));
			} catch (Exception e) {}
		}
		return dftValue;
	}

	/**
	 * Returns the long property value associated to the key
	 * 
	 * @param key Name of the property to retieve
	 * @param dftValue The default value to return if the property key does not exist in the
	 * list
	 * @return Returns the property value if the key exists in the property list otherwise it
	 * returns the passed in default long value
	 */
	public long getLong(String key, long dftValue) {
		if (_instance._properties.containsKey(key)) {
			try {
				return Long.parseLong(_instance._properties.get(key));
			} catch (Exception e) {}
		}
		return dftValue;
	}

	/**
	 * Removes the property from the properties list
	 * 
	 * @param key Key of the property to remove
	 * @return Returns the stored value if it existed in the properties list otherise it
	 * returns null
	 */
	public String remove(String key) {
		return hasKey(key) ? _properties.remove(key) : null;
	}

	/**
	 * Check to see if the passed in key exists in properties map
	 * @param key  Name of property to check  
	 * @return  Returns true if the property key exists otherwise false
	 */
	public boolean hasKey(String key) {
		return _properties.containsKey(key);
	}

	/**
	 * Prints all properties to the log file if the default log level is Debug or higher.
	 */
	public void printToInitLog() {
		Iterator<String> iter = getSortedKeys().iterator();
		Logger.writeInit(this.getClass().getSimpleName());
		while (iter.hasNext()) {
			String key = iter.next();
			if (! NO_PRINT.contains(key.toLowerCase())) {
				Logger.writeInit(" " + key + ": " + _properties.get(key));
			}
		}
	}

	/**
	 *
	 * @return  Returns an ArrayList of all the properties keys
	 */
	public ArrayList<String> getKeys() {
		ArrayList<String> keys = new ArrayList<String>();
		Iterator<String> iter = _properties.keySet().iterator();
		while (iter.hasNext()) {
			keys.add(iter.next());
		}
		return keys;
	}

	/**
	 * clear all property lists prior to Object dispose 
	 */
	public void dispose() {
		_properties.clear();
		_properties = null;

	}

	/**
	 * 
	 * @return  Returns true if GlobalProperties currently has an error message
	 */
	public boolean hasError() {
		return _hasError;
	}

	/**
	 * 
	 * @return  Returns the current error and resets the error value to null
	 */
	public String getError() {
		String errorMsg = _errorMsg;
		_hasError = false;
		_errorMsg = null;
		return errorMsg;
	}

	/**
	 * Sets the current error to the passed in error message
	 * @param errorMsg  Text to set the current to.
	 */
	protected void setError(String errorMsg) {
		getError();
		_errorMsg = errorMsg;
		_hasError = (_errorMsg != null);
	}

	/**
	 * 
	 * @return  Returns the list of properties in sort format.
	 */
	public ArrayList<String> getSortedKeys() {
		ArrayList<String> keys = new ArrayList<String>();
		Iterator<String> iter = _properties.keySet().iterator();
		while (iter.hasNext()) {
			keys.add(iter.next());
		}
		Collections.sort(keys, new KeyComparator());
		return keys;
	}
	
	public JSONObject asJson() {
		JSONObject jobj = new JSONObject();
		ArrayList<String> keys = this.getSortedKeys();
		for (String key : keys) {
			try {
				jobj.put(key, _instance.get(key));
			} catch (JSONException e) {
				Logger.error(e);
			}
		}
		return jobj;
	}

}
