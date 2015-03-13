package org.geof.db;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;

import org.geof.log.Logger;
import org.geof.util.ConvertUtil;

/**
 * This class is an Entity to Map map used for providing table and link information for all
 * database interaction.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */

public class EntityMap {

	private static final String sqlSelect = "SELECT ef.* FROM entityfield ef WHERE ef.entityid = ?";
	private HashMap<String, FieldObject> _fieldObjects = new HashMap<String, FieldObject>();
	
	private String[] _allfields = null;
	private String _allfieldsCSV = null;
	private String[] _dftfields = null;
	private String[] _pkeyfields = null;
	private String[] _requiredfields = null;
	private String[] _autofields = null;

	long _entityid = -1;
	int _allcnt = 0;
	int _defaultcnt = 0;
	int _pkeycnt = 0;
	int _requiredcnt = 0;
	int _autocnt = 0;

	private ArrayList<String> _autoflds = null;
	private ArrayList<String> _requiredflds = null;

	private String _entityName = null;

	// ----------------------------------------------------
	/**
	 *  Class Constructor 
	 * @param entityname  Entity/Table name
	 * @param entityid  Database primary key id field
	 * @param conn  DBConnection object object
	 */
	public EntityMap(String entityname, int entityid, DBInteract dbi) {
		initialize(entityname, entityid, dbi);
	}

	// ----------------------------------------------------

	private boolean initialize(String entityname, long entityid, DBInteract dbi) {
		PreparedStatement ps = null;
		ResultSet rs = null;
		_entityid = entityid;
		_entityName = entityname;

		try {
			ps = dbi.getPreparedStatement(sqlSelect);
			ps.setLong(1, _entityid);
			rs = ps.executeQuery();
			FieldObject objField;

			while (rs.next()) {
				objField = new FieldObject();
				objField.EntityID = rs.getInt("entityid");
				objField.Fieldname = rs.getString("fieldname").toLowerCase();
				objField.IsDefault = rs.getBoolean("isdefault");
				objField.IsPKey = rs.getBoolean("ispkey");
				objField.Datatype = rs.getInt("datatype");
				objField.IsRequired = rs.getBoolean("isrequired");
				objField.IsAuto = rs.getBoolean("isauto");
				objField.IsSpatial = false;
				objField.IsTemporal = false;
				_defaultcnt += objField.IsDefault ? 1 : 0;
				_pkeycnt += objField.IsPKey ? 1 : 0;
				_requiredcnt += (objField.IsRequired && !objField.IsAuto) ? 1 : 0;
				_autocnt += objField.IsAuto ? 1 : 0;
				_fieldObjects.put(objField.Fieldname, objField);
			}
		} catch (Exception e) {
			Logger.error(e);
		} finally {
			if (ps != null) {
				try {ps.close();} catch(Exception e) {}
			}
		}
		return true;
	}

	/**
	 * @return Returns the database table name
	 */
	public String getName() {
		return _entityName;
	}

	/**
	 * 
	 * @return Returns the Entity Id long (primary key)
	 */
	public long getEntityId() {
		return _entityid;
	}
	/**
	 * @return Returns name of possible temporal field if available
	 */
	public String getTemporalName() {
		return hasField("utcdate") ? "utcdate" : (hasField("startdate") ? "startdate" : null);

	}

	/**
	 * 
	 * @return Name used as foreign key in linked or child tables
	 */
	public String getForeignKey() {
		return _entityName + "id";
	}

	/**
	 * 
	 * @return A String array of all field names for this entity/table
	 */
	public String[] getAllFields() {
		if (_allfields == null) {
			_allfields = ConvertUtil.toArray(_fieldObjects.keySet());
		}
		return _allfields;
	}

	/**
	 * 
	 * @return Returns a comma delimited list of all fields for this Entity/Table
	 */
	public String getAllFieldsCsv() {
		if ((_allfieldsCSV == null) || (_allfieldsCSV.length() == 0)) {
			_allfieldsCSV = ConvertUtil.toCsv(_fieldObjects.keySet(), null);
		}
		return _allfieldsCSV;
	}

	/**
	 * 
	 * @return Returns a comma delimited list of all fields for this Entity/Table
	 */
	public String fieldsCsvPrefixed(String fieldList) {
		if (fieldList == null) {
			return null;
		}
		return ConvertUtil.toCsv(fieldList.split(","), _entityName + ".");
	}
	
	public ColumnTrio[] getColumnTrio(String[] fieldlist) {
		int count = fieldlist.length;
		ColumnTrio[] cts = new ColumnTrio[count];
		FieldObject fo;
		
		for (int indx=0;indx<count;indx++) {
			fo = this.getFieldObject(fieldlist[indx]);
			if (fo == null) {
				Logger.error("EntityMap.getFieldObject does not contain field: " + fieldlist[indx]);
			} else {
				cts[indx] = new ColumnTrio(indx, fo.Datatype, fo.Fieldname);
			}
		}
		return cts;
	}
	
