package org.geof.dpl;

import java.util.ArrayList;
import java.util.List;

public class DomainData {
	public String name = null;
	public List<String> files = new ArrayList<String>();
	public String xml_str = null;
	public String error = null;
	
	public DomainData(String name) {
		this.name = name;
	}
	
	public void addFile(String filepath) {
		files.add(filepath);
	}
	
	public void setXmlStr(String xmlstr) {
		xml_str = xmlstr;
	}
	
	public String getDomainDirectory() {
		if (files == null || files.size() < 1) {
			return null;
		}
		String file = files.get(0);
		String dir = name + "/";
		int indx = file.indexOf(dir);
		if (indx == -1) {
			return null;
		}
		return file.substring(0, indx + dir.length());
	}
}
