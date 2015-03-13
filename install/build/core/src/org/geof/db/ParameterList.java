package org.geof.db;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Time;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Scanner;

import org.geof.log.Logger;
import org.geof.util.DateUtil;
import org.json.JSONObject;
import org.postgis.Geometry;

/**
 * ParameterLists are a list of NameValue objects with can be associated to a specific
 * EntityMap object. The primary use of this class is to facilitate the setting of
 * Parameterized query search or update values.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class ParameterList {

	public static final int GEOMETRYTYPE = 1111;
	public final String QUESTION = "?";

	private EntityMap _emap = null;
	private ArrayList<NameValue> _params = null;
	private String _error = null;

	/**
	 * Class Constructor
	 * 
	 * @param emap EntityMap to associate this ParameterList with.
	 */
	public ParameterList(EntityMap emap) {
		_emap = emap;
		_params = new ArrayList<NameValue>();
	}

	/**
	 * Class Constructor
	 * 
	 * @param emap EntityMap name to associate this ParameterList with.
	 */
	public ParameterList(String emapname) {
		this(EntityMapMgr.getEMap(emapname));
	}

	/**
	 * Class Constructor
	 * 
	 * @param emap EntityMap name to associate this ParameterList with.
	 * @param json JSONObject that containst the NameValue information to load into the
	 * ParameterList fields
	 */
	public ParameterList(EntityMap emap, JSONObject json) throws Exception{
		this(emap);
		if (json != null) {
			addJson(json);
		}
	}

	public ParameterList(String emapName, JSONObject json) throws Exception {
		this(emapName);
		if (json != null) {
			addJson(json);
		}
	}
	
	/**
	 * /** Class Constructor
	 * 
	 * @param emap EntityMap name to associate this ParameterList with.
	 * @param fields JSONObject that containst the NameValue information to load into the
	 * ParameterList fields
	 * @param exclude List of field names to exclude from the NameValue list normally because
	 * they are non-editable fields or ones that will be set later.
	 * @param required List of field names with must be in the <fields> object for the
	 * ParameterList to be valid
	 */
	public ParameterList(EntityMap emap, JSONObject fields, ArrayList<String> exclude, ArrayList<String> required) {
		this(emap);

		try {
			if (fields == null) {
				return;
			}

			HashMap<String, NameValue> map = addJsonMap(fields);
			if (required != null) {
				for (String fieldname : required) {
					if (!map.containsKey(fieldname)) {
						if (this._error == null) {
							this._error = "";
						}
						this._error += fieldname + " ";
					}
				}
			}
			if (this._error != null) {
				String msg = "Missing required params for " + emap.getName();
				Logger.error(msg + " " + this._error);
				return;
			}

			if (exclude != null) {
				for (String fieldname : exclude) {
					map.remove(fieldname);
				}
			}
			_params = new ArrayList<NameValue>(map.values());

		} catch (Exception e) {
			Logger.error(e);
			_error = e.getMessage();
		}
	}
	
	public EntityMap getEntityMap() {
		return this._emap;
	}
	
	public String getError() {
		String error = this._error;
		this._error = null;
		return error;
	}
	
	public Object getValue(String paramName) {
		for (NameValue nv : _params) {
			if (nv.Name.equalsIgnoreCase(paramName)) {
				return nv.Value;
			}
		}
		return null;
	}

	/**
	 * This method adds a set of NameValue fields to the ParameterList
	 * 
	 * @param json JSONObject with contains the names and values to be added.
	 * @return Returns an ArrayList of NameValues with have been added to the ParameterList.
	 */
	public ArrayList<NameValue> addJson(JSONObject json) throws Exception {
		ArrayList<NameValue> nvs = new ArrayList<NameValue>();
		if (json != null) {
			NameValue namevalue;
			String[] fldnames = JSONObject.getNames(json);
			if (fldnames != null ) {
				int fldcount = fldnames.length;
				String fieldname;
				for (int index = 0; index < fldcount; index++) {
					fieldname = fldnames[index];
					if (_emap.hasField(fieldname)) {
						namevalue = this.addJSON(json, fieldname);
						if (namevalue == null) {
							throw new Exception("ParameterList.addJson field value is null : "+fieldname);
						} else {
							nvs.add(namevalue);							
						}
					}
				}
			}
		}
		return nvs;
	}

	/**
	 * This method adds a set of NameValue fields to the ParameterList
	 * 
	 * @param json JSONObject with contains the names and values to be added.
	 * @return Returns an Hashmap of NameValues with have been added to the ParameterList with
	 * each NameValue name variable as a HashMap key.
	 */
	public HashMap<String, NameValue> addJsonMap(JSONObject json) throws Exception {
		HashMap<String, NameValue> map = new HashMap<String, NameValue>();
		NameValue namevalue;
		String[] fldnames = JSONObject.getNames(json);

		for (String fieldname : fldnames) {
			if (_emap.hasField(fieldname)) {
				namevalue = this.addJSON(json, fieldname);
				if ((!map.containsKey(fieldname)) && (namevalue != null)) {
					// Logger.error("adding field: " + fieldname);
					map.put(fieldname, this.addJSON(json, fieldname));
				}
			}
		}
		return map;
	}

	/**
	 * 
	 * @return Returns the number of NameValue objects in this ParameterList
	 */
	public int getParamCount() {
		return _params.size();
	}

	/**
	 * 
	 * @param indx Index of the NameValue name field to return.
	 * @return Returns the Name of a NameValue object at the index point of the NameValue
	 * list. If the indx is out of range it returns null instead.
	 */
	public String getParamName(int indx) {
		if ((indx < 0) || (indx >= _params.size()))
			return null;
		return _params.get(indx).Name;
	}

	/**
	 * 
	 * @return Returns true if the ParameterList contains any NameValue objects
	 */
	public boolean hasParameters() {
		return _params.size() > 0;
	}

	/**
	 * 
	 * @return Returns the name of the EntityMap if the ParameterList contains one otherwise
	 * null.
	 */
	public String getTableName() {
		return _emap == null ? "" : _emap.getName();
	}

	/**
	 * @return Returns all the Names of the NameValues as a Comma Delimited String
	 */
	public String getFields() {
		String rtn = "";
		for (NameValue nv : _params) {
			rtn += "," + nv.Name;
		}
		return rtn.length() > 1 ? rtn.substring(1) : "";
	}

	/**
	 * Adds a new NameValue Object to the ParameterList
	 * 
	 * @param namevalue New NameValue object to add
	 * @return Returns the added NameValue Object
	 */
	public NameValue add(NameValue namevalue) {
		_params.add(namevalue);
		return namevalue;
	}

	/**
	 * Adds a new NameValue object to the ParemeterList
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in string format
	 * @param type Java Datatype enum to convert the Value field to when adding.
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, String value, int type) {
		return add(new NameValue(fieldname, this.convert(value, type), type));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a string object
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in string format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, String fieldvalue) {
		return add(new NameValue(fieldname, fieldvalue, java.sql.Types.VARCHAR));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as an int
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in int format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, int fieldvalue) {
		return add(new NameValue(fieldname, new Integer(fieldvalue), java.sql.Types.INTEGER));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a long
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in long format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, long fieldvalue) {
		return add(new NameValue(fieldname, new Long(fieldvalue), java.sql.Types.BIGINT));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a double
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in double format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, double fieldvalue) {
		return add(new NameValue(fieldname, new Double(fieldvalue), java.sql.Types.DOUBLE));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a date
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in date format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, Date fieldvalue) {
		return add(new NameValue(fieldname, fieldvalue, java.sql.Types.DATE));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a Timestamp
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in Timestamp format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, Timestamp fieldvalue) {
		return add(new NameValue(fieldname, fieldvalue, java.sql.Types.TIMESTAMP));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a boolean
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in boolean format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, boolean fieldvalue) {
		return add(new NameValue(fieldname, new Boolean(fieldvalue), java.sql.Types.BOOLEAN));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a byte
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in byte format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, byte fieldvalue) {
		return add(new NameValue(fieldname, new Byte(fieldvalue), java.sql.Types.TINYINT));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a short
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in short format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, short fieldvalue) {
		return add(new NameValue(fieldname, new Short(fieldvalue), java.sql.Types.SMALLINT));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a float
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in float format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, float fieldvalue) {
		return add(new NameValue(fieldname, new Float(fieldvalue), java.sql.Types.FLOAT));
	}

	/**
	 * Adds a new NameValue object to the ParemeterList with the value as a Geometry
	 * 
	 * @param fieldname Name field for the new NameValue Object to be added.
	 * @param fieldvalue Value of the new NameValue in Geometry format
	 * @return Returns the newly added NameValue Object.
	 */
	public NameValue add(String fieldname, Geometry fieldvalue) {
		return add(new NameValue(fieldname, fieldvalue, GEOMETRYTYPE));
	}

	/**
	 * Sets the PreparedStatments parameters values with the values in the ParameterList
	 * 
	 * @param ps PreparedStatement whose parameters are to be set
	 * @return Tru if the method was successful other false if an error occurred.
	 */
	public boolean setPreparedStatement(PreparedStatement ps) throws Exception {
		int paramCount = _params.size();
		boolean rtn;
		for (int index = 0; index < paramCount; index++) {
			rtn = setData(ps, _params.get(index), index + 1);
			if (!rtn)
				return false;
		}
		return true;
	}

	/**
	 * Sets the PreparedStatments parameters values with the values in the ParameterList
	 * 
	 * @param ps PreparedStatement whose parameters are to be set
	 * @param offset The offset into the PreparedStatement's parameters to start at. Used when
	 * more than one ParameterList is used to set parameter values.
	 * @return True if the method was successful other false if an error occurred.
	 */
	public boolean setPreparedStatement(PreparedStatement ps, int offset) throws Exception  {
		int paramCount = _params.size();
		for (int index = 0; index < paramCount; index++) {
			if (!setData(ps, _params.get(index), index + offset + 1)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Internal Method for setting the individual PreparedStatement's parameter value
	 * 
	 * @param ps PreparedStatement whose parameter is to be set
	 * @param nv NameValue object holding the parameter data
	 * @param index Index of Parameter object to set.
	 * @return True if the method was successful other false if an error occurred.
	 */
	protected boolean setData(PreparedStatement ps, NameValue nv, int index) throws Exception {
		int iDatatype = nv.Datatype; 
		if (iDatatype == java.sql.Types.CHAR) {
			ps.setString(index, (String) nv.Value);
		} else if (iDatatype == java.sql.Types.VARCHAR) {
			ps.setString(index, (String) nv.Value);
		} else if (iDatatype == java.sql.Types.LONGVARCHAR) {
			ps.setString(index, (String) nv.Value);
		} else if (iDatatype == java.sql.Types.NUMERIC) {
			ps.setBigDecimal(index, BigDecimal.valueOf((Double) nv.Value));
		} else if (iDatatype == java.sql.Types.DECIMAL) {
			ps.setBigDecimal(index, BigDecimal.valueOf((Double) nv.Value));
		} else if (iDatatype == java.sql.Types.BIT) {
			ps.setBoolean(index, (Boolean) nv.Value);
		} else if (iDatatype == java.sql.Types.TINYINT) {
			ps.setByte(index, (Byte) nv.Value);
		} else if (iDatatype == java.sql.Types.SMALLINT) {
			ps.setShort(index, (Short) nv.Value);
		} else if (iDatatype == java.sql.Types.BIGINT) {
			ps.setLong(index, (Long) nv.Value);
		} else if (iDatatype == java.sql.Types.INTEGER) {
			ps.setInt(index, (Integer) nv.Value);
		} else if (iDatatype == java.sql.Types.BIGINT) {
			ps.setLong(index, (Long) nv.Value);
		} else if (iDatatype == java.sql.Types.REAL) {
			ps.setFloat(index, (Float) nv.Value);
		} else if (iDatatype == java.sql.Types.FLOAT) {
			ps.setDouble(index, (Float) nv.Value);
		} else if (iDatatype == java.sql.Types.DOUBLE) {
			ps.setDouble(index, (Double) nv.Value);
		} else if (iDatatype == java.sql.Types.DATE) {
			ps.setDate(index, (Date) nv.Value);
		} else if (iDatatype == java.sql.Types.TIME) {
			ps.setTime(index, (Time) nv.Value);
		} else if (iDatatype == java.sql.Types.BOOLEAN) {
			ps.setBoolean(index, (Boolean) nv.Value);
		} else if (iDatatype == java.sql.Types.TIMESTAMP) {
			ps.setTimestamp(index, (Timestamp) nv.Value);
		} else if (iDatatype == GEOMETRYTYPE) {
			ps.setObject(index, nv.Value, GEOMETRYTYPE);
		} else {
			throw new Exception("ParameterList.setData missing datatype for " + iDatatype );
		}
		// Logger.verbose(nv.toString());
		return true;
	}

	/**
	 * Adds a new NameValue object to the ParameterList using the JSONObject as the data
	 * source.
	 * 
	 * @param json JSONObject which provides the data for the Value field
	 * @param fieldname Name of the field to add to the ParameterList
	 * @return Returns the new NameValue object
	 */
	protected NameValue addJSON(JSONObject json, String fieldname) throws Exception {
		int iDatatype = _emap.getDatatype(fieldname); 
		if ( iDatatype == java.sql.Types.CHAR) {
			return add(fieldname, json.getString(fieldname));
		} else if (iDatatype == java.sql.Types.VARCHAR) {
			return add(fieldname, json.getString(fieldname));
		} else if (iDatatype == java.sql.Types.LONGVARCHAR) {
			return add(fieldname, json.getString(fieldname));
		} else if (iDatatype == java.sql.Types.NUMERIC) {
			return add(fieldname, json.getDouble(fieldname));
		} else if (iDatatype == java.sql.Types.DECIMAL) {
			return add(fieldname, json.getDouble(fieldname));
		} else if (iDatatype == java.sql.Types.BIT) {
			String strVal = json.getString(fieldname);
			Scanner scanner = new Scanner(strVal);
			NameValue rtn;
			if (scanner.hasNextBoolean()) {
				rtn = add(fieldname, Boolean.parseBoolean(strVal));
			} else {
				rtn = add(fieldname, Integer.parseInt(strVal));
			}
			scanner.close();
			return rtn;
		} else if (iDatatype == java.sql.Types.TINYINT) {
			return add(fieldname, json.getInt(fieldname));
		} else if (iDatatype == java.sql.Types.SMALLINT) {
			return add(fieldname, json.getInt(fieldname));
		} else if (iDatatype == java.sql.Types.INTEGER) {
			return add(fieldname, json.getInt(fieldname));
		} else if (iDatatype == java.sql.Types.BIGINT) {
			return add(fieldname, json.getLong(fieldname));
		} else if (iDatatype == java.sql.Types.REAL) {
			return add(fieldname, json.getDouble(fieldname));
		} else if (iDatatype == java.sql.Types.FLOAT) {
			return add(fieldname, json.getDouble(fieldname));
		} else if (iDatatype == java.sql.Types.DOUBLE) {
			return add(fieldname, json.getDouble(fieldname));
		} else if (iDatatype == java.sql.Types.BOOLEAN) {
			return add(fieldname, json.getBoolean(fieldname));
		} else if (iDatatype == java.sql.Types.DATE) {
			return add(fieldname, java.sql.Date.valueOf(json.getString(fieldname)));
		} else if (iDatatype == java.sql.Types.TIME) {
			return add(fieldname, json.getString(fieldname));
		} else if (iDatatype == java.sql.Types.TIMESTAMP) {
			String value = json.getString(fieldname);
			Timestamp ts = null;
			if ((value != null) && (!value.equalsIgnoreCase("null"))){
				if (value.indexOf("M") > -1) {
					value = DateUtil.TSDateFormat.format(DateUtil.TSDateFormat.parse(value));
				}
				ts = Timestamp.valueOf(value);
			}
			return add(fieldname, ts);
		} else {
			throw new Exception("ParameterList.addJson - Missing handler for type: " + iDatatype);
		}
	}

	/**
	 * Adds a new NameValue object to the ParameterList using the JSONObject as the data
	 * source.
	 * 
	 * @param json JSONObject which provides the data for the Value field
	 * @param fieldname Name of the field to add to the ParameterList
	 * @return Returns the new NameValue object
	 */
	protected Object convert(String value, Integer datatype) {
		try {
			if (datatype == java.sql.Types.CHAR) {
				return value;
			} else if (datatype == java.sql.Types.VARCHAR) {
				return value;
			} else if (datatype == java.sql.Types.LONGVARCHAR) {
				return value;
			} else if (datatype == java.sql.Types.NUMERIC) {
				return Double.parseDouble(value);
			} else if (datatype == java.sql.Types.DECIMAL) {
				return Double.parseDouble(value);
			} else if (datatype == java.sql.Types.BIT) {
				Scanner scanner = new Scanner(value);
				Object rtn;
				if (scanner.hasNextBoolean()) {
					rtn = Boolean.parseBoolean(value);
				} else {
					rtn = Integer.parseInt(value);
				}				
				scanner.close();
				return rtn;
			} else if (datatype == java.sql.Types.TINYINT) {
				return Integer.parseInt(value);
			} else if (datatype == java.sql.Types.SMALLINT) {
				return Integer.parseInt(value);
			} else if (datatype == java.sql.Types.INTEGER) {
				return Integer.parseInt(value);
			} else if (datatype == java.sql.Types.BIGINT) {
				return Long.parseLong(value);
			} else if (datatype == java.sql.Types.REAL) {
				return  Double.parseDouble(value);
			} else if (datatype == java.sql.Types.FLOAT) {
				return  Double.parseDouble(value);
			} else if (datatype == java.sql.Types.DOUBLE) {
				return  Double.parseDouble(value);
			} else if (datatype == java.sql.Types.BOOLEAN) {
				return Boolean.parseBoolean(value);
			} else if (datatype == java.sql.Types.DATE) {
				return java.sql.Date.valueOf(value);
			} else if (datatype == java.sql.Types.TIME) {
				return java.sql.Date.valueOf(value);
			} else if (datatype == java.sql.Types.TIMESTAMP) {
				Timestamp ts = null;
				if ((value != null) && (!value.equalsIgnoreCase("null"))){
					if (value.indexOf("M") > -1) {
						value = DateUtil.TSDateFormat.format(DateUtil.TSDateFormat.parse(value));
					}
					ts = Timestamp.valueOf(value);
				}
				return ts;
			}
			return null;
		} catch (Exception e) {
			Logger.error(e);
			return null;
		}
	}

	/**
	 * Builds Where statement from the NameValues in the ParameterList
	 * 
	 * @param useFirstAndOr Sets whether the start of the where statement should have an AND
	 * or OR prepended to the string. Usually true if the Where statement is going to be
	 * concatinated onto another statement
	 * @return Returns the string based Where statement for a SQL query
	 */
	public String getWhere(boolean useFirstAndOr) {
		if (!this.hasParameters())
			return "";

		StringBuilder sb = new StringBuilder();
		
		for (NameValue nv : _params) {
			if ((sb.length() > 0) || useFirstAndOr) {
				sb.append(QueryBuilder.AND);
			}
			 
			sb.append(nv.Name).append("=").append(QUESTION);
		}
		return sb.toString();
	}

	/**
	 * @return Returns a formatted string including all the NameValue objects
	 */
	public String toString() {
		String rtn = "";
		for (NameValue nv : _params) {
			rtn += ", [" + nv.Name + "] : " + nv.Value.toString();
		}
		return (rtn.length() > 2) ? rtn.substring(2) : rtn;
	}
}
