import { Button } from '@/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute('/authentication/forgot')({
  component: ForgotPage,
})

function ForgotPage() {
  const handleSubmit = () => {
    console.log('Clicked')
  }
  
  return (
    <div>
      <span>Hello "/authentication/forgot-password"!</span>
      <div>yryry</div>
      <div>ryryr</div>
      <Button onClick={handleSubmit}>Click me</Button>
      <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="blueberry">Blueberry</SelectItem>
          <SelectItem value="grapes">Grapes</SelectItem>
          <SelectItem value="pineapple">Pineapple</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
    </div>
  )
}
