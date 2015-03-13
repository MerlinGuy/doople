package org.geof.store;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import org.bouncycastle.util.encoders.Base64;
import org.geof.data.FileInfo;
import org.geof.db.DBInteract;
import org.geof.db.EntityMapMgr;
import org.geof.log.Logger;
import org.geof.prop.GlobalProp;
import org.geof.request.Request;
import org.geof.service.JsonWriter;
import org.geof.util.FileUtil;
import org.geof.util.JsonUtil;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The StorageManager class manages all media storage location on the server as well as all
 * file uploads to those locations.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class StorageMgr {

	public final static String FILECOUNT = "filecount";
	public final static String USEDSPACE = "usedspace";
	public final static String STORAGELOC = "storageloc";
	public final static String CANSTREAM = "canstream";
	public final static String NAME = "name";
	public final static String APPENDCONFPATH = "appendconfpath";
	public final static String SYSTEMDIR = "systemdir";
	public final static String EXISTING = "existing";
	public final static String TESTFILE = "/geof_system_test_file.txt";
	public final static double BYTE_PER_MEG = 1048576.0;
	
	private final static String _sqlRead = "SELECT * FROM storageloc";
	private static StorageMgr _instance = null;
	
	private final static DecimalFormat _decFormat = new DecimalFormat("#.000");

	private HashMap<Long, StorageLocation> _storageloc = new HashMap<Long, StorageLocation>();
	private HashMap<String, FileUpload> _fileUploads = new HashMap<String, FileUpload>();

	/**
	 * Class constructor
	 */
	private StorageMgr() {
	}

	/**
	 * 
	 * @return Returns the Singleton instanace of the StorageManager class
	 */
	public static StorageMgr instance() {
		if (_instance == null) {
			_instance = new StorageMgr();
		}
		return _instance;
	}

	/**
	 * Initializes the current list of Storage Locations stored in memory
	 * 
	 * @param dbConn DBConnection to use to read the location from the database
	 * @return Returns true if the locations were successfully read from the database
	 * otherwise false.
	 */
	public boolean initialize(DBInteract dbi) {
		Logger.writeInit("*** StorageMgr.initialized");
		if (dbi == null) {
			Logger.error("StorageManager.initialize : dbi = null");
			return false;
		}
		return reloadLocations(dbi);
	}

	/**
	 * Reads in the StorageLocation from the database
	 * 
	 * @param dbConn DBConnection to use to read the location from the database
	 * @return Returns true if the locations were successfully read from the database
	 * otherwise false.
	 */
	public boolean reloadLocations(DBInteract dbi) {
		try {
			clear();
			dbi.setLastSQL(_sqlRead);
			PreparedStatement ps =  dbi.getPreparedStatement(_sqlRead);
			ResultSet rs = ps.executeQuery();
			while (rs.next()) {
				put(new StorageLocation(rs));
			}
			rs.close();
			return true;
		} catch (Exception e) {
			Logger.error(e);

		}
		return false;
	}

	/**
	 * Updates the StorageLocation rows in the storageloc table of the database
	 * 
	 * @param dbConn DBConnection to use to read the location from the database
	 * @param data JSONObject holding the new storageloc information
	 * @return Returns true if no error occured otherwise false
	 */
	public String update(DBInteract dbi, JSONObject data) {
		try {
			JSONObject where = JsonUtil.getJsonObject(data, Request.WHERE, null);
			if (where == null) {
				return "DBInteract.update failed data object missing 'where' element";
			}

			long id = where.optLong(Request.ID, -1);
			if (id < 0) {
				return "DBInteract.update failed where element missing 'id' value";
			}

			StorageLocation sl = this.getById(id);
			String error = setFileInfo(sl);
			if (error != null){
				return error;
			}

			JSONObject fields = JsonUtil.getJsonObject(data, Request.FIELDS, null);
			if (fields == null) {
				return "DBInteract.update failed data object missing 'fields' element";
			}
			fields.put(FILECOUNT, sl.filecount);
			fields.put(USEDSPACE, sl.usedspace);

			if (! dbi.update(EntityMapMgr.getEMap(STORAGELOC), data)) {
				error = dbi.getError();
			}
			
			reloadLocations(dbi);
			return error;
		} catch (Exception e) {
			Logger.error(e);
			return e.getMessage();
		}
	}

	/**
	 * Writes the current StorageLocation in memory back to the database
	 * 
	 * @param dbConn DBConnection to use to read the location from the database
	 * @param storageLocID ID of StorageLocation to write back.
	 * @return Returns true if no error occured otherwise false
	 */
	public String update(DBInteract dbi, long storageLocID) {
		try {
			StorageLocation sl = getById(storageLocID);
			if (sl == null) {
				return "StorageManager.update : StorageLocation not found: " + storageLocID;
			}

			String error = setFileInfo(sl);
			if (error != null){
				return error;
			}
			JSONObject data = new JSONObject();
			data.put(Request.FIELDS, sl.toJSON());
			JSONObject where = new JSONObject();
			where.put(Request.ID, sl.storageid);
			data.put(Request.WHERE, where);
			dbi.update(EntityMapMgr.getEMap(STORAGELOC), data);
			return null;
		} catch (Exception e) {
			Logger.error(e);
			return e.getMessage();
		}
	}

	/**
	 * Creates a new StorageLocation in the storageloc table of the database
	 * 
	 * @param dbConn DBConnection to use to read the location from the database
	 * @param data JSONObject holding the new storageloc information
	 * @return Returns text of the error message if the create method fails
	 */
	public String create(DBInteract dbi, JSONObject data) {
		try {
			// Logger.verbose(data.toString());
			String error = validate( data, true, true );
			if (error != null) {
				return error;
			}
			JSONObject fields = data.getJSONObject(Request.FIELDS);
			String systemdir = fields.getString(SYSTEMDIR);
			if (systemdir.endsWith("/")) {
				systemdir = systemdir.substring(0, systemdir.length() - 1);
			}

			if (fields.has(CANSTREAM) && fields.getBoolean(CANSTREAM)) {
//				String alias = fields.getString(NAME);
//				ApacheConfManager acm = new ApacheConfManager();
//				if (GlobalProp.instance().hasKey(APPENDCONFPATH)) {
//					String path = GlobalProp.instance().get(APPENDCONFPATH);
//					acm.setAppendConfPath(path);
//				}

//				boolean hasAlias = acm.hasAlias(alias);
//				if (hasAlias) {
//					String path = acm.getAliasDirectory(alias);
//					if (path == null) {
//						Logger.error("Null alias path in apache2.conf");
//						return "Null alias path in apache2.conf ";
//					} else if (!path.equalsIgnoreCase(systemdir)) {
//						Logger.error("Existing alias path in apache2.conf mismatch");
//						return "Existing alias path in apache2.conf mismatch";
//					}
//				} else {
//					boolean rtn = acm.AppendAlias(alias, systemdir);
//					if (!rtn) {
//						Logger.error("Apache2 alias in apache2.conf failed for " + alias + " : " + systemdir);
//						return "Apache2 alias in apache2.conf failed for " + alias + " : " + systemdir;
//					}
//				}
			}

			if ( dbi.create(EntityMapMgr.getEMap(STORAGELOC), data)) {
				File file = new File(systemdir);
				if (! file.mkdir()) {
					error = "StorageMgr could not create directory: " + systemdir;
				}

				reloadLocations(dbi);
				return error;
			} else {
				return "StorageMgr.create Storagelocation failed during db call to create record";
			}

		} catch (Exception e) {
			Logger.error(e);
			return e.getMessage();
		} finally {

		}
	}
	
	public String validate(JSONObject data, boolean checkName, boolean checkDir) {
		JSONObject fields = JsonUtil.getJsonObject(data, Request.FIELDS, null);
		if (fields == null) {
			return "Data missing 'fields' object";
		}
		
		long id = fields.optLong(Request.ID, -1);
		if (checkName) {
			String name = fields.optString( NAME, null);
			StorageLocation sl = this.getByName(name);
			if (( sl != null) && (id != sl.storageid)) {
				return "StorageLocation name already exists";
			}
		}
		
		if (checkDir) {
			String systemdir = fields.optString( SYSTEMDIR, null);
			if (systemdir.endsWith("/")) {
				systemdir = systemdir.substring(0, systemdir.length() - 1);
			}
			int lastIndx = systemdir.lastIndexOf("/");
			if ( lastIndx < 3) {
				return "Can not create systemdir at root '/'";
			}
			String parentdir = systemdir.substring(0, lastIndx);
			File file = new File(parentdir);
			if (! file.exists()) {
				return "Requested systemdir's parent directory does not exist: " + parentdir;
			}
			
			long sl_id = this.getIdByDirectory(systemdir, false);
			if ((sl_id > -1) && (sl_id != id)) {
				return "StorageLocation system directory already registered";
			}
			
			boolean existing = fields.optBoolean( EXISTING, false);
			file = new File(systemdir);
			if (file.exists()) {
				if (! existing) {
					return "StorageLocation directory already exists";
				}
			} else {
				if (existing) {
					return "Requested Existing directory does not exist";
				}
				if (!file.mkdir()) {
					return "Could not create directory " + systemdir;
				}
			}
			
			String testfile = systemdir + TESTFILE;
			file = new File(testfile);
			try {
				file.createNewFile();
				if (! file.exists()) {
					return "Could not create systemdir test file: " + testfile;
				}
				if (! file.delete()) {
					return "Could not delete systemdir test file: " + testfile;
				}
				if (! existing) {
					file = new File(systemdir);
					file.delete();
				}
			} catch (IOException e) {
				return e.getMessage();
			}
		}
		return null;
	}

	/**
	 * Deletes the StorageLocation from the storageloc table and removes the storageloc
	 * directory from the server disk
	 * 
	 * @param dbConn DBConnection to use to read the location from the database
	 * @param data JSONObject holding the storageloc information necessary to delete the
	 * record and directory.
	 * @return Returns text of the error message if the delete method fails
	 */
	public String delete(DBInteract dbi, JSONObject data) {
		String error = null;
		try {
			JSONObject where = JsonUtil.getJsonObject(data, Request.WHERE, null);
			if (where == null) {
				return "StorageLoc delete failed. Data object does not include 'where' element";
			}
			long id = where.optLong( Request.ID, -1);
			if (id < 0) {
				return "Delete failed. No storage location id supplied in 'where' element";
			}

			StorageLocation loc = this.getById(id);
			if (loc == null) {
				return "Delete failed. No storage location with id: " + id;
			}

			File file = new File(loc.systemdir);

			if (file.exists()) {
				// Logger.verbose("file count in systemdir " + file.list().length);
				if (file.list().length > 0) {
					return "Error! Can not delete directory which is not empty";
				}

				if (!file.delete()) {
					return "Error! Call to delete directory failed.";
				}
			}

			if (! dbi.delete( EntityMapMgr.getEMap(STORAGELOC), where)) {
				error = "Delete DB record failed";
			}
			reloadLocations(dbi);
			return error;

		} catch (Exception e) {
			Logger.error(e);
			return e.getMessage();
		}
	}

	/**
	 * Writes the current file upload information to the response stream
	 * 
	 * @param jwriter JsonWriter to use for writing the upload information.
	 * @return True if no error occurs otherwise returns false.
	 */
	public boolean read(JsonWriter jwriter, String[] ids) {
		try {
			jwriter.writePair(Request.DATA, getUploadsAsJson(ids));
			return true;
		} catch (Exception e) {
			Logger.error(e);
			return false;
		}
	}

	/**
	 * Deletes a file from the server.
	 * 
	 * @param mi MediaInfo object that holds information about which file to remove
	 * @return True if the file existed and was deleted otherwise returns false.
	 */
	public boolean removeFile(FileInfo mi, DBInteract dbi) {
		try {
			String filepath = mi.Fullpath;
			if (mi.Fileext != null) {
				filepath += "." + mi.Fileext;
			}
			File file = new File(filepath);
			if (!file.exists()) {
				return true;
			}
			file.delete();
			if (!file.exists()) {
				_instance.update( dbi, getIdFromPath(filepath) );
				return true;
			}
		} catch (Exception e) {
			Logger.error(e);
		}
		return false;
	}
	
	public static File getFile(FileInfo mi) {
		try {
			String filepath = mi.Fullpath;
			if (mi.Fileext != null) {
				filepath += "." + mi.Fileext;
			}
			File file = new File(filepath);
			if (file.exists()) {
				return file;
			}
		} catch (Exception e) {
			Logger.error(e);
		}
		return null;
	}

	/**
	 * Deletes a file from the server.
	 * 
	 * @param filepath Full path to the file to remove
	 * @return True if the file existed and was deleted otherwise returns false.
	 */
	public boolean removeFile(String filepath, DBInteract dbi) {
		try {
			File file = new File(filepath);
			if (!file.exists()) {
				return true;
			}
			file.delete();
			if (!file.exists()) {
				_instance.update( dbi, getIdFromPath(filepath) );
				return true;
			}
		} catch (Exception e) {
			Logger.error(e);
		}
		return false;
	}

	/**
	 * Deletes a file from the server.
	 * 
	 * @param filepath Full path to the file to remove
	 * @return True if the file existed and was deleted otherwise returns false.
	 */
	public boolean removeFiles(String[] filepaths, DBInteract dbi) {
		try {
			//check all that all files are in the same directory;
			long lastSlid = -1;
			long slid = -1;
			String systemdir = null;
			for (String fp : filepaths) {
				systemdir = fp.substring(0, fp.lastIndexOf('/'));
				slid = getIdByDirectory(systemdir, true);
				if ((slid == -1) || ((lastSlid != -1) && (lastSlid != slid))) {
					return false;
				}
				lastSlid = slid;
			}
			
			for (String fp : filepaths) {
				File file = new File(fp);
				if (file.exists()) {
					file.delete();
					if (file.exists()) { // could not delete for some reason.
						return false;
					}
				}
			}
			_instance.update(dbi, slid);
			return true;
		} catch (Exception e) {
			Logger.error(e);
			return false;
		}
	}
	
	public long getIdFromPath(String filepath) {
		int indx = filepath.lastIndexOf('/');
		long id = -1;
		if (indx == -1) {
			indx = filepath.lastIndexOf('\\');
		}
		if (indx != -1) {
			String sysdir = filepath.substring(0,indx);
			id = getIdByDirectory(sysdir, true);
		}
		return id;
	}

	/**
	 * Removes the directory from the server as well as all subdirectories and files
	 * 
	 * @param path String containing the absolute path to the directory to be removed.
	 * @return Returns true if the directory is deleted otherwise false.
	 */
	public boolean removeDirectory(String path) {
		return removeDirectory(new File(path));
	}

	/**
	 * Removes the directory from the server as well as all subdirectories and files
	 * 
	 * @param path File object specifying the directory to be removed.
	 * @return Returns true if the directory is deleted otherwise false.
	 */
	public boolean removeDirectory(File path) {
		if (path.exists()) {
			File[] files = path.listFiles();
			for (int i = 0; i < files.length; i++) {
				if (files[i].isDirectory()) {
					removeDirectory(files[i]);
				} else {
					files[i].delete();
				}
			}
		}
		return (path.delete());
	}

	/**
	 * 
	 * @return Returns the current size amount of disk space being used by the storage
	 * location.
	 */
	public int getSize() {
		return _storageloc.size();
	}

	/**
	 * Checks whether a specified storage location key exists in the StorageManager
	 * 
	 * @param id Key to check for
	 * @return True if the key exists otherwise false
	 */
	public boolean containsKey(Long id) {
		return _storageloc.containsKey(id);
	}

	/**
	 * Checks for the existance of the specified system directory in the Storage Manager and
	 * returns the id if found
	 * 
	 * @param systemdir Absolute path of the path to check
	 * @return Long ID for the StorageLocation if found otherwise null
	 */
	public long getIdByDirectory(String systemdir, boolean reportFailure) {
		for (StorageLocation loc : _storageloc.values()) {
			if (systemdir.compareTo(loc.systemdir) == 0) {
				return loc.storageid;
			}
		}
		if (reportFailure) {
			Logger.error("StorageLocation for directory: " + systemdir + " not found.");
		}
		return -1;
	}

	/**
	 * Checks for the existance of the storage location using the specified name in the
	 * Storage Manager
	 * 
	 * @param name StorageLocation name to check for.
	 * @return Returns the StorageLocation if the name is found otherwise null
	 */
	public StorageLocation getByName(String name) {
		for (StorageLocation sl : _storageloc.values()) {
			if (sl.name.compareToIgnoreCase(name) == 0) {
				return sl;
			}
		}
		return null;
	}
	
	public StorageLocation getByDirectory(String directory) {
		for (StorageLocation sl : _storageloc.values()) {
			if (sl.systemdir.compareTo(directory) == 0) {
				return sl;
			}
		}
		return null;
	}	

	/**
	 * Checks for the existance of the storage location using the specified id in the Storage
	 * Manager
	 * 
	 * @param id StorageLocation id to check for.
	 * @return Returns the StorageLocation if the id is found otherwise null
	 */
	public StorageLocation getById(Long id) {
		return (_storageloc.containsKey(id)) ? _storageloc.get(id) : null;
	}

	/**
	 * Adds a new StorageLocation to the StorageManager
	 * 
	 * @param sl new StorageLocation to add
	 * @return Returns the previously stored StorageLocation if the passed in StorageLocation
	 * name already exists in the Manager.
	 */
	public StorageLocation put(StorageLocation sl) {
		StorageLocation oldstore = _instance.getByName(sl.name);
		_storageloc.put(sl.storageid, sl);
		return oldstore;
	}

	/**
	 * Removes the StorageLocation associated to the ID specified
	 * 
	 * @param id StorageLocation ID to remove
	 * @return Returns the removed StorageLocation if it existed otherwise false.
	 */
	public StorageLocation remove(long id) {
		return _storageloc.remove(id);
	}

	/**
	 * Removes all the current StorageLocations from the server.
	 */
	private void clear() {
		_storageloc.clear();
	}

	/**
	 * Creates a new StorageLocation with the specified information
	 * 
	 * @param name Name of the StorageLocation to create
	 * @param systemdir Absolute path to the directory of the new StorageLocation
	 * @param active Sets the active flag for the new StorageLocation
	 * @param desc Sets the description of the new StorageLocation
	 * @return Returns the new StorageLocation if no errors occur otherwise false
	 */
	public StorageLocation create(String name, String systemdir, boolean active, String desc) {
		if (getIdByDirectory(systemdir, true) != -1) {
			return null;
		}
		File file = new File(systemdir);
		if (!file.exists()) {
			if (!file.mkdir()) {
				Logger.error("StorateLocation.create failed:" + systemdir);
				return null;
			}
		}
		// TODO: finish this
		return null;
	}

	/**
	 * 
	 * @return Returns all the current files as a JSONArray actively being uploaded
	 */
	public JSONArray getUploadsAsJson(String[] ids) {

		JSONArray array = new JSONArray();
		List<String> keys = new ArrayList<String>();
		
		if (ids != null && ids.length > 0) {
			keys.addAll(Arrays.asList(ids));
		} else {
			keys.addAll(_fileUploads.keySet());
		}
		try {
			for (String key : keys) {
				if (_fileUploads.containsKey(key)) {
					array.put(_fileUploads.get(key).toJsonObject(true));
				}
			}
		} catch (Exception e1) {
			Logger.error(e1);
		}
		return array;
	}

	/**
	 * 
	 * @return Returns all the StorageLocations as a JSONArray
	 */
	public JSONArray getStorageAsJSON() {

		JSONArray array = new JSONArray();
		for (StorageLocation location : _storageloc.values()) {
			array.put(location.toJSON());
		}
		return array;
	}

	/**
	 * 
	 * @param isActive Set whether or not to return active or inactive StorageLocations
	 * @return Returns an JSONArray of StorageLocation as JSONObjects according to the
	 * isActive flag.
	 */
	public JSONArray asJson(boolean isActive) {
		JSONArray array = new JSONArray();
		for (StorageLocation location : _storageloc.values()) {
			if (location.active == isActive) {
				array.put(location.toJSON());
			}
		}
		return array;
	}

	public JSONArray usableAsJson() {
		JSONArray array = new JSONArray();
		for (StorageLocation sloc : _storageloc.values()) {
			if ((sloc.active)&&((sloc.quota == 0)||(sloc.quota > sloc.usedspace))) {
				array.put(sloc.toJSONShort());
			}
		}
		return array;
	}

	public StorageLocation getLocation(int filetype, long size) {
		
		//TODO: add code to check amount of free space left on disk if sloc.quota == 0
		// or quota exceeds current free space.
		for (StorageLocation sloc : _storageloc.values()) {
			if (sloc.active) { 
				double megSize = (sloc.usedspace + size) / BYTE_PER_MEG;
				if ( (sloc.quota < 1) || (sloc.quota >= megSize)) {
					if ( filetype != FileUtil.VIDEO || sloc.canstream ) {
						return sloc;
					}
				}
			}
		}
		return null;
	}

	/**
	 * Checks to see if the current sendname is currently being uploaded
	 * 
	 * @param sendname Name of FileUpload to check
	 * @return Returns true if the name specified is being uploaded otherwise false.
	 */
	public boolean hasUpload(String sendname) {
		return _fileUploads.containsKey(sendname);
	}

	/**
	 * Adds a new FileUpload to the StorageLocation
	 * 
	 * @param fileupload New FileUpload Object to add
	 * @return Returns true if the FileUpload was added, false if it already exists
	 */
	public boolean addFileUpload(FileUpload fileupload) {
		if (hasUpload(fileupload.SendName)) {
			return false;
		}
		_fileUploads.put(fileupload.SendName, fileupload);
		return true;
	}

	/**
	 * Deletes the specified FileUpload
	 * 
	 * @param fileupload FileUpload from the _fileUploads list.
	 * @return True if the file was existed otherwise false.
	 */
	public boolean deleteFileUpload(FileUpload fileupload) {
		String sendname = fileupload.SendName;
		if ( ! _fileUploads.containsKey(sendname)) {
			Logger.debug("StorageManager.deleteFileUpload missing sendname:"  + sendname);
			//TODO: create error
			return false;
		}
		_fileUploads.remove(sendname);
		String stageloc = GlobalProp.instance().get("uploadstageloc");
		
		try {
			for (int I = 0; I <= fileupload.UploadCount; I++) {
				String inputname = stageloc + "/" + sendname + "_" + I;
				File inputfile = new File(inputname);
				if (inputfile.exists()) {
					inputfile.delete();
				}
			}
			return true;
		} catch (Exception e) {
			Logger.error(e);
			return false;
		}
	}

	/**
	 * Deletes the specified FileUpload
	 * 
	 * @param fileupload FileUpload from the _fileUploads list.
	 * @return True if the file was existed otherwise false.
	 */
	public boolean deleteFileUpload(String sendname) {
		FileUpload fu = getFileUpload(sendname);
		if (fu == null) {
			return false;
		}
		return deleteFileUpload(fu);
	}

	/**
	 * Returns the FileUpload specified by the sendname
	 * 
	 * @param sendname FileUpload sendname to retrieve
	 * @return Returns the FileUpload if the sendname is found otherwise null;
	 */
	public FileUpload getFileUpload(String sendname) {
		return hasUpload(sendname) ? _fileUploads.get(sendname) : null;
	}

	/**
	 * Removes all the FileUploads from the StorageManager
	 */
	public void clearFileUploads() {
		_fileUploads.clear();
	}
	
	public boolean setUploadStatus(long fileid, DBInteract dbi, int status, String error, boolean delete) {
		for ( FileUpload fu : _fileUploads.values()) {
			if (fu.fileid == fileid) {
				fu.Status = status;
				fu.Error = error;
				FileInfo.setStatus(fu.fileid, status, dbi, null);
				if (delete) {
					deleteFileUpload(fu.SendName);
				}
				return true;
			}
		}
		return false;
	}

	/**
	 * Writes the specified section of uploaded file to the server.
	 * 
	 * @param filepart Section of upload file in string format.
	 * @param fileindex The section number of the file upload part
	 * @param sendname Sendname of the FileUpload object which is being uploaded
	 * @return Returns true if no errors occur otherwise return false.
	 */
	public synchronized boolean writeFilePart(String filepart, int fileindex, String sendname) {
		boolean rtn = false;
		String stageloc = GlobalProp.instance().get("uploadstageloc");
		FileUpload fu = getFileUpload(sendname);
		if (fu == null) {
			return rtn;
		}
		String filename = fu.SendName + "_" + fileindex;
		String fullpath = stageloc + "/" + filename;
		FileOutputStream fos = null;
		try {
			File file = new File(fullpath);
			fos = new FileOutputStream(file);
//			Logger.debug(sendname + ", size: " + filepart.length());
			byte[] decoded = Base64.decode(filepart);
			fos.write(decoded);
//			Logger.debug(sendname + " decode size " + decoded.length);
			fu.UploadCount = Math.max(fu.UploadCount, fileindex);
			rtn = true;
		} catch (Exception e) {
			Logger.error(e);
		} finally {
			if (fos != null) {
				try {
					fos.close();
				} catch (Exception fe) {}
			}
		}
		return rtn;
	}

	/**
	 * The method compiles all the previously uploaded file sections in to the final single
	 * file.
	 * 
	 * @param fu FileUpload object whose file is to built from its sections
	 * @return Returns true if the final file is created otherwise false.
	 */
	public synchronized boolean appendFileUpload(FileUpload fu) {
		boolean rtn = false;
		String stageloc = GlobalProp.instance().get("uploadstageloc");
		String fullpath = fu.SystemDir + "/" + fu.NewName;
		FileOutputStream fos = null;
		byte[] readbuffer = new byte[4048];
		int readcount = 0;

		try {
			File file = new File(fullpath);
			fos = new FileOutputStream(file);
			for (int I = 0; I <= fu.UploadCount; I++) {
				String inputname = stageloc + "/" + fu.SendName + "_" + I;
				File inputfile = new File(inputname);
				FileInputStream fis = new FileInputStream(inputfile);
				readcount = fis.read(readbuffer);
				while (readcount > 0) {
					fos.write(readbuffer, 0, readcount);
					readcount = fis.read(readbuffer);
				}
				fos.flush();
				fis.close();
			}
//			deleteFileUpload(fu);
			rtn = true;
		} catch (Exception e) {
			Logger.error(e);
		} finally {
			if (fos != null) {
				try {
					fos.close();
				} catch (Exception fe) {}
			}
		}
		return rtn;
	}

	public synchronized boolean moveFromStaged(String stage, String destDir, String filename) {
		File stgDir = new File(stage);
		File file = new File(stgDir, filename);
		if (file.exists()) {
			File dir = new File(destDir);
			return file.renameTo(new File(dir, filename));
		} else {
			Logger.error("moveFromStaged: " + stage + filename + " does not exist");
			return false;
		}
	}

	/**
	 * Resets the filecount and used space for the specified StorageLocation
	 * 
	 * @param sl StorageLocation whose information is to be reset.
	 * @return Returns true if the reset succeeds otherwise false.
	 */
	private static String setFileInfo(StorageLocation sl) {
		try {
			if (sl == null) {
				return "StorageManager.SetFileInfo : StorageLocation is null";
			}
			File sysdir = new File(sl.systemdir);
			if (!sysdir.exists()) {
				return "System directory does not exist";
			}
			File[] files = sysdir.listFiles();
			sl.filecount = files.length;
			sl.usedspace = 0;
			for (int indx = 0; indx < sl.filecount; indx++) {
				sl.usedspace += files[indx].length();
			}
			sl.usedspace = sl.usedspace / BYTE_PER_MEG;
			sl.usedspace = Double.valueOf(_decFormat.format(sl.usedspace));
			return null;
		} catch (Exception e) {
			Logger.error(e);
			return e.getMessage();			
		}
	}

	/**
	 * Checks to see if the specific StorageLocation is valid and the filename is stored at
	 * its location
	 * 
	 * @param slid ID of the StorageLocation whose directory is to be scanned.
	 * @param filename Filename to check.
	 * @return Returns true if the StorageLocation id is valid and if its filename exists
	 */
	public boolean Exists(long slid, String filename) {
		if ((filename == null) || (filename.length() == 0))
			return false;
		if (!_storageloc.containsKey(slid))
			return false;
		return (new File(_storageloc.get(slid).systemdir + "/" + filename)).exists();
	}
}
