package org.geof.store;

import java.sql.ResultSet;

import org.geof.log.Logger;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * StorageLocation represents a location on the server disk where upload files are stored and served from.
 * 
 * @author Jeff Boehmer
 * @comanpay  Ft Collins Research, LLC.
 * @url	www.ftcollinsresearch.org
 *
 */
public class StorageLocation {

	private final static String ID = "id";
	private final static String NAME = "name";
	private final static String SYSTEMDIR = "systemdir";
	private final static String ACTIVE = "active";
	private final static String DESC = "description";
	private final static String USEDSPACE = "usedspace";
	private final static String QUOTA = "quota";
	private final static String FILECOUNT = "filecount";
	private final static String CANSTREAM = "canstream";

	public long storageid = -1;
	public String systemdir = null;
	public boolean active = false;
	public String name = null;
	public String description = null;
	public long quota = 0;
	public double usedspace = 0.0;	
	public long filecount = 0;
	public boolean canstream = false;
	
	private String _error = null;

	/**
	 * Class constructor
	 */
	public StorageLocation() {
	}

	/**
	 * Class constructor
	 * @param ID Storage Location primary key
	 * @param Name  Friencly name of the the storage location
	 * @param Systemdir Storage directory location on the server disk
	 * @param Active  Whether or not the storage location is active
	 * @param Desc  Description of the storage location
	 */
	public StorageLocation(long ID, String Name, String Systemdir, boolean Active, String Desc) {
		storageid = ID;
		name = Name;
		systemdir = Systemdir;
		active = Active;
		description = Desc;
	}

	/**
	 * Class constructor for building a storage location from resultset row from the database
	 * @param row ResultSet row to use for object initialization.
	 */
	public StorageLocation(ResultSet row) {
		try {
			systemdir = row.getString(SYSTEMDIR);
			name = row.getString(NAME);
			storageid = row.getLong(ID);
			active = row.getBoolean(ACTIVE);
			description = row.getString(DESC);
			usedspace = row.getDouble(USEDSPACE);
			quota = row.getLong(QUOTA);
			filecount =row.getLong(FILECOUNT);
			canstream = row.getBoolean(CANSTREAM);
		} catch (Exception e) {
			Logger.error(e);
		}
	}
	
	/**
	 * Class constructor for building a storage location from a JSONObject
	 * @param joLoc JSONObject to use for object initialization.
	 */
	public StorageLocation(JSONObject joLoc) {
		try {
			if (validate(joLoc) == null) {
				systemdir = joLoc.getString(SYSTEMDIR);
				name = joLoc.getString(NAME);
				storageid = joLoc.has(ID) ? joLoc.getLong(ID) : -1;
				active = joLoc.has(ACTIVE) ? joLoc.getBoolean(ACTIVE) : false;
				description = joLoc.has(DESC) ? joLoc.getString(DESC) : "";
				usedspace = joLoc.has(USEDSPACE) ? joLoc.getDouble(USEDSPACE) : 0.0;
				quota = joLoc.has(QUOTA) ? joLoc.getLong(QUOTA) : 0;
				filecount = joLoc.has(FILECOUNT) ? joLoc.getLong(FILECOUNT) : 0;
				canstream = joLoc.has(CANSTREAM) ? joLoc.getBoolean(CANSTREAM) : false;
				//Logger.verbose(this.toJSON().toString());
			}
		} catch (JSONException e) {
			Logger.error(e);
		}
	}

	/**
	 * Checks to make sure the JSONObject has the minimum information needed to create a new StroageLocation Object 
	 * @param joLoc
	 * @return Returns null if the a new StorageLocation object can be created otherwise returns an error message.
	 */
	public static String validate(JSONObject joLoc) {
		if (joLoc.optString( SYSTEMDIR, "").length() == 0) {
			return "Missing systemdir field";
		}
		if (joLoc.optString( NAME, "").length() == 0) {
			return "Missing name field";
		}
		return null;
	}
	
	/**
	 * Method checks to see if there is enough remaining storage space alloted for the new file
	 * @param filesize  File size to check.
	 * @return True if there is enough alloted space otherwise return false.
	 */
	public boolean hasQuotaSpace(long filesize) {
		double megSize = (usedspace + filesize) / StorageMgr.BYTE_PER_MEG;
		return ( (quota < 1) || (quota >= megSize));
	}

	/**
	 * 
	 * @return Returns the object serialzied as a JSON string
	 */
	public JSONObject toJSON() {
		try {
			JSONObject storage = new JSONObject();
			storage.put(ID, storageid);
			storage.put(NAME, name);
			storage.put(SYSTEMDIR, systemdir);
			storage.put(ACTIVE, active);
			storage.put(DESC, description);
			storage.put(QUOTA, quota);
			storage.put(USEDSPACE, usedspace);
			storage.put(FILECOUNT, filecount);
			storage.put(CANSTREAM, canstream);
			return storage;
		} catch (JSONException e) {
			Logger.error(e);
			return null;
		}
	}

	/**
	 * 
	 * @return Returns the object serialzied as a JSON string
	 */
	public JSONObject toJSONShort() {
		try {
			JSONObject storage = new JSONObject();
			storage.put(ID, storageid);
			storage.put(NAME, name);
			storage.put(DESC, description);
			storage.put(CANSTREAM, canstream);
			return storage;
		} catch (JSONException e) {
			Logger.error(e);
			return null;
		}
	}

	/**
	 * 
	 * return Returns the current error string and then clears the error.
	 */
	public String getError() {
		String error = _error;
		_error = null;
		return error;
	}
}
