/**
 * RichTextEditor Component
 * TipTap-based rich text editor with horizontal scrollable toolbar
 * Outputs markdown format internally
 */

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { IonIcon } from '@ionic/react';
import {
  removeOutline,
  listOutline,
  reorderFourOutline,
} from 'ionicons/icons';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon?: string;
  label: string;
  children?: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  icon,
  label,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`toolbar-button ${isActive ? 'active' : ''}`}
    title={label}
    aria-label={label}
  >
    {icon ? <IonIcon icon={icon} /> : children}
  </button>
);

// Custom SVG icons for formatting not in ionicons
const BoldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
  </svg>
);

const ItalicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
  </svg>
);

const UnderlineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" />
  </svg>
);

const StrikethroughIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
  </svg>
);

const QuoteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
  </svg>
);

const H1Icon = () => (
  <span style={{ fontWeight: 700, fontSize: '14px' }}>H1</span>
);

const H2Icon = () => (
  <span style={{ fontWeight: 700, fontSize: '13px' }}>H2</span>
);

const H3Icon = () => (
  <span style={{ fontWeight: 600, fontSize: '12px' }}>H3</span>
);

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your thoughts here...',
  disabled = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        html: true, // Allow HTML input for backward compatibility with existing entries
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // Get markdown content (type assertion needed for tiptap-markdown extension)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdown = (editor.storage as any).markdown.getMarkdown();
      onChange(markdown);
    },
  });

  // Update content when value prop changes externally
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (editor && value !== (editor.storage as any).markdown.getMarkdown()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Update editable state when disabled changes
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor">
      {/* Horizontal Scrollable Toolbar */}
      <div className="editor-toolbar-container">
        <div className="editor-toolbar">
          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            disabled={disabled}
            label="Bold"
          >
            <BoldIcon />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            disabled={disabled}
            label="Italic"
          >
            <ItalicIcon />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            disabled={disabled}
            label="Underline"
          >
            <UnderlineIcon />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            disabled={disabled}
            label="Strikethrough"
          >
            <StrikethroughIcon />
          </ToolbarButton>

          <div className="toolbar-divider" />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            disabled={disabled}
            label="Heading 1"
          >
            <H1Icon />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            disabled={disabled}
            label="Heading 2"
          >
            <H2Icon />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            disabled={disabled}
            label="Heading 3"
          >
            <H3Icon />
          </ToolbarButton>

          <div className="toolbar-divider" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            disabled={disabled}
            icon={listOutline}
            label="Bullet List"
          />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            disabled={disabled}
            icon={reorderFourOutline}
            label="Numbered List"
          />

          <div className="toolbar-divider" />

          {/* Block Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            disabled={disabled}
            label="Blockquote"
          >
            <QuoteIcon />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            disabled={disabled}
            icon={removeOutline}
            label="Horizontal Rule"
          />
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
};
