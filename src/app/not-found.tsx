import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <p className="eyebrow">Friends Included</p>
      <h1>This guest is not on the list.</h1>
      <Link href="/">Return to the finance desk</Link>
    </main>
  );
}
