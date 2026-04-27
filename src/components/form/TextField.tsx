import { Input } from "@/components/ui/input"
import { FieldWrapper } from "./FieldWrapper"
import { Sparkles, Loader2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/core/lib/utils"

interface TextFieldProps {
  id?: string
  label?: string
  value?: string | number
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  required?: boolean
  type?: string
  isAI?: boolean
  onAIClick?: () => void
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  type = "text",
  isAI = false,
  onAIClick,
}: TextFieldProps) {
  const [showPopover, setShowPopover] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const handleAIClick = async () => {
    setShowPopover(true)
    setIsLoading(true)
    setTimeout(() => {
      setSuggestions([
        "Identify potential partnership avenues",
        "Highlight emerging market trends",
        "Explore cross-selling opportunities"
      ])
      setIsLoading(false)
    }, 1500)
    onAIClick?.()
  }

  const handleSuggestionSelect = (suggestion: string) => {
    onChange(suggestion)
    setShowPopover(false)
    setSuggestions([])
  }

  return (
    <FieldWrapper id={id} label={label} required={required} error={error}>
      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary",
            error && "border-destructive focus:border-destructive focus:ring-destructive",
            isAI && "pr-10",
          )}
        />
        {isAI && (
          <button
            type="button"
            onClick={handleAIClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-200"
            aria-label="AI assistance">
            <Sparkles className="h-4 w-4" />
          </button>
        )}

        {showPopover && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Generating suggestions...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">AI Suggestions</h3>
                  <button
                    onClick={() => setShowPopover(false)}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    ✕
                  </button>
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors duration-200 text-sm border border-transparent hover:border-border"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}
