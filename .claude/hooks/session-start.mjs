#!/usr/bin/env node
// SessionStart hook — soft nudge only, never blocks. Emits additionalContext so the rule
// "spec trước, code sau" (AGENTS.md rule 2/3) stays sticky across sessions instead of depending
// on the model remembering it. See docs/features/_template.md, .claude/skills/feature-spec/SKILL.md.

const context = `Đầu session này trong Ultron — trước khi làm việc, nhớ:

1. Đọc \`docs/roadmap/README.md\` (mục "Tầm nhìn sản phẩm") trước để biết đang ở đâu.
2. Task KHÔNG nhỏ (feature mới, UI surface mới, đổi kiến trúc/mô hình lưu trữ, module mới):
   kiểm tra \`docs/features/<slug>.md\` đã tồn tại chưa — chưa có thì viết trước (skill
   \`feature-spec\` / \`/spec\`), dùng Plan Mode để bàn Goals/Non-goals với user, đợi spec ở
   trạng thái "accepted" rồi mới code.
3. Task nhỏ (fix bug, sửa 1-2 file, không đổi hành vi lưu trữ/kiến trúc): code thẳng, chạy
   \`/check\` trước khi báo xong.
4. Quyết định kiến trúc thật (đổi ORM/DB/thư viện lớn, đổi cách agent gọi nhau, thêm entity mới)
   → ADR trước khi code (\`docs/adr/_template.md\`, skill \`adr-writer\` / \`/new-adr\`), không code
   trước rồi giải thích sau.
5. Đụng UI \`apps/web\`: đọc \`docs/conventions/09-ui-visual-design.md\` trước — Ultron theo
   Soft Glass Workspace Console, chat-first AI workspace, không generic admin dashboard.

Iron law: có skill/subagent cho việc gì thì dùng nó, không tự làm tay lặp lại quy tắc đã có.`;

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: context,
  },
}));
