
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS board (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR (255) NOT NULL,
  board json NOT NULL,
  created_on TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE account (
  id VARCHAR (255) PRIMARY KEY ,
  name VARCHAR (255) NOT NULL
);

CREATE TABLE account_board (
  account_id VARCHAR (255) NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  is_owner boolean DEFAULT false,
  visible boolean DEFAULT false,
  PRIMARY KEY (account_id, board_id)
);
