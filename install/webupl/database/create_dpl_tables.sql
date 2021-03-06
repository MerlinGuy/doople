\connect dopple;

---------------------------------------------------------
--DROP TABLE domain;
-- Table holds Virtual Machine info

CREATE TABLE domain
(
	id 			serial NOT NULL,
	name 		character varying(255) NOT NULL,
 	notes 		character varying(4000),
 	xmlpath		character varying(512) NOT NULL,
 	statusid 	smallint,
 	domaintype	smallint,
	createdate	timestamp without time zone,
	ipaddress	character varying(64),
	CONSTRAINT 	domain_pkey PRIMARY KEY (id),
	CONSTRAINT	domain_unq_name UNIQUE (name)
)
WITH (OIDS=FALSE);
ALTER TABLE domain OWNER TO dpladmin;

---------------------------------------------------------
--DROP TABLE image;
-- Table holds image file information

CREATE TABLE image
(
	id 				serial NOT NULL,
	name 			character varying(255) NOT NULL,
	storageloc_id 	integer,
	createdate		timestamp without time zone,
	CONSTRAINT 		image_pkey PRIMARY KEY (id)
)
WITH (OIDS=FALSE);
ALTER TABLE image OWNER TO dpladmin;

---------------------------------------------------------
-- Table: domain_image
-- DROP TABLE domain_image;

CREATE TABLE domain_image
(
	domainid	integer,
	imageid		integer,
	createdate	timestamp without time zone,
	CONSTRAINT 	domain_image PRIMARY KEY (domainid, imageid)
)
WITH (OIDS=FALSE);
ALTER TABLE domain_image OWNER TO dpladmin;


---------------------------------------------------------
-- Table: buildplan
-- DROP TABLE buildplan;

CREATE TABLE buildplan
(
	id 			serial NOT NULL,
	domainid	integer,
	baseip		character varying(16) NOT NULL,
	antcmd		character varying(512) NOT NULL,
	imgcfg		character varying(4000) NOT NULL, -- replaces image_changes.cfg
	createdate	timestamp without time zone,
	CONSTRAINT 	buildplan PRIMARY KEY (id)
)
WITH (OIDS=FALSE);
ALTER TABLE buildplan OWNER TO dpladmin;


---------------------------------------------------------
-- Table: buildplan_file
-- DROP TABLE buildplan_file;
-- file types (build.xml, image upload, domain rcps )

CREATE TABLE buildplan_file
(
	buildplanid		integer,
	fileid			integer,
	filetype		smallint,
	directory		character varying(512) NOT NULL,
	createdate		timestamp without time zone,
	CONSTRAINT 		buildplan_file PRIMARY KEY (buildplanid, fileid)
)
WITH (OIDS=FALSE);
ALTER TABLE buildplan_file OWNER TO dpladmin;

---------------------------------------------------------
--DROP TABLE macip;
-- Table holds mac address and ip information

CREATE TABLE macip
(
	id 			serial NOT NULL,
	ipaddress 	integer NOT NULL,
	macaddress 	character varying(32) NOT NULL,
	domainid 	integer,
	CONSTRAINT 	macip_pkey PRIMARY KEY (id),
	CONSTRAINT 	macip_unq_ip UNIQUE (ipaddress)
)
WITH (OIDS=FALSE);
ALTER TABLE macip OWNER TO dpladmin;
