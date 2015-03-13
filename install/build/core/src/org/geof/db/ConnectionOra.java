package org.geof.db;

import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Class inherits from the DBConnection abstract object for connecting to a Oracle database
 * 
 * @author Jeff Boehmer
 * @comanpay  Ft Collins Research, LLC.
 * @url	www.ftcollinsresearch.org
 *
 */
public class ConnectionOra extends DBConnection {

	/**
	 * Class Constructor
	 */
	public ConnectionOra() {}

	@Override
	public boolean connect(String connstr, String uid, String pwd) {
		_connstr = connstr;
		_uid = uid;
		_pwd = pwd;
		return connect();
	}
	
	/**
	 * Establishes a connection to the Oracle database
	 * @return True if connection succeeded, false if error occured.
	 */
	private boolean connect() {
		try {
			if (!disconnect()) {
				return false;
			}
			if (_connstr.indexOf(":thin:") > -1) {
				useThinDriver(_uid, _pwd);
			} else {
				useOCIDriver(_uid, _pwd);
			}
			_conn.setAutoCommit(_autoCommit);
			return true;

		} catch (SQLException se) {
			se.printStackTrace();
			return false;
		} catch (Exception e) {
			return false;
			
		}
	}

	@Override
	public String to_Date(java.sql.Date date) {
		return "TO_DATE('yyyy-mm-dd','" + date.toString() + "')";
	}

	@Override
	public String to_date(java.util.Date date) {
		return to_date(new java.sql.Date(date.getTime()));
	}

	/**
	 * Connects to the Oracle Database using Oracle's Thin driver
	 * @param login  Database user login 
	 * @param pwd  Database user password
	 * @return  True if connection established, false if error occured.
	 */
	private boolean useThinDriver(String login, String pwd) {
		
        try {
			// Load the JDBC driver
			String driverName = "oracle.jdbc.driver.OracleDriver";
			Class.forName(driverName);
			// Create a connection to the database
			_conn = DriverManager.getConnection(_connstr, login, pwd);
			return true;
		} catch (Exception e) {
			return false;
		}
		
	}
	
	/**
	 * Connects to the Oracle Database using Oracle's standard OCI driver
	 * @param login  Database user login 
	 * @param pwd  Database user password
	 * @return  True if connection established, false if error occured.
	 */
	private boolean useOCIDriver(String login, String pwd) {
		
        try {
			if (!_driverLoaded) {
				try {
//			        DriverManager.registerDriver(new oracle.jdbc.OracleDriver());
			        _driverLoaded = true;
		        } catch (Exception e) {
		        }
			}
			_conn = DriverManager.getConnection(_connstr, login, pwd);
			return true;
		} catch (Exception e) {
			return false;
		}
		
	}
}
