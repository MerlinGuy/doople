package org.geof.request;

import java.sql.PreparedStatement;
import java.sql.ResultSet;

import org.geof.data.FileInfo;
import org.geof.db.DBInteract;
import org.geof.db.EntityMap;
import org.geof.db.EntityMapMgr;
import org.geof.job.TaskExecutor;
import org.geof.job.ThumbnailTask;
import org.geof.log.Logger;
import org.geof.store.FileUpload;
import org.geof.store.StorageLocation;
import org.geof.store.StorageMgr;
import org.geof.util.DateUtil;
import org.geof.util.FileUtil;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Derived Class used for managing the uploading of media files to the server
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class FileRequest extends DBRequest {

	public final static String ENTITYNAME = "file";
	
	public final static String FILENAME = "filename";
	public final static String FILEEXT = "fileext";
	public final static String FILESIZE = "filesize";
	public final static String ORIGINALNAME = "originalname";
	public final static String FILETYPE = "filetype";
	public final static String GEOMTYPE = "geomtype";
	public final static String STATUS = "status";
	public final static String CREATEDATE = "createdate";
	public final static String CHECKSUM = "checksumval";
	public final static String REGISTERDATE = "registerdate";
	public final static String REGISTEREDBY = "registeredby";
	public final static String SENDNAME = "sendname";
	public final static String NOTES = "notes";
	public final static String STORAGELOCID = "storagelocid";

	public static final String FIELDLIST = "storagelocid, status, filename, fileext, filetype, originalname";
	private static final String _sqlChangeName = "UPDATE file SET filename = ? WHERE id = ?";

	public static final int OFFLINE = 0, ONLINE = 1, UPLOADING = 2, UPLOAD_FAILED = 3;

	/**
	 * Overrides the base class's process() call to handle all file upload actions.
	 * 
	 * @return True if the method a possible Action was found.
	 */
	@Override
	public boolean process() {

		if (_actionKey.equalsIgnoreCase(CREATE)) {
			return create();

		} else if (_actionKey.equalsIgnoreCase(UPDATE)) {
			return update();

		} else if (_actionKey.equalsIgnoreCase(DELETE)) {
			return delete();

		} else if (_actionKey.equalsIgnoreCase(READ)) {
			return super.read();
			
		} else if (_actionKey.equalsIgnoreCase(UPDATE + ".thumbnail")) {
			return buildThumbnails();
		}
		return false;
	}

	public boolean create() {

		try {
			if (!_data.has("fields")) {
				setError("FileRequest.request Data missing Fields");
				return false;
			}
			JSONObject fields = _data.getJSONObject("fields");
			String sendname = fields.getString("sendname");

			boolean rtn = false;
			int fileindex = fields.getInt("fileindex");
			String fpart = fields.getString("filepart");
			rtn = StorageMgr.instance().writeFilePart(fpart, fileindex, sendname);
			_jwriter.openObject("data");
			_jwriter.writePair("sendname", sendname);
			_jwriter.writePair("fileindex", fileindex);
			_jwriter.writePair(_action, rtn);
			_jwriter.closeObject();
			return true;
		} catch (JSONException e) {
			setError(e);
			return false;
		}
	}

	public static boolean registerRecord(DBInteract dbi, FileUpload fu) throws Exception {
		EntityMap emap = EntityMapMgr.getEMap(ENTITYNAME);
		if (emap == null) {
			return false;
		}
		fu.Status  = UploadRequest.REGISTERED;
		JSONObject data = new JSONObject();
		JSONObject fields = fu.toJsonObject(true);
		fields.put(REGISTERDATE,DateUtil.nowStr());
		data.put("fields", fields);
		boolean rtn = dbi.create(emap, data);
		if (rtn) {
			JSONObject newfile = dbi.getLastReturning(); 
			fu.fileid = newfile.getLong("id");
		} else {
			fu.Status  = UploadRequest.ERROR;
			//TODO: set error - probably from DBI
		}
		return rtn;
	}
	

	/**
	 * Changes the file's filename field. this is due for security reasons since
	 * the sendname on uploads is known to the user and is changed once the upload
	 * process is complete
	 * 
	 * @param id Primary key of the record.
	 * @param newName The new name of the file as saved to the working location.
	 * @return returns error message if error occurs
	 */
	public static String changeName(DBInteract dbi, long id, String newName) throws Exception {
		PreparedStatement ps = dbi.getPreparedStatement(_sqlChangeName);
		ps.setString(1, newName);
		ps.setLong(2, id);
		ps.execute();			
		return null;
	}

	/**
	 * Method stub to be completed later
	 * 
	 * @return Always returns true for now
	 */
	public boolean delete() {
		try {
			if (! _where.has(ID)) {
				setError("FileRequest.delete 'id missing from WHERE'");
				return false;
			}
			long fileid = _where.getLong(ID);
			FileInfo mi = getFileInfo(fileid);
			if (mi == null) {
				Logger.debug("FileRequest.delete - no mediainfo for file id: " + fileid);
//				return false;
			} else {
				/*
				 * 1) mark the file as offline to restrict access during removal
				 * 2) remove the file(s) from the storage location
				 * 3) remove links to an assoicative tables.
				 * 4) remove child records
				 * 5) remove the file record from the database
				 */
					
				// step 1
				if ( ! FileInfo.setStatus(mi.ID, OFFLINE, _dbi, _entitymap)) {
					Logger.debug("FileRequest.delete - cannot set status for file id: " + fileid);
//					return false;
				}

				String[] filepaths;
				if (mi.FileType == FileUtil.PHOTO) {
					filepaths = new String[FileUtil.THUMBEXT.length];
					// create list of all files based on extentions
					for (int indx = 0; indx < filepaths.length; indx++) {
						filepaths[indx] = mi.Fullpath + FileUtil.THUMBEXT[indx];
					}
				} else {
					filepaths = new String[] {mi.Fullpath};
				}
				
				// step 2
				StorageMgr.instance().removeFiles(filepaths, _dbi);
			}

			// step 3
			_dbi.deleteLinks( this.getEntity(), fileid);

			// step 4
			//TODO: add code to remove all child records
			
			// step 5
			JSONObject json = new JSONObject();
			json.put(ID,fileid);
			return _dbi.delete(_entitymap, json);
				
		} catch (Exception e) {
			setError(e.getMessage());
		}
		return false;
	}

	public boolean update() {
		try {
			boolean rtn = super.update();
			_jwriter.openObject(Request.DATA);
			_jwriter.writePair(FIELDS, _fields);
			_jwriter.writePair(_action, rtn);
			_jwriter.closeObject();
			return true;
		} catch (Exception e) {
			setError(e);
			return false;
		}
	}

	public FileInfo getFileInfo( long id ) {
		ResultSet rs = null;
		try {
			rs = this._dbi.readRecords(this._entitymap, _data);
			if (rs.next()) {
				String filename = rs.getString(FILENAME);
				long storageid = rs.getLong(STORAGELOCID);
	
				StorageLocation sl = StorageMgr.instance().getById(storageid);
				String systemDir = "Unknown";
				if (sl == null) {
					setError("FileRequest.getFileInfo - StorageLocation missing for " + sl);
				} else {
					systemDir = sl.systemdir;
				}
				
				FileInfo finfo = new FileInfo(id, filename, rs.getString(FILEEXT), rs.getInt(FILETYPE),
						systemDir + "/" + filename, rs.getString(ORIGINALNAME),
						systemDir, rs.getInt(STATUS), 0, storageid);
				rs.close();
				return finfo;
			}
		} catch (Exception e) {
			setError("FileRequest.getFileInfo - " + e.getMessage());
		} 
		return null;
	}
	
	private boolean buildThumbnails() {
		long fileid = _where.optLong( ID, -1);
		if (fileid == -1) {
			setError("Missing id for file to thumbnail");
			return false;
		}
		TaskExecutor.execute(new ThumbnailTask(fileid));
		return true;
	}

	/**
	 * Performs an advanced query against the Photo table to check if photos exists on the
	 * server already
	 * 
	 * @return True if action was processed successfully otherwise false if an error occurs
	 */
//	private boolean readAdvanced() {
//		boolean rtn = false;
//		try {
//			if (!_data.has("media"))
//				return false;
//
//			boolean autoclosePS = false;
//			String sql = "SELECT id FROM photo WHERE checksumval=?";
//			JSONArray jaPhotos = _data.getJSONArray("media");
//			JSONObject criteria = _data.getJSONObject("criteria");
//
//			boolean hasServer = criteria.has("server");
//			boolean onServer = JsonUtil.optBoolean(criteria, "server", true);
//
//			JSONObject joPhoto;
//			int count = jaPhotos.length();
//			JSONArray passChecksums = new JSONArray();
//
//			ParameterList PL2 = new ParameterList(_entitymap);
//			if (criteria.has("validgps")) {
//				sql += " AND validgps=?";
//				PL2.add("validgps", JsonUtil.optBoolean(criteria, "validgps", true));
//			}
//			PreparedStatement ps = _conn.getPreparedStatement(sql);
//			String checksum;
//
//			// run the query against each photo
//			for (int indx = 0; indx < count; indx++) {
//				joPhoto = jaPhotos.getJSONObject(indx);
//
//				if (joPhoto.has("checksum")) {
//					checksum = joPhoto.getString("checksum");
//					ParameterList PL1 = new ParameterList(_entitymap);
//					PL1.add("checksumval", checksum);
//
//					ResultSet rs = _dbi.getResultSet(ps, PL1, PL2, autoclosePS);
//					if ((!rs.isClosed()) && rs.next()) {
//						if (hasServer) {
//							boolean exists = FileInfo.getInfo(rs.getLong(1),_dbi, _entitymap).Exists();
//							if (onServer && exists) {
//								passChecksums.put(checksum);
//							}
//						} else {
//							passChecksums.put(checksum);
//						}
//					}
//					rs.close();
//				}
//			}
//			_jwriter.writePair("checksum", passChecksums);
//			return true;
//		} catch (Exception e) {
//			Logger.error(e);
//		}
//		return rtn;
//	}

}
