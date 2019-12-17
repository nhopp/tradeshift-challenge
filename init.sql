create table node(
  id SERIAL PRIMARY KEY,
  parent_id integer REFERENCES node(id)
);