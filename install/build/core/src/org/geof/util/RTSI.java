package org.geof.util;

/**
 * RTSI.java
 *
 * Created: Wed Jan 24 11:15:02 2001
 *
 */

import java.io.*;
import java.net.URL;
import java.net.JarURLConnection;
import java.util.jar.*;
import java.util.zip.*;
import java.util.Enumeration;

import org.geof.log.Logger;

/**
 * This utility class is looking for all the classes implementing or inheriting from a given
 * interface or class. (RunTime Subclass Identification)
 * 
 * @author <a href="mailto:daniel@satlive.org">Daniel Le Berre</a>
 * @version 1.0
 */
public class RTSI {

	/**
	 * Display all the classes inheriting or implementing a given class in the currently
	 * loaded packages.
	 * 
	 * @param tosubclassname the name of the class to inherit from
	 */
	public static void find(String tosubclassname) {
		try {
			Class<?> tosubclass = Class.forName(tosubclassname);
			Package[] pcks = Package.getPackages();
			for (int i = 0; i < pcks.length; i++) {
				find(pcks[i].getName(), tosubclass);
			}
		} catch (ClassNotFoundException ex) {
			Logger.error("Class " + tosubclassname + " not found!");
		}
	}

	/**
	 * Display all the classes inheriting or implementing a given class in a given package.
	 * 
	 * @param pckgname the fully qualified name of the package
	 * @param tosubclass the name of the class to inherit from
	 */
	public static void find(String pckname, String tosubclassname) {
		try {
			Class<?> tosubclass = Class.forName(tosubclassname);
			find(pckname, tosubclass);
		} catch (ClassNotFoundException ex) {
			Logger.error("Class " + tosubclassname + " not found!");
		}
	}

	/**
	 * Display all the classes inheriting or implementing a given class in a given package.
	 * 
	 * @param pckgname the fully qualified name of the package
	 * @param tosubclass the Class object to inherit from
	 */
	public static void find(String pckgname, Class<?> tosubclass) {
		// Code from JWhich
		// ======
		// Translate the package name into an absolute path
		String name = new String(pckgname);
		if (!name.startsWith("/")) {
			name = "/" + name;
		}
		name = name.replace('.', '/');

		// Get a File object for the package
		URL url = RTSI.class.getResource(name);
		Logger.error(name + "->" + url);

		if (url == null)
			return;

		File directory = new File(url.getFile());

		if (directory.exists()) {
			// Get the list of the files contained in the package
			String[] files = directory.list();
			for (int i = 0; i < files.length; i++) {

				// we are only interested in .class files
				if (files[i].endsWith(".class")) {
					// removes the .class extension
					String classname = files[i].substring(0, files[i].length() - 6);
					try {
						// Try to create an instance of the object
						Object o = Class.forName(pckgname + "." + classname).newInstance();
						if (tosubclass.isInstance(o)) {
							Logger.error(classname);
						}
					} catch (ClassNotFoundException cnfex) {
						Logger.error(cnfex);
					} catch (InstantiationException iex) {
					} catch (IllegalAccessException iaex) {
					}
				}
			}
		} else {
			try {
				// It does not work with the filesystem: we must
				// be in the case of a package contained in a jar file.
				JarURLConnection conn = (JarURLConnection) url.openConnection();
				String starts = conn.getEntryName();
				JarFile jfile = conn.getJarFile();
				Enumeration<JarEntry> e = jfile.entries();
				while (e.hasMoreElements()) {
					ZipEntry entry = (ZipEntry) e.nextElement();
					String entryname = entry.getName();
					if (entryname.startsWith(starts) && (entryname.lastIndexOf('/') <= starts.length()) && entryname.endsWith(".class")) {
						String classname = entryname.substring(0, entryname.length() - 6);
						if (classname.startsWith("/"))
							classname = classname.substring(1);
						classname = classname.replace('/', '.');
						try {
							// Try to create an instance of the object
							Object o = Class.forName(classname).newInstance();
							if (tosubclass.isInstance(o)) {
								Logger.error(classname.substring(classname.lastIndexOf('.') + 1));
							}
						} catch (ClassNotFoundException cnfex) {
							Logger.error(cnfex);
						} catch (InstantiationException iex) {
							// We try to instantiate an interface
							// or an object that does not have a
							// default constructor
						} catch (IllegalAccessException iaex) {
							// The class is not public
						}
					}
				}
			} catch (IOException ioex) {
				Logger.error(ioex);
			}
		}
	}

}// RTSI
