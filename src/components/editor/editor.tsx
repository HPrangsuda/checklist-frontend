import { useMemo, useState, useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { JSONContent } from "@tiptap/core"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import Typography from "@tiptap/extension-typography"
import CharacterCount from "@tiptap/extension-character-count"
import { TextStyle } from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableCell } from "@tiptap/extension-table-cell"
import { cn } from "@/core/lib/utils"
import { EditorToolbar } from "./toolbar"
import Image from '@tiptap/extension-image'
import { Separator } from "@/components/ui/separator"
import ImageResize from 'tiptap-extension-resize-image';

export type OnChange = (html: string, json: JSONContent) => void

export type TiptapEditorProps = {
  content?: string | JSONContent
  placeholder?: string
  onChange?: OnChange
  editable?: boolean
  className?: string
}

export function TiptapEditor({
  content = "<div></div>",
  placeholder = "Write something amazing...",
  onChange,
  editable = true,
  className,
}: TiptapEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isColumnsMode, setIsColumnsMode] = useState(false)

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-primary pl-4 italic text-muted-foreground",
          },
        },
        codeBlock:{
          HTMLAttributes:{
            class: "code-ppm"
          }
        }
      }),
      Placeholder.configure({ placeholder }),
      Image,
      ImageResize,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Typography,
      CharacterCount.configure({}),
      TextStyle,
      Color.configure({
        types: ["textStyle"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    [placeholder],
  )

  const editor = useEditor({
    content,
    editable,
    extensions,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML(), editor.getJSON())
    },
  })

  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content)
    }
  }, [editor])
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    if (isFullscreen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isFullscreen])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const toggleColumns = () => {
    setIsColumnsMode(!isColumnsMode)
  }

  return (
    <div className="flex h-full">
      <div
        className={cn(
          "flex-1 overflow-hidden rounded-md border bg-background transition-all duration-300",
          isFullscreen && "fixed inset-0 z-40 rounded-none border-0 h-screen w-screen",
          className,
        )}
      >
        <EditorToolbar
          editor={editor}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onToggleColumns={toggleColumns}
          isColumnsMode={isColumnsMode}
        />
        <Separator />
        <div className={cn("overflow-auto scrollbar-hide p-4 md:p-6", isFullscreen ? "h-[calc(100vh-120px)]" : "max-h-[100vh]")}>
          <div
            className={cn(
              "tiptap min-h-[250px] text-base leading-7 focus:outline-none",
              isColumnsMode && "columns-2 gap-8",
            )}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
          <span>Characters: {editor?.storage.characterCount.characters() ?? 0}</span>
          <span>Words: {editor?.storage.characterCount.words() ?? 0}</span>
        </div>
      </div>
    </div>
  )
}