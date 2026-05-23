import React from 'react';
import { User, Bot } from 'lucide-react';
import ReactRunner from './ReactRunner';
import PythonRunner from './PythonRunner';

interface MessageBubbleProps {
  message: {
    role: string;
    content: string | any;
    type?: string;
    showContinue?: boolean;
  };
  onContinue?: () => void;
}

const MessageBubble = ({ message, onContinue }: MessageBubbleProps) => {
  const { role, content, type, showContinue } = message;
  const isUser = role === 'user';
  
  // Check if content is a code object (from LangGraph or similar)
  const isCode = typeof content === 'object' && content !== null && content.type === 'code';

  return (
    <div className={`flex items-start gap-3 p-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-indigo-600' : 'bg-gray-700'
      }`}>
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
      </div>
      
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className="text-xs text-gray-400 mb-1 ml-1">
          {isUser ? 'You' : 'Pelada'}
        </div>
        
        <div className={`rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-lg ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-tr-none' 
            : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
        }`}>
          {isCode ? (
            content.lang === 'jsx' || content.lang === 'react' ? (
              <ReactRunner code={content.code} />
            ) : content.lang === 'python' ? (
              <PythonRunner code={content.code} />
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(content, null, 2)}</pre>
            )
          ) : (
            <div className="whitespace-pre-wrap">{typeof content === 'string' ? content : JSON.stringify(content)}</div>
          )}

          {showContinue && (
            <button 
              onClick={onContinue}
              className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors shadow-md"
            >
              Continue Execution
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;