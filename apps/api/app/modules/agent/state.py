from langgraph.graph import MessagesState


class ChatState(MessagesState):
    """Graph state — bản đầu chỉ có `messages` (kế thừa MessagesState).

    Mở rộng sau khi thêm tool/approval-gate (ADR-0005): thêm field ở đây,
    KHÔNG đổi cách dùng `messages` (add_messages reducer đã xử lý append đúng).
    """
