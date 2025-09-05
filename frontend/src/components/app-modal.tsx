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
  submitClassName,
  contentClassName,
}: {
  children: ReactNode
  title: string
  submit?: () => void
  submitDisabled?: boolean
  submitLabel?: string
  triggerClassName?: string
  submitClassName?: string
  contentClassName?: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="default" className={triggerClassName}>{title}</Button>
      </DialogTrigger>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">{children}</div>
        <DialogFooter>
          {submit ? (
            <Button variant="outline" size="default" type="submit" onClick={submit} disabled={submitDisabled} className={submitClassName}>
              {submitLabel || 'Save'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}