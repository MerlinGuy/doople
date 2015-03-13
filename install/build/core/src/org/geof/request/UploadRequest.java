package org.geof.request;

import org.geof.data.FileInfo;
import org.geof.prop.GlobalProp;
import org.geof.store.FileUpload;
import org.geof.store.StorageLocation;
import org.geof.store.StorageMgr;
import org.geof.util.FileUtil;
import org.geof.util.JsonUtil;
import org.json.JSONException;
import org.json.JSONObject;



public class UploadRequest extends Request {

	private final static long MAXSENDSIZE = 2000000; // maximum size of a send block

	public final static String SENDNAME = "sendname";
	public final static String STATUS = "status";
	public final static String SENDNAMES = "sendnames";
	public final static String FILEINDEX = "fileindex";
	public final static String FILEPART = "filepart";
	public final static String MAX_FILE_PART_SIZE = "maxfilepartsize";
	public final static String INDEX = "index";
	
	public final static int INACTIVE = 0, ACTIVE = 1, INITIALIZED = 2, REGISTERED = 3, 
			SENDING = 4, ALL_SENT = 5, COMPLETING = 6, COMPLETE = 7, ACTIVATING = 8, 
			ADDING_LINKS = 9, LINKS_ADDED=10, SERVER_ACTIVATE = 11, ERROR = 12;
	
	/**
	 * Overrides the base class's process() call to handle all file upload actions.
	 * 
	 * @return True if the method a possible Action was found.
	 */
	@Override
	public boolean process() {
		if (_actionKey.equalsIgnoreCase(Request.CREATE)) {
			return create();
		} else if (_actionKey.equalsIgnoreCase(Request.UPDATE)) {
			return update();

		} else if (_actionKey.equalsIgnoreCase(Request.UPDATE+ ".status")) {
			return updateStatus();

		}  else if (_actionKey.equalsIgnoreCase(Request.UPDATE + ".complete")) {
			return complete();

		} else if (_actionKey.equalsIgnoreCase(Request.DELETE)) {
			return delete();

		} else if (_actionKey.equalsIgnoreCase(Request.READ)) {
			
			String names = _where.optString( SENDNAMES, null);			
			String[] snames = (names == null) ? new String[]{} : names.split(",");
			return StorageMgr.instance().read( _jwriter , snames);
			
		} 
		return false;
	}

	/**
	 * Create checks to see if the proposed upload of a specific file can be performed. 
	 * It also checks to see if the file already exists or if it is currently in the 
	 * process of being uploaded.  If all the checks pass it registers the upload 
	 * and returns the 'sendname' and maximum file part size
	 * 
	 * @return True if the method was successful otherwise false if an error occurs
	 */
	private boolean create() {
		try {
			if (_fields == null) {
				setError("UploadRequest.create missing data.fields");
				return false;
			}
			
			String originalname = _fields.getString(FileRequest.ORIGINALNAME);
			int geomtype = _fields.getInt(FileRequest.GEOMTYPE);
			int filetype = FileUtil.getIdByFilename(originalname);
			if ((filetype == FileUtil.UNKNOWN) && _fields.has(FileRequest.FILETYPE)) {
				filetype = _fields.getInt(FileRequest.FILETYPE);
				_fields.put("filetype", filetype);
			}
			long filesize = _fields.getLong(FileRequest.FILESIZE);
			String createdate = _fields.optString(FileRequest.CREATEDATE, "");
						
			StorageLocation stor_loc = StorageMgr.instance().getLocation(filetype, filesize);
			if (stor_loc == null) {
				StorageMgr.instance().reloadLocations(_dbi);
				stor_loc = StorageMgr.instance().getLocation(filetype, filesize);
				if (stor_loc == null) {
					setError("Could not aquire storage location");
					return false;
				}
			}
			
			// TODO: Add config so that a default location for each user can be specified and only overwriitern
			// with a permission
//			if (fields.has("storageid")) {
//				long si = fields.getLong("storageid");
//				StorageLocation sloc = StorageManager.get(si);
//				// if invalid use default
//				if (sloc == null) {
//					Logger.error("Storage location not found : " + si);
//				}				
//			}
					
			String sendname = java.util.UUID.randomUUID().toString();
			while (StorageMgr.instance().hasUpload(sendname)) {
				sendname = java.util.UUID.randomUUID().toString();
			}
			FileUpload fu = null;
			if (!stor_loc.hasQuotaSpace(filesize)) {
				setError("File size exceeds Storage quota or remaining storage space");
				return false;
			} else {
				long sid = stor_loc.storageid;
				long rid = _session.getUsrID();
				fu = new FileUpload(sid, sendname, filetype, geomtype, originalname, rid);
				fu.FileSize = filesize;
				fu.CreateDate = createdate;
				StorageMgr.instance().addFileUpload(fu);
			}
			long size = GlobalProp.instance().getLong("maxfilesectionsize", MAXSENDSIZE);
			_jwriter.openArray(JsonUtil.DATA);
			_jwriter.openObject();
			_jwriter.writePair(SENDNAME, sendname);
			_jwriter.writePair(MAX_FILE_PART_SIZE, size);
			_jwriter.writePair("fileid", fu.fileid);
			if (_fields.has(INDEX)) {
				_jwriter.writePair(INDEX, _fields.getInt(INDEX));
			}
			FileRequest.registerRecord(_dbi, fu);
			_jwriter.closeObject();
			_jwriter.closeArray();
			return true;
			
		} catch (Exception e) {
			setError("UploadRequest.create: " + e.getMessage());
			return false;
		}
	}

