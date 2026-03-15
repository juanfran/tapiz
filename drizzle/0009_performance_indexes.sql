-- Performance-Indizes für häufige Query-Patterns bei 50+ parallelen Benutzern

-- accounts_boards: Lookup nach boardId (getBoardUsers, getBoardAdmins, deleteBoard)
CREATE INDEX IF NOT EXISTS idx_accounts_boards_board_id ON accounts_boards (board_id);

-- accounts_boards: Lookup nach role pro Board (getBoardAdmins)
CREATE INDEX IF NOT EXISTS idx_accounts_boards_board_role ON accounts_boards (board_id, role);

-- starreds: Lookup nach boardId (deleteBoard, getBoards-Join)
CREATE INDEX IF NOT EXISTS idx_starreds_board_id ON starreds (board_id);

-- team_members: Lookup nach teamId + role (getTeamAdmins, getTeamMembers)
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members (team_id);

-- boards: Lookup nach teamId (getBoardsByTeam, getBoards)
CREATE INDEX IF NOT EXISTS idx_boards_team_id ON boards (team_id);

-- board_files: Lookup nach boardId (getBoardFiles, deleteBoard)
CREATE INDEX IF NOT EXISTS idx_board_files_board_id ON board_files (board_id);

-- notifications: Lookup nach userId (getNotifications)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);

-- account_session: Lookup nach userId + expiresAt (session validation)
CREATE INDEX IF NOT EXISTS idx_session_user_id ON account_session (user_id, expires_at);
