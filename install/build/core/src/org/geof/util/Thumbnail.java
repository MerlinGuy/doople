package org.geof.util;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.awt.image.renderable.ParameterBlock;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;

import javax.imageio.ImageIO;
import javax.media.jai.JAI;
import javax.media.jai.OpImage;
import javax.media.jai.RenderedOp;

import org.geof.log.Logger;
import org.geof.store.StorageMgr;

import com.sun.media.jai.codec.SeekableStream;

/**
 * The Thumnail class creates thumbnail images for photos.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class Thumbnail {

	// The JAI.create action name for handling a stream.
	private static final String JAI_STREAM_ACTION = "stream";

	// The JAI.create action name for handling a resizing using a subsample
	// averaging technique.
	private static final String JAI_SUBSAMPLE_AVERAGE_ACTION = "SubsampleAverage";

	// The JAI.create encoding format name for JPEG.
	private static final String JAI_ENCODE_FORMAT_JPEG = "JPEG";

	// The JAI.create action name for encoding image data.
	private static final String JAI_ENCODE_ACTION = "encode";

	// The http content type/mime-type for JPEG images.
	// private static final String JPEG_CONTENT_TYPE = "image/jpeg";

	
	/**
	 * Creates a new thumbnail
	 * 
	 * @param filepath Absolute path to the original image to create the file from.
	 * @param newfile New file name to use for the thumbnail
	 * @param maxDim Maximum dimension of the thumbnail created
	 * @return Returns true if the thumbnail was created otherwise false.
	 */
	public static String createThumbnail(String filepath, String newfile, int maxDim) {
		try {
			File file = new File(filepath);
			if (!file.exists()) {
				return "File does not exist";
			}
			BufferedImage img = ImageIO.read(file);
			double scale = (double) maxDim / (double) img.getHeight(null);
			if (img.getWidth(null) > img.getHeight(null)) {
				scale = (double) maxDim / (double) img.getWidth(null);
			}
			// Determine size of new image. One of them should equal maxDim.
			int scaledW = (int) (scale * img.getWidth(null));
			int scaledH = (int) (scale * img.getHeight(null));

			BufferedImage ret = new BufferedImage(scaledW, scaledH, BufferedImage.TYPE_INT_RGB);
			ret.getGraphics().drawImage(img, 0, 0, scaledW, scaledH, null);
			// String extension = getExtension(file);
			File newFile = new File(newfile);
			ImageIO.write(ret, "jpeg", newFile);
			img = null;
			return null;

		} catch (Exception e) {
			Logger.error(e);
			return e.getMessage();
		}
	}

	/**
	 * Removes a thumbnail from the system
	 * @param filepath Absolute path to the thumbnail to remove
	 * @return Returns true if the file was deleted otherwise false.
	 */
	public static boolean removeThumbnail(String filepath) {
		return StorageMgr.instance().removeFile(filepath, null);
	}

	/**
	 * Returns the extension text of a give file otherwise null
	 * 
	 * @param file File whose extention is to be returned.
	 * @return Returns the extension text of a give file otherwise null
	 */
	public static String getExtension(File file) {
		String path = file.getAbsolutePath();
		int indx = path.lastIndexOf(".");
		return (indx > -1) ? path.substring(indx) : "";
	}

	/**
	 * Converts the BufferedImage to an Array of Bytes
	 * @param img  BufferedImage to convert
	 * @return Returns a byte Array of the BufferedImage
	 * @throws IOException
	 */
	public static byte[] getImageAsBytes(BufferedImage img) throws IOException {
		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		ImageIO.write(img, "jpeg", baos);
		baos.flush();
		byte[] rtnBytes = baos.toByteArray();
		baos.close();
		return rtnBytes;
	}

	/**
	 * Rotates a BufferedImage
	 * @param img BufferedImage to rotate
	 * @param angleDeg The Rotation angle to use
	 * @return Returns a rotated BufferedImage
	 */
	public static BufferedImage rotateImage(BufferedImage img, double angleDeg) {
		double radians = Math.toRadians(angleDeg);
		AffineTransform transform = new AffineTransform();
		transform.rotate(radians, img.getWidth() / 2, img.getHeight() / 2);
		AffineTransformOp op = new AffineTransformOp(transform, AffineTransformOp.TYPE_BILINEAR);
		return op.filter(img, null);
	}

	/**
	 * Rotates a BufferedImage
	 * @param img BufferedImage to rotate
	 * @param angle The Rotation angle to use
	 * @return Returns a rotated BufferedImage
	 */
	public static BufferedImage rotate(BufferedImage img, int angle) {
		int w = img.getWidth();
		int h = img.getHeight();
		BufferedImage dimg = new BufferedImage(w, h, img.getType());
		Graphics2D g = dimg.createGraphics();
		g.rotate(Math.toRadians(angle), w / 2, h / 2);
		g.drawImage(img, null, 0, 0);
		return dimg;
	}

	/**
	 * This method takes in an image as a byte array (currently supports GIF, JPG, PNG and
	 * possibly other formats) and resizes it to have a width no greater than the pMaxWidth
	 * parameter in pixels. It converts the image to a standard quality JPG and returns the
	 * byte array of that JPG image.
	 * 
	 * @param pImageData the image data.
	 * @param pMaxWidth the max width in pixels, 0 means do not scale.
	 * @return the resized JPG image.
	 * @throws IOException if the image could not be manipulated correctly.
	 */
	static public byte[] resizeImageAsJPG(byte[] pImageData, int pMaxWidth) throws IOException {

		InputStream imageInputStream = new ByteArrayInputStream(pImageData);
		// read in the original image from an input stream
		SeekableStream seekableImageStream = SeekableStream.wrapInputStream(imageInputStream, true);
		RenderedOp originalImage = JAI.create(JAI_STREAM_ACTION, seekableImageStream);
		((OpImage) originalImage.getRendering()).setTileCache(null);
		int origImageWidth = originalImage.getWidth();
		// now resize the image
		double scale = 1.0;
		if (pMaxWidth > 0 && origImageWidth > pMaxWidth) {
			scale = (double) pMaxWidth / originalImage.getWidth();
		}
		ParameterBlock paramBlock = new ParameterBlock();
		paramBlock.addSource(originalImage); // The source image
		paramBlock.add(scale); // The xScale
		paramBlock.add(scale); // The yScale
		paramBlock.add(0.0); // The x translation
		paramBlock.add(0.0); // The y translation

		RenderingHints hints = new RenderingHints(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

		RenderedOp resizedImage = JAI.create(JAI_SUBSAMPLE_AVERAGE_ACTION, paramBlock, hints);

		// lastly, write the newly-resized image to an output stream, in a
		// specific encoding
		ByteArrayOutputStream encoderOutputStream = new ByteArrayOutputStream();
		JAI.create(JAI_ENCODE_ACTION, resizedImage, encoderOutputStream, JAI_ENCODE_FORMAT_JPEG, null);
		// Export to Byte Array
		byte[] resizedImageByteArray = encoderOutputStream.toByteArray();
		return resizedImageByteArray;
	}

}