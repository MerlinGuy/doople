package org.geof.service;

import org.geof.db.DBConnMgr;
import org.geof.db.DBInteract;
import org.geof.db.EntityMapMgr;
import org.geof.encrypt.CipherMgr;
import org.geof.job.TaskExecutor;
import org.geof.log.Logger;
import org.geof.prop.GlobalProp;
import org.geof.request.VersionRequest;
import org.geof.store.StorageMgr;
//import org.geof.tasker.TaskMgrConfig;
import org.geof.util.FileUtil;
import org.geof.service.SessionMgr;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextListener;
import javax.servlet.ServletContextEvent;

/**
 * The BaseContextListener is responsible for performing all system initialization before the
 * application's Servlet becomes availabe.  
 * 
 * It loads the initialization properties from files and the database.
 * It initializes the following systems
 * <ul>
 * 	<li>Logging system</li>
 * 	<li>Database Connection Pool</li>
 * 	<li>EntityMap Manager</li>
 * 	<li>Global Properties</li>
 * 	<li>Session Manager</li>
 * 	<li>Authority Manager</li>
 * </ul>
 * 
 * @author Jeff Boehmer
 * @comanpay Ft Collins Research, LLC.
 * @url www.ftcollinsresearch.org
 * 
 */
public class BaseContextListener implements ServletContextListener {

	public static final String LOGLEVEL = "loglevel";
	public static long applicationInitialized = 0L;
	public static GlobalProp _gprops = null;
	public static String CONF_PATH = "";
//	public static TaskMgrConfig _taskMgrConfig = null;
	
	private static final boolean DEBUG = false;

	/**
	 * Application Startup Event
	 * Override of the ServletContextListener method which is called prior to the WebServlet startup.
	 * @param ce ServletContextEvent
	 */
	@Override
	public void contextInitialized(ServletContextEvent ce) {
		try {
			if (DEBUG) {
				Thread.sleep(10000);
			}
			initialize(ce);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
	}
	
	private void initialize(ServletContextEvent ce) {
		
		// Read in the intial bootstrap properties from file
		ServletContext sc = ce.getServletContext();
		String basePath = sc.getRealPath("/") + "WEB-INF/";
		String initlogpath =  basePath + "logs/init.log";		
		String geoflogpath = basePath + "logs/geof.log";
		CONF_PATH =  basePath + "conf/";
		String confPath = CONF_PATH + "file.conf";
		String proppath = CONF_PATH + "geof.conf";
		
		_gprops = GlobalProp.instance();
		_gprops.populate(proppath);
		_gprops.put("basepath", basePath);		
		
		Logger.initialize(geoflogpath, "Application started at ",  Logger._VERBOSE);
		Logger.setAppend(false);
		Logger.writeTime( _gprops.getBool("write_time", false) );
		
		Logger.initialize2(geoflogpath, initlogpath, "Application started at ",  Logger._VERBOSE);
		Logger.writeInit("*** Logger.initialized ");

		// Print out version information
		Logger.writeInit("  ");
		Logger.writeInit(" [ Server Software Version: " + VersionRequest.getVersion() + " ]");
		Logger.writeInit("  ");
		Logger.writeInitTime();
		
		// setup filetypes
		FileUtil.loadFileTypes(confPath);

		// Read in all the database properties
		DBInteract dbi = new DBInteract(DBConnMgr.getConnection(), null);
		Logger.writeInitTime();
		_gprops.populate(dbi);

		EntityMapMgr.initialize(dbi);
		Logger.writeInitTime();
//		EntityMapMgr.logEntities();

		_gprops.printToInitLog();
		Logger.writeInitTime();
		
		Logger.writeInit("");
		if (_gprops.hasKey(LOGLEVEL)) {
			Logger.setLogLevel(_gprops.getInt(LOGLEVEL, Logger._VERBOSE));
			Logger.verbose("  --- Logger log level reset to : " + _gprops.get(LOGLEVEL));
		}

		boolean rtn = StorageMgr.instance().initialize(dbi);
		if (rtn) {
			Logger.writeInit("  ---  Storage Location count: " + StorageMgr.instance().getSize());
		} else {
			Logger.writeInit("????? StorageManager.initialize Failed ");
		}
		Logger.writeInitTime();

		Long sessiontimeout = null;
		if (_gprops.hasKey("sessiontimeout")) {
			sessiontimeout = Long.valueOf(_gprops.get("sessiontimeout"));
		}
		SessionMgr.initialize(sessiontimeout);
		Logger.writeInitTime();
		
		CipherMgr.initialize();
		Logger.writeInitTime();
		
		boolean Securityoff = _gprops.getBool("securityoff", false);
		boolean ReadOnlySecurity = _gprops.getBool("readonlysecurity", false);
		AuthorityMgr.initialize(dbi, Securityoff,ReadOnlySecurity);
		Logger.writeInitTime();

		dbi.releaseConnection();
		Logger.writeInit("  --- Context DB connection released\n");

		// Setup the JobExecutor objects
		Logger.writeInit("*** Setting up JobExecutor ");
		TaskExecutor.initialize();
		Logger.writeInitTime();

//		// Setup the Tasker objects
//		Logger.writeInit("*** Setting up Tasker Objects ");
//		try {
//			_taskMgrConfig = TaskMgrConfig.getInstance();
//			Logger.writeInitTime();
//			
//		} catch (Exception e) {
//			Logger.error(e);
//		}
		
		Logger.writeInit("\nBaseContextListener initialization complete.");
		Logger.writeInitTime();
		Logger.writeInit("------------------------------------------------\n");			
	}

	/**
	 * Application Shutdown Event
	 * This method is called just prior to the Java Servlet shutdown and is used to clean up objects in memory 
	 * @param ce
	 */
	public void contextDestroyed(ServletContextEvent ce) {
		// Logger.debug("Application Ending now", true);
		// Time to clean up all the connections
		// _sessionData.dispose();
		
//		if (_taskMgrConfig != null) {
//			_taskMgrConfig.dispose();
//		}
		
		DBConnMgr.shutdown();
		// log.info("geof application shutdown");
	}
	
}

