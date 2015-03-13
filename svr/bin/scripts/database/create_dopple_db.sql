
DROP database dopple;
DROP USER dpladmin;

CREATE USER dpladmin WITH PASSWORD 'dpl_1408';
CREATE DATABASE dopple OWNER dpladmin;

\connect dopple;
\i ./create_dopple_tables.sql
