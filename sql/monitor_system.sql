create schema adadasdasdwer;
set search_path to adadasdasdwer;

-- userid can be some company's internal ID (so a link to more personal data, RODO etc),or
-- just a phone number; alias can accomodate extra data (e.g. json with user data
-- to be deserialized in backend service)
create table users(
    userid text primary key,
    alias text
);

-- these are the bluetooth devices;
-- note -- some can be stronger, other weaker; their signal must be standarized by dividing
-- by some "strength" number; on creating the device, the number can be measured easily
-- (e.g. signal strength 1m away from standard receiver)
create table devices(
    deviceid text primary key,
    strength double precision
);

--assignment of devices to users;
--note: many-to-many relation; 1 user can have e.g. 2 devices (smartband or company token),
--1 device can have many users (e.g. visitors will be given a device for 1 day only, which they
--return upon leaving company's premisses)
create table userdevices(
    userid text references users(userid) on delete cascade,
    deviceid text references devices(deviceid) on delete cascade
);

alter table userdevices add constraint unique_u_d unique(userid,deviceid);

-- these are PC's monitoring nearby devices;
-- each can have one "tag" which will group them together
-- note: some monitors can be more sensitive than others; their signal must therefore
-- be divided by a factor, which can be measured (e.g. 1m away from a device of known strength)
create table monitor(
    monitorid SERIAL primary key,
    name text,
    tag text,
    sensitivity double precision
);

-- data on device presence will be gathered here; very many rows to be expected...
create table results (
    resultid SERIAL primary key,
    monitorid int references monitor(monitorid),
    deviceid text references devices(deviceid),
    timestamp_epoch int,
    rssi double precision
);
create index i_m on results(monitorid);
create index i_d on results(deviceid);
create index i_ts on results(timestamp_epoch);

-- campuses are groups of 'tags', which are groups of monitors
-- eg. campus_name='BB safe', or 'BB danger'; few rows e.g. tag='bb_building_1', 'bb_building_2'
create table campuses (
    campus_name text primary key,
    tag text,
    constraint uq unique(campus_name,tag)
);

