package org.geof.db;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Set;

import org.geof.log.Logger;

/**
 * EntityMapManager is a static class which holds a list of all the EntityMaps used in the system along
 * with functions to access those Map objects. * 
 * 
 * @author Jeff Boehmer
 * @comanpay  Ft Collins Research, LLC.
 * @url	www.ftcollinsresearch.org
 *
 */
public class EntityMapMgr {
	
	public final static int IMMEDIATE=0, ONNEED=1;
	public final static String UNDERSCORE = "_";
	
	private final static String sqlSelect = "SELECT name, id,loadtime FROM entity";
	private final static String sqlSelectTbl = "SELECT id,loadtime FROM entity WHERE name = ?";
	
	private static HashMap<String, EntityMap> _entitymaps = new HashMap<String, EntityMap>();
	private static HashMap<String, ArrayList<EntityMap>> _linkmaps = null;
	private static HashMap<String, ArrayList<EntityMap>> _childmaps = null;

	//---------------------------------------------------------
	
	/**
	 * This Method loads all the EntityMaps in from the database into a set of lists.
	 * @param DBConnection  The database connection object to use for query the Entity Entitys.
	 * @return  Returns true if the initialization succeeds otherwise false if an error occurs.
	 */
	public static boolean initialize(DBInteract dbi) {
		ResultSet rs = null;
		try {
			HashMap<String, EntityMap> entitymaps = new HashMap<String, EntityMap>();
			rs = dbi.getResultSet(sqlSelect, null);
			String Entityname;
			int id;
			while (rs.next()) {
				Entityname = rs.getString(1).toLowerCase();
				id = rs.getInt(2);
				EntityMap map = new EntityMap(Entityname, id, dbi);
				entitymaps.put(Entityname, map);
			}
			
			HashMap<String, ArrayList<EntityMap>> linkmaps = new HashMap<String, ArrayList<EntityMap>>();
			HashMap<String, ArrayList<EntityMap>> childmaps = new HashMap<String, ArrayList<EntityMap>>();

			String[] entities;
			EntityMap lemap;
			
			for (String EntityName : entitymaps.keySet()) {
				if (EntityName.contains(UNDERSCORE)) {
					lemap = entitymaps.get(EntityName);
					entities = EntityName.split(UNDERSCORE);
					if ( ! linkmaps.containsKey(entities[0])) {
						linkmaps.put(entities[0], new ArrayList<EntityMap>());
					}
					if (lemap == null) {
						Logger.error("EntityMap for  " + EntityName + " is null ");
					}
					linkmaps.get(entities[0]).add(lemap);
//					Logger.debug("link added " + EntityName + " to " + entities[0]);
					
					if ( ! linkmaps.containsKey(entities[1])) {
						linkmaps.put(entities[1], new ArrayList<EntityMap>());
					}
					linkmaps.get(entities[1]).add(lemap);
//					Logger.debug("link added " + EntityName + " to " + entities[1]);
					
				} else {
					String fkey = EntityName + "id";
					for (EntityMap em : entitymaps.values()) {
						if (!em.getName().contains(UNDERSCORE) && em.hasField( fkey )) {
							if ( ! childmaps.containsKey(EntityName)) {
								childmaps.put(EntityName, new ArrayList<EntityMap>());
							}
							childmaps.get(EntityName).add(em);
//							Logger.debug("child added " + em.getName() + " to " + EntityName);
						}
					}					
				}
			}

			_entitymaps = entitymaps;
			_linkmaps = linkmaps;
			_childmaps = childmaps;
			
			Logger.writeInit("*** EntityMapMgr.initialized ");
			return true;
		} catch (Exception e) {
			Logger.error(e);
			Logger.writeInit("*** EntityMapMgr.initialization Failed ");
			return false;
		} finally {
			if (rs != null) {
				try {rs.close();} catch (Exception dbe){}
			}
		}
	}

	/**
	 * @param Entityname  Name of database Entity to query for
	 * @return  True if the <Entityname> is a loaded EntityMap otherwise false
	 */
	public static boolean isEntity(String Entityname) {
		return _entitymaps.containsKey(Entityname);
	}
	
	/**
	 * 
	 * @param Entityname  Name of database Entity to query for
	 * @return  True only if the <Entityname> is a valid EntityMap 
	 * and that Map has already been loaded into the EntityMapManager 
	 */
	public static boolean hasMap(String Entityname) {
		if ((Entityname == null) || (Entityname.length() == 0)) {
			return false;
		}
		return _entitymaps.get(Entityname) != null;
	}
	
	/**
	 * 
	 * @param Entityname  Name of database Entity to return.
	 * @return  Returns the EntityMap associated with the Entityname
	 * if it is a valid key and is loaded otherwise it returns null.
	 */
	public static EntityMap getEMap(String Entityname) {
		return isEntity(Entityname) ? _entitymaps.get(Entityname) : null;
	}
	
