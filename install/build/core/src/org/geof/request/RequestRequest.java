package org.geof.request;

import java.lang.reflect.Modifier;
import java.net.JarURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.zip.ZipEntry;

import org.geof.log.Logger;
import org.geof.util.RTSI;
import org.json.JSONArray;

/**
 * Derived ABaseRequest object for listing all permissable RequestObjects which access tables
 * in the database. It does this by returning the names of all the classes that are derived
 * from the ABaseRequest class in the org/geof/request package.
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class RequestRequest extends Request {

	public static int DEFAULT = 0, RTSI = 1, CONTEXT = 2;
	private final static String PACKAGENAME = "org.geof.request";
	private final static String PARENTCLASS = "Request";
	private static List<String> _excludeList = null; // {"DB","Table"};
	private static JSONArray _classNames = null;

	private final static int _method = RTSI;

	public RequestRequest() {
		_entityname = "request";
	}

	/**
	 * Overrides the base class process() to provide Request specific action handlers.
	 * 
	 * @return True if action was processed successfully otherwise false
	 */
	@Override
	public boolean process() {
		// TODO: check all permissions here
		if (_actionKey.equalsIgnoreCase(READ)) {
			return read();
		}

		return true;
	}

	/**
	 * This method builds a list of the all the classes derived from ABaseRequest located in
	 * the org/geof/request package. This list is then written to the response stream.
	 * 
	 * @return Returns true if the method succeeds otherwise false if an error occurs.
	 */
	private boolean read() {
		//JSONArray requests = new JSONArray();
		if (_classNames == null) {
			if (!resetClassNames()) {
				return false;
			}
		}
		_jwriter.writePair("data", _classNames);
		return true;
	}

	private boolean resetClassNames() {
		JarFile jfile = null;
		try {
			String path = RequestRequest.class.getProtectionDomain().getCodeSource().getLocation().getPath();
			String decodedPath = URLDecoder.decode(path, "UTF-8");
			Logger.debug("Geof.jar path is " + decodedPath);
			
			_classNames = new JSONArray();
			_excludeList = Arrays.asList(new String[] { "DB" });
			String pckgname = PACKAGENAME;
			Class<?> tosubclass = null;
			try {
				tosubclass = Class.forName(PACKAGENAME + "." + PARENTCLASS);
			} catch (Exception cnf) {
				setError("RequestRequest.resetClassNames : " + PACKAGENAME + "." + PARENTCLASS, cnf);
			}


			// Code from JWhich
			// ======
			// Translate the package name into an absolute path
			String name = new String(pckgname);
			if (!name.startsWith("/")) {
				name = "/" + name;
			}
			name = name.replace('.', '/');
			URL url = null;
			if (_method == RTSI) {
				url = RTSI.class.getResource(name);
			} else if (_method == CONTEXT) {
				return false;
			} else {
				url = new URL("jar:file:" + decodedPath + "!/org/geof/request");
			}

			// Logger.verbose("url: " + url);
			if (url == null) {
				setError("Request.read failed url is null");
				return false;
			}

			JarURLConnection conn = (JarURLConnection) url.openConnection();
			String starts = conn.getEntryName();
			jfile = conn.getJarFile();

			Enumeration<JarEntry> e = jfile.entries();
			while (e.hasMoreElements()) {
				ZipEntry entry = (ZipEntry) e.nextElement();
				String en = entry.getName();
				if (en.startsWith(starts) && (en.lastIndexOf('/') <= starts.length()) && en.endsWith(".class")) {
					String cn = en.substring(0, en.length() - 6);
					if (cn.startsWith("/")) {
						cn = cn.substring(1);
					}
					cn = cn.replace('/', '.');
					if (cn.indexOf('$') == -1) {
						try {
							// Try to create an instance of the object
							Class<?> klass = Class.forName(cn);
							if (!(Modifier.isAbstract(klass.getModifiers()) || Modifier.isInterface(klass.getModifiers()))) {
								if (tosubclass.isInstance(klass.newInstance())) {
									cn = cn.substring(cn.lastIndexOf('.') + 1);
									cn = cn.substring(0, cn.lastIndexOf("Request"));
									if (!_excludeList.contains(cn)) {
										_classNames.put(cn);
									}
								}

							}
						} catch (Exception ie) {
							setError("RequestRequest.read : classname - " + cn, ie);
						}
					}
				}
			}
			return true;
		} catch (Exception e) {
			setError("Request.resetClassNames failed " + e.getMessage());
			return false;
		} finally {
			try {
				if (jfile != null) {
					jfile.close();
				}
			} catch (Exception e) {}

		}
	}
}