	/**
	 * Writes an uploaded file section to the staging location of the server disk.
	 * 
	 * @return True if no error occurs
	 */
	private boolean update() {

		try {
			if (_fields == null) {
				setError("UploadRequest.update Data missing Fields");
				return false;
			}
			String sendname = _fields.getString(SENDNAME);

			int fileindex = _fields.getInt(FILEINDEX);
			
			boolean written = StorageMgr.instance().writeFilePart(_fields.getString(FILEPART), fileindex, sendname);
			_jwriter.openObject(Request.DATA);
			_jwriter.writePair(SENDNAME, sendname);
			_jwriter.writePair(FILEINDEX, fileindex);
			_jwriter.writePair("written", written);
			if (_fields.has(INDEX)) {
				_jwriter.writePair(INDEX, _fields.getInt(INDEX));
			}
			_jwriter.closeObject();
			FileUpload fu = StorageMgr.instance().getFileUpload(sendname);
			if (fu != null) {
				fu.Status = written ? SENDING : ERROR;
			}
			FileInfo.setStatus(fu.fileid, fu.Status, _dbi, null);
			return true;
		} catch (JSONException e) {
			setError("UploadRequest.update: " + e.getMessage());
			return false;
		}
	}

	/**
	 * Completes the process for uploading a file to the server. This includes reassembling
	 * the file sections into the full file and moving it to the correct storage location and
	 * then setting the file's status to the appropriate state.
	 * 
	 * @return True if no error occurs
	 */
	private boolean complete() {
		try {
			boolean rtn = false;
			if (_fields == null) {
				setError("UploadRequest.complete Data missing Fields");
				return rtn;
			}
			JSONObject newflds = _data.getJSONObject(JsonUtil.FIELDS);
			boolean hasSendname = newflds.has(SENDNAME);

			String sendname = "";
			if (hasSendname) {
				sendname = newflds.getString(SENDNAME);
//				Logger.debug("UploadRequest.complete - " + sendname);
				FileUpload fu = StorageMgr.instance().getFileUpload(sendname);
				if (fu == null) {
					setError("StorageManager has no FileUpload - " + sendname);
					return false;
				}
				fu.Status = COMPLETE;
				// generate a new name that the client does see.
				fu.NewName = java.util.UUID.randomUUID().toString(); // + ext;
				rtn = StorageMgr.instance().appendFileUpload(fu);
				FileRequest.changeName(_dbi, fu.fileid, fu.NewName);
				rtn = ( StorageMgr.instance().update(_dbi, fu.StorageId) == null);
			}

			_jwriter.openObject(Request.DATA);
			_jwriter.writePair(SENDNAME, sendname);
			if (_fields.has(INDEX)) {
				_jwriter.writePair(INDEX, _fields.getInt(INDEX));
			}
			_jwriter.writePair(_action, rtn);
			_jwriter.closeObject();
			return rtn;
		} catch (Exception e) {
			setError("UploadRequest.complete: " + e.getMessage());
			return false;
		}
	}


	private boolean updateStatus() {
		if (_fields == null) {
			setError("UploadRequest.complete Data missing Fields");
			return false;
		}
		if (_where == null) {
			setError("UploadRequest.complete Data missing Where");
			return false;
		}
		String sendName = _where.optString( SENDNAME, null);
		if (sendName == null) {
			setError("UploadRequest.complete Where missing sendname");
			return false;
		}			
		int status = _fields.optInt( STATUS, -1);
		if (status == -1) {
			setError("UploadRequest.complete Fields missing status");
			return false;
		}
		FileUpload fu = StorageMgr.instance().getFileUpload(sendName);
		if (fu == null) {
			setError("StorageManager has no FileUpload - " + sendName);
			return false;
		}
		
		fu.Status = status;
		return true;
	}


	/**
	 * Method stub to be completed later
	 * 
	 * @return Always returns true for now
	 */
	private boolean delete() {
		
		try {
			if (_where == null) {
				setError("UploadRequest.delete Data missing 'where'");
				return false;
			}
			String sendname = _where.getString(SENDNAME);
			boolean deleted = StorageMgr.instance().deleteFileUpload(sendname);
			_jwriter.openObject(Request.DATA);
			_jwriter.writePair(SENDNAME, sendname);
			_jwriter.writePair(Request.DELETE, deleted);
			_jwriter.closeObject();
			return deleted;
		} catch (JSONException e) {
			setError("Upload.delete : " + e.getMessage());
			return false;
		}
	}

	/**
	 * 
	 * @return Returns a generated unique temporary file name
	 */
//	public static String getTempFilename() {
//		Random rnd = new Random((new Date()).getTime());
//		return new String(ConvertUtil.longToHex(rnd.nextLong()));
//	}

	/**
	 * 
	 * @return Converts the current date/time to a hex value and then converts that to a
	 * string
	 */
//	public static String getHexTimestamp() {
//		long curTimestamp;
//		do {
//			curTimestamp = (new Date()).getTime();
//		} while (curTimestamp == _lastTimestamp);
//		_lastTimestamp = curTimestamp;
//		return new String(ConvertUtil.longToHex(_lastTimestamp));
//	}

}

