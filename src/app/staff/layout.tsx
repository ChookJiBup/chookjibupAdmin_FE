export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-1 flex-col">
      <div className="flex-1 px-10 py-[30px]">{children}</div>
    </div>
  );
}
