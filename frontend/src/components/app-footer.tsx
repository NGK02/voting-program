import React from 'react'
import Image from 'next/image'

export function AppFooter() {
  return (
    <footer className="py-2 bg-neutral-100 dark:bg-neutral-900">
      <div className="flex flex-row mx-auto w-min">
        <Image
          className="mr-2 dark:hidden"
          src="/nextjs-icon-black.svg"
          alt="Next.js black logo"
          width={32}
          height={32}
        />
        <Image
          className="mr-2 hidden dark:block"
          src="/nextjs-icon-white.svg"
          alt="Next.js white logo"
          width={32}
          height={32}
        />
        <Image
          className="mr-2 hidden dark:block"
          src="/anchor-icon-white.png"
          alt="Anchor white logo"
          width={32}
          height={32}
        />
        <Image
          className="mr-2 dark:hidden"
          src="/anchor-icon-black.png"
          alt="Anchor black logo"
          width={32}
          height={32}
        />
      </div>
    </footer>
  )
}
