export default function CancelPage({ searchParams }: { searchParams: { order_id?: string } }) {
    return (
      <main className="min-h-screen p-6 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold">Checkout canceled</h1>
        <p className="mt-2 text-neutral-700">
          If you want to try again, go back and checkout. Order ID:{" "}
          <span className="font-mono">{searchParams.order_id}</span>
        </p>
      </main>
    );
  }