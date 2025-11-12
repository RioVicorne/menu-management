"use client";

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  User,
  Bot,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

type TextBlock =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'table'; title?: string; items: string[] };

const ensureListLineBreaks = (text: string) => {
  if (!text) {
    return '';
  }

  let normalized = text.replace(/\r\n/g, '\n');
  normalized = normalized.replace(/(\s+)(\d+\.\s+)/g, (_match, spaces: string, item: string) => {
    return spaces.includes('\n') ? `${spaces}${item}` : `\n${item}`;
  });
  normalized = normalized.replace(/(\s+)(•\s+)/g, (_match, spaces: string, item: string) => {
    return spaces.includes('\n') ? `${spaces}${item}` : `\n${item}`;
  });
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  normalized = normalized.replace(/^\n+/, '');

  return normalized.trim();
};

const convertParagraphToTable = (lines: string[]): TextBlock | null => {
  if (lines.length === 0) {
    return null;
  }

  const joined = lines.join(' ').replace(/\s+/g, ' ').trim();
  if (!joined.includes(':') || !joined.includes(',')) {
    return null;
  }

  const match = joined.match(/^(.{3,}?):\s*(.+)$/);
  if (!match) {
    return null;
  }

  const [, rawTitle, rawItems] = match;
  const items = rawItems
    .split(',')
    .map((item) => item.trim())
    .map((item) => item.replace(/\.$/, ''))
    .filter((item) => item.length > 0);

  if (items.length < 4) {
    return null;
  }

  const averageLength =
    items.reduce((total, item) => total + item.length, 0) / items.length;
  if (averageLength > 45) {
    return null;
  }

  const title = rawTitle.trim().replace(/\s+/g, ' ');

  return {
    type: 'table',
    title: title.length > 0 ? title : undefined,
    items,
  };
};

const splitIntoBlocks = (text: string): TextBlock[] => {
  if (!text?.trim()) {
    return [];
  }

  const normalized = ensureListLineBreaks(text);
  const rawLines = normalized.split('\n');

  const blocks: TextBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const tableBlock = convertParagraphToTable(paragraphLines);
    if (tableBlock) {
      blocks.push(tableBlock);
      paragraphLines = [];
      return;
    }

    const cleaned = paragraphLines.map((line) => line.trim()).filter((line) => line.length > 0);
    if (cleaned.length > 0) {
      blocks.push({ type: 'paragraph', lines: cleaned });
    }

    paragraphLines = [];
  };

  let index = 0;
  while (index < rawLines.length) {
    const line = rawLines[index]?.trim() ?? '';

    if (line.length === 0) {
      flushParagraph();
      index += 1;
      continue;
    }

    const orderedMatch = /^\d+[\.\)]\s+/.test(line);
    if (orderedMatch) {
      flushParagraph();
      const items: string[] = [];
      while (index < rawLines.length) {
        const current = rawLines[index]?.trim() ?? '';
        if (!/^\d+[\.\)]\s+/.test(current)) {
          break;
        }
        items.push(current.replace(/^\d+[\.\)]\s+/, '').trim());
        index += 1;
      }
      if (items.length > 0) {
        blocks.push({ type: 'ordered-list', items });
      }
      continue;
    }

    const unorderedMatch = /^[-*•+]\s+/.test(line);
    if (unorderedMatch) {
      flushParagraph();
      const items: string[] = [];
      while (index < rawLines.length) {
        const current = rawLines[index]?.trim() ?? '';
        if (!/^[-*•+]\s+/.test(current)) {
          break;
        }
        items.push(current.replace(/^[-*•+]\s+/, '').trim());
        index += 1;
      }
      if (items.length > 0) {
        blocks.push({ type: 'unordered-list', items });
      }
      continue;
    }

    paragraphLines.push(line);
    index += 1;
  }

  flushParagraph();
  return blocks;
};

