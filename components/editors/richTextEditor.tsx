/**
 * Rich Text Editor Component (TipTap)
 */
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface RichEditorProps {
  initialContent?: string
  onChange?: (html: string) => void
  placeholder?: string
}

const EditorToolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2">
      <Button
        variant={editor.isActive('bold') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="w-10"
      >
        <strong>B</strong>
      </Button>
      <Button
        variant={editor.isActive('italic') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="w-10"
      >
        <em>I</em>
      </Button>
      <Button
        variant={editor.isActive('underline') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className="w-10"
      >
        <u>U</u>
      </Button>
      <div className="mx-1 border-r border-gray-300" />
      <Button
        variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className="w-10"
      >
        ↖
      </Button>
      <Button
        variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className="w-10"
      >
        =
      </Button>
      <Button
        variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className="w-10"
      >
        ↗
      </Button>
      <div className="mx-1 border-r border-gray-300" />
      <Button
        variant={editor.isActive('bulletList') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="w-10"
      >
        •
      </Button>
      <Button
        variant={editor.isActive('orderedList') ? 'default' : 'outline'}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="w-10"
      >
        1
      </Button>
      <div className="mx-1 border-r border-gray-300" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className="w-10"
      >
        &lt;&gt;
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        className="w-10"
      >
        ↶
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        className="w-10"
      >
        ↷
      </Button>
    </div>
  )
}

export const RichTextEditor = ({ initialContent = '', onChange, placeholder = 'Start typing...' }: RichEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: initialContent || `<p>${placeholder}</p>`,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="editor-content"
        style={{
          minHeight: '400px',
          padding: '1rem',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
      />
    </div>
  )
}
