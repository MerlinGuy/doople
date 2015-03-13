package org.geof.store;

import java.io.File;

import org.geof.log.Logger;
import org.geof.request.FileRequest;
import org.geof.request.UploadRequest;
import org.geof.util.DateUtil;
import org.geof.util.FileUtil;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * FileUpload object wrappers all the necessary information used to upload a file to the
 * server
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class FileUpload {
	
	public long fileid = -1;
	public long FileSize = -1;
	public long StorageId;
	public String SendName;
	public String OriginalName;
	public String CreateDate = "";
	public String NewName;
	public String SystemDir;
	public int FileType;
	public int GeomType;
	public long PKey = -1;
	public int UploadCount = 0;
	public String Error = null;
	private String _fullPath = null;
	public long RegisteredBy = -1;
	public int Status = UploadRequest.INITIALIZED;

	/**
	 * Class constructor
	 */
	public FileUpload() {
	}

	/**
	 * Class constructor
	 * 
	 * @param storageid Id of the storage location to place the new file
	 * @param sendname The temporary, unique name used to send the file to the server
	 * @param filetype File type enumeration i.e. Photo, Video, etc.
	 * @param originalname The original name of the file on the client system.
	 */
	public FileUpload(long storageid, String sendname, int filetype, int geomtype, String originalname, long registeredby) {
		StorageId = storageid;
		StorageLocation sl = StorageMgr.instance().getById(StorageId);
		if (sl == null) {
			Error = "Storage Location not found: " + StorageId;
			return;
		}
		SystemDir = sl.systemdir;
		SendName = sendname;
		NewName = sendname;
		FileType = filetype;
		GeomType = geomtype;
		OriginalName = originalname;
		UploadCount = 0;
		RegisteredBy = registeredby;
	}

	/**
	 * Initializes a new FileUpload object using the information stored in the JSONObject passed to the method.
	 * @param joFO JSONObject holding the initialization fields.
	 */
	public void initialize(JSONObject joFO) {
		try {
			SendName = joFO.getString("sendname");
			StorageId = joFO.getLong("storageid");
			OriginalName = joFO.getString("originalname");
			NewName = joFO.getString("newname");
			FileType = joFO.getInt("filetype");
			GeomType = joFO.getInt("geomtype");
			PKey = joFO.getLong("pkey");
			RegisteredBy = joFO.getLong("registeredby");
			if (PKey != -1) {
				SystemDir = StorageMgr.instance().getByName("video1").systemdir;
			}

		} catch (Exception e) {
			Logger.error(e);
		}
	}

	/**
	 * 
	 * @return Returns a JSONObject which holds all the FileUpload information as fields.
	 */
	public JSONObject toJsonObject(boolean useSendname) {
		JSONObject fields = new JSONObject();
		try {
			String extension = FileUtil.getExtention(OriginalName);
			String filetype = FileUtil.getFileTypeByExtension(extension);
			int filetypeid = FileUtil.getIdByTypeName(filetype);
			fields.put(FileRequest.ID, fileid);
			fields.put(FileRequest.STORAGELOCID, StorageId);
			fields.put(FileRequest.ORIGINALNAME, OriginalName);
			fields.put(FileRequest.FILENAME, useSendname ? SendName : NewName);
			fields.put(FileRequest.FILEEXT, extension);
			fields.put(FileRequest.FILESIZE, FileSize);
			fields.put(FileRequest.FILETYPE, filetypeid);
			fields.put(FileRequest.GEOMTYPE, GeomType);
			if (CreateDate != null && CreateDate.length() > 0) {
				fields.put(FileRequest.CREATEDATE, CreateDate);
			}
			fields.put(FileRequest.REGISTEREDBY, RegisteredBy);
			fields.put(FileRequest.REGISTERDATE,DateUtil.nowStr());
			fields.put(FileRequest.STATUS, Status);
			fields.put(FileRequest.ERROR, Error);
			return fields;
		} catch (JSONException e) {
			Logger.error(e);
		}
		return null;
	}

	/**
	 * 
	 * @return Returns the fullpath of sent file as it exists on the server
	 */
	public String FullPath() {
		if (_fullPath == null) {
			_fullPath = SystemDir + "/" + SendName;
		}
		return _fullPath;
	}
	
	public File getFile(String currentName) {
		try {
			StorageLocation sl = StorageMgr.instance().getById(StorageId);
			if (sl == null) {
				Error = "Storage Location not found: " + StorageId;
				return null;
			}
			String filepath = sl.systemdir + "/" + currentName;
			File file = new File(filepath);
			if (file.exists()) {
				return file;
			}
		} catch (Exception e) {
			Logger.error(e);
		}
		return null;

	}
}
