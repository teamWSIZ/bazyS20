create table if not exists v2.elections
(
	electionid serial not null
		constraint elections_pkey
			primary key,
	title text,
	votebegin timestamp,
	voteend timestamp
);

alter table v2.elections owner to student;

create table if not exists v2.registrations
(
	userid text,
	electionid integer
		constraint registrations_electionid_fkey
			references v2.elections
				on delete cascade,
	constraint user_election_unique
		unique (userid, electionid)
);

alter table v2.registrations owner to student;

create table if not exists v2.tokens
(
	electionid integer
		constraint tokens_electionid_fkey
			references v2.elections
				on delete cascade,
	token text not null
		constraint tokens_token_key
			unique
);

alter table v2.tokens owner to student;

create table if not exists v2.choices
(
	choiceid serial not null
		constraint choices_pkey
			primary key,
	electionid integer
		constraint choices_electionid_fkey
			references v2.elections
				on delete cascade,
	title text not null,
	description text,
	url text
);

alter table v2.choices owner to student;

create table if not exists v2.votes
(
	voteid serial not null
		constraint votes_pkey
			primary key,
	electionid integer
		constraint votes_electionid_fkey
			references v2.elections
				on delete cascade,
	choiceid integer
		constraint votes_choiceid_fkey
			references v2.choices,
	value integer default 0
);

alter table v2.votes owner to student;

