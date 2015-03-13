package org.geof.dpl.mgr;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.geof.dpl.DomainData;
import org.geof.log.Logger;
import org.geof.prop.GlobalProp;
import org.libvirt.Connect;
import org.libvirt.Domain;
import org.libvirt.DomainInfo;
import org.libvirt.LibvirtException;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

public class DomainMgr {

	public final static String BLOCKED = "VIR_DOMAIN_BLOCKED";
	public final static String CRASHED = "VIR_DOMAIN_CRASHED"; 
    public final static String NOSTATE = "VIR_DOMAIN_NOSTATE";
    public final static String PAUSED = "VIR_DOMAIN_PAUSED"; 
    public final static String RUNNING = "VIR_DOMAIN_RUNNING";
    public final static String SHUTDOWN = "VIR_DOMAIN_SHUTDOWN";
    public final static String SHUTOFF = "VIR_DOMAIN_SHUTOFF";
    
	public final static String DEFAULT_CONN = "qemu:///system";
	
	
	private String _conn_str = null;
	private Connect _conn;
	private String _remote_svr = null;
	
	private String _error = null;
	
	public DomainMgr ( ) {	
		this(null);
	}
	
	public DomainMgr (String conn_string) {
		connect(conn_string);
	}
		
	
	public boolean connect(String conn_string) {
		_conn_str = conn_string;
		if (_conn_str == null) {
			_conn_str = GlobalProp.instance().get("libvirt_conn", DEFAULT_CONN);
		}
		if (_conn_str.indexOf("///") == -1) {
			int indx = _conn_str.indexOf("//");
			_remote_svr = _conn_str.substring(indx, _conn_str.indexOf("/", indx + 2)); 
		}
//		if (is_remote_host) {
//			libvirt_conn = _data.optString("qemu", "qemu+tls") + "://"
//					+ qemu_svr + "/system";
//		}


		if (_conn != null) {
			this.dispose();
		}
        try {
			_conn = new Connect(_conn_str);
			return true;
		} catch (LibvirtException e) {
			setError( e.getMessage());
			_conn = null;
		}
        return false;
	}
	
	public boolean isRemoteSvr() {
		return _remote_svr != null;
	}
	
	public String getRemoveSvr() {
		return _remote_svr;
	}
	/**
	 * 
	 * @return
	 */
	public int dispose() {
		int rtn = 0;
		if (_conn != null) {
			try {
				rtn = _conn.close();
			} catch (LibvirtException e) {
				rtn = -1;
				setError(e.getMessage());
			}
			_conn = null;
		}
		return rtn;
	}
	
	/**
	 * 
	 * @param xmlpath
	 * @param name
	 * @return
	 */
	public boolean define(String xmlpath, String name) {
	    try {
	        _conn.domainDefineXML(xmlpath);
	        return (this.getDomain(name) != null);
	    } catch(Exception e) {
	        return false;
	    }
	}
	
	/**
	 * 
	 * @param name
	 * @return
	 */
	public boolean undefine(String name) {
	    try {
	        Domain domain = this.getDomain(name);
	        if (domain == null){
	            return true;
	        }
	        else {
	            if (domain.getInfo().state == DomainInfo.DomainState.VIR_DOMAIN_RUNNING) {
	                if (! this.shutdown(name) ) {
	                    return false;
	                }
	            }
	                
	            domain.undefine();
	            domain = this.getDomain(name);
	            if (domain == null) {
	                return true;
	            }
	        }
	    } catch(Exception e) {
	       setError( "Could not undefine domain "+ name + " due to: " +  e.getMessage());
	    }
        return false;
	}
	
	/**
	 * 
	 * @param name
	 * @return
	 */
	public boolean shutdown(String name) {
	    try {
	        Domain domain = this.getDomain(name);
	        if (domain == null) {
	            return true;
	        }

	        if (domain.getInfo().state == DomainInfo.DomainState.VIR_DOMAIN_SHUTOFF) {
	            return true ;
	        }
	        
	        domain.destroy();
	        domain = this.getDomain(name);
	        return (domain.getInfo().state == DomainInfo.DomainState.VIR_DOMAIN_SHUTOFF);
	            
	    } catch(Exception e) {
	    	setError( e.getMessage());
	        return false;
	    }
	}
		
	/**
	 * 
	 * @param name
	 * @return
	 */
	public boolean start(String name) {
	    try {
	        Domain domain = this.getDomain(name);         
	        domain.create();
	        return (domain.getInfo().state == DomainInfo.DomainState.VIR_DOMAIN_RUNNING);
	    } catch(Exception e){
	    	setError( e.getMessage());
	        return false;
	    }
	}
	
