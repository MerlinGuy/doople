package org.geof.service;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Date;

import org.geof.db.DBConnMgr;
import org.geof.db.DBConnection;
import org.geof.db.DBInteract;
import org.geof.db.EntityMap;
import org.geof.db.EntityMapMgr;
import org.geof.log.Logger;
import org.geof.util.DateUtil;
import org.geof.util.JsonUtil;
import org.json.JSONObject;

public class AuthCodeMgr {

	public static final String AUTHCODE = "authcode";
	public static final String STARTDATE = "startdate";
	public static final String ENDDATE = "enddate";
	public static final String ID = "id";
	public static final String USRID = "usrid";
	public static final String GUID = "guid";
	public static final long DEFAULT_CODE_LIFE = 86400000;
	
	private static final EntityMap _entitymap = EntityMapMgr.loadMap(AUTHCODE, null);
	
	public static boolean hasValidCode(String auth_code, long usrid) {
		DBConnection conn = null;
		try {
			Timestamp ts = new Timestamp(new Date().getTime());
			StringBuilder qry = new StringBuilder();
			qry.append("SELECT count(*) as cnt FROM authcode WHERE usrid = ?");
			qry.append(" AND guid = ? AND startdate <= ? and enddate >= ?");
			conn = DBConnMgr.getConnection();
			PreparedStatement ps = conn.getPreparedStatement(qry.toString());
			ps.setLong(1, usrid);
			ps.setString(2, auth_code);
			ps.setTimestamp(3, ts);
			ps.setTimestamp(4, ts);
			ResultSet rs = ps.executeQuery();
			int cnt = 0; 
			if (rs.next()) {
				cnt = rs.getInt("cnt");
			}
			return cnt > 0;
		} catch (SQLException e) {
			Logger.error(e);
			return false;
		} finally {
			DBConnMgr.release(conn);
		}
	}
	
	public static JSONObject create(long usrid, Timestamp startdate, Timestamp enddate) {

		String guid = java.util.UUID.randomUUID().toString();
		JSONObject keys =  null;
		DBInteract dbi = null;
		
		if (startdate == null) {
			startdate = DateUtil.getTimestamp(null);
			enddate = DateUtil.getTimestamp(startdate.getTime(), 1, 0, 0, 0);
		} else if (enddate == null) {
			enddate = DateUtil.getTimestamp(startdate.getTime(), 1, 0, 0, 0);
		}
		try {
			JSONObject fields = new JSONObject();
			fields.put("usrid", usrid);
			fields.put("guid", guid);
			fields.put("startdate", startdate);
			fields.put("enddate", enddate);
			JSONObject data = JsonUtil.getDataFields(fields);
			dbi = new DBInteract();
			if (dbi.create(_entitymap, data)) {
				keys = dbi.getLastReturning();
			}
		} catch (Exception e) {
			Logger.error(e);
		} finally {
			if (dbi != null) {
				dbi.releaseConnection();
			}
		}
		return keys;
	}
	
	public static void delete(String guid) {

		DBInteract dbi = null;
		
		try {
			dbi = new DBInteract();
			String sql = "DELETE FROM authcode WHERE guid = ?";
			PreparedStatement ps = dbi.getPreparedStatement(sql);
			ps.setString(1, guid);
			ps.execute();			
		} catch (Exception e) {
			Logger.error(e);
		} finally {
			if (dbi != null) {
				dbi.releaseConnection();
			}
		}
	}
}
