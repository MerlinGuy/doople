package org.geof.dpl;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import org.geof.log.Logger;
import org.geof.util.JsonUtil;
import org.json.JSONArray;
import org.json.JSONObject;

import com.redhat.et.libguestfs.*;

import java.util.Map;

public class ImageEditor {

	public static final int SEARCH=0;
	public static final int REPLACE=1;
    String _error = null;
    int _tempIndx = 0;
    String nl = System.getProperty("line.separator");
       
    // -------------------------------    
    // Modify both the image file and the xml file
    public HashMap<String,String> modify(JSONObject mod_cfg, JSONObject changes, JSONObject vargs) {
        HashMap<String,String> rtn = new HashMap<String,String>();
        try {
        	
            //TODO: change this to rotate through all image files 
            // sent : to find the correct one.
        	JSONArray imgFiles = mod_cfg.optJSONArray("imgfiles");
            String img = imgFiles.getString(0);
            GuestFS g = this.mount_disk(img);
            if (g == null) {
            	rtn.put("error","Could not mount disk - "  + img );
            	return rtn;
            }
            
            Logger.debug( "Mounted image OS: " + img);
            
            String tmplDir = mod_cfg.optString("template_dir");
            if (tmplDir.substring(tmplDir.length() -1) != "/") {
            	tmplDir += "/";
            }
            
            Logger.debug( "Create_uploads tmplDir " + tmplDir);
            JSONArray uploads = changes.optJSONArray("upload");
            if  (! this.create_uploads(tmplDir, uploads, vargs) ){
                g.umount_all ();
            	rtn.put("error","Could not modify upload files");
            	return rtn;
            }
            Logger.debug( "... upload files created, ready for upload");
            
            for (int indx=0; indx<uploads.length(); indx++) {
                JSONObject joFile = uploads.getJSONObject(indx);
            	String target = joFile.optString("target");
                String newfilename = tmplDir + target ;
                String filename = joFile.optString("guestdir") + target;
//                Logger.debug( "uploading "  + newfilename + " to " + filename);
                g.upload(newfilename, filename);              
                (new File(newfilename)).delete();
            }            
            Logger.debug( "... upload files added to image" );
            
            JSONArray appends = changes.optJSONArray("append");
            for (int indx=0; indx<appends.length(); indx++) {
                JSONObject joApnd = appends.getJSONObject(indx);
                JSONArray jaEdits = joApnd.optJSONArray("edits");
                String filepath = joApnd.optString("filepath");
                String add_line = joApnd.optString("add_line");
                this.append_line(g, filepath, add_line, jaEdits);
            }            
            Logger.debug( "... new files appended to image");

            JSONArray edits = changes.optJSONArray("edit");
            for (int indx=0; indx<edits.length(); indx++) {
                JSONObject joEdit = edits.getJSONObject(indx);
                String filepath = joEdit.optString("filepath");
                JSONArray jaEdits = joEdit.optJSONArray("edits");
            	this.edit_file(g, filepath, jaEdits);
            }
            Logger.debug( "... file edits made to image");
            
            g.umount_all ();
        } catch (Exception e) {
        	rtn.put("error",e.getMessage());
        }
    	return rtn;
    }

    // -------------------------------    
    // Runs the all the modifying code
    public GuestFS mount_disk(String imgName) {
    	try {
            Logger.debug( "mounting image - " + imgName);
            File file = new File(imgName);
            if (! file.exists()) {
                this._error = "Image file .get(" + imgName +  ") does not exist";
                return null;
            }
            
            GuestFS g = new GuestFS();
            HashMap<String, Object> opts = new HashMap<String, Object>();
            opts.put("readonly", Boolean.FALSE);
            g.add_drive_opts (imgName, opts);
            g.launch ();
            String[] roots = g.inspect_os();
            
            if (roots.length == 0){
                this._error = "modifyImage: no operating systems found for " + imgName;
                return null;
            }
            
            for (String root : roots){
            	Map<String,String> mps = g.inspect_get_mountpoints(root);        	
            	List<String> mps_keys = new ArrayList<String> (mps.keySet ());
//                Collections.sort (mps_keys, COMPARE_KEYS_LEN);

                for (String mp : mps_keys) {
                    String dev = mps.get (mp);
                    try {
                        g.mount (dev, mp);
                    }
                    catch (Exception exn) {
                        System.err.println (exn + " (ignored)");
                    }
                }

            }
            Logger.debug( "...image mounted ");
            return g;
	    } catch (Exception e) {
	    	Logger.debug(e);
	    	return null;
	    }
    }

    // -------------------------------    
    // uploads each file to image
    private boolean create_uploads(String tmplDir, JSONArray mod_files, JSONObject vargs) {
        try {
        	int len = mod_files.length();
	        for (int indx=0; indx < len; indx++) {
	        	JSONObject tfile = mod_files.getJSONObject(indx);
	            String infile =  tmplDir  + tfile.optString("source");
	            String outfile = tmplDir + tfile.optString("target");
	        	BufferedReader fin = new BufferedReader(new FileReader(infile));
	        	BufferedWriter fout = new BufferedWriter(new FileWriter(outfile));
	            
	        	HashMap<String,String> rmap = new HashMap<String,String>();
            	JSONArray flds= tfile.getJSONArray("fields");
            	String field;
                for (int i=0;i<flds.length();i++)  {
                	field = flds.getString(i);
                   	rmap.put("%" + field, vargs.optString("-" + field,""));
                }

	        	String line;
	            while ((line = fin.readLine()) != null) {
	            	for (String key : rmap.keySet()) {
	                    line = line.replaceAll(key,rmap.get(key));
	            	}
	                fout.write(line + System.getProperty("line.separator"));
	            }
	            fout.close();
	            fin.close();
	        }
	        return true;
	     } catch (Exception e) {
	    	 Logger.debug("create_uploads: " + e);
	    	 Logger.debug( e);
	     }
        return false;
    }
    
    // -------------------------------
    // Appends a line to the end of a file    
    private void append_line(GuestFS g, String filepath, String add_line, JSONArray repl) throws Exception{
        try {
			add_line = nl + JsonUtil.replace(add_line, repl, "search", "replace");			
        	g.write_append(filepath, add_line.getBytes());
		} catch (Exception e) {
			throw e;
		}
    }    
        
    // -------------------------------
    // Replaces all occurances of a search phrase with a new phrase    
    private void edit_file(GuestFS g, String filepath, JSONArray edits) throws Exception {
    	try {
			String[] lines = g.read_lines(filepath);
			g.touch(filepath);
			g.truncate(filepath);
			for (String line : lines) {
				line = JsonUtil.replace(line, edits, "search", "replace") + nl;
				g.write_append(filepath, line.getBytes());
			}
		} catch (Exception e) {
			throw e;
		}
    }
        
}

