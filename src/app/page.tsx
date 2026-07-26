import { Header } from "@/components/layout/Header";

export default function Home() {
  return (
    <>
      <Header variant="default" />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="heading-regular">축지법</h1>
      </main>
    </>
  );
}
