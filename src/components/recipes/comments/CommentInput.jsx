import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

export default function CommentInput({ onSend }) {
  const [text, setText] = useState('');

  return (
    <div className="mise-card mt-4">
      <Textarea 
        value={text} 
        onChange={e => setText(e.target.value)} 
        placeholder="Leave feedback or revision notes..."
        className="mb-2"
      />
      <Button onClick={() => { onSend(text); setText(''); }} className="w-full">
        <Send size={14} className="mr-2" /> Post Revision Note
      </Button>
    </div>
  );
}