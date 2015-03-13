package org.geof.job;

import org.geof.data.FileInfo;
import org.geof.db.DBInteract;
import org.geof.prop.GlobalProp;
import org.geof.store.StorageMgr;
import org.geof.util.FileUtil;
import org.geof.util.Thumbnail;

public class ThumbnailTask extends GeofTask {
	
	private static final String PHOTOSIZES = "photosizes";
	private long _fileid = -1;
	
	private int[] _sizes = {80,280,800};
	
	public ThumbnailTask(long photoid) {
		_fileid = photoid;
	}

	@Override
	public void doTask() {
		DBInteract dbi = new DBInteract();
		boolean rtn = thumbnail(dbi);
		int status = rtn ? FileInfo.ONLINE : FileInfo.ERROR;
		StorageMgr.instance().setUploadStatus(_fileid, dbi, status, _error, false);
		dbi.dispose();
	}

	/**
	 * This method regenerates thumbnails for a single photo id.
	 * 
	 * @param photoid ID of photo whose thumbnails to be regenerated
	 * @return True if action was processed successfully otherwise false if an error occurs
	 */
	private boolean thumbnail(DBInteract dbi) {
		
		try {
			String newfile;
			String filename;

			int[] sizes = _sizes;
			
			String psizes = GlobalProp.getProperty(PHOTOSIZES);
			if ( psizes != null) {
				int indx=0;
				for (String size : psizes.split(",")) {
					sizes[indx++] = Integer.parseInt(size);
				}
			}

			FileInfo fi = FileInfo.getInfo(_fileid, dbi);
			if (fi == null) {
				_error = "ThumbnailTask - no file with id = " + _fileid; 
				return false;
			}
			filename = fi.Fullpath;
			for (int sizeindx = 0; sizeindx < sizes.length; sizeindx++) {
				newfile = fi.Fullpath + FileUtil.THUMBEXT[sizeindx + 1];
				Thumbnail.createThumbnail(filename, newfile, sizes[sizeindx]);
			}
			return true;
		} catch (Exception e) {
			_error = e.getMessage();
		}
		return false;
	}


	@Override
	public void handleCancellation() {
		// TODO Auto-generated method stub

	}

}
