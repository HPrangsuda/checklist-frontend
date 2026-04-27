import type { ReactNode } from "react"

interface TblContainerProps {
  children: ReactNode
  className?: string
}

export function TblContainer({ children, className = "" }: TblContainerProps) {
  return (
    <div className={`flex flex-1 flex-col ${className}`}>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col py-4 px-4">
          {children}
        </div>
      </div>
    </div>
  )
}
