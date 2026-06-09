export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  parent_msg_id: number | null;
  branch_from_message_id: number | null;
  branch_from_text: string | null;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  main_leaf_id: number | null;
}

export interface BranchPanel {
  trunkLeafId: number;
  trunkBranchPointId: number | null;
  branchLeafId: number;
  branchPointId: number;
  input: string;
  branchFromText: string | null;
  hasStarted: boolean;
}

export interface SendMessageResponse {
  user_message: Message;
  ai_message: Message;
}

export interface User {
  id: number;
  email: string;
  username: string;
}
