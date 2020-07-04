drop table cities;
create table cities
(
	id serial not null
		constraint nodes_pkey
			primary key,
	pid integer default 0,
	name text default ''::text,
	pop double precision default 1,
	leaf boolean default true,
	x double precision default 0.0,
	y double precision default 0.0
);



