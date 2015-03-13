package org.geof.data;

import java.io.File;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import org.geof.db.DBInteract;
import org.geof.db.EntityMap;
import org.geof.db.EntityMapMgr;
import org.geof.log.Logger;
import org.geof.request.FileRequest;
import org.geof.request.Request;
import org.geof.store.StorageLocation;
import org.geof.store.StorageMgr;
import org.geof.util.JsonUtil;
import org.json.JSONObject;

/**
 * MediaInfo provides access to database and file information 
 * for media files stored on the server
 * 
 * @author Jeff Boehmer
 * @comanpay  Ft Collins Research, LLC.
 * @url	www.ftcollinsresearch.org
 *
 */

public class FileInfo {

	public static final int ERROR = -1, OFFLINE = 0, ONLINE = 1, UPLOADING = 2, UPLOAD_FAILED = 3;

	public static final String POINTSRID = "pointsrid";

	public static final int DEFAULTSRID = 4326;
	public static final int GEOMETRYDATATYPE = 1111;
	
	private static final String _readSQL = "SELECT * FROM file WHERE id=?";
	private static EntityMap _fileEmap = null;
	
	public long ID;
	public String Filename;
	public String Fileext;
	public int FileType;
	public String Fullpath;
	public String OriginalName;
	public String SystemDir;
	public int Status;
	public int Size;
	public long StorageLocID;

	/**
	 * Class constructor.
	 */
	public FileInfo() {
	}

	/**
	 * Class constructor.
	 * 
	 * @param id  database primary key field
	 * @param filename  name of file as stored on server disk
	 * @param fileext  file extenion 
	 * @param fullpath  full path to file on server disk
	 * @param systemdir  system directory of file on server
	 * @param status  status of file (active or inactive)
	 * @param size  size in bytes of file on disk
	 * @param storagelocid  database foreign key for StorageLocation
	 */
	public FileInfo(long id, String filename, String fileext, int filetype, String fullpath, String originalName, String systemdir, int status, int size, long storagelocid) {
		ID = id;
		Filename = filename;
		Fileext = fileext;
		FileType = filetype;
		Fullpath = fullpath;
		OriginalName = originalName;
		Status = status;
		Size = size;
		StorageLocID = storagelocid;
	}
	
	/**
	 * 
	 * @return True if file exists on server disk
	 */
	public boolean Exists() {
		return (new File(Fullpath)).exists();
	}

	
	public static FileInfo getInfo(long id, DBInteract dbi) {
		PreparedStatement ps = null;
		boolean disposeDbi = (dbi == null);
		try {
			if (disposeDbi) {
				dbi = new DBInteract();
			}
			if (_fileEmap == null) {
				_fileEmap = EntityMapMgr.getEMap(FileRequest.ENTITYNAME);
			}

			ps = dbi.getPreparedStatement(_readSQL);
			ps.setLong(1, id);
			ResultSet rs = ps.executeQuery();
			if (!rs.next()) {
				return null;
			}
			String filename = rs.getString(FileRequest.FILENAME);
			long storageid = rs.getLong(FileRequest.STORAGELOCID);

			StorageLocation sl = StorageMgr.instance().getById(storageid);
			String systemDir = "Unknown";
			if (sl == null) {
				Logger.error("FileRequest.getMediaInfo - StorageLocation missing for " + sl);
			} else {
				systemDir = sl.systemdir;
			}
			return new FileInfo(
					id, filename, 
					rs.getString(FileRequest.FILEEXT),
					rs.getInt(FileRequest.FILETYPE), 
					systemDir + "/" + filename,
					rs.getString(FileRequest.ORIGINALNAME),
					systemDir, 
					rs.getInt(FileRequest.STATUS), 
					0, 
					storageid);
			
		} catch (Exception e) {
			Logger.error(e);
			return null;
		} finally {
			if (disposeDbi && (dbi != null)) {
				dbi.dispose();
			}
			if (ps != null) {
				try {ps.close();} catch (SQLException e) {}
			}
		}
	}

	/*
	 * Updates the status of a entity record
	 * 
	 * @param emap EntityMap whose table will be updated
	 * @param id Primary key of the record to update
	 * @param status New status value to use
	 * @return True if the update is successful
	 */
	public static boolean setStatus(long id, int status, DBInteract dbi, EntityMap emap) {
		boolean disposeDbi = (dbi == null);
		try {
			if (disposeDbi) {
				dbi = new DBInteract();
			}
			if (emap == null) {
				emap = EntityMapMgr.getEMap("file");
			}
			JSONObject data = JsonUtil.getDataFields(id);
			data.getJSONObject(Request.FIELDS).put("status", status);
			dbi.update(emap, data);
			return true;

		} catch (Exception e) {
			Logger.error(e);
			return false;
			
		}  finally {
			if (disposeDbi && (dbi != null)) {
				dbi.dispose();
			}
		}
	}


}
