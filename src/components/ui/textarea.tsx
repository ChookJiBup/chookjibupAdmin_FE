import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 body-regular text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:placeholder:text-zinc-400 aria-invalid:border-red-600 aria-invalid:placeholder:text-red-600",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
