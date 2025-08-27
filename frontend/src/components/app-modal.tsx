import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ReactNode } from 'react'


export function AppModal({
  children,
  title,
  submit,
  submitDisabled,
  submitLabel,
  triggerClassName,
  submitClassName
}: {
  children: ReactNode
  title: string
  submit?: () => void
  submitDisabled?: boolean
  submitLabel?: string
  triggerClassName?: string
  submitClassName?: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>{title}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">{children}</div>
        <DialogFooter>
          {submit ? (
            <Button variant="outline" type="submit" onClick={submit} disabled={submitDisabled} className={submitClassName}>
              {submitLabel || 'Save'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}