	public static boolean isLinkEntity(EntityMap emap) {
		return _linkmaps.containsKey(emap.getName());
	}

	public static EntityMap getLinkMap(String tbl1, String tbl2) {
		EntityMap map = getEMap(tbl1 + "_" + tbl2);
		if (map == null) {
			map = getEMap(tbl2 + "_" + tbl1);
		}
		return map;
	}	
	
	/**
	 * Loads a Databse Entity as an EntityMap into the Manager 
	 * @param Entityname  Database Entity name
	 * @param conn  DBConnection to use for reading EntityMap information from Database
	 * @param reload  If true this forces a reload of the EntityMap if it already has been loaded
	 * @return  Returns the EntityMap for the Entity
	 */
	public static EntityMap loadMap(String Entityname, DBInteract dbi) {
		EntityMap entitymap = null;
		ResultSet rs = null;
		PreparedStatement ps = null;
		
		try {
			ps = dbi.getPreparedStatement(sqlSelectTbl);
			ps.setString(1, Entityname);
			rs = ps.executeQuery();
			if (rs.next()) {
				int id = rs.getInt(1);
				entitymap = new EntityMap(Entityname, id, dbi);
				_entitymaps.remove(Entityname);
				_entitymaps.put(Entityname, entitymap);
				rs.close();
			} else {				
				Logger.error("EntityMapManager.loadMap ERROR: " + Entityname + " is not a Entity");
//				Logger.debug(Thread.currentThread().getStackTrace());
			}
		} catch (Exception e) {
			Logger.error(e);
		} finally {
			if (ps != null) {
				try {ps.close();} catch(Exception e) {}
			}
		}
		return entitymap;
	}
	
	public static ArrayList<EntityMap> getLinkEmaps(String name) {
		if (_linkmaps.containsKey(name)) {
			return _linkmaps.get(name);
		} else {
			return new ArrayList<EntityMap>();
		}		
	}
	
	public static ArrayList<EntityMap> getChildEmaps(String name) {
		if (_childmaps.containsKey(name)) {
			return _childmaps.get(name);
		} else {
			return new ArrayList<EntityMap>();
		}		
	}
	
	/**
	 * Returns a list of the Linking Entitys which have the toEntityName as the 'To' side
	 * of a LinkObject
	 * @param toEntityName  'To' Entityname 
	 * @return  Returns ArrayList of names of LinkObjects which are linked to the To Entity
	 */
	public static ArrayList<EntityMap> getLinkToEntities(String toEntityName) {
		ArrayList<EntityMap> linkEntitys = new ArrayList<EntityMap>();
		String suffix = "_" + toEntityName.toLowerCase();
		ArrayList<EntityMap> linkmaps = _linkmaps.get(toEntityName);
		for (EntityMap emap : linkmaps) {
			if (emap.getName().endsWith(suffix)) {
				linkEntitys.add(emap);
			}
		}
		return linkEntitys;
	}
	
	/**
	 * Returns a list of the Linking Entitys which have the fromEntityName as the 'From' side
	 * of a LinkObject
	 * @param fromEntityName  'TFrom' Entityname 
	 * @return  Returns ArrayList of names of LinkObjects which are linked to the From Entity
	 */
	public static ArrayList<EntityMap> getLinkFromEntities(String fromEntityName) {
		ArrayList<EntityMap> linkEntitys = new ArrayList<EntityMap>();
		String prefix = fromEntityName.toLowerCase() + "_";
		ArrayList<EntityMap> linkmaps = _linkmaps.get(fromEntityName);
		for (EntityMap emap : linkmaps) {
			if (emap.getName().startsWith(prefix)) {
				linkEntitys.add(emap);
			}
		}
		return linkEntitys;
	}
	
	public static ArrayList<EntityMap> getLinkTables(String entityA) {
		ArrayList<EntityMap> linkEntitys = new ArrayList<EntityMap>();
		String prefix = entityA.toLowerCase() + "_";
		String suffix = "_" + entityA.toLowerCase();
		Iterator<String> iterator = _entitymaps.keySet().iterator();
		String entityname;
		while (iterator.hasNext()) {
			entityname = iterator.next();
			if (entityname.startsWith(prefix)) {
				linkEntitys.add(EntityMapMgr.getEMap(entityname));
			} else if (entityname.endsWith(suffix)) {
				linkEntitys.add(EntityMapMgr.getEMap(entityname));
			}  
		}
		return linkEntitys;
	}
	
	/**
	 * Writes a full list of loaded EntityMap names to the log file.
	 */
	public static void logEntities() {
		
		Set<String> keyset = _entitymaps.keySet();
		Iterator<String> keys = keyset.iterator();
		Logger.info("--- EntityMapManager Entity Listing ---");
		while (keys.hasNext()) {
			String key = keys.next();
			Logger.info(key + " (has map: " + hasMap(key) + ")");
		}
	}
}