	public FieldObject getFieldObject(String fieldname) {
		return _fieldObjects.get(fieldname.toLowerCase());
	}
	
	/**
	 * 
	 * @return Returns a comma delimited list of all fields for this Entity/Table
	 */
	public String getFieldsCsv(String[] fieldList, boolean prepend) {
		if (_fieldObjects.size() == 0) {
			return null;
		}
		
		List<String> flds = filter(fieldList, true);
		if (flds.size() == 0) {
			return null;
		}
		String prefix =  prepend ? this.getName(): null;
		return ConvertUtil.toCsv(flds, prefix);
	}
	
	public List<String> filter(String[] fields, boolean fillEmpty) {
		List<String> flds = new ArrayList<String>();
		
		if (fields == null || fields.length == 0) {
			if (fillEmpty) {
				flds.addAll(_fieldObjects.keySet());
			}
		} else {
			for (String field : fields) {
				field = field.trim().toLowerCase();
				if (_fieldObjects.containsKey(field)) {
					flds.add(field);
				}
			}
		}
		return flds;		
	}
	
	/**
	 * 
	 * @return Returns a String array of all fields markeds as 'Default'
	 */
	public String[] getDefaultFields() {
		if (_dftfields == null) {
			_dftfields = ConvertUtil.toArray(_fieldObjects.keySet());
		}
		return _dftfields;
	}

	/**
	 * 
	 * @return Returns a String array of all fields included in the primary key
	 */
	public String[] getPrimaryKeys() {
		if (_pkeyfields == null) {
			_pkeyfields = new String[_pkeycnt];
			int indx = 0;
			for (FieldObject fo : _fieldObjects.values()) {
				if (fo.IsPKey) {
					_pkeyfields[indx++] = fo.Fieldname;
				}
			}
		}
		return _pkeyfields;
	}

	/**
	 * 
	 * @return Returns a String array of all fields marked as required.
	 */
	public String[] getRequiredFields() {
		if (_requiredfields == null) {
			_requiredfields = new String[_requiredcnt];
			int indx = 0;
			for (FieldObject fo : _fieldObjects.values()) {
				if ((fo.IsRequired) && (!fo.IsAuto)) {
					_requiredfields[indx++] = fo.Fieldname;
				}
			}
		}
		return _requiredfields;
	}

	/**
	 * Retursn a String array of all fields marked as 'Auto'. Auto fields are set by the
	 * database and can not be altered by queries
	 * 
	 * @return Returns all fields marked as 'Auto'
	 */
	public String[] getAutoFields() {
		if (_autofields == null) {
			_autofields = new String[_autocnt];
			int indx = 0;
			for (FieldObject fo : _fieldObjects.values()) {
				if (fo.IsAuto) {
					_autofields[indx++] = fo.Fieldname;
				}
			}
		}
		return _autofields;
	}

	/**
	 * Returns an ArrayList of all fields marked as 'Auto'. Auto fields are set by the
	 * database and can not be altered by queries
	 * 
	 * @return Returns an ArrayList of fields marked as 'Auto'
	 */
	public ArrayList<String> getAutoFldsAsList() {
		if (_autoflds == null) {
			_autoflds = new ArrayList<String>(Arrays.asList(getAutoFields()));
		}
		return _autoflds;
	}

	/**
	 * @return Returns an ArrayList of all fields marked as 'Required'.
	 */
	@SuppressWarnings("unchecked")
	public ArrayList<String> getRequiredFldsAsList() {
		if (_requiredflds == null) {
			_requiredflds = new ArrayList<String>();
			Collections.addAll(_requiredflds, getRequiredFields()); 
		}
		return (ArrayList<String>) (Object) _requiredflds.clone();
	}

	/**
	 * Method that checks if parameter is a one of the Entity/Table fields
	 * 
	 * @param fieldname Field name to check
	 * @return Returns true if the parameter is a field otherwise false.
	 */
	public boolean hasField(String fieldname) {
		return _fieldObjects.containsKey(fieldname);
	}

	public Integer getDatatype(String fieldname) {
		return _fieldObjects.containsKey(fieldname) ? _fieldObjects.get(fieldname).Datatype : null;
	}

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	/**
	 * Class for database table field information
	 */
	
	public class FieldObject {
		int EntityID = -1;
		String Fieldname = null;
		boolean IsDefault = false;
		boolean IsPKey = false;
		int Datatype = -1;
		boolean IsRequired = false;
		boolean IsAuto = false;
		boolean IsSpatial = false;
		boolean IsTemporal = false;
	}


}
