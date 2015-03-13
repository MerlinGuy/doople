package org.geof.util;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.geof.log.Logger;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.EntityResolver;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

public class XMLReader {

	Document _doc = null;

	private XMLReader(File file) {
		try {
			DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
			DocumentBuilder db = dbf.newDocumentBuilder();
			_doc = db.parse(file);
			_doc.getDocumentElement().normalize();

		} catch (Exception e) {
			Logger.error(e);
		}
	}

	private XMLReader(InputStream stream) throws SAXException, IOException, ParserConfigurationException {
		try {

			DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();

			dbf.setValidating(false);
			dbf.setIgnoringComments(false);
			dbf.setIgnoringElementContentWhitespace(true);
			dbf.setNamespaceAware(true);
			DocumentBuilder db = null;
			db = dbf.newDocumentBuilder();
			db.setEntityResolver(new NullResolver());
			_doc = db.parse(stream);
			_doc.getDocumentElement().normalize();

		} catch (Exception e) {
			Logger.error(e);
		}
	}

	public static XMLReader getXMLReader(File file) {
		return new XMLReader(file);
	}

	public static XMLReader create(InputStream stream) {
		try {
			return new XMLReader(stream);
		} catch (Exception e) {
			Logger.error(e);
		}
		return null;
	}

	public NodeList getNodeList(Element ele, String name) {
		return ele.getElementsByTagName(name);
	}

	public NodeList getNodeList(String name) {
		return _doc.getElementsByTagName(name);
	}

	public Element getFirstElement(String nodeName) {
		NodeList nl = _doc.getElementsByTagName(nodeName);
		if (nl.getLength() > 0) {
			if (nl.item(0).getNodeType() == Node.ELEMENT_NODE) {
				return (Element) nl.item(0);
			}
		}
		return null;
	}

	public Element getFirstElement(Element ele, String nodeName) {
		NodeList nl = getNodeList(ele, nodeName);
		if (nl.getLength() > 0) {
			if (nl.item(0).getNodeType() == Node.ELEMENT_NODE) {
				return (Element) nl.item(0);
			}
		}
		return null;
	}

	public String getFirstElementText(Element ele, String nodeName) {
		NodeList nl = getNodeList(ele, nodeName);
		if (nl.getLength() > 0) {
			if (nl.item(0).getNodeType() == Node.ELEMENT_NODE) {
				Element enode = (Element) nl.item(0);
				return enode.getTextContent();
			} else {
				return null;
			}
		}
		return null;
	}

	public NodeList getChildren(Element element) {
		return element.getChildNodes();
	}
	
	
	//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	class NullResolver implements EntityResolver {
		  public InputSource resolveEntity(String publicId, String systemId) throws SAXException,
		      IOException {
		    return new InputSource(new StringReader(""));
		  }
		}

}