	/**
	 * 
	 * @param name
	 * @return
	 * @throws LibvirtException
	 */
	public int getDomainState(String name) throws LibvirtException {
	    Domain domain = this.getDomain(name);
	    if (domain == null) {
	        return -1;
	    } else {
	        return domain.getInfo().state.ordinal();
	    }
	}
	
	/**
	 * 
	 * @param name
	 * @return
	 */
	public Domain getDomain(String name) {
	    try { 
	        return _conn.domainLookupByName(name)  ;    
	    } catch(Exception e) {
	       return null;
	    }
	}
	    
	public List<Domain> getDomains() throws Exception {
		
		List<Domain> domains = new ArrayList<Domain>();
		for ( int id : _conn.listDomains()) {
			domains.add( _conn.domainLookupByID(id));
		}
	    return domains;      
	}
	
	/**
	 * 
	 * @param id
	 * @return
	 * @throws LibvirtException
	 */
	public Domain getDomainById(int id) throws LibvirtException {
		return _conn.domainLookupByID(id);
	}

	/**
	 * 
	 * @param state
	 * @return
	 * @throws Exception
	 */
	public Integer[] getDomainIdsByState(String state) throws Exception {
		
		List<Domain> domains = getDomainsByState( state );
		int count = domains.size();
		Integer[] ids = new Integer[count];
		
		for ( int indx=0; indx < count; indx++) {
			ids[indx] = domains.get(indx).getID();
		}
	    return ids;      
	}

	/**
	 * 
	 * @param state
	 * @return
	 * @throws Exception
	 */
	public List<Domain> getDomainsByState(String state) throws Exception {
		
		List<Domain> domains = new ArrayList<Domain>();
		for ( int id : _conn.listDomains()) {
			Domain domain = _conn.domainLookupByID(id);
			DomainInfo di = domain.getInfo();
			if (state == null || di.state.toString().compareTo(state) == -1) {
				domains.add(domain);
			}
		}
	    return domains;      
	}
	
	/**
	 * 
	 * @param state
	 * @return
	 * @throws Exception
	 */
	public List<Domain> getDomainsByState(int stateid) throws Exception {
		
		List<Domain> domains = new ArrayList<Domain>();
		for ( int id : _conn.listDomains()) {
			Domain domain = _conn.domainLookupByID(id);
			DomainInfo di = domain.getInfo();
			if (di.state.ordinal() == stateid) {
				domains.add(domain);
			}
		}
	    return domains;      
	}
	
	/**
	 * 
	 * @param name
	 * @return
	 */
	public DomainData getDomainInfo(String name) {
		
		DomainData dd = new DomainData(name);
		try {			
			Domain domain = this.getDomain(name);
			if (domain == null) {
			    return null;
			}
			String raw_xml = domain.getXMLDesc(0);
			dd.setXmlStr( raw_xml);
			XPath xpath = XPathFactory.newInstance().newXPath();
			InputSource iSrc = new InputSource(new StringReader(raw_xml));

			String exp = "//devices/disk/source";
			iSrc = new InputSource(new StringReader(raw_xml));
			NodeList nodes = (NodeList) xpath.evaluate(exp, iSrc, XPathConstants.NODESET);
			for (int indx=0;indx<nodes.getLength();indx++) {
				Node currentItem = nodes.item(indx);
				Node filename = currentItem.getAttributes().getNamedItem("file");
			    dd.addFile( filename.getNodeValue() );
			}
			
		} catch (Exception e) {
			try {
				setError( e.getMessage());
				dd.error = _error;
			} catch (Exception eo){}
		}
		return dd;
	}
			
	/**
	 * 
	 * @param filename
	 * @param contents
	 * @return
	 */
	public boolean writeNewXml(String filename, String contents) {
	    try {
	    	BufferedWriter out = new BufferedWriter(new FileWriter(filename));
		    out.write(contents);
	        out.close();
	        return true; 
	    } catch(Exception e) {
	        return false;
	    }
	}   
	           
	/**
	 * 
	 * @return
	 */
	public String randomMAC() {
	    Random rand = new Random();
	    String mac_base = GlobalProp.instance().get("mac_base");
	    return mac_base  + ":" 
	    	+ Integer.toHexString(rand.nextInt(0xFF))
	      	+ ":" + Integer.toHexString(rand.nextInt(0xFF))
	      	+ ":" + Integer.toHexString(rand.nextInt(0xFF)); 
	}	
	
	/**
	 * 
	 * @return
	 */
	public String getError() {
		String rtn = "";
		if (_error != null) {
			rtn = _error;
			_error = null;
		}
		return rtn;
				
	}

	/**
	 * 
	 * @return
	 */
	public boolean hasError () {
		return _error != null;
	}
	
	private void setError (String error) {
		Logger.debug(error);
		_error = error;
	}
	
}
