package org.geof.dpl;

import java.io.ByteArrayInputStream;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathFactory;

import org.w3c.dom.Document;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;


public class NewDomain {

	public String name = null;
	public List<ImageFile> imgFiles = new ArrayList<ImageFile>();
	public DomainData domainData = null;
	public String host_image_dir = null;
	public String work_dir = null;
	public String xml_path = null;
	public String host_domain_dir = null;
	public int index = 0;
	public String error = null;
	public boolean useLocalFiles = false;
	
	public NewDomain(String name, String host_image_dir, String work_dir) {
		this.name = name;
		this.host_image_dir = host_image_dir;
		if (this.host_image_dir.lastIndexOf("/") != this.host_image_dir.length() -1) {
			this.host_image_dir += "/";
		}
		this.host_domain_dir = host_image_dir + name + "/";
		this.xml_path =  this.host_domain_dir + name + ".xml";
		this.work_dir = work_dir;
		if (work_dir != null && work_dir.lastIndexOf("/") != work_dir.length() -1) {
			this.work_dir += "/";
		}
	}
	
	public boolean setImages(DomainData dd, List<String> local_images) {
		this.domainData = dd;
		List<String> src_files = null;
		if ( local_images != null ) {
			useLocalFiles = true;
			src_files = local_images;
		} else {
			src_files = dd.files;			
		}
		if (src_files == null || src_files.size() == 0) {
			error = "No files specified for NewDomain.setImages";
			return false;
		}
		
		String file = src_files.get(0);
		String ext = file.substring(file.lastIndexOf("."));
		
		for (String src_img : src_files) {
			String image_name = name + "_" + index++ + ext;
			String host_image = this.host_domain_dir + image_name;
			String work_img = null;
			if (this.work_dir != null) {
				work_img = work_dir + image_name;
			}
			imgFiles.add(new ImageFile(useLocalFiles, src_img, host_image, work_img));
		}
		return true;
	}
	
	//---------------------------------
	public HashMap<String, String> getXmlParams( String macaddress) {
	    try {
	    	HashMap<String,String> params = new HashMap<String,String>();
	    	params.put("/domain/name", this.name);
	    	params.put("//uuid", java.util.UUID.randomUUID().toString());
	    	params.put("//devices/interface/mac[@address]", macaddress);
			
			String file = "//devices/disk/source[@file=\"";
			String exp;
			int indx = 0;
			for (ImageFile imgF : imgFiles) {				
				exp = file + this.domainData.files.get(indx++) + "\"]";
		    	params.put(exp, imgF.host_image);
			}
			
			return params;
		} catch (Exception e) {
			error = e.getMessage();
			return null;
		}
	}

	//---------------------------------
	public String getImageXml(String raw_xml, String macAddress) {
		try {
			HashMap<String,String> params = getXmlParams(macAddress);
			if (params == null) {
				return null;
			}
			DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
			DocumentBuilder docBuilder = docFactory.newDocumentBuilder();
			Document doc = docBuilder.parse(new ByteArrayInputStream(raw_xml.getBytes("UTF-8")));
			XPath xpath = XPathFactory.newInstance().newXPath();

			String text;
			XPathExpression exp;
			NodeList nl;
			Node node;
			for (String path : params.keySet()) {
				text = params.get(path);
				exp = xpath.compile(path);
				nl = (NodeList)exp.evaluate(doc, XPathConstants.NODESET);
				node = nl.item(0);
				if (node == null) {
					error = "NewDomain.getImageXml xpath returned null for " + path;
					return null;
				}
				int indx = path.indexOf('@');
				if (indx > -1) {
					String key = path.substring(indx + 1);
					indx = key.indexOf("="); 
					if (indx == -1) {
						indx = key.indexOf("]"); 
					}
					if (indx > -1) {
						key = key.substring(0,indx);	
						NamedNodeMap nnm = node.getAttributes();
						nnm.getNamedItem(key).setNodeValue(text);
					}
				} else {
					node.setTextContent(text);
				}
			}
			Transformer transformer = TransformerFactory.newInstance().newTransformer();
			StreamResult result = new StreamResult(new StringWriter());
			DOMSource source = new DOMSource(doc);
			transformer.transform(source, result);
			return result.getWriter().toString();
		} catch (Exception e) {
			e.printStackTrace();
			error = e.getMessage();
			return null;
		}
 	}
	

}