const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
  if (!text) {
    return [''];
  }

  const nodes: ReactNode[] = [];
  let buffer = '';
  let i = 0;
  let tokenIndex = 0;

  const flushBuffer = () => {
    if (buffer.length > 0) {
      nodes.push(buffer);
      buffer = '';
    }
  };

  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flushBuffer();
        const content = text.slice(i + 2, end);
        const key = `${keyPrefix}-bold-${tokenIndex++}`;
        nodes.push(
          <strong key={key} className="font-semibold">
            {renderInline(content, `${key}-inner`)}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    if (text[i] === '*' && !text.startsWith('**', i)) {
      const end = text.indexOf('*', i + 1);
      if (end !== -1) {
        flushBuffer();
        const content = text.slice(i + 1, end);
        const key = `${keyPrefix}-italic-${tokenIndex++}`;
        nodes.push(
          <em key={key} className="italic">
            {renderInline(content, `${key}-inner`)}
          </em>,
        );
        i = end + 1;
        continue;
      }
    }

    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flushBuffer();
        const content = text.slice(i + 1, end);
        const key = `${keyPrefix}-code-${tokenIndex++}`;
        nodes.push(
          <code
            key={key}
            className="rounded bg-gray-200 px-1 py-0.5 font-mono text-xs text-gray-900 dark:bg-gray-700 dark:text-gray-100"
          >
            {content}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }

    buffer += text[i] ?? '';
    i += 1;
  }

  flushBuffer();
  return nodes;
};

