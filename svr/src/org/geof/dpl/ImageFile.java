package org.geof.dpl;

public class ImageFile {
	
	public String from_image = null; // name of the actual source image file
	public String host_image = null; // name of the final new image file on host
	public String work_image = null; // name of copied from_image
	public boolean is_local = false;
	
	public ImageFile(boolean isLocal, String from_image, String host_image, String work_image) {
		this.from_image = from_image;
		this.host_image = host_image;
		this.work_image = work_image;
		this.is_local = isLocal;
	}
	
}
