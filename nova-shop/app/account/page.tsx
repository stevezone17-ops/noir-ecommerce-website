import { currentSession } from '../../lib/customer';
import { authenticate, logout, updateProfile } from './actions';
import './style.css';

const messages: Record<string, string> = {
  invalid: 'Check your email address and password.',
  signup: 'Enter your name and a password of 15 to 128 characters.',
  unavailable: 'Unable to create this account. Check your details or try signing in.',
  wait: 'Too many attempts. Try again in 15 minutes.',
  name: 'Enter a name between 1 and 100 characters.',
  saved: 'Your profile has been saved.',
};
export default async function Account({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const session = await currentSession();
  const { message } = await searchParams;
  return <><header><a href="/" aria-label="NOIR home">NOIR.</a><a href="/#shop">Back to shop ↗</a></header><main>
    <h1>Your account</h1>
    {message && Object.hasOwn(messages, message) && <p role="status">{messages[message]}</p>}
    {session ? <section><p><a href="/orders">Order history</a> · <a href="/checkout">Continue to checkout</a></p><h2>Profile</h2><p>{session.customer.email}</p>
      <form action={updateProfile}><label>Name<input name="name" autoComplete="name" maxLength={100} defaultValue={session.customer.name} required /></label><button>Save changes</button></form>
      <form action={logout}><button className="secondary">Sign out</button></form>
    </section> : <div className="columns">{['login', 'signup'].map(mode => {
      const signup = mode === 'signup';
      return <section key={mode}><h2>{signup ? 'Create an account' : 'Sign in'}</h2><form action={authenticate}>
        <input type="hidden" name="mode" value={mode}/>
        {signup && <label>Name<input name="name" autoComplete="name" maxLength={100} required /></label>}
        <label>Email<input type="email" name="email" autoComplete="email" maxLength={254} required /></label>
        <label>{signup ? 'Password (15–128 characters)' : 'Password'}<input type="password" name="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 15 : 1} maxLength={128} required /></label>
        <button>{signup ? 'Create account' : 'Sign in'}</button>
      </form></section>;
    })}</div>}
  </main></>;
}
