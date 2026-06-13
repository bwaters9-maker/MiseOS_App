import { MessageSquare } from 'lucide-react';

export default function CommentThread({ comments = [] }) {
  return (
    <div className="mise-card space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-[var(--primary)]" />
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Collaboration Feed</h3>
      </div>
      {comments.length === 0 ? (
        <p className="text-sm text-[var(--muted)] italic">No revisions yet. Start the conversation.</p>
      ) : (
        comments.map(c => (
          <div key={c.id} className="p-3 bg-[var(--row)] rounded-lg border border-[var(--border)]">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span>{c.user_name}</span>
              <span className="text-[var(--muted)]">{new Date(c.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm">{c.text}</p>
          </div>
        ))
      )}
    </div>
  );
}