import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/overview', { replace: true });
  }, [user, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(username, password);
      navigate('/overview', { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[color:var(--bg)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,163,255,0.14),transparent_38%),radial-gradient(circle_at_30%_60%,rgba(45,212,191,0.08),transparent_26%)]" />
      <div className="relative grid w-full max-w-[1120px] gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="hidden overflow-hidden lg:block">
          <CardContent className="flex h-full flex-col justify-between p-10">
            <div className="space-y-6">
              <Badge variant="success">Field-ops hybrid admin</Badge>
              <h1 className="max-w-[12ch] text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-[color:var(--text-strong)]">Quiet Tactical Command</h1>
              <p className="max-w-[44ch] text-base leading-7 text-[color:var(--text-muted)]">
                Quiet tactical control for incident coordination, volunteer routing, and camera-aware emergency response.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-enter">
          <CardHeader className="pb-4">
            <Badge variant="neutral" className="w-fit">Secure operator access</Badge>
            <CardTitle className="text-3xl">Jyldam</CardTitle>
            <CardDescription>Sign in to the field operations command environment.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm text-[color:var(--text-soft)]">
                Username
                <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" autoFocus />
              </label>
              <label className="grid gap-2 text-sm text-[color:var(--text-soft)]">
                Password
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="admin123" />
              </label>
              {error ? <div className="rounded-3xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
              <Button type="submit" className="mt-2 w-full">{loading ? 'Signing in...' : 'Access command deck'}</Button>
            </form>
            <div className="mt-6 rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4 text-sm text-[color:var(--text-muted)]">
              Demo credentials: <strong className="text-[color:var(--text-strong)]">admin / admin123</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
