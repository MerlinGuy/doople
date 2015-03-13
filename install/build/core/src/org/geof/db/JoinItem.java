package org.geof.db;

import java.util.ArrayList;

import org.geof.log.Logger;
import org.geof.request.Request;
import org.json.JSONException;
import org.json.JSONObject;

class JoinItem {
	
	public static final String PARENT = "parent";
	public static final String CHILD = "child";
	public static final String LINK = "link";
	
	public EntityMap emap = null;
	public String join = "";
	public String columns = "";
	public ArrayList<WhereItem> whereItems = new ArrayList<WhereItem>();
	public String type = LINK;
	/*
	{
	"entity":"point"
	"join":"outer"
	"columns":"longitude,latitude,utcdate"
	"where":{
	}
	*/
	public JoinItem(JSONObject joJoin) {
		try {
			String emapName = joJoin.getString(Request.ENTITY);
			String join = joJoin.getString(Request.JOIN);
			String columns = "";
			if (joJoin.has(Request.COLUMNS)) {
				columns = joJoin.getString(Request.COLUMNS);
			}
			this.emap = EntityMapMgr.getEMap(emapName);
			
			if ((join != null) && join.equalsIgnoreCase("outer")) {
				this.join = QueryBuilder.LEFT_OUTER_JOIN;
			} else {
				this.join = QueryBuilder.INNER_JOIN;
				if (join.equalsIgnoreCase(PARENT)) {
					this.type = PARENT;
				} else if (join.equalsIgnoreCase(PARENT)){
					this.type = CHILD;
				}
			}
			this.columns = QueryBuilder.buildColumns(this.emap.getName(), columns);
			if (joJoin.has(Request.WHERE)) {
				this.whereItems = QueryBuilder.getWhereItems(this.emap, joJoin);
//				JSONObject where = joJoin.getJSONObject(Request.WHERE);
//				this.whereItems.addAll( QueryBuilder.getWhereItems(this.emap, where) );
			}
		} catch (JSONException e) {
			Logger.error(e);
		}
	}
	
}
