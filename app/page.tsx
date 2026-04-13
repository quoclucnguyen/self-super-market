import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start">
        <Link href="/">
          <img
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
          />
        </Link>
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
            Self Super Market
          </h1>
          <p className="max-w-md text-lg leading-8 text-muted-foreground">
            A modern product management system with admin interface.
            {' '}Access the admin dashboard to manage your inventory.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-foreground/90 md:w-[158px] min-h-12"
            href="/admin"
          >
            Admin Dashboard
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center rounded-full border border-border px-5 transition-colors hover:bg-accent md:w-[158px] min-h-12"
            href="/admin/api-docs"
          >
            API Docs
          </Link>
        </div>
      </main>
    </div>
  );
}
