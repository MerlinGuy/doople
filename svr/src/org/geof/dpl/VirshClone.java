package org.geof.dpl;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;

import org.geof.log.Logger;
import org.libvirt.*;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

public class VirshClone {

	public final static String BLOCKED = "VIR_DOMAIN_BLOCKED";
	public final static String CRASHED = "VIR_DOMAIN_CRASHED"; 
    public final static String NOSTATE = "VIR_DOMAIN_NOSTATE";
    public final static String PAUSED = "VIR_DOMAIN_PAUSED"; 
    public final static String RUNNING = "VIR_DOMAIN_RUNNING";
    public final static String SHUTDOWN = "VIR_DOMAIN_SHUTDOWN";
    public final static String SHUTOFF = "VIR_DOMAIN_SHUTOFF";
    
	public final static String DEFAULT_CONN = "qemu:///system";
	
	String _conn_str = null;
	Connect _conn;
	
	public VirshClone ( String conn_str) {
		_conn_str = conn_str; 
	}
	public VirshClone ( ) {
		this(DEFAULT_CONN); 
	}
		
	public boolean open() {
        try {
			_conn = new Connect(_conn_str);
			return true;
		} catch (LibvirtException e) {
			Logger.debug(e);
			return false;
		}
	}
	
	public boolean open(String conn_str) {
		_conn_str = (conn_str == null) ? DEFAULT_CONN : conn_str;
		return open();
	}
	
	public int close() {
		if (_conn != null) {
			try {
				return _conn.close();
			} catch (LibvirtException e) {
				return -1;
			}
		}
		return 0;
	}

	//---------------------------------
	public boolean define(String xmlpath, String name) {
	    try {
	        _conn.domainDefineXML(xmlpath);
	        return (this.get_domain(name) != null);
	    } catch(Exception e) {
	        return false;
	    }
	}
	
	//---------------------------------
	public boolean undefine(String name) {
	    try {
	        Domain domain = this.get_domain(name);
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
	            domain = this.get_domain(name);
	            if (domain == null) {
	                return true;
	            }
	        }
	    } catch(Exception e) {
	       Logger.debug( "Could not unpublic define domain "+ name + " due to: " +  e.getMessage());
	    }
        return false;
	}
	
	//---------------------------------
	public boolean shutdown(String name) {
	    try {
	        Domain domain = this.get_domain(name);
	        if (domain == null) {
	            return true;
	        }

	        if (domain.getInfo().state == DomainInfo.DomainState.VIR_DOMAIN_SHUTOFF) {
	            return true ;
	        }
	        
	        domain.destroy();
	        domain = this.get_domain(name);
	        return (domain.getInfo().state == DomainInfo.DomainState.VIR_DOMAIN_SHUTOFF);
	            
	    } catch(Exception e) {
	       Logger.debug( e.getMessage());
	        return false;
	    }
	}
	
	
	//---------------------------------
	public boolean start(String name) {
	    try {
	        Domain domain = this.get_domain(name);         
	        domain.create();
	        return (domain.getInfo().state == DomainInfo.DomainState.VIR_DOMAIN_RUNNING);
	    } catch(Exception e){
	        return false;
	    }
	}
	
	//---------------------------------
	public int get_domain_state(String name) throws LibvirtException {
	    Domain domain = this.get_domain(name);
	    if (domain == null) {
	        return -1;
	    } else {
	        return domain.getInfo().state.ordinal();
	    }
	}
	
	//--------------------------------
	public Domain get_domain(String name) {
	    try { 
	        return _conn.domainLookupByName(name)  ;    
	    } catch(Exception e) {
	       return null;
	    }
	}
	    
	//---------------------------------
	public DomainData get_image_info(String name) {
		
		DomainData dd = new DomainData(name);
		try {			
			Domain domain = this.get_domain(name);
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
				dd.error = e.getMessage();
			} catch (Exception eo){}
		}
		return dd;
	}
		
	
	//---------------------------------
	public boolean write_new_xml(String filename, String contents) {
	    try {
	    	BufferedWriter out = new BufferedWriter(new FileWriter(filename));
		    out.write(contents);
	        out.close();
	        return true; 
	    } catch(Exception e) {
	        return false;
	    }
	}   
	           
	//---------------------------------
	public String makeTargetDir(String directory) {
		File file = new File(directory);
	    if (file.exists()) {
	        return "File exists";
	    } else {
	        file.mkdir();
	        return null;
	    }
	}
	
	//---------------------------------
	public String randomMAC() {
	    Random rand = new Random();
	    return "52:54:00:" 
	    	+ Integer.toHexString(rand.nextInt(0xFF))
	      	+ ":" + Integer.toHexString(rand.nextInt(0xFF))
	      	+ ":" + Integer.toHexString(rand.nextInt(0xFF)); 
	}	
	
	//---------------------------------
	public Integer[] list_domains(String state) throws Exception {
		
		List<Integer> ids = new ArrayList<Integer>();
		for ( int id : _conn.listDomains()) {
			Domain domain = _conn.domainLookupByID(id);
			DomainInfo di = domain.getInfo();
			System.out.println(domain.getName() + " : " + di.state);
			if (state == null || di.state.toString().compareTo(state) == -1) {
				ids.add(id);
			}
		}
	    return ids.toArray(new Integer[ids.size()]) ;      
	}

	public String getDomainName(int id) throws LibvirtException {
		Domain domain = _conn.domainLookupByID(id);
		return domain.getName();
	}
}
