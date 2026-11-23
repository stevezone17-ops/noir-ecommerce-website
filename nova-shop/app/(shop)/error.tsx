'use client';
export default function ErrorPage({reset}:{reset:()=>void}){
  return <main style={{padding:'10vw'}}><h1>The collection is temporarily unavailable.</h1><p>We couldn’t load the catalog. Your saved bag and wishlist are safe.</p><button onClick={reset}>Try again</button></main>
}
