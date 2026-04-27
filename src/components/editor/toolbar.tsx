import type React from "react"
import type { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Columns,
  Expand,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Palette,
  Quote,
  Redo2,
  Shrink,
  Sparkles,
  Table,
  Underline,
  Undo2
} from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "../ui/textarea"

const TEXT_COLORS = [
  "#000000",
  "#374151",
  "#6b7280",
  "#9ca3af",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
]

const HIGHLIGHT_COLORS = [
  "#fef08a",
  "#fed7aa",
  "#fecaca",
  "#f3e8ff",
  "#ddd6fe",
  "#c7d2fe",
  "#bfdbfe",
  "#a7f3d0",
  "#bbf7d0",
  "#fde68a",
  "#fcd34d",
]

interface EditorToolbarProps {
  editor: Editor | null
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  onToggleColumns?: () => void
  isColumnsMode?: boolean
}

export function EditorToolbar({
  editor,
  isFullscreen = false,
  onToggleFullscreen,
  onToggleColumns,
  isColumnsMode = false,
}: EditorToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("https://")
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [imageUploadOpen, setImageUploadOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

  if (!editor) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 bg-muted/30">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  const applyHeading = (level: 0 | 1 | 2 | 3 | 4) => {
    const chain = editor.chain().focus()
    if (level === 0) chain.setParagraph().run()
    else chain.toggleHeading({ level }).run()
  }

  const setOrUpdateLink = () => {
    const url = linkUrl.trim()
    if (!url) return
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    setLinkOpen(false)
  }

  const removeLink = () => {
    editor.chain().focus().unsetLink().run()
    setLinkOpen(false)
  }

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const handleAiPrompt = async () => {
    if (!aiPrompt.trim() || !editor) return
    setIsAiProcessing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const aiResponse = `AI Response to: "${aiPrompt}"\n\nThis is a simulated AI response. In a real implementation, this would be replaced with an actual AI API call to generate content based on your prompt.`
      editor.chain().focus().insertContent(`<p><strong>AI Generated Content:</strong></p><p>${aiResponse}</p>`).run()
      setAiPrompt("")
      setAiDialogOpen(false)
    } catch (error) {
      console.error("AI processing failed:", error)
    } finally {
      setIsAiProcessing(false)
    }
  }

  const handleImageUpload = () => {
    if (editor) {
      editor.commands.blur(); // <-- important!
    }
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = () => {
        const src = String(reader.result)
        if (!src) return
        editor.chain().focus().setImage({ src, alt: imageFile.name }).run()
        setImageUploadOpen(false)
        setImageFile(null)
        setImagePreview("")
      }
      reader.readAsDataURL(imageFile)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(String(reader.result))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 overflow-x-auto px-3 py-2 bg-muted/30 border-b">
        <div className="flex items-center gap-1">
          <IconButton
            tooltip="Undo (Ctrl+Z)"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}>
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <IconButton
            tooltip="Redo (Ctrl+Y)"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}>
            <Redo2 className="h-4 w-4" />
          </IconButton>
          <IconButton
            tooltip={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
            onClick={onToggleFullscreen}>
            {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </IconButton>
        </div>
        <Separator orientation="vertical" className="mx-2 vline" />
        <div className="flex items-center gap-1">
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Sparkles className="h-4 w-4" />
                <span className="sr-only">AI Assistant</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md z-50">
              <DialogHeader>
                <DialogTitle className="font-normal">AI Assistant</DialogTitle>
                <DialogDescription>
                  Enter a prompt and let AI help you generate content for your document.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="ai-prompt">Your Prompt</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Write a paragraph about sustainable technology..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="min-h-[100px]"
                    disabled={isAiProcessing}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={(e) => { e.stopPropagation(); setAiDialogOpen(false) }} disabled={isAiProcessing}>
                  Cancel
                </Button>
                <Button onClick={handleAiPrompt} disabled={!aiPrompt.trim() || isAiProcessing}>
                  {isAiProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Separator orientation="vertical" className="mx-2 vline" />
        <div className="flex items-center gap-1">
          <Toggle
            pressed={editor.isActive("heading", { level: 1 })}
            onPressedChange={() => applyHeading(1)}
            aria-label="Heading 1"
            size="sm">
            <Heading1 className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("heading", { level: 2 })}
            onPressedChange={() => applyHeading(2)}
            aria-label="Heading 2"
            size="sm">
            <Heading2 className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("heading", { level: 3 })}
            onPressedChange={() => applyHeading(3)}
            aria-label="Heading 3"
            size="sm">
            <Heading3 className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("heading", { level: 4 })}
            onPressedChange={() => applyHeading(4)}
            aria-label="Heading 4"
            size="sm">
            <Heading4 className="h-4 w-4" />
          </Toggle>
        </div>
        <Separator orientation="vertical" className="mx-2 vline" />
        <div className="flex items-center gap-1">
          <Toggle
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            aria-label="Bold (Ctrl+B)"
            size="sm">
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            aria-label="Italic (Ctrl+I)"
            size="sm">
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("underline")}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
            aria-label="Underline (Ctrl+U)"
            size="sm">
            <Underline className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("code")}
            onPressedChange={() => editor.chain().focus().toggleCode().run()}
            aria-label="Inline code"
            size="sm">
            <Code className="h-4 w-4" />
          </Toggle>
        </div>
        <Separator orientation="vertical" className="mx-2 vline" />
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 z-50">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Text Color</Label>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: color }}
                        onClick={() => editor.chain().focus().setColor(color).run()}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 bg-transparent"
                    onClick={() => editor.chain().focus().unsetColor().run()}>
                    Remove Color
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={editor.isActive("highlight") ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0">
                <Highlighter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 z-50">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Highlight Color</Label>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: color }}
                        onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 bg-transparent"
                    onClick={() => editor.chain().focus().unsetHighlight().run()}>
                    Remove Highlight
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Separator orientation="vertical" className="mx-2 vline" />
        <div className="flex items-center gap-1">
          <Toggle
            pressed={editor.isActive("bulletList")}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bullet list"
            size="sm">
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("orderedList")}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Ordered list"
            size="sm">
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("blockquote")}
            onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
            aria-label="Blockquote"
            size="sm">
            <Quote className="h-4 w-4" />
          </Toggle>
        </div>
        <Separator orientation="vertical" className="mx-2 vline" />
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={editor.isActive("table") ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0">
                <Table className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 z-50">
              <DropdownMenuItem onClick={insertTable}>Insert Table (3×3)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addRowBefore().run()}
                disabled={!editor.can().addRowBefore()}
              >
                Add Row Above
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addRowAfter().run()}
                disabled={!editor.can().addRowAfter()}
              >
                Add Row Below
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().deleteRow().run()}
                disabled={!editor.can().deleteRow()}
              >
                Delete Row
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                disabled={!editor.can().addColumnBefore()}
              >
                Add Column Before
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                disabled={!editor.can().addColumnAfter()}
              >
                Add Column After
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().deleteColumn().run()}
                disabled={!editor.can().deleteColumn()}
              >
                Delete Column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                disabled={!editor.can().toggleHeaderRow()}
              >
                Toggle Header Row
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().deleteTable().run()}
                disabled={!editor.can().deleteTable()}
                className="text-red-600"
              >
                Delete Table
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <IconButton tooltip="Toggle Columns" onClick={onToggleColumns}>
            <Columns className={`h-4 w-4 ${isColumnsMode ? "text-primary" : ""}`} />
          </IconButton>
        </div>
        <Separator orientation="vertical" className="mx-2 vline" />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().setTextAlign("left").run();
            }}>
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive({ textAlign: "center" }) ? "default" : "ghost"}
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().setTextAlign("center").run();
            }}>
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive({ textAlign: "right" }) ? "default" : "ghost"}
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().setTextAlign("right").run();
            }}>
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="mx-2 vline" />
        <div className="flex items-center gap-1">
          <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
            <DialogTrigger asChild>
              <Button variant={editor.isActive("link") ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md z-50">
              <DialogHeader>
                <DialogTitle>Add or edit link</DialogTitle>
                <DialogDescription>Paste a URL to link the selected text.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  autoFocus
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="secondary" onClick={removeLink}>
                  Remove link
                </Button>
                <Button onClick={setOrUpdateLink}>Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={imageUploadOpen} onOpenChange={setImageUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ImageIcon className="h-4 w-4" />
                <span className="sr-only">Insert image</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md z-50">
              <DialogHeader>
                <DialogTitle>Upload Image</DialogTitle>
                <DialogDescription>Select an image file to insert into your document.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="image-upload">Choose Image</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>
                {imagePreview && (
                  <div className="grid gap-2">
                    <Label>Preview</Label>
                    <div className="border rounded-md p-2 bg-muted/30">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Preview"
                        className="max-w-full max-h-48 object-contain mx-auto rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImageUploadOpen(false)
                    setImageFile(null)
                    setImagePreview("")
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleImageUpload} disabled={!imageFile}>
                  Insert Image
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Separator orientation="vertical" className="mx-2 h-6" />
      </div>
    </TooltipProvider>
  )
}

function IconButton({
  tooltip,
  onClick,
  disabled,
  children,
}: {
  tooltip: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onClick;
          }}
          disabled={disabled}>
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
