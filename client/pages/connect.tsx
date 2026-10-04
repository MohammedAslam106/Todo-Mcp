import { useEffect, useState, type FormEvent } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { CheckIcon, CopyIcon, KeyRoundIcon, PlugIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiToken } from '../../schemas/tokens'

export function getMeta() {
  return { title: 'Connect AI assistant - Todo App' }
}

const TOKEN_PLACEHOLDER = '<your-token>'

export default function Connect() {
  const [tokens, setTokens] = useState<ApiToken[] | null>(null)
  // The plaintext of a token created on this visit. The server never returns it again.
  const [newToken, setNewToken] = useState<string | null>(null)
  const [mcpUrl, setMcpUrl] = useState('http://localhost:3000/mcp')

  useEffect(() => {
    // Use the address the user actually opened, so a remapped host port (e.g. -p 8080:3000) is reflected.
    setMcpUrl(`${window.location.origin}/mcp`)
    api.listApiTokens().then(setTokens, (err) => toast.error(err.message))
  }, [])

  const token = newToken ?? TOKEN_PLACEHOLDER

  return (
    <>
      <PageHeader
        title={
          <>
            <PlugIcon className="size-6" /> Connect AI assistant
          </>
        }
        description="Let Claude (or any MCP client) on this computer read and manage your tasks through the Model Context Protocol."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepNumber n={1} /> Create an access token
          </CardTitle>
          <CardDescription>
            Your assistant uses this token to act as you. Create one per app so you can revoke them separately.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {newToken ? (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
                Copy this token now. You won't be able to see it again.
              </p>
              <CopyField value={newToken} />
              <Button variant="outline" size="sm" className="self-start" onClick={() => setNewToken(null)}>
                Create another token
              </Button>
            </div>
          ) : (
            <CreateTokenForm
              onCreated={(created) => {
                setNewToken(created.token)
                setTokens((prev) => [created, ...(prev ?? [])])
              }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepNumber n={2} /> Add it to your assistant
          </CardTitle>
          <CardDescription>
            {newToken
              ? 'Your new token is already filled in below.'
              : `Create a token first, then replace ${TOKEN_PLACEHOLDER} below with it.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="claude-code">
            <TabsList>
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
              <TabsTrigger value="claude-desktop">Claude Desktop</TabsTrigger>
              <TabsTrigger value="other">Other clients</TabsTrigger>
            </TabsList>

            <TabsContent value="claude-code" className="flex flex-col gap-3 pt-2">
              <p className="text-sm text-muted-foreground">Run this in a terminal:</p>
              <CodeBlock
                code={`claude mcp add --transport http todo ${mcpUrl} --header "Authorization: Bearer ${token}"`}
              />
              <p className="text-sm text-muted-foreground">
                Then start <code className="font-mono">claude</code> and ask something like "what's due today?".
              </p>
            </TabsContent>

            <TabsContent value="claude-desktop" className="flex flex-col gap-3 pt-2">
              <p className="text-sm text-muted-foreground">
                In Claude Desktop open <strong>Settings → Developer → Edit Config</strong> and add this to{' '}
                <code className="font-mono">claude_desktop_config.json</code>, then restart Claude Desktop. It bridges to
                this server with <code className="font-mono">mcp-remote</code>, which needs{' '}
                <a className="underline underline-offset-4" href="https://nodejs.org" target="_blank" rel="noreferrer">
                  Node.js
                </a>{' '}
                installed.
              </p>
              <CodeBlock
                code={JSON.stringify(
                  {
                    mcpServers: {
                      todo: {
                        command: 'npx',
                        args: ['-y', 'mcp-remote', mcpUrl, '--header', 'Authorization:${AUTH_HEADER}'],
                        env: { AUTH_HEADER: `Bearer ${token}` },
                      },
                    },
                  },
                  null,
                  2,
                )}
              />
            </TabsContent>

            <TabsContent value="other" className="flex flex-col gap-3 pt-2">
              <p className="text-sm text-muted-foreground">
                Any client that supports the Streamable HTTP transport can connect with these settings:
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-[max-content_1fr] sm:items-center">
                <dt className="font-medium">Server URL</dt>
                <dd>
                  <CopyField value={mcpUrl} />
                </dd>
                <dt className="font-medium">Transport</dt>
                <dd>Streamable HTTP</dd>
                <dt className="font-medium">Header</dt>
                <dd>
                  <CopyField value={`Authorization: Bearer ${token}`} />
                </dd>
              </dl>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4" /> Your tokens
          </CardTitle>
          <CardDescription>Revoke a token to disconnect the assistant using it immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <TokenList
            tokens={tokens}
            onRevoked={(id) => setTokens((prev) => prev?.filter((t) => t.id !== id) ?? null)}
          />
        </CardContent>
      </Card>
    </>
  )
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
      {n}
    </span>
  )
}

function CreateTokenForm({ onCreated }: { onCreated: (token: Awaited<ReturnType<typeof api.createApiToken>>) => void }) {
  const [name, setName] = useState('Claude')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      onCreated(await api.createApiToken(name))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="flex-row items-end gap-2">
        <Field className="max-w-xs">
          <FieldLabel htmlFor="token-name">Token name</FieldLabel>
          <Input
            id="token-name"
            required
            maxLength={100}
            placeholder="e.g. Claude Desktop"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading && <Spinner />}
          Create token
        </Button>
      </FieldGroup>
    </form>
  )
}

function TokenList({ tokens, onRevoked }: { tokens: ApiToken[] | null; onRevoked: (id: number) => void }) {
  if (!tokens) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (tokens.length === 0) {
    return <p className="text-sm text-muted-foreground">No tokens yet.</p>
  }

  async function revoke(token: ApiToken) {
    try {
      await api.revokeApiToken(token.id)
      onRevoked(token.id)
      toast.success(`Revoked "${token.name}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not revoke token')
    }
  }

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {tokens.map((token) => (
        <li key={token.id} className="flex items-center justify-between gap-4 p-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{token.name}</span>
            <span className="text-xs text-muted-foreground">
              Created {formatDistanceToNow(token.created_at, { addSuffix: true })}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {token.last_used_at ? (
              <Badge variant="secondary">Used {formatDistanceToNow(token.last_used_at, { addSuffix: true })}</Badge>
            ) : (
              <Badge variant="outline">Never used</Badge>
            )}
            <Button variant="ghost" size="icon" title={`Revoke ${token.name}`} onClick={() => revoke(token)}>
              <Trash2Icon />
              <span className="sr-only">Revoke {token.name}</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.')
    }
  }
  return { copied, copy }
}

function CopyButton({ value }: { value: string }) {
  const { copied, copy } = useCopy()
  return (
    <Button variant="outline" size="icon" className="shrink-0" title="Copy" onClick={() => copy(value)}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span className="sr-only">Copy</span>
    </Button>
  )
}

function CopyField({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={value} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
      <CopyButton value={value} />
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border bg-muted p-4 pr-14 font-mono text-xs leading-relaxed">
        {code}
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton value={code} />
      </div>
    </div>
  )
}