const renderItemsAsTable = (
  items: string[],
  keyBase: string,
  options?: { showIndex?: boolean; caption?: string },
) => {
  const columns = items.length >= 12 ? 4 : items.length >= 8 ? 3 : 2;
  const rows = Math.ceil(items.length / columns);

  return (
    <div key={keyBase} className="space-y-2">
      {options?.caption && (
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {renderInline(
            options.caption.endsWith(':') ? options.caption : `${options.caption}:`,
            `${keyBase}-caption`,
          )}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full table-fixed border-collapse text-sm text-gray-900 dark:text-gray-100">
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr
                key={`${keyBase}-row-${rowIndex}`}
                className="divide-x divide-gray-200 dark:divide-gray-700"
              >
                {Array.from({ length: columns }, (_, colIndex) => {
                  const itemIndex = rowIndex * columns + colIndex;
                  const item = items[itemIndex];

                  return (
                    <td
                      key={`${keyBase}-cell-${rowIndex}-${colIndex}`}
                      className="border-t border-gray-200 px-3 py-2 align-top dark:border-gray-700"
                    >
                      {item ? (
                        <div className="flex items-start gap-2">
                          {options?.showIndex && (
                            <span className="font-medium text-gray-500 dark:text-gray-400">
                              {itemIndex + 1}.
                            </span>
                          )}
                          <span className="flex-1 leading-relaxed">
                            {renderInline(item, `${keyBase}-item-${itemIndex}`)}
                          </span>
                        </div>
                      ) : (
                        <span className="block">&nbsp;</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FormattedMessage = ({ text }: { text: string }) => {
  const blocks = useMemo(() => splitIntoBlocks(text), [text]);

  if (blocks.length === 0) {
    return (
      <div className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">
        {text}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-900 dark:text-gray-100">
      {blocks.map((block, blockIndex) => {
        const keyBase = `block-${blockIndex}`;

        if (block.type === 'ordered-list') {
          if (block.items.length >= 6) {
            return renderItemsAsTable(block.items, keyBase, { showIndex: true });
          }

          return (
            <ol
              key={keyBase}
              className="list-decimal space-y-1 pl-5 text-sm text-gray-900 marker:text-gray-500 dark:text-gray-100 dark:marker:text-gray-400"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${keyBase}-item-${itemIndex}`} className="leading-relaxed">
                  {renderInline(item, `${keyBase}-item-${itemIndex}`)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'unordered-list') {
          if (block.items.length >= 6) {
            return renderItemsAsTable(block.items, keyBase);
          }

          return (
            <ul
              key={keyBase}
              className="list-disc space-y-1 pl-5 text-sm text-gray-900 marker:text-gray-500 dark:text-gray-100 dark:marker:text-gray-400"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${keyBase}-item-${itemIndex}`} className="leading-relaxed">
                  {renderInline(item, `${keyBase}-item-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'table') {
          return renderItemsAsTable(block.items, keyBase, {
            caption: block.title,
          });
        }

        return (
          <div key={keyBase} className="space-y-2">
            {block.lines.map((line, lineIndex) => (
              <p key={`${keyBase}-line-${lineIndex}`} className="leading-relaxed">
                {renderInline(line, `${keyBase}-line-${lineIndex}`)}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
};

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
  onRegenerate?: () => void;
  onFeedback?: (type: 'like' | 'dislike') => void;
}

export default function ChatMessage({
  message,
  isTyping = false,
  onRegenerate,
  onFeedback,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(type);
    if (onFeedback) {
      onFeedback(type);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isTyping) {
    return (
      <div className="flex items-start space-x-2 lg:space-x-3 py-3 lg:py-4 px-3 lg:px-6 animate-fade-in">
        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Bot className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0 max-w-[85%] lg:max-w-3xl">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl lg:rounded-2xl rounded-tl-md p-3 lg:p-4 shadow-sm">
            <div className="flex space-x-1.5">
              <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.sender === 'user') {
    return (
      <div className="flex items-start space-x-2 lg:space-x-3 py-3 lg:py-4 px-3 lg:px-6 justify-end animate-fade-in">
        <div className="flex-1 min-w-0 max-w-[85%] lg:max-w-3xl flex flex-col items-end">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl lg:rounded-2xl rounded-tr-md p-3 lg:p-4 ml-auto shadow-lg hover:shadow-xl transition-shadow">
            <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
              {message.text}
            </div>
          </div>
          <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 mt-1 lg:mt-1.5 text-right px-1">
            {formatTime(message.timestamp)}
          </div>
        </div>
        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-2 lg:space-x-3 py-3 lg:py-4 px-3 lg:px-6 animate-fade-in group">
      <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
        <Bot className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%] lg:max-w-3xl">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl lg:rounded-2xl rounded-tl-md p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow">
          <FormattedMessage text={message.text} />
        </div>
        
        {/* AI Result Display */}
        {message.type === 'ai-result' && message.aiData && (
          <div className="mt-2 lg:mt-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900 lg:rounded-xl lg:p-4">
            <FormattedMessage text={message.aiData.content} />
            {message.aiData.suggestions && message.aiData.suggestions.length > 0 && (
              <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 lg:mb-3 text-xs lg:text-sm">
                  Gợi ý chi tiết:
                </h4>
                <ul className="space-y-1.5 lg:space-y-2">
                  {message.aiData.suggestions.slice(0, 5).map((suggestion: string, index: number) => (
                    <li key={index} className="flex items-start break-words text-xs text-gray-700 dark:text-gray-300 lg:text-sm">
                      <span className="mt-1.5 mr-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500 lg:mr-2.5"></span>
                      <span className="flex-1 leading-relaxed">
                        {renderInline(suggestion, `suggestion-${index}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-0.5 lg:space-x-1 mt-2 lg:mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 lg:h-8 px-1.5 lg:px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            {copied ? (
              <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback('like')}
            className={`h-7 lg:h-8 px-1.5 lg:px-2 rounded-lg ${
              feedback === 'like' 
                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback('dislike')}
            className={`h-7 lg:h-8 px-1.5 lg:px-2 rounded-lg ${
              feedback === 'dislike' 
                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
          
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              className="h-7 lg:h-8 px-1.5 lg:px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </Button>
          )}
        </div>
        
        <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 mt-1 lg:mt-1.5 px-1">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
