
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS board (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR (255) NOT NULL,
  board json NOT NULL,
  created_on TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_board (
  account_id VARCHAR (255),
  board_id uuid NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  is_owner boolean DEFAULT false,
  visible boolean DEFAULT false,
  PRIMARY KEY (account_id, board_id)
